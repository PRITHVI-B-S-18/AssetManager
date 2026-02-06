import { useState, useEffect, useMemo, useRef } from "react";
import type { SectionConfig, StoredRecord } from "../types/sections";
import { isDateColumnKey, parseDateToInputValue, formatInputDateToStore } from "../utils/dateFormat";

/** Sections that show "assign available" dropdown. For MAC sections: only MAC address without username is available. */
const ASSIGN_AVAILABLE_SECTIONS: Record<
  string,
  {
    availabilityKey: string;
    alsoAvailableWhenEmptyKey?: string;
    /** When true: available only when macAddress has value AND userName is empty (MAC without user). */
    macAddressNoUserOnly?: boolean;
    labelKey: string;
    prefillKeys: string[];
    dropdownLabel?: string;
  }
> = {
  allMonitors: {
    availabilityKey: "username",
    labelKey: "assetId",
    prefillKeys: ["assetId", "assetName"],
    dropdownLabel: "Assign available monitor",
  },
  windowsMacAddress: {
    availabilityKey: "macAddress",
    alsoAvailableWhenEmptyKey: "userName",
    macAddressNoUserOnly: true,
    labelKey: "serialNumber",
    prefillKeys: ["serialNumber", "model", "macAddress"],
    dropdownLabel: "Assign available MAC address",
  },
  macMacAddress: {
    availabilityKey: "macAddress",
    alsoAvailableWhenEmptyKey: "userName",
    macAddressNoUserOnly: true,
    labelKey: "productSerialNumber",
    prefillKeys: ["productSerialNumber", "laptopType", "macAddress"],
    dropdownLabel: "Assign available MAC address",
  },
};

const REMOVE_FROM_LIST_SECTIONS = ["allMonitors", "windowsMacAddress", "macMacAddress"];

interface RecordModalProps {
  section: SectionConfig;
  record: StoredRecord | null;
  /** When adding: 'add-asset' = unified list + add form; 'assign' = assign user to existing */
  addMode?: "add-asset" | "assign" | null;
  sectionRecords?: StoredRecord[];
  onClose: () => void;
  onSave: (data: Record<string, string | number | undefined>, existingRecordId?: string) => void;
  onRemoveFromList?: (id: string) => void | Promise<void>;
  onEditFromList?: (record: StoredRecord) => void;
  onUnassign?: (id: string) => void | Promise<void>;
  saving?: boolean;
}

