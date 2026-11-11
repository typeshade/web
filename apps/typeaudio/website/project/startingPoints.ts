import { BLANK } from "../sound-recipes.ts";
import { emptyScene } from "../video-model.ts";
import { encodeProject } from "./encodeProject.ts";

/** New projects built from the editor's existing templates. No new sound content. */
export const STARTING_POINTS = [
  {
    id: "empty",
    title: "Empty project",
    detail: "A single plain oscillator and an empty timeline.",
  },
  {
    id: "procedural",
    title: "Procedural sound",
    detail: "A node network with a TypeShade Code node and exposed parameters.",
  },
  {
    id: "function",
    title: "Function sound",
    detail: "Complete TypeShade functions connected through typed pins.",
  },
  {
    id: "picture",
    title: "Picture composition",
    detail: "A timeline for arranging sound layers against a video reference.",
  },
] as const;

export type StartingPoint = (typeof STARTING_POINTS)[number]["id"];

export const isStartingPoint = (value: string): value is StartingPoint =>
  STARTING_POINTS.some((p) => p.id === value);

/** The empty project every starting point opens before its template is applied. */
export function emptyProject() {
  return encodeProject(emptyScene(), [], {
    source: { name: "Untitled sound", patch: { ...BLANK } },
    drafts: {},
    selected: "",
    selection: [],
  });
}
