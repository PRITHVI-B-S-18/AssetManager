import { useState, useRef, useEffect } from "react";
import { Tooltip } from "./Tooltip";

interface IconDropdownOption {
  value: string;
  label: string;
}

interface IconDropdownProps {
  icon: React.ReactNode;
  options: IconDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  tooltipLabel: string;
  className?: string;
  "aria-label"?: string;
}

export function IconDropdown({
  icon,
  options,
  value,
  onChange,
  tooltipLabel,
  className = "btn btn-secondary btn-icon",
  "aria-label": ariaLabel,
}: IconDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="icon-dropdown-wrap">
      <Tooltip label={tooltipLabel}>
        <button
          type="button"
          className={`${className} ${open ? "dropdown-open" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-label={ariaLabel ?? tooltipLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          {icon}
        </button>
      </Tooltip>
      {open && (
        <div
          className="icon-dropdown-menu"
          role="listbox"
          aria-label={tooltipLabel}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              className={`icon-dropdown-item ${value === opt.value ? "selected" : ""}`}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
