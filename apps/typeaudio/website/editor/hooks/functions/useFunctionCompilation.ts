import { useEffect, useRef, useState } from "react";
import type { FunctionGraphDocument } from "typeaudio/function-graph";
import { validateFunctionDocument } from "typeaudio/function-graph";
import type { Editor } from "../../useEditor.ts";
import {
  prepareFunctions,
  FunctionPreparationError,
} from "../../../functions/compilationClient.ts";
import { functionSourceKey } from "../../../functions/sourceKey.ts";
import type {
  FunctionProblem,
  FunctionLayout,
  PreparedFunctions,
  CompositionRequest,
} from "../../../functions/types.ts";

export function useFunctionCompilation(e: Editor, owner: string) {
  const graph = e.state.patch.functions,
    epoch = e.state.documentEpoch,
    compositionSource = e.state.patch.functionComposition;
  const key = graph ? functionSourceKey(graph) : "";
  const [program, setProgram] = useState<PreparedFunctions>();
  const [error, setError] = useState("");
  const [problems, setProblems] = useState<FunctionProblem[]>([]);
  const [busy, setBusy] = useState(false);
  const request = useRef(0),
    latest = useRef({ e, owner, graph });
  latest.current = { e, owner, graph };
  useEffect(() => {
    request.current++;
    setBusy(false);
    setError("");
    setProblems([]);
    setProgram(undefined);
  }, [owner, epoch]);
  useEffect(() => {
    let active = true;
    if (graph)
      void prepareFunctions(
        graph,
        false,
        compositionSource
          ? { mode: "validate", source: compositionSource }
          : { mode: "project" },
      )
        .then((p) => {
          if (active) setProgram(p);
        })
        .catch((err) => {
          if (active) setError(String(err));
        });
    return () => {
      active = false;
    };
  }, [key, owner, epoch, compositionSource]);
  async function apply(
    raw: FunctionGraphDocument,
    layout?: FunctionLayout,
    synchronize = false,
    composition?: CompositionRequest,
  ) {
    const id = ++request.current,
      before = JSON.stringify(latest.current.graph),
      beforeComposition = latest.current.e.state.patch.functionComposition,
      beforeLayout = JSON.stringify(
        latest.current.e.state.patch.functionLayout,
      );
    setBusy(true);
    setError("");
    setProblems([]);
    try {
      const next = validateFunctionDocument(raw),
        prepared = await prepareFunctions(
          next,
          synchronize,
          composition ?? {
            mode: "project",
            source: beforeComposition ?? program?.composition?.source,
          },
        );
      const current = latest.current;
      if (
        id !== request.current ||
        owner !== current.owner ||
        epoch !== current.e.state.documentEpoch
      )
        return false;
      if (
        JSON.stringify(current.graph) !== before ||
        current.e.state.patch.functionComposition !== beforeComposition ||
        (layout &&
          JSON.stringify(current.e.state.patch.functionLayout) !== beforeLayout)
      )
        throw new Error(
          "The sound changed during preparation. Apply again to keep the newer edits.",
        );
      current.e.endEdit();
      current.e.patch({
        functions: { ...prepared.document, parameters: next.parameters },
        functionComposition: prepared.composition?.source ?? null,
        ...(layout ? { functionLayout: layout } : {}),
      });
      setProgram(prepared);
      current.e.setNotice(
        "Functions applied. Named control edits retain state. Retrigger starts the sound again.",
      );
      return true;
    } catch (err) {
      if (id === request.current) {
        setError(String(err));
        setProblems(
          err instanceof FunctionPreparationError ? err.problems : [],
        );
        latest.current.e.setNotice(
          "Sound unchanged. Fix the function or connection and apply again.",
        );
      }
      return false;
    } finally {
      if (id === request.current) setBusy(false);
    }
  }
  return {
    program,
    error,
    setError,
    problems,
    clearProblems: () => setProblems([]),
    busy,
    apply,
    latest,
  };
}
