import type {
  FunctionGraphProgram,
  FunctionComposition,
} from "typeaudio/function-graph";
import type { GraphProgram } from "typeaudio/graph";

export interface PreparedFunctions extends FunctionGraphProgram {
  composition?: FunctionComposition;
  compositionError?: string;
}
export interface CompositionRequest {
  mode: "project" | "apply" | "validate";
  source?: string;
  rename?: { definition: string; port: string; name: string };
}
export type PreparedProgram = GraphProgram | PreparedFunctions;
export type FunctionLayout = Record<string, { x: number; y: number }>;
export interface FunctionProblem {
  file: string;
  line: number;
  column: number;
  definition: string;
  message: string;
}
