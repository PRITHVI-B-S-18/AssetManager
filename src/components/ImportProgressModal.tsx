import { useEffect } from "react";

interface ImportProgressModalProps {
  open: boolean;
  phase: "reading" | "importing" | "done";
  current: number;
  total: number;
  fileName?: string;
  error?: string;
}

export function ImportProgressModal({
  open,
  phase,
  current,
  total,
  fileName,
  error,
}: ImportProgressModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const isDone = phase === "done" || error;

  return (
    <div className="modal-overlay import-progress-overlay">
      <div className="modal import-progress-modal">
        <div className="modal-header">
          <h3>{error ? "Import failed" : isDone ? "Import complete" : "Importing…"}</h3>
        </div>
        <div className="modal-body">
          {fileName && (
            <p className="import-file-name" title={fileName}>
              {fileName.length > 40 ? fileName.slice(0, 37) + "…" : fileName}
            </p>
          )}
          {error ? (
            <p className="import-error">{error}</p>
          ) : (
            <>
              <div className="progress-bar-wrap">
                <div
                  className="progress-bar-fill"
                  style={{ width: isDone ? "100%" : `${percent}%` }}
                />
              </div>
              <p className="progress-status">
                {phase === "reading" && "Reading file…"}
                {phase === "importing" && `Importing… ${current} of ${total} records`}
                {phase === "done" && total > 0 && `Imported ${current} record(s).`}
                {phase === "done" && total === 0 && "No records to import."}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
