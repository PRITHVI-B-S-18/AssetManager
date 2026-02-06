import { useState, useEffect } from "react";
import type { SectionColumn } from "../types/sections";

interface SectionEditModalProps {
  section: { id: string; name: string; slug: string; columns: SectionColumn[]; isCustom?: boolean };
  onClose: () => void;
  onSave: (id: string, data: { name: string; slug: string; columns: SectionColumn[] }) => void;
  saving: boolean;
}

function keyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "") || "field";
}

export function SectionEditModal({ section, onClose, onSave, saving }: SectionEditModalProps) {
  const [name, setName] = useState(section.name);
  const [columns, setColumns] = useState<SectionColumn[]>(section.columns.map((c) => ({ ...c })));

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

  const addColumn = () => {
    setColumns((prev) => [...prev, { key: `column_${Date.now()}`, label: "New column" }]);
  };

  const removeColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, label: string) => {
    setColumns((prev) => {
      const next = [...prev];
      // Always derive key from label so key and label stay in sync (e.g. "Date" → "Emp ID" gives key emp_id, not date)
      next[index] = { ...next[index], label, key: keyFromLabel(label) };
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const slug = trimmedName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "section";
    const validColumns = columns.filter((c) => c.label.trim());
    if (validColumns.length === 0) return;
    const finalColumns = validColumns.map((c) => ({
      key: keyFromLabel(c.label),
      label: c.label.trim(),
    }));
    onSave(section.id, { name: trimmedName, slug, columns: finalColumns });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit section – {section.name}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label>Section name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Section name"
              />
            </div>
            <div className="input-group">
              <div className="columns-header">
                <label>Columns</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addColumn}>
                  + Add column
                </button>
              </div>
              <div className="columns-list">
                {columns.map((col, idx) => (
                  <div key={idx} className="column-row">
                    <input
                      type="text"
                      value={col.label}
                      onChange={(e) => updateColumn(idx, e.target.value)}
                      placeholder="Column label"
                      className="column-input"
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeColumn(idx)}
                      disabled={columns.length <= 1}
                      title="Remove column"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
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
