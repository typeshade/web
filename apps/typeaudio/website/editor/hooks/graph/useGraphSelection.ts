import { useRef, useState } from "react";
import type { SoundGraph } from "../../../graph/types.ts";

export function useGraphSelection(graph: SoundGraph | null, owner: string) {
  const [value, setValue] = useState<{ owner: string; ids: string[] }>({
    owner: "",
    ids: [],
  });
  const current = useRef(value);
  current.current = value;
  function getSelection() {
    const ids =
      current.current.owner === owner
        ? current.current.ids
        : [
            graph?.nodes.find((n) => n.kind === "code")?.id ??
              graph?.nodes[0]?.id ??
              "",
          ];
    return ids.filter((id) => graph?.nodes.some((n) => n.id === id));
  }
  function selectMany(ids: string[]) {
    const next = { owner, ids: [...new Set(ids)] };
    current.current = next;
    setValue(next);
  }
  function select(
    id: string,
    mode: "replace" | "toggle" | "preserve" = "replace",
  ) {
    const ids = getSelection();
    selectMany(
      mode === "toggle"
        ? ids.includes(id)
          ? ids.filter((n) => n !== id)
          : [...ids, id]
        : mode === "preserve" && ids.includes(id)
          ? ids
          : [id],
    );
  }
  const selectedIds = getSelection();
  return {
    selectedIds,
    selected: graph?.nodes.find((n) => n.id === selectedIds.at(-1)),
    getSelection,
    selectMany,
    select,
    isSelected: (id: string) => getSelection().includes(id),
  };
}
