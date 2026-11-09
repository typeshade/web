import { GraphDsp } from "typeaudio/graph/runtime";
import { LiveDsp } from "../live-dsp.ts";
import type { Patch } from "../sound/types.ts";
import { FunctionPatchDsp } from "./FunctionPatchDsp.ts";

export type SourceDsp = LiveDsp | GraphDsp | FunctionPatchDsp;
export function createSourceDsp(p: Patch, previous?: SourceDsp): SourceDsp {
  if (p.functions)
    return new FunctionPatchDsp(
      p,
      previous instanceof FunctionPatchDsp ? previous : undefined,
    );
  if (p.graph)
    return new GraphDsp(p, previous instanceof GraphDsp ? previous : undefined);
  return new LiveDsp(p);
}
