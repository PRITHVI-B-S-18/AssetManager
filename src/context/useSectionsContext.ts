import { useContext } from "react";
import { SectionsContext } from "./sectionContextValue";

export function useSectionsContext() {
  const ctx = useContext(SectionsContext);
  if (!ctx) throw new Error("useSectionsContext must be used within SectionsProvider");
  return ctx;
}
