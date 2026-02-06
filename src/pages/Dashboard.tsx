import { Link } from "react-router-dom";
import { useSectionsContext } from "../context/useSectionsContext";
import { Breadcrumbs } from "../components/Breadcrumbs";

export function Dashboard() {
  const { sections } = useSectionsContext();

  return (
    <>
      <div className="page-header">
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
        <h2>Dashboard</h2>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.35rem", fontSize: "0.95rem" }}>
          Manage employees, licenses, laptops, monitors, and more.
        </p>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
          Click a section to open and load its records.
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {sections.map((sec) => (
          <Link
            key={sec.id}
            to={`/section/${sec.id}`}
            className="card"
            style={{
              padding: "1.25rem",
              display: "block",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 24px var(--shadow-hover)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "0.25rem",
              }}
            >
              {sec.name}
            </div>
            {sec.isCustom && (
              <span className="badge badge-custom" style={{ marginBottom: "0.5rem" }}>
                Custom
              </span>
            )}
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {sec.columns.length} columns · Click to open
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
