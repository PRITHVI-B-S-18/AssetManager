import { useState } from "react";
import type { SectionConfig, StoredRecord } from "../types/sections";

interface BulkEditModalProps {
  section: SectionConfig;
  selectedRecords: StoredRecord[];
  onClose: () => void;
  onSave: (updates: Record<string, string | number | undefined>) => Promise<void>;
  saving: boolean;
}

export function BulkEditModal({
  section,
  selectedRecords,
  onClose,
  onSave,
  saving,
}: BulkEditModalProps) {
  const [columnKey, setColumnKey] = useState(section.columns[0]?.key ?? "");
  const [value, setValue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!columnKey.trim()) return;
    const updates: Record<string, string | number | undefined> = {
      [columnKey]: value.trim() || undefined,
    };
    await onSave(updates);
    onClose();
  };

  const col = section.columns.find((c) => c.key === columnKey);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Bulk edit ({selectedRecords.length} rows)</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ marginBottom: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Set one field for all selected records. Other fields are unchanged.
            </p>
            <div className="input-group">
              <label htmlFor="bulk-edit-column">Field</label>
              <select
                id="bulk-edit-column"
                value={columnKey}
                onChange={(e) => setColumnKey(e.target.value)}
                required
              >
                {section.columns.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="bulk-edit-value">{col?.label ?? "Value"}</label>
              <input
                id="bulk-edit-value"
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`New value for ${col?.label ?? columnKey}`}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Updating…" : `Update ${selectedRecords.length} rows`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
