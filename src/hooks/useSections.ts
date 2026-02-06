import { useState, useEffect } from "react";
import { getSections, initSectionsIfEmpty } from "../services/firestore";
import { BUILT_IN_SECTIONS } from "../types/sections";
import type { SectionConfig } from "../types/sections";

export function useSections(): {
  sections: SectionConfig[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      await initSectionsIfEmpty(BUILT_IN_SECTIONS);
      const list = await getSections();
      setSections(list.length ? list : BUILT_IN_SECTIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return { sections, loading, refresh: load };
}
