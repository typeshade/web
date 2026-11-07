import type { FunctionGraphProgram } from "typeaudio/function-graph";
import type { GraphProgram } from "typeaudio/graph";

export type PreparedProgram = GraphProgram | FunctionGraphProgram;
export type FunctionLayout = Record<string, { x: number; y: number }>;
export interface FunctionProblem {
  file: string;
  line: number;
  column: number;
  definition: string;
  message: string;
}
