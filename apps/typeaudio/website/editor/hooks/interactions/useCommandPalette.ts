import { useEffect, useState } from "react";
import { useInteractions } from "./useInteractions.ts";

export function useCommandPalette() {
  const [mode, setMode] = useState<"commands" | "files" | null>(null);
  const { closeMenu } = useInteractions();
  function open(next: "commands" | "files" = "commands") {
    closeMenu();
    setMode(next);
  }
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        event.stopPropagation();
        open(event.shiftKey ? "commands" : "files");
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  });
  return { mode, open, close: () => setMode(null) };
}
export type CommandPaletteController = ReturnType<typeof useCommandPalette>;
