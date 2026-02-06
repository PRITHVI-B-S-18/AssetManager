import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUserRole } from "../context/useUserRole";
import { useSectionsContext } from "../context/useSectionsContext";
import { signOut } from "../services/auth";

const SIDEBAR_STORAGE_KEY = "assetmanager-sidebar-collapsed";

export function Layout() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const { sections, loading: sectionsLoading } = useSectionsContext();
  const navigate = useNavigate();
  const isAdmin = role === "admin" || role === null;
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  if (sectionsLoading) {
    return <div className="loading-screen">Loading…</div>;
  }

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-header">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="sidebar-toggle-icon">{collapsed ? "›" : "‹"}</span>
          </button>
          <div className="sidebar-brand">
            <h1 className="sidebar-title">Asset Manager</h1>
            <p className="sidebar-subtitle">iamneo – Admin</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className="sidebar-link" title="Dashboard">
            <span className="nav-icon" aria-hidden>◉</span>
            <span className="nav-label">Dashboard</span>
          </NavLink>
          {sections.map((sec) => (
            <NavLink
              key={sec.id}
              to={`/section/${sec.id}`}
              className="sidebar-link"
              title={sec.name}
            >
              <span className="nav-icon" aria-hidden>
                {sec.name.charAt(0).toUpperCase()}
              </span>
              <span className="nav-label">
                {sec.name}
                {sec.isCustom && <span className="badge badge-custom">Custom</span>}
              </span>
            </NavLink>
          ))}
          <NavLink to="/policies" className="sidebar-link" title="Policies">
            <span className="nav-icon" aria-hidden>📄</span>
            <span className="nav-label">Policies</span>
          </NavLink>
          <NavLink to="/settings" className="sidebar-link" title="Settings">
            <span className="nav-icon" aria-hidden>⚙</span>
            <span className="nav-label">Settings</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/manage-users" className="sidebar-link" title="Manage users">
              <span className="nav-icon" aria-hidden>👥</span>
              <span className="nav-label">Manage users</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-email" title={user?.email ?? ""}>
            {user?.email ?? ""}
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-signout"
            onClick={handleSignOut}
          >
            <span className="nav-icon" aria-hidden>⎋</span>
            <span className="nav-label">Sign out</span>
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
