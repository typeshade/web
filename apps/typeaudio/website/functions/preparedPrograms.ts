import type {
  FunctionGraphDocument,
  FunctionGraphProgram,
} from "typeaudio/function-graph";
import type { PreparedProgram } from "./types.ts";
import { functionSourceKey } from "./sourceKey.ts";

const programs = new Map<string, FunctionGraphProgram>();
export function preparedCode(program: PreparedProgram) {
  return "schema" in program
    ? program.artifacts.map((a) => a.code).join("\n")
    : program.code;
}
/** Metadata accompanies locally compiled registration modules; project JSON cannot supply it. */
export function registerFunctionPrograms(prepared: PreparedProgram[] = []) {
  for (const program of prepared) {
    if (!("schema" in program)) continue;
    const key = functionSourceKey(program.document);
    if (programs.size >= 64 && !programs.has(key))
      programs.delete(programs.keys().next().value!);
    programs.set(key, program);
  }
}
export function functionProgram(document: FunctionGraphDocument) {
  const program = programs.get(functionSourceKey(document));
  if (!program) throw new Error("Prepare this function sound before playback.");
  return { ...program, document };
}
