import { type Patch } from "../../sound/types.ts";
import { type Scene } from "../../video-model.ts";
export type Workspace = "sound" | "picture";

export type Tool = "select" | "hand";

export interface Document {
  scene: Scene;
  patch: Patch;
  patchName: string;
  selected: string;
  selection?: string[];
  source: { patch: Patch; name: string };
}

export interface EditorState extends Document {
  checkpoint?: Document;
  past: Document[];
  future: Document[];
  workspace: Workspace;
  tool: Tool;
}

export type Action =
  | { type: "begin" }
  | { type: "commit" }
  | { type: "cancel" }
  | { type: "edit"; edit: (doc: Document) => Document; record?: boolean }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "select"; id: string; mode?: SelectionMode }
  | { type: "selectMany"; ids: string[] }
  | { type: "workspace"; workspace: Workspace }
  | { type: "tool"; tool: Tool }
  | { type: "open"; scene: Scene }
  | { type: "media"; media: Scene["media"] };

export type SelectionMode = "toggle" | "range" | "preserve";
