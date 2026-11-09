import { useEffect, useState } from "react";
import type { CodeMode } from "../../layout/types.ts";
const KEY = "typeaudio.editor.code-layout.v1";

export function useCodeLayout() {
  const [mode, setMode] = useState<CodeMode>(() => {
    try {
      const value = localStorage.getItem(KEY);
      return value === "right" || value === "code" ? value : "bottom";
    } catch {
      return "bottom";
    }
  });
  const [wide, setWide] = useState(() => innerWidth >= 1400);
  useEffect(() => {
    const media = matchMedia("(min-width: 1400px)");
    const change = () => setWide(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return {
    wide,
    codeMode: mode === "right" && !wide ? ("bottom" as const) : mode,
    setCodeMode: (next: CodeMode) => {
      setMode(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {}
    },
  };
}
