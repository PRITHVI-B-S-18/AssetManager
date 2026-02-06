import { Link } from "react-router-dom";

interface Crumb {
  label: string;
  to?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="breadcrumb-item">
          {i > 0 && <span className="breadcrumb-sep" aria-hidden>›</span>}
          {item.to ? (
            <Link to={item.to} className="breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
