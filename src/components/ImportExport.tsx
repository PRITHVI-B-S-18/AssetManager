import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import type { SectionConfig, StoredRecord } from "../types/sections";
import { addRecord } from "../services/firestore";
import { isDateColumnKey, formatDateForDisplay } from "../utils/dateFormat";
import { IconImport, IconExportCsv, IconExportExcel } from "./Icons";
import { Tooltip } from "./Tooltip";
import { ImportPreviewModal } from "./ImportPreviewModal";

/** Normalize header for matching: trim, collapse spaces, fix common typos */
function normalizeHeader(label: string): string {
  const s = String(label).trim().replace(/\s+/g, " ").toLowerCase();
  if (s === "deteled date") return "deleted date";
  if (s === "warranty") return "warrenty"; /* All Laptop column label is "Warrenty" */
  return s;
}

export type ImportPhase = "idle" | "reading" | "importing" | "done";

export interface ImportProgress {
  phase: ImportPhase;
  current: number;
  total: number;
  fileName?: string;
  error?: string;
}

interface ImportExportProps {
  section: SectionConfig;
  records: StoredRecord[];
  onImportDone: () => void;
  onImportProgress: (progress: ImportProgress) => void;
  importInProgress: boolean;
  /** If false, only export buttons are shown (view-only users). */
  canImport?: boolean;
}

export function ImportExport({
  section,
  records,
  onImportDone,
  onImportProgress,
  importInProgress,
  canImport = true,
}: ImportExportProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{
    records: Record<string, string | number | undefined>[];
    fileName: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const exportCSV = () => {
    const headers = section.columns.map((c) => c.label);
    const rows = records.map((r) =>
      section.columns.map((c) => {
        const v = isDateColumnKey(c.key) ? formatDateForDisplay(r[c.key]) : r[c.key];
        const s = v == null ? "" : String(v);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      })
    );
    const line = (arr: string[]) => arr.join(",");
    const csv = [line(headers), ...rows.map((r) => line(r))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${section.slug}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const wsData = [
      section.columns.map((c) => c.label),
      ...records.map((r) =>
        section.columns.map((c) =>
          isDateColumnKey(c.key) ? formatDateForDisplay(r[c.key]) : (r[c.key] ?? "")
        )
      ),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, section.name.slice(0, 31));
    XLSX.writeFile(wb, `${section.slug}-export.xlsx`);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (fileRef.current) fileRef.current.value = "";

    const fileName = file.name;
    onImportProgress({ phase: "reading", current: 0, total: 0, fileName });

    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const first = wb.SheetNames[0];
      if (!first) {
        onImportProgress({
          phase: "done",
          current: 0,
          total: 0,
          fileName,
          error: "No sheet found in file.",
        });
        return;
      }
      const ws = wb.Sheets[first];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | number)[][];
      if (data.length < 2) {
        onImportProgress({
          phase: "done",
          current: 0,
          total: 0,
          fileName,
          error: "File has no data rows (only header or empty).",
        });
        return;
      }

      const headerRow = data[0] as string[];
      const normalizedToKey = new Map<string, string>();
      section.columns.forEach((c) => {
        normalizedToKey.set(normalizeHeader(c.label), c.key);
      });
      const keyForLabel = (label: string) => normalizedToKey.get(normalizeHeader(label));
      const allRows = data.slice(1) as (string | number)[][];

      const hasAnyMappedValue = (row: (string | number)[]) => {
        return headerRow.some((label, colIndex) => {
          const key = keyForLabel(label);
          const raw = row[colIndex];
          return key != null && raw !== undefined && raw !== "";
        });
      };
      const rowsToImport = allRows.filter(hasAnyMappedValue);
      const records: Record<string, string | number | undefined>[] = [];
      for (const row of rowsToImport) {
        const record: Record<string, string | number | undefined> = {
          sectionId: section.id,
        };
        headerRow.forEach((label, colIndex) => {
          const key = keyForLabel(label);
          if (!key) return;
          const raw = row[colIndex];
          if (raw === undefined || raw === "") return;
          let value: string | number = raw as string | number;
          if (isDateColumnKey(key)) {
            const formatted = formatDateForDisplay(raw);
            if (formatted) value = formatted;
          } else if (key === "empId") {
            // Emp ID can be formats like "neo/c/10313" – always store as string
            value = String(raw);
          }
          record[key] = value;
        });
        if (Object.keys(record).length > 1) records.push(record);
      }

      if (records.length === 0) {
        onImportProgress({
          phase: "done",
          current: 0,
          total: 0,
          fileName,
          error: "No valid rows to import (all empty or unmapped).",
        });
        return;
      }

      setPreview({ records, fileName });
      onImportProgress({ phase: "idle", current: 0, total: 0 });
    } catch (err) {
      onImportProgress({
        phase: "done",
        current: 0,
        total: 0,
        fileName,
        error: err instanceof Error ? err.message : "Import failed.",
      });
    }
  };

  const runImport = async () => {
    if (!preview) return;
    setImporting(true);
    const { records, fileName } = preview;
    onImportProgress({ phase: "importing", current: 0, total: records.length, fileName });
    let added = 0;
    try {
      for (let i = 0; i < records.length; i++) {
        await addRecord(records[i] as StoredRecord & { sectionId: string });
        added++;
        onImportProgress({
          phase: "importing",
          current: i + 1,
          total: records.length,
          fileName,
        });
      }
      onImportProgress({ phase: "done", current: added, total: records.length, fileName });
      onImportDone();
    } catch (err) {
      onImportProgress({
        phase: "done",
        current: 0,
        total: 0,
        fileName,
        error: err instanceof Error ? err.message : "Import failed.",
      });
    } finally {
      setPreview(null);
      setImporting(false);
    }
  };

  return (
    <>
      <ImportPreviewModal
        open={!!preview}
        section={section}
        previewRows={preview?.records ?? []}
        totalRows={preview?.records.length ?? 0}
        fileName={preview?.fileName ?? ""}
        onConfirm={runImport}
        onCancel={() => setPreview(null)}
        importing={importing}
      />
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      {canImport && (
        <Tooltip label={importInProgress ? "Importing…" : "Import"}>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => fileRef.current?.click()}
            disabled={importInProgress}
            aria-label={importInProgress ? "Importing…" : "Import"}
          >
            <IconImport />
          </button>
        </Tooltip>
      )}
      <Tooltip label="Export CSV">
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={exportCSV}
          disabled={importInProgress}
          aria-label="Export CSV"
        >
          <IconExportCsv />
        </button>
      </Tooltip>
      <Tooltip label="Export Excel">
        <button
          type="button"
          className="btn btn-secondary btn-icon"
          onClick={exportExcel}
          disabled={importInProgress}
          aria-label="Export Excel"
        >
          <IconExportExcel />
        </button>
      </Tooltip>
    </>
  );
}
