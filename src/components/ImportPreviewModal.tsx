import type { SectionConfig } from "../types/sections";

const PREVIEW_ROWS = 10;

interface ImportPreviewModalProps {
  open: boolean;
  section: SectionConfig;
  previewRows: Record<string, string | number | undefined>[];
  totalRows: number;
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
  importing: boolean;
}

export function ImportPreviewModal({
  open,
  section,
  previewRows,
  totalRows,
  fileName,
  onConfirm,
  onCancel,
  importing,
}: ImportPreviewModalProps) {
  if (!open) return null;

  const displayCols = section.columns.slice(0, 8);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Import preview – {fileName}</h3>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            First {Math.min(PREVIEW_ROWS, previewRows.length)} of <strong>{totalRows}</strong> rows. Confirm to import.
          </p>
          <div style={{ maxHeight: "280px", overflow: "auto", border: "1px solid var(--border)", borderRadius: "10px" }}>
            <table className="data-table" style={{ fontSize: "0.8rem" }}>
              <thead>
                <tr>
                  {displayCols.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, PREVIEW_ROWS).map((row, idx) => (
                  <tr key={idx}>
                    {displayCols.map((c) => (
                      <td key={c.key}>{String(row[c.key] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={importing}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={importing}>
            {importing ? "Importing…" : `Import ${totalRows} rows`}
          </button>
        </div>
      </div>
    </div>
  );
}
