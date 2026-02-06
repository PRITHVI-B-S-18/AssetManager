import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "../context/useUserRole";
import { getUsers, setUserRole, type UserRole } from "../services/firestore";
import { useToast } from "../context/ToastContext";
import { Breadcrumbs } from "../components/Breadcrumbs";

type UserRow = { uid: string; email: string; role: UserRole };

export function ManageUsers() {
  const { role, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (role !== "admin") return;
    let cancelled = false;
    getUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch(() => {
        if (!cancelled) showToast("error", "Failed to load users.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [role, showToast]);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    setSaving(true);
    try {
      await setUserRole(uid, newRole);
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u)));
      showToast("success", "Role updated.");
    } catch {
      showToast("error", "Failed to update role.");
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading) {
    return <div className="loading-screen">Loading…</div>;
  }
  if (role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div className="page-header">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Manage users" }]} />
        <h2>Manage users</h2>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.35rem", fontSize: "0.95rem" }}>
          Set users to Viewer (read-only) or Admin (full access). New users get Viewer by default.
        </p>
      </div>
      <div className="card" style={{ padding: "1.5rem" }}>
        {loading ? (
          <p className="empty-state">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="empty-state">No users yet. Users appear here after they sign in.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>User UID</th>
                <th>Role</th>
                <th>Change role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td>{u.email || "(no email)"}</td>
                  <td title={u.uid} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                    {u.uid.slice(0, 12)}…
                  </td>
                  <td>
                    <span className={`badge ${u.role === "admin" ? "badge-custom" : ""}`}>
                      {u.role === "admin" ? "Admin" : "Viewer"}
                    </span>
                  </td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                      disabled={saving}
                      className="btn btn-secondary"
                      style={{ padding: "0.35rem 0.6rem", fontSize: "0.875rem" }}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
