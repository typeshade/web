import { FUNCTION_COMPOSITION_PATH } from "typeaudio/function-graph";
import type { CodeDrafts } from "./editorState.ts";
export function hasCompositionDrafts(drafts: CodeDrafts = {}): boolean {
  return Object.keys(drafts).some(
    (key) => JSON.parse(key)[1] === `module:${FUNCTION_COMPOSITION_PATH}`,
  );
}
