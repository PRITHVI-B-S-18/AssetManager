import React, { useCallback, useState, useEffect } from "react";
import { getSections, initSectionsIfEmpty, subscribeSections } from "../services/firestore";
import { BUILT_IN_SECTIONS } from "../types/sections";
import type { SectionConfig } from "../types/sections";
import { SectionsContext } from "./sectionContextValue";

export function SectionsProvider({ children }: { children: React.ReactNode }) {
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSections = useCallback(async () => {
    setLoading(true);
    try {
      await initSectionsIfEmpty(BUILT_IN_SECTIONS);
      const list = await getSections();
      setSections(list.length ? list : BUILT_IN_SECTIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    initSectionsIfEmpty(BUILT_IN_SECTIONS).then(() => {
      setLoading(true);
      unsub = subscribeSections((list) => {
        setSections(list.length ? list : BUILT_IN_SECTIONS);
        setLoading(false);
      });
    });
    return () => {
      unsub?.();
    };
  }, []);

  return (
    <SectionsContext.Provider value={{ sections, loading, refreshSections }}>
      {children}
    </SectionsContext.Provider>
  );
}
