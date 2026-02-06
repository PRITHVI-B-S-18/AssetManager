import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { SectionConfig, StoredRecord } from "../types/sections";
import type { DocumentSnapshot } from "firebase/firestore";
import {
  subscribeRecords,
  subscribeRecordsPaginated,
  getSectionRecordCount,
  addRecord,
  updateRecord,
  deleteRecord,
} from "../services/firestore";
import { ImportExport, type ImportProgress } from "./ImportExport";
import { ImportProgressModal } from "./ImportProgressModal";
import { RecordModal } from "./RecordModal";
import { ConfirmDialog } from "./ConfirmDialog";
import { BulkEditModal } from "./BulkEditModal";
import { useToast } from "../context/ToastContext";
import { useCanEdit } from "../context/useCanEdit";
import { isDateColumnKey, formatDateForDisplay } from "../utils/dateFormat";
import { IconAdd, IconEdit, IconDelete, IconClearSelection, IconSearchColumn, IconFilter, IconColumns, IconDuplicate } from "./Icons";
import { Tooltip } from "./Tooltip";
import { IconDropdown } from "./IconDropdown";

/** Sections where "Delete" only clears the assignment (username/userName); the asset/MAC/monitor stays in the list. */
const UNASSIGN_ONLY_SECTIONS: Record<string, string> = {
  allMonitors: "username",
  windowsMacAddress: "userName",
  macMacAddress: "userName",
};

/** Section ids that have two add actions: add asset itself vs assign user to existing */
const ASSIGN_SECTION_IDS = ["allMonitors", "windowsMacAddress", "macMacAddress"] as const;

/** Section-specific filter column key or label hint. Resolved against section.columns so edited keys (e.g. user_license_type) work. */
const SECTION_FILTER_COLUMN: Record<string, string> = {
  allEmpLicense: "userLicenseType",
  allDeptGroups: "owner",
  allLaptop: "laptopType",
  nonLaptopUsers: "laptopStatus",
  underTicketLaptops: "ticketStatus",
  backup: "totalBackup",
  windowsMacAddress: "model",
  macMacAddress: "laptopType",
  dlGroups: "owner",
  allMonitors: "assetName",
};

/** Resolve the actual column key for the section filter (handles user-edited keys like user_license_type). */
function resolveSectionFilterKey(sectionId: string, columns: { key: string; label: string }[]): string | null {
  const hint = SECTION_FILTER_COLUMN[sectionId];
  if (!hint) return null;
  const byKey = columns.find((c) => c.key === hint || c.key === hint.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, ""));
  if (byKey) return byKey.key;
  const hintLower = hint.toLowerCase().replace(/_/g, " ");
  const byLabel = columns.find((c) => c.label.toLowerCase().replace(/\s+/g, " ").includes(hintLower) || hintLower.includes(c.label.toLowerCase().replace(/\s+/g, " ")));
  return byLabel?.key ?? null;
}

interface DataTableSectionProps {
  section: SectionConfig;
}

const PAGE_SIZE = 50;

