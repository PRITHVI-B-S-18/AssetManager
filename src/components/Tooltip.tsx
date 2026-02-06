import { useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  children: React.ReactElement;
  label: string;
}

/** Tooltip with no delay – renders in a portal so it is never clipped by overflow */
export function Tooltip({ children, label }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!visible || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const gap = 6;
    setPosition({
      top: rect.bottom + gap,
      left: rect.left + rect.width / 2,
    });
  }, [visible]);

  return (
    <div
      ref={anchorRef}
      className="tooltip-wrap"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible &&
        createPortal(
          <div
            className="tooltip-bubble tooltip-bubble-portal"
            role="tooltip"
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              transform: "translate(-50%, 0)",
            }}
          >
            {label}
          </div>,
          document.body
        )}
    </div>
  );
}
