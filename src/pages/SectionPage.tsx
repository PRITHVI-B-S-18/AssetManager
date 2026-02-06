import { useParams } from "react-router-dom";
import { useSectionsContext } from "../context/useSectionsContext";
import { DataTableSection } from "../components/DataTableSection";
import { Breadcrumbs } from "../components/Breadcrumbs";

export function SectionPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { sections } = useSectionsContext();
  const section = sections.find((s) => s.id === sectionId);

  if (!section) {
    return (
      <div className="page-header">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: "Section not found" }]} />
        <h2>Section not found</h2>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          The section "{sectionId}" does not exist or was removed.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/" }, { label: section.name }]} />
        <h2>{section.name}</h2>
        {section.isCustom && (
          <span className="badge badge-custom" style={{ marginTop: "0.5rem" }}>
            Custom section
          </span>
        )}
      </div>
      <DataTableSection section={section} />
    </>
  );
}