export function DataTableSection({ section }: DataTableSectionProps) {
  const [records, setRecords] = useState<StoredRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [pageCursors, setPageCursors] = useState<Record<number, DocumentSnapshot | null>>({ 1: null });
  const [search, setSearch] = useState("");
  const [searchInColumn, setSearchInColumn] = useState<string>("");
  const [filterColumn, setFilterColumn] = useState<string>("");
  const [filterValue, setFilterValue] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterValueDebounced, setFilterValueDebounced] = useState("");
  const [modalRecord, setModalRecord] = useState<StoredRecord | null | "new">(null);
  const [modalAddMode, setModalAddMode] = useState<"add-asset" | "assign" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(() => section.columns[0]?.key ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const canEdit = useCanEdit();

  const COLUMN_VISIBILITY_KEY = "assetManager_columns";
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => section.columns.map((c) => c.key));
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${COLUMN_VISIBILITY_KEY}_${section.id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleColumns(parsed.filter((k) => section.columns.some((c) => c.key === k)));
          return;
        }
      }
    } catch (_) {}
    setVisibleColumns(section.columns.map((c) => c.key));
  }, [section.id, section.columns]);
  const displayColumns = useMemo(
    () => section.columns.filter((c) => visibleColumns.includes(c.key)),
    [section.columns, visibleColumns]
  );
  const toggleColumnVisibility = useCallback((key: string) => {
    setVisibleColumns((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem(`${COLUMN_VISIBILITY_KEY}_${section.id}`, JSON.stringify(next));
      } catch (_) {}
      return next.length ? next : section.columns.map((c) => c.key);
    });
  }, [section.id, section.columns]);

  const toggleSelection = (id: string | undefined) => {
    if (!id) return;
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = (checked: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      pageRows.forEach((r) => {
        if (r.id) checked ? next.add(r.id) : next.delete(r.id);
      });
      return next;
    });
  };

  const handleSort = (key: string) => {
    setSortKey((prev) => (prev === key ? prev : key));
    setSortDir((prev) => (sortKey === key && prev === "asc" ? "desc" : "asc"));
  };
  const effectiveSortKey = sortKey && section.columns.some((c) => c.key === sortKey) ? sortKey : section.columns[0]?.key ?? null;

  // Reset search, filter, sort, and selection when switching to a different section
  useEffect(() => {
    setSearch("");
    setSearchInColumn("");
    setFilterColumn("");
    setFilterValue("");
    setSearchDebounced("");
    setFilterValueDebounced("");
    setSortKey(section.columns[0]?.key ?? null);
    setSortDir("asc");
    setSelectedRowIds(new Set());
    setPage(1);
    setPageCursors({ 1: null });
    setTotalCount(0);
  }, [section.id]);

  // Debounce search (300ms)
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setFilterValueDebounced(filterValue), 300);
    return () => clearTimeout(t);
  }, [filterValue]);

  // Auto-close import progress modal and show toast when done
  useEffect(() => {
    if (!importProgress || importProgress.phase !== "done") return;
    const timer = setTimeout(() => {
      if (importProgress.error) {
        showToast("error", importProgress.error);
      } else if (importProgress.current > 0) {
        showToast("success", `Imported ${importProgress.current} record(s) successfully.`);
      } else if (importProgress.total > 0) {
        showToast("info", "No new records added (all rows were empty or invalid).");
      } else {
        showToast("info", "No records to import.");
      }
      setImportProgress(null);
    }, 1500);
    return () => clearTimeout(timer);
  }, [importProgress, showToast]);

  const sectionFilterKey = useMemo(
    () => resolveSectionFilterKey(section.id, section.columns),
    [section.id, section.columns]
  );
  /** Option B: full fetch when search or filter is active so search/filter work on full set */
  const useFullFetch = Boolean(
    searchDebounced.trim() || (sectionFilterKey != null && filterValueDebounced.trim())
  );
  const filterOptions = useMemo(() => {
    if (!sectionFilterKey) return [];
    const builtInKey = SECTION_FILTER_COLUMN[section.id];
    const altKey = builtInKey && builtInKey !== sectionFilterKey ? builtInKey : null;
    const seen = new Set<string>();
    const out: { value: string; label: string }[] = [{ value: "", label: "All" }];
    for (const r of records) {
      const raw = String((r[sectionFilterKey] ?? (altKey ? r[altKey] : undefined)) ?? "").trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: raw, label: raw });
    }
    return out.sort((a, b) => (a.value === "" ? -1 : b.value === "" ? 1 : a.label.localeCompare(b.label, undefined, { sensitivity: "base" })));
  }, [records, sectionFilterKey, section.id]);

  const filtered = useMemo(() => {
    if (!useFullFetch) return records;
    let list = records;
    const s = searchDebounced.trim().toLowerCase();
    if (s) {
      if (searchInColumn && section.columns.some((c) => c.key === searchInColumn)) {
        list = list.filter((r) =>
          String(r[searchInColumn] ?? "").toLowerCase().startsWith(s)
        );
      } else {
        list = list.filter((r) =>
          section.columns.some(
            (col) =>
              String(r[col.key] ?? "").toLowerCase().includes(s)
          )
        );
      }
    }
    if (filterColumn && filterValueDebounced.trim()) {
      const v = filterValueDebounced.trim().toLowerCase();
      const builtInKey = sectionFilterKey ? SECTION_FILTER_COLUMN[section.id] : null;
      const altKey = builtInKey && builtInKey !== filterColumn ? builtInKey : null;
      list = list.filter((r) => {
        const cellVal = r[filterColumn] ?? (altKey ? r[altKey] : undefined);
        const cell = String(cellVal ?? "").trim().toLowerCase();
        return sectionFilterKey ? cell === v : cell.includes(v);
      });
    }
    return list;
  }, [useFullFetch, records, searchDebounced, searchInColumn, filterColumn, filterValueDebounced, section.columns, sectionFilterKey]);

  const sortedList = useMemo(() => {
    if (!effectiveSortKey || filtered.length === 0) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = String(a[effectiveSortKey] ?? "").toLowerCase();
      const vb = String(b[effectiveSortKey] ?? "").toLowerCase();
      const cmp = va.localeCompare(vb, undefined, { numeric: true });
      return cmp * dir;
    });
  }, [filtered, effectiveSortKey, sortDir]);

  const selectedRecords = useMemo(
    () => sortedList.filter((r) => r.id && selectedRowIds.has(r.id)),
    [sortedList, selectedRowIds]
  );
  const selectedRecord = selectedRecords.length === 1 ? selectedRecords[0]! : null;

  const [page, setPage] = useState(1);
  const totalPages = useFullFetch
    ? Math.max(1, Math.ceil(sortedList.length / PAGE_SIZE))
    : Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageRows = useMemo(
    () =>
      useFullFetch
        ? sortedList.slice(pageStart, pageStart + PAGE_SIZE)
        : sortedList,
    [useFullFetch, sortedList, pageStart]
  );
  const showPagination = useFullFetch
    ? sortedList.length > PAGE_SIZE
    : totalCount > PAGE_SIZE;

  useEffect(() => {
    if (useFullFetch) {
      // Don't set loading true when switching to full fetch – keeps search input mounted so cursor/focus isn't lost
      const unsub = subscribeRecords(section.id, (list) => {
        setRecords(list);
        setLoading(false);
      });
      return () => unsub();
    }
    setLoading(true);
    const cursor = pageCursors[page] ?? (page === 1 ? null : undefined);
    if (cursor === undefined) {
      setLoading(false);
      return () => {};
    }
    if (page === 1) {
      getSectionRecordCount(section.id).then((n) => setTotalCount(n)).catch(() => setTotalCount(0));
    }
    const unsub = subscribeRecordsPaginated(
      section.id,
      { limit: PAGE_SIZE, startAfterDoc: cursor },
      (list, lastDoc) => {
        setRecords(list);
        setPageCursors((prev) => ({ ...prev, [page + 1]: lastDoc }));
        setLoading(false);
      }
    );
    return () => unsub();
  }, [section.id, useFullFetch, page]);

  useEffect(() => {
    if (!useFullFetch) {
      setPage(1);
      setPageCursors({ 1: null });
    }
  }, [useFullFetch]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el || pageRows.length === 0) return;
    const some = pageRows.some((r) => r.id && selectedRowIds.has(r.id));
    const all = pageRows.every((r) => r.id && selectedRowIds.has(r.id));
    el.indeterminate = some && !all;
  }, [selectedRowIds, pageRows]);

  const handleSave = async (
    data: Record<string, string | number | undefined>,
    existingRecordId?: string
  ) => {
    setSaving(true);
    try {
      const payload = { sectionId: section.id, ...data };
      if (existingRecordId) {
        await updateRecord(section.id, existingRecordId, data);
        showToast("success", "Record updated.");
      } else if (modalRecord === "new") {
        await addRecord(payload);
        showToast("success", "Record added.");
      } else if (modalRecord && modalRecord.id) {
        await updateRecord(section.id, modalRecord.id, data);
        showToast("success", "Record updated.");
      }
      setModalRecord(null);
      setModalAddMode(null);
      setSelectedRowIds(new Set());
    } catch (e) {
      showToast("error", "Save failed. Try again.");
      /* Modal stays open so user can retry */
    } finally {
      setSaving(false);
    }
  };

  const isAssignSection = ASSIGN_SECTION_IDS.includes(section.id as (typeof ASSIGN_SECTION_IDS)[number]);

  const handleRemoveFromList = useCallback(
    async (id: string) => {
      await deleteRecord(section.id, id);
      showToast("success", "Removed from list.");
    },
    [section.id]
  );

  const handleEditFromList = useCallback((rec: StoredRecord) => {
    setModalRecord(rec);
    setModalAddMode(null);
  }, []);

  const handleUnassign = useCallback(
    async (id: string) => {
      const field = UNASSIGN_ONLY_SECTIONS[section.id];
      if (!field) return;
      await updateRecord(section.id, id, { [field]: "" });
      showToast("success", "Assignment removed.");
    },
    [section.id]
  );

  const handleBulkDeleteClick = () => {
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;
    setDeleteTarget({ ids });
  };

  const unassignOnly = UNASSIGN_ONLY_SECTIONS[section.id] != null;
  const assignmentField = UNASSIGN_ONLY_SECTIONS[section.id];

  const handleBulkEditSave = async (updates: Record<string, string | number | undefined>) => {
    setSaving(true);
    try {
      for (const r of selectedRecords) {
        if (r.id) await updateRecord(section.id, r.id, updates);
      }
      showToast("success", `${selectedRecords.length} row(s) updated.`);
      setBulkEditOpen(false);
      setSelectedRowIds(new Set());
    } catch (e) {
      showToast("error", "Bulk update failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.key === "Escape") setSelectedRowIds(new Set());
      if (canEdit && e.key === "Enter" && selectedRecord && !modalRecord && !bulkEditOpen) {
        setModalRecord(selectedRecord);
        setModalAddMode(null);
      }
      if (canEdit && e.key === "Delete" && selectedRowIds.size > 0 && !modalRecord && !bulkEditOpen) handleBulkDeleteClick();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, selectedRecord, selectedRowIds.size, modalRecord, bulkEditOpen]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (unassignOnly && assignmentField) {
        for (const id of deleteTarget.ids) {
          await updateRecord(section.id, id, { [assignmentField]: "" });
        }
        showToast(
          "success",
          deleteTarget.ids.length === 1
            ? "Assignment removed. Asset is available again."
            : `${deleteTarget.ids.length} assignments removed. Assets are available again.`
        );
      } else {
        for (const id of deleteTarget.ids) {
          await deleteRecord(section.id, id);
        }
        showToast(
          "success",
          deleteTarget.ids.length === 1 ? "Record deleted." : `${deleteTarget.ids.length} records deleted.`
        );
      }
      setDeleteTarget(null);
      setSelectedRowIds(new Set());
    } catch (e) {
      showToast("error", "Delete failed. Try again.");
      /* Dialog stays open so user can retry */
    } finally {
      setDeleting(false);
    }
  };

  const handleImportProgress = useCallback((progress: ImportProgress) => {
    setImportProgress(progress);
  }, []);

  const importInProgress =
    importProgress != null &&
    importProgress.phase !== "idle" &&
    importProgress.phase !== "done";

  if (loading) {
    return <div className="loading-screen">Loading…</div>;
  }

  return (
    <div className="card">
      <div className="toolbar-wrap">
        <div className="toolbar">
          <IconDropdown
            icon={<IconSearchColumn />}
            options={[
              { value: "", label: "All columns" },
              ...section.columns.map((col) => ({ value: col.key, label: `Search by ${col.label}` })),
            ]}
            value={searchInColumn}
            onChange={setSearchInColumn}
            tooltipLabel="Search in column (or all)"
            aria-label="Search in column"
          />
          <input
            type="search"
            className="search-input"
            placeholder={
              searchInColumn
                ? `Starts with… (in ${section.columns.find((c) => c.key === searchInColumn)?.label ?? ""})`
                : "Search in this section…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {sectionFilterKey ? (
            <IconDropdown
              icon={<IconFilter />}
              options={filterOptions}
              value={filterColumn === sectionFilterKey ? filterValue : ""}
              onChange={(val) => {
                setFilterColumn(sectionFilterKey);
                setFilterValue(val);
              }}
              tooltipLabel={`Filter by ${section.columns.find((c) => c.key === sectionFilterKey)?.label ?? sectionFilterKey}`}
              aria-label={`Filter by ${section.columns.find((c) => c.key === sectionFilterKey)?.label ?? sectionFilterKey}`}
            />
          ) : (
            <>
              <IconDropdown
                icon={<IconFilter />}
                options={[
                  { value: "", label: "Filter" },
                  ...section.columns.map((col) => ({ value: col.key, label: col.label })),
                ]}
                value={filterColumn}
                onChange={setFilterColumn}
                tooltipLabel="Filter by column"
                aria-label="Filter by column"
              />
              {filterColumn && (
                <input
                  type="text"
                  className="search-input filter-value-input"
                  placeholder={`Filter ${section.columns.find((c) => c.key === filterColumn)?.label}…`}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                />
              )}
            </>
          )}
          <IconDropdown
            icon={<IconColumns />}
            options={section.columns.map((col) => ({
              value: col.key,
              label: (visibleColumns.includes(col.key) ? "✓ " : "○ ") + col.label,
            }))}
            value=""
            onChange={(key) => toggleColumnVisibility(key)}
            tooltipLabel="Show or hide columns"
            aria-label="Column visibility"
          />
          <ImportExport
            section={section}
            records={selectedRowIds.size > 0 ? selectedRecords : sortedList}
            onImportDone={() => {}}
            onImportProgress={handleImportProgress}
            importInProgress={importInProgress}
            canImport={canEdit}
          />
          {canEdit && isAssignSection ? (
            <Tooltip
              label={
                section.id === "allMonitors"
                  ? "Manage monitors: list, add, edit, assign"
                  : "Manage MAC addresses: list, add, edit, assign"
              }
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setModalRecord("new");
                  setModalAddMode("add-asset");
                  setSelectedRowIds(new Set());
                }}
                aria-label={
                  section.id === "allMonitors"
                    ? "Manage monitors"
                    : "Manage MAC addresses"
                }
              >
                <span className="btn-add-label">
                  {section.id === "allMonitors"
                    ? "Manage monitors"
                    : "Manage MAC addresses"}
                </span>
              </button>
            </Tooltip>
          ) : canEdit ? (
            <Tooltip label="Add record">
              <button
                type="button"
                className="btn btn-primary btn-icon"
                onClick={() => {
                  setModalRecord("new");
                  setModalAddMode(null);
                  setSelectedRowIds(new Set());
                }}
                aria-label="Add record"
              >
                <IconAdd />
              </button>
            </Tooltip>
          ) : null}
          {canEdit && selectedRowIds.size > 0 && (
            <span className="toolbar-selection-actions">
              {selectedRecord && (
                <>
                  <Tooltip label="Edit selected (Enter)">
                    <button
                      type="button"
                      className="btn btn-primary btn-icon"
                      onClick={() => {
                        setModalRecord(selectedRecord);
                        setModalAddMode(null);
                      }}
                      aria-label="Edit selected"
                    >
                      <IconEdit />
                    </button>
                  </Tooltip>
                  <Tooltip label="Duplicate selected">
                    <button
                      type="button"
                      className="btn btn-secondary btn-icon"
                      onClick={() => {
                        const { id: _id, ...rest } = selectedRecord;
                        setModalRecord({ ...rest, sectionId: section.id } as StoredRecord);
                        setModalAddMode(null);
                      }}
                      aria-label="Duplicate selected"
                    >
                      <IconDuplicate />
                    </button>
                  </Tooltip>
                </>
              )}
              {selectedRowIds.size > 1 && (
                <Tooltip label="Bulk edit selected">
                  <button
                    type="button"
                    className="btn btn-secondary btn-icon"
                    onClick={() => setBulkEditOpen(true)}
                    aria-label="Bulk edit selected"
                  >
                    <IconEdit />
                  </button>
                </Tooltip>
              )}
              <Tooltip
                label={
                  unassignOnly
                    ? `Remove assignment (${selectedRowIds.size})`
                    : `Delete selected (${selectedRowIds.size})`
                }
              >
                <button
                  type="button"
                  className="btn btn-danger btn-icon"
                  onClick={handleBulkDeleteClick}
                  aria-label={
                    unassignOnly
                      ? `Remove assignment (${selectedRowIds.size})`
                      : `Delete selected (${selectedRowIds.size})`
                  }
                >
                  <IconDelete />
                </button>
              </Tooltip>
              <Tooltip label="Clear selection">
                <button
                  type="button"
                  className="btn btn-secondary btn-icon"
                  onClick={() => setSelectedRowIds(new Set())}
                  aria-label="Clear selection"
                >
                  <IconClearSelection />
                </button>
              </Tooltip>
            </span>
          )}
        </div>
        {selectedRowIds.size > 0 && (
          <p className="selection-hint">
            <span className="selection-label">{selectedRowIds.size} row{selectedRowIds.size !== 1 ? "s" : ""} selected</span>
            {selectedRecord && section.columns[0] && (
              <span className="selection-preview">
                — {String(selectedRecord[section.columns[0].key] ?? "").slice(0, 40)}
                {String(selectedRecord[section.columns[0].key] ?? "").length > 40 ? "…" : ""}
              </span>
            )}
          </p>
        )}
        {!loading && (
          <p className="record-count">
            {useFullFetch
              ? filtered.length === records.length
                ? `${records.length} record${records.length !== 1 ? "s" : ""}`
                : `Showing ${sortedList.length} of ${records.length} records`
              : `Showing ${records.length} of ${totalCount} record${totalCount !== 1 ? "s" : ""}`}
            {effectiveSortKey && (
              <span className="sort-hint"> · Sorted by {section.columns.find((c) => c.key === effectiveSortKey)?.label} ({sortDir === "asc" ? "A→Z" : "Z→A"})</span>
            )}
          </p>
        )}
      </div>
      <div className="table-container">
        <div className="table-wrap">
        {sortedList.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">
              {records.length === 0
                ? "No records yet"
                : "No matching records"}
            </p>
            <p className="empty-state-hint">
              {records.length === 0
                ? "Add a record or import from CSV/Excel to get started."
                : "Try a different search or clear filters."}
            </p>
            {records.length === 0 && (
              <p className="empty-state-cta">
                {canEdit ? (
                  <>Use <kbd>Import</kbd> or <kbd>+ Add record</kbd> in the toolbar above.</>
                ) : (
                  "You have view-only access. Ask an admin to add records."
                )}
              </p>
            )}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th className="th-select" title="Select row">
                  {pageRows.length > 0 ? (
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      checked={pageRows.every((r) => r.id && selectedRowIds.has(r.id))}
                      onChange={(e) => selectAllOnPage(e.target.checked)}
                      aria-label="Select all on page"
                    />
                  ) : (
                    <span className="sr-only">Select</span>
                  )}
                </th>
                <th style={{ width: "40px" }}>#</th>
                {displayColumns.map((col) => (
                  <th
                    key={col.key}
                    className={effectiveSortKey === col.key ? "sortable sortable-active" : "sortable"}
                    onClick={() => handleSort(col.key)}
                    title={`Sort by ${col.label} ${effectiveSortKey === col.key && sortDir === "asc" ? "(descending)" : "(ascending)"}`}
                  >
                    <span className="th-content">
                      {col.label}
                      {effectiveSortKey === col.key && (
                        <span className="sort-arrow" aria-hidden>{sortDir === "asc" ? " ↑" : " ↓"}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, idx) => {
                const globalIdx = pageStart + idx;
                const isSelected = row.id ? selectedRowIds.has(row.id) : false;
                return (
                <tr
                  key={row.id ?? globalIdx}
                  className={isSelected ? "row-selected" : ""}
                  onClick={() => toggleSelection(row.id)}
                >
                  <td className="td-select" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(row.id)}
                      aria-label={`Select row ${globalIdx + 1}`}
                    />
                  </td>
                  <td>{globalIdx + 1}</td>
                  {displayColumns.map((col) => (
                    <td key={col.key}>
                      {isDateColumnKey(col.key)
                        ? formatDateForDisplay(row[col.key])
                        : String(row[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
        {showPagination && (
          <div className="pagination-bar pagination-bar-sticky">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {page} of {totalPages} · {useFullFetch ? sortedList.length : records.length} records
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        )}
        </div>
      </div>

      {modalRecord && (
        <RecordModal
          section={section}
          record={modalRecord === "new" ? null : modalRecord}
          addMode={modalRecord === "new" ? modalAddMode : null}
          sectionRecords={records}
          onClose={() => {
            setModalRecord(null);
            setModalAddMode(null);
          }}
          onSave={handleSave}
          onRemoveFromList={unassignOnly ? handleRemoveFromList : undefined}
          onEditFromList={isAssignSection ? handleEditFromList : undefined}
          onUnassign={unassignOnly ? handleUnassign : undefined}
          saving={saving}
        />
      )}

      {bulkEditOpen && selectedRecords.length > 0 && (
        <BulkEditModal
          section={section}
          selectedRecords={selectedRecords}
          onClose={() => setBulkEditOpen(false)}
          onSave={handleBulkEditSave}
          saving={saving}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={
          deleteTarget
            ? unassignOnly
              ? deleteTarget.ids.length > 1
                ? "Remove assignments"
                : "Remove assignment"
              : deleteTarget.ids.length > 1
                ? "Delete records"
                : "Delete record"
            : ""
        }
        message={
          deleteTarget
            ? unassignOnly
              ? deleteTarget.ids.length > 1
                ? `Remove assignment from ${deleteTarget.ids.length} items? The assets will stay in the list and become available again.`
                : "Remove this assignment? The asset will stay in the list and become available again."
              : deleteTarget.ids.length > 1
                ? `Delete ${deleteTarget.ids.length} records? This cannot be undone.`
                : "Are you sure you want to delete this record? This cannot be undone."
            : ""
        }
        confirmLabel={unassignOnly ? "Remove assignment" : "Delete"}
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />


      {importProgress && (
        <ImportProgressModal
          open={importProgress.phase !== "idle"}
          phase={importProgress.phase as "reading" | "importing" | "done"}
          current={importProgress.current}
          total={importProgress.total}
          fileName={importProgress.fileName}
          error={importProgress.error}
        />
      )}
    </div>
  );
}
