import { useEffect, useRef, useState } from "react";
import type { Editor } from "../../useEditor.ts";
import type { SoundGraph } from "../../../graph/types.ts";
import { graphKey } from "../../../graph/graphIdentity.ts";
import { validateGraph } from "../../../graph/validateGraph.ts";
import { prepareGraph } from "../../../graph/compilationClient.ts";

export function useGraphCompilation(e: Editor, owner: string) {
  const graph = e.state.patch.graph;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [source, setSource] = useState("");
  const latest = useRef({ e, owner, graph });
  latest.current = { e, owner, graph };
  const request = useRef(0);
  useEffect(() => {
    request.current++;
    setBusy(false);
    setError("");
    return () => {
      request.current++;
    };
  }, [owner]);
  const key = graph ? graphKey(graph) : "";
  useEffect(() => {
    let active = true;
    if (graph)
      void prepareGraph(graph)
        .then((p) => {
          if (active) {
            setSource(p.source);
            setError("");
          }
        })
        .catch((error) => {
          if (active) setError(String(error));
        });
    return () => {
      active = false;
    };
  }, [key, owner]);
  async function apply(next: SoundGraph) {
    const id = ++request.current,
      before = JSON.stringify(latest.current.graph),
      sourceOwner = owner;
    setBusy(true);
    setError("");
    try {
      const checked = validateGraph(next),
        program = await prepareGraph(checked);
      if (id !== request.current || sourceOwner !== latest.current.owner)
        return false;
      if (JSON.stringify(latest.current.graph) !== before)
        throw new Error(
          "The sound changed during compilation. Apply again to keep the newer edits.",
        );
      latest.current.e.endEdit();
      latest.current.e.patch({ graph: checked });
      setSource(program.source);
      e.setNotice(
        "Graph applied. Parameter edits preserve running state. Retrigger starts a new note.",
      );
      return true;
    } catch (error) {
      if (id === request.current) {
        setError(String(error));
        e.setNotice("Graph unchanged. Fix the node error and apply again.");
      }
      return false;
    } finally {
      if (id === request.current) setBusy(false);
    }
  }
  return { busy, error, source, setError, apply, latest };
}