export function RecordModal({
  section,
  record,
  addMode = null,
  sectionRecords = [],
  onClose,
  onSave,
  onRemoveFromList,
  onEditFromList,
  onUnassign,
  saving = false,
}: RecordModalProps) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [selectedAvailableId, setSelectedAvailableId] = useState<string>("");
  const [removing, setRemoving] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [listSortKey, setListSortKey] = useState<string | null>(null);
  const [listSortDir, setListSortDir] = useState<"asc" | "desc">("asc");
  const [validationError, setValidationError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
    );
    const first = focusable[0];
    if (first) first.focus();
  }, [section.id, record?.id]);

  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
        )
      ).filter((n) => n.tabIndex !== -1);
      if (focusable.length === 0) return;
      const last = focusable[focusable.length - 1]!;
      const first = focusable[0]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, []);

  const canRemoveFromList =
    record?.id &&
    REMOVE_FROM_LIST_SECTIONS.includes(section.id) &&
    typeof onRemoveFromList === "function";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, saving]);

  const assignConfig = ASSIGN_AVAILABLE_SECTIONS[section.id];

  const listColumns = useMemo(() => {
    if (section.id === "allMonitors")
      return [
        { key: "assetId", label: "Asset Id" },
        { key: "assetName", label: "Asset Name" },
      ];
    if (section.id === "windowsMacAddress")
      return [
        { key: "serialNumber", label: "Serial Number" },
        { key: "model", label: "Model" },
        { key: "macAddress", label: "Mac Address" },
      ];
    if (section.id === "macMacAddress")
      return [
        { key: "productSerialNumber", label: "Product Serial" },
        { key: "laptopType", label: "Laptop Type" },
        { key: "macAddress", label: "Mac Address" },
      ];
    return [];
  }, [section.id]);

  const statusUserKey = section.id === "allMonitors" ? "username" : "userName";
  const getStatusSortValue = (r: StoredRecord) =>
    String(r[statusUserKey] ?? "").trim() !== "" ? "assigned" : "not assigned";

  const filteredAndSortedList = useMemo(() => {
    if (!listColumns.length) return sectionRecords;
    const search = listSearch.trim().toLowerCase();
    let list = sectionRecords;
    if (search) {
      list = list.filter((r) =>
        listColumns.some((col) =>
          String(r[col.key as keyof StoredRecord] ?? "").toLowerCase().includes(search)
        )
      );
    }
    if (listSortKey) {
      list = [...list].sort((a, b) => {
        const va =
          listSortKey === "status"
            ? getStatusSortValue(a)
            : String(a[listSortKey] ?? "").toLowerCase();
        const vb =
          listSortKey === "status"
            ? getStatusSortValue(b)
            : String(b[listSortKey] ?? "").toLowerCase();
        const cmp = va.localeCompare(vb);
        return listSortDir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [sectionRecords, listColumns, listSearch, listSortKey, listSortDir, statusUserKey]);

  const handleListSort = (key: string) => {
    setListSortKey((prev) => (prev === key ? prev : key));
    setListSortDir((prev) => (listSortKey === key && prev === "asc" ? "desc" : "asc"));
  };

  const availableList = useMemo(() => {
    if (!assignConfig || !sectionRecords.length) return [];
    const { availabilityKey, alsoAvailableWhenEmptyKey, macAddressNoUserOnly } = assignConfig;
    return sectionRecords.filter((r) => {
      const isCurrent = record != null && r.id === record.id;
      if (isCurrent) return true;
      const macFilled = String(r[availabilityKey] ?? "").trim() !== "";
      const userEmpty =
        alsoAvailableWhenEmptyKey != null
          ? String(r[alsoAvailableWhenEmptyKey] ?? "").trim() === ""
          : false;
      if (macAddressNoUserOnly) {
        return macFilled && userEmpty;
      }
      const mainEmpty = !macFilled;
      return mainEmpty || userEmpty;
    });
  }, [assignConfig, sectionRecords, record?.id]);

  useEffect(() => {
    const initial: Record<string, string> = {};
    section.columns.forEach((col) => {
      const raw = record ? record[col.key] : undefined;
      initial[col.key] = isDateColumnKey(col.key)
        ? parseDateToInputValue(raw)
        : (record ? String(record[col.key] ?? "") : "");
    });
    setForm(initial);
    setSelectedAvailableId(record?.id ?? "");
  }, [section.columns, record]);

  const onSelectAvailable = (recordId: string) => {
    setSelectedAvailableId(recordId);
    if (!recordId) return;
    const r = availableList.find((x) => x.id === recordId);
    if (!r) return;
    const config = ASSIGN_AVAILABLE_SECTIONS[section.id];
    if (!config) return;
    setForm((prev) => {
      const next = { ...prev };
      config.prefillKeys.forEach((key) => {
        const v = r[key];
        next[key] = v != null ? String(v) : "";
      });
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const data: Record<string, string | number | undefined> = {};
    section.columns.forEach((col) => {
      let v = form[col.key]?.trim() ?? "";
      if (isDateColumnKey(col.key) && v) v = formatInputDateToStore(v);
      data[col.key] = v === "" ? undefined : v;
    });

    const firstCol = section.columns[0];
    if (firstCol) {
      const firstVal = (data[firstCol.key] ?? "").toString().trim();
      if (!firstVal) {
        setValidationError(`"${firstCol.label}" is required.`);
        return;
      }
    }

    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const col of section.columns) {
      const val = data[col.key];
      if (col.key.toLowerCase().includes("email") && val && typeof val === "string") {
        if (!emailLike.test(val)) {
          setValidationError(`"${col.label}" must be a valid email address.`);
          return;
        }
      }
    }

    const existingId =
      addMode === "add-asset" && selectedAvailableId ? selectedAvailableId : undefined;
    onSave(data, existingId);
  };

  const handleRemoveFromList = async () => {
    if (!record?.id || !onRemoveFromList) return;
    setRemoving(true);
    try {
      await onRemoveFromList(record.id);
      onClose();
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className={`modal ${addMode === "add-asset" ? "modal-wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-modal-title"
      >
        <div className="modal-header">
          <h3 id="record-modal-title">
            {record
              ? "Edit record"
              : addMode === "add-asset"
                ? section.id === "allMonitors"
                  ? "Manage monitors"
                  : "Manage MAC addresses"
                : addMode === "assign"
                  ? "Assign user to existing"
                  : "Add record"}{" "}
            – {section.name}
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {validationError && (
            <div className="modal-validation-error" role="alert">
              {validationError}
            </div>
          )}
          <div className="modal-body">
            {addMode === "add-asset" && sectionRecords.length >= 0 && (
              <div className="add-asset-two-col">
                <div className="add-asset-left">
                  {assignConfig && (
                    <div className="input-group assign-available-group">
                      <label htmlFor="assign-available-in-list">
                        {assignConfig.dropdownLabel ?? "Assign to existing"}
                      </label>
                      <select
                        id="assign-available-in-list"
                        className="assign-available-select"
                        value={selectedAvailableId}
                        onChange={(e) => onSelectAvailable(e.target.value)}
                      >
                        <option value="">— Select to assign user (optional) —</option>
                        {availableList.map((r) => {
                          const isMacSection =
                            section.id === "windowsMacAddress" || section.id === "macMacAddress";
                          const label = isMacSection
                            ? String(r.macAddress ?? "").trim() || "Unnamed"
                            : (() => {
                                const primary = String(r[assignConfig.labelKey] ?? "").trim();
                                const name =
                                  section.id === "allMonitors"
                                    ? String(r.assetName ?? "").trim()
                                    : "";
                                return primary && name
                                  ? `${primary} – ${name}`
                                  : primary || name || "Unnamed";
                              })();
                          return (
                            <option key={r.id} value={r.id ?? ""}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                      {availableList.length === 0 && (
                        <p className="assign-available-hint">No unassigned items.</p>
                      )}
                    </div>
                  )}
                  <div className="add-asset-list-header">
                    <h4 className="add-asset-list-title">
                      {section.id === "allMonitors" ? "All monitors" : "All MAC addresses"}
                    </h4>
                    {listColumns.length > 0 && (
                      <input
                        type="search"
                        placeholder="Search list…"
                        value={listSearch}
                        onChange={(e) => setListSearch(e.target.value)}
                        className="add-asset-list-search-input"
                        aria-label="Search list"
                      />
                    )}
                  </div>
                  <div className="add-asset-list-scroll">
                    <table className="add-asset-list-table">
                      <thead>
                        <tr>
                          {listColumns.map((col) => (
                            <th
                              key={col.key}
                              className="add-asset-list-th-sortable"
                              onClick={() => handleListSort(col.key)}
                              title={`Sort by ${col.label}`}
                            >
                              {col.label}
                              {listSortKey === col.key && (
                                <span className="add-asset-list-sort-icon" aria-hidden>
                                  {listSortDir === "asc" ? " ↑" : " ↓"}
                                </span>
                              )}
                            </th>
                          ))}
                          <th
                            className="add-asset-list-th-sortable"
                            onClick={() => handleListSort("status")}
                            title="Sort by Status"
                          >
                            Status
                            {listSortKey === "status" && (
                              <span className="add-asset-list-sort-icon" aria-hidden>
                                {listSortDir === "asc" ? " ↑" : " ↓"}
                              </span>
                            )}
                          </th>
                          <th className="add-asset-actions-th">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedList.map((r) => {
                          const userKey =
                            section.id === "allMonitors" ? "username" : "userName";
                          const assigned = String(r[userKey] ?? "").trim() !== "";
                          return (
                            <tr key={r.id}>
                              {section.id === "allMonitors" ? (
                                <>
                                  <td>{String(r.assetId ?? "")}</td>
                                  <td>{String(r.assetName ?? "")}</td>
                                </>
                              ) : section.id === "windowsMacAddress" ? (
                                <>
                                  <td>{String(r.serialNumber ?? "")}</td>
                                  <td>{String(r.model ?? "")}</td>
                                  <td>{String(r.macAddress ?? "")}</td>
                                </>
                              ) : (
                                <>
                                  <td>{String(r.productSerialNumber ?? "")}</td>
                                  <td>{String(r.laptopType ?? "")}</td>
                                  <td>{String(r.macAddress ?? "")}</td>
                                </>
                              )}
                              <td>
                                <span
                                  className={
                                    assigned
                                      ? "add-asset-status assigned"
                                      : "add-asset-status not-assigned"
                                  }
                                >
                                  {assigned ? "Assigned" : "Not assigned"}
                                </span>
                              </td>
                              <td className="add-asset-actions-td">
                                {typeof onEditFromList === "function" && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-secondary add-asset-btn"
                                    onClick={() => onEditFromList(r)}
                                    title="Edit / Assign"
                                  >
                                    Edit
                                  </button>
                                )}
                                {assigned && typeof onUnassign === "function" && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-secondary add-asset-btn"
                                    onClick={() => r.id && onUnassign(r.id)}
                                    title="Remove assignment"
                                  >
                                    Unassign
                                  </button>
                                )}
                                {typeof onRemoveFromList === "function" && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger add-asset-btn"
                                    onClick={() => r.id && onRemoveFromList(r.id)}
                                    title="Remove from list"
                                  >
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {sectionRecords.length === 0 && (
                    <p className="add-asset-list-empty">No items yet. Add one on the right.</p>
                  )}
                  {sectionRecords.length > 0 && filteredAndSortedList.length === 0 && (
                    <p className="add-asset-list-empty">No matches for your search.</p>
                  )}
                </div>
                <div className="add-asset-right">
                  <h4 className="add-asset-form-title">
                    {section.id === "allMonitors"
                      ? "Add new monitor"
                      : "Add new MAC address"}
                  </h4>
                  {section.columns.map((col) => {
                    const isDateCol = isDateColumnKey(col.key);
                    return (
                      <div key={col.key} className="input-group">
                        <label htmlFor={`add-asset-${col.key}`}>{col.label}</label>
                        <input
                          id={`add-asset-${col.key}`}
                          type={isDateCol ? "date" : "text"}
                          value={form[col.key] ?? ""}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, [col.key]: e.target.value }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {assignConfig && addMode !== "add-asset" && (
              <div className="input-group assign-available-group">
                <label htmlFor="assign-available">
                  {assignConfig.dropdownLabel ?? "Assign available"}
                </label>
                <select
                  id="assign-available"
                  className="assign-available-select"
                  value={selectedAvailableId}
                  onChange={(e) => onSelectAvailable(e.target.value)}
                >
                  <option value="">— Select available (optional) —</option>
                  {availableList.map((r) => {
                    const isMacSection =
                      section.id === "windowsMacAddress" || section.id === "macMacAddress";
                    const label = isMacSection
                      ? String(r.macAddress ?? "").trim() || "Unnamed"
                      : (() => {
                          const primary = String(r[assignConfig.labelKey] ?? "").trim();
                          const name =
                            section.id === "allMonitors"
                              ? String(r.assetName ?? "").trim()
                              : "";
                          return primary && name
                            ? `${primary} – ${name}`
                            : primary || name || "Unnamed";
                        })();
                    return (
                      <option key={r.id} value={r.id ?? ""}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {availableList.length === 0 && (
                  <p className="assign-available-hint">No available items (all are assigned).</p>
                )}
              </div>
            )}
            {addMode !== "add-asset" &&
              section.columns.map((col) => {
                const isDateCol = isDateColumnKey(col.key);
                return (
                  <div key={col.key} className="input-group">
                    <label htmlFor={col.key}>{col.label}</label>
                    <input
                      id={col.key}
                      type={isDateCol ? "date" : "text"}
                      value={form[col.key] ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [col.key]: e.target.value }))
                      }
                    />
                  </div>
                );
              })}
          </div>
          <div className="modal-footer">
            {canRemoveFromList && (
              <button
                type="button"
                className="btn btn-danger modal-footer-remove"
                onClick={handleRemoveFromList}
                disabled={saving || removing}
              >
                {removing ? "Removing…" : "Remove from list"}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
