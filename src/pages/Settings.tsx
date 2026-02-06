import { useState } from "react";
import {
  addSection,
  updateSection,
  deleteSection,
} from "../services/firestore";
import type { SectionColumn } from "../types/sections";
import { useToast } from "../context/ToastContext";
import { useSectionsContext } from "../context/useSectionsContext";
import { useAuth } from "../context/AuthContext";
import { useCanEdit } from "../context/useCanEdit";
import { changePassword as doChangePassword } from "../services/auth";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SectionEditModal } from "../components/SectionEditModal";

type SectionItem = { id: string; name: string; slug: string; columns: SectionColumn[]; order: number; isCustom?: boolean };

export function Settings() {
  const { user } = useAuth();
  const canEdit = useCanEdit();
  const { sections, refreshSections } = useSectionsContext();
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionColumns, setNewSectionColumns] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editSection, setEditSection] = useState<SectionItem | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const { showToast } = useToast();

  const canChangePassword = user?.email != null;
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canChangePassword) return;
    const cur = currentPassword.trim();
    const newP = newPassword.trim();
    const conf = confirmPassword.trim();
    if (!cur || !newP || !conf) {
      showToast("error", "Fill in all password fields.");
      return;
    }
    if (newP.length < 6) {
      showToast("error", "New password must be at least 6 characters.");
      return;
    }
    if (newP !== conf) {
      showToast("error", "New password and confirmation do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      await doChangePassword(cur, newP);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("success", "Password changed successfully.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to change password.";
      showToast("error", msg.includes("wrong-password") || msg.includes("invalid-credential") ? "Current password is incorrect." : msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSectionName.trim();
    const columnLines = newSectionColumns
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!name || columnLines.length === 0) {
      showToast("error", "Enter section name and at least one column (label per line).");
      return;
    }
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const keyFromLabel = (label: string) =>
      label
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    const columns: SectionColumn[] = columnLines.map((label) => ({
      key: keyFromLabel(label),
      label,
    }));
    setSaving(true);
    try {
      await addSection({
        name,
        slug: slug || "custom",
        columns,
        order: sections.length,
        isCustom: true,
      });
      await refreshSections();
      setNewSectionName("");
      setNewSectionColumns("");
      showToast("success", "Section added. It will appear in the sidebar.");
    } catch (e) {
      showToast("error", "Failed to add section: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSectionClick = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const handleDeleteSectionConfirm = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteSection(deleteTarget.id);
      await refreshSections();
      showToast("success", "Section deleted.");
      setDeleteTarget(null);
    } catch (e) {
      showToast("error", "Failed to delete: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleEditSectionSave = async (
    id: string,
    data: { name: string; slug: string; columns: SectionColumn[] }
  ) => {
    setSaving(true);
    try {
      await updateSection(id, data);
      await refreshSections();
      showToast("success", "Section updated.");
      setEditSection(null);
    } catch (e) {
      showToast("error", "Failed to update section: " + (e instanceof Error ? e.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Settings" }]} />
        <h2>Settings</h2>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.35rem", fontSize: "0.95rem" }}>
          Add and manage custom sections.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {canChangePassword && (
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Change password</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Update your account password. You will need to enter your current password.
            </p>
            <form onSubmit={handleChangePassword}>
              <div className="input-group">
                <label htmlFor="settings-current-password">Current password</label>
                <input
                  id="settings-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  disabled={changingPassword}
                />
              </div>
              <div className="input-group">
                <label htmlFor="settings-new-password">New password</label>
                <input
                  id="settings-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={changingPassword}
                />
              </div>
              <div className="input-group">
                <label htmlFor="settings-confirm-password">Confirm new password</label>
                <input
                  id="settings-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={changingPassword}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={changingPassword}>
                {changingPassword ? "Updating…" : "Change password"}
              </button>
            </form>
          </div>
        )}

        {canEdit && (
        <>
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Add new section</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            Create a custom section with your own columns. Enter one column label per line.
          </p>
          <form onSubmit={handleAddSection}>
            <div className="input-group">
              <label>Section name</label>
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder="e.g. All Keyboards"
              />
            </div>
            <div className="input-group">
              <label>Column labels (one per line)</label>
              <textarea
                value={newSectionColumns}
                onChange={(e) => setNewSectionColumns(e.target.value)}
                rows={4}
                placeholder={"Asset ID\nModel\nUser\nDate"}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Adding…" : "Add section"}
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>All sections</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Edit name and columns for any section. Delete is only available for custom sections.
          </p>
          <ul className="sections-list">
            {sections.map((s) => (
              <li key={s.id} className="sections-list-item">
                <span className="section-name">{s.name}</span>
                {s.isCustom && (
                  <span className="badge badge-custom" style={{ marginRight: "0.5rem" }}>
                    Custom
                  </span>
                )}
                <span className="section-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditSection(s)}
                    disabled={saving}
                  >
                    Edit
                  </button>
                  {s.isCustom ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => handleDeleteSectionClick(s.id, s.name)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  ) : (
                    <span className="no-delete-hint" title="Built-in sections cannot be deleted">
                      —
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        </>
        )}
      </div>

      {editSection && (
        <SectionEditModal
          section={editSection}
          onClose={() => setEditSection(null)}
          onSave={handleEditSectionSave}
          saving={saving}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete section"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.name}" and all its data? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={saving}
        onConfirm={handleDeleteSectionConfirm}
        onCancel={() => !saving && setDeleteTarget(null)}
      />
    </>
  );
}
