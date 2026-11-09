import { decodeProject } from "../../project/decodeProject.ts";
import type { encodeProject } from "../../project/encodeProject.ts";

export const PROJECT_HISTORY_KEY = "typeaudio.projects.history.v1";
export interface ProjectCopy {
  id: string;
  name: string;
  savedAt: string;
  content: ReturnType<typeof encodeProject>;
}

/** Local source checkpoints. A failed write must never replace the working document. */
export class ProjectHistory {
  list(): ProjectCopy[] {
    const raw = localStorage.getItem(PROJECT_HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (
      !Array.isArray(data) ||
      data.some(
        (c) =>
          !c ||
          typeof c.id !== "string" ||
          typeof c.name !== "string" ||
          typeof c.savedAt !== "string" ||
          !c.content,
      )
    )
      throw new Error(
        "Saved project copies could not be read. Save your current project file before resetting browser storage.",
      );
    return data;
  }
  save(content: ReturnType<typeof encodeProject>): ProjectCopy {
    const copies = this.list(),
      encoded = JSON.stringify(content);
    const existing = copies.find((c) => JSON.stringify(c.content) === encoded);
    if (existing) return existing;
    const { scene, editor } = decodeProject(content);
    const copy = {
      id: crypto.randomUUID(),
      name: scene.cues.length ? scene.name : editor?.source.name || scene.name,
      savedAt: new Date().toISOString(),
      content,
    };
    try {
      localStorage.setItem(
        PROJECT_HISTORY_KEY,
        JSON.stringify([copy, ...copies]),
      );
    } catch {
      throw new Error(
        "Could not preserve this project. Save a project file or remove an older saved copy, then retry. Your current work has not been replaced.",
      );
    }
    return copy;
  }
  read(id: string) {
    const copy = this.list().find((c) => c.id === id);
    if (!copy) throw new Error("This saved project copy is unavailable.");
    return copy.content;
  }
  remove(id: string) {
    localStorage.setItem(
      PROJECT_HISTORY_KEY,
      JSON.stringify(this.list().filter((c) => c.id !== id)),
    );
  }
  usesAudio(id: string) {
    try {
      return this.list().some((c) =>
        decodeProject(c.content).scene.cues.some((cue) => cue.audio?.id === id),
      );
    } catch {
      return true;
    } // Unreadable recovery data must never permit deleting its audio.
  }
}
