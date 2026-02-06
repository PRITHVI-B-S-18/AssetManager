import { useState, useEffect, useRef, useCallback } from "react";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useToast } from "../context/ToastContext";
import { useCanEdit } from "../context/useCanEdit";
import { isSupabaseConfigured } from "../supabase";
import {
  listPoliciesAt,
  uploadPolicy,
  getPolicyPublicUrl,
  downloadPolicyBlob,
  deletePolicy,
  createFolder,
  deleteFolder,
  type PolicyFile,
} from "../services/policyStorage";

function formatBytes(bytes?: number): string {
  if (bytes == null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

/** Show original file name without the timestamp prefix (e.g. 1770295040544-name.pdf → name.pdf). */
function displayFileName(name: string): string {
  const match = name.match(/^\d+-(.+)$/);
  return match ? match[1]! : name;
}

export function Policies() {
  const { showToast } = useToast();
  const canEdit = useCanEdit();
  const [currentPath, setCurrentPath] = useState<string>("");
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<PolicyFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PolicyFile | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [createFolderLoading, setCreateFolderLoading] = useState(false);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const configured = isSupabaseConfigured();

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { folders: f, files: fl } = await listPoliciesAt(currentPath);
      setFolders(f);
      setFiles(fl);
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Failed to load");
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [configured, currentPath, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const pathSegments = currentPath ? currentPath.split("/").filter(Boolean) : [];

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !configured) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showToast("error", "Only PDF files are allowed");
      return;
    }
    setUploading(true);
    try {
      await uploadPolicy(file, currentPath || undefined);
      showToast("success", "PDF uploaded");
      await load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !configured) return;
    setCreateFolderLoading(true);
    try {
      await createFolder(currentPath, name);
      showToast("success", "Folder created");
      setNewFolderName("");
      setShowNewFolder(false);
      await load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreateFolderLoading(false);
    }
  };

  const handleView = (f: PolicyFile) => {
    const url = getPolicyPublicUrl(f.path);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async (f: PolicyFile) => {
    setDownloadingPath(f.path);
    try {
      const blob = await downloadPolicyBlob(f.path);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = displayFileName(f.name);
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("success", "Download started");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingPath(null);
    }
  };

  const handleBack = () => {
    if (pathSegments.length === 0) return;
    setCurrentPath(pathSegments.slice(0, -1).join("/"));
  };

  const handleDeleteFileConfirm = async () => {
    if (!deleteTarget || !configured) return;
    setDeleteLoading(true);
    try {
      await deletePolicy(deleteTarget.path);
      showToast("success", "File deleted");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteFolderConfirm = async () => {
    if (deleteFolderTarget == null || !configured) return;
    setDeleteLoading(true);
    try {
      await deleteFolder(deleteFolderTarget);
      showToast("success", "Folder deleted");
      setDeleteFolderTarget(null);
      await load();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  const navigateToFolder = (segment: string) => {
    setCurrentPath((p) => (p ? `${p}/${segment}` : segment));
  };

  if (!configured) {
    return (
      <>
        <div className="page-header">
          <Breadcrumbs items={[{ label: "Policies" }]} />
          <h2>Policies</h2>
        </div>
        <div className="card" style={{ padding: "1.5rem" }}>
          <p style={{ color: "var(--text-secondary)" }}>
            Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> and create a public bucket named{" "}
            <code>policies</code> in Supabase Storage.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
        <div style={{ flex: "1 1 auto" }}>
          <Breadcrumbs items={[{ label: "Policies" }]} />
          <h2>Policies</h2>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.35rem", fontSize: "0.95rem" }}>
            Create folders and upload PDFs. View, download, or delete.
          </p>
        </div>
        {canEdit && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              style={{ display: "none" }}
              aria-hidden
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Upload PDF"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowNewFolder(true)}
            >
              New folder
            </button>
          </>
        )}
      </div>

      {/* Location (read-only) and Back button */}
      <div className="card" style={{ padding: "0.75rem 1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        {pathSegments.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleBack}
            aria-label="Go back to previous folder"
          >
            ← Back
          </button>
        )}
        <span style={{ color: "var(--text-secondary)" }}>
          Location:{" "}
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
            {pathSegments.length === 0 ? "Root" : ["Root", ...pathSegments].join(" / ")}
          </span>
        </span>
      </div>

      {/* New folder inline form */}
      {showNewFolder && canEdit && (
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            className="input"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            style={{ maxWidth: "240px" }}
            autoFocus
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || createFolderLoading}
          >
            {createFolderLoading ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
          >
            Cancel
          </button>
        </div>
      )}

      <div className="card" style={{ overflow: "auto" }}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading…
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            This folder is empty. {canEdit && "Create a folder or upload a PDF."}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th style={{ width: "1%", whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {folders.map((folderName) => {
                const fullPath = currentPath ? `${currentPath}/${folderName}` : folderName;
                return (
                  <tr key={fullPath}>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ textAlign: "left", fontWeight: 600 }}
                        onClick={() => navigateToFolder(folderName)}
                      >
                        📁 {folderName}
                      </button>
                    </td>
                    <td>—</td>
                    <td>—</td>
                    <td>
                      {canEdit ? (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteFolderTarget(fullPath)}
                        >
                          Delete
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {files.map((f) => (
                <tr key={f.path}>
                  <td>
                    <span title={displayFileName(f.name)}>📄 {displayFileName(f.name)}</span>
                  </td>
                  <td>{formatBytes(f.size)}</td>
                  <td>{formatDate(f.createdAt)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleView(f)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownload(f)}
                        disabled={downloadingPath === f.path}
                      >
                        {downloadingPath === f.path ? "Downloading…" : "Download"}
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(f)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete file"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteFileConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={deleteFolderTarget !== null}
        title="Delete folder"
        message={deleteFolderTarget ? `Delete folder "${deleteFolderTarget.split("/").pop()}" and all its contents? This cannot be undone.` : ""}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDeleteFolderConfirm}
        onCancel={() => setDeleteFolderTarget(null)}
      />
    </>
  );
}
