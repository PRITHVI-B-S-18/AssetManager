import { createContext } from "react";
import type { SectionConfig } from "../types/sections";

export interface SectionsContextValue {
  sections: SectionConfig[];
  loading: boolean;
  refreshSections: () => Promise<void>;
}

export const SectionsContext = createContext<SectionsContextValue | null>(null);
