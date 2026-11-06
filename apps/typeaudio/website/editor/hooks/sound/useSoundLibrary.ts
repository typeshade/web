import { useRef, useState } from "react";
import { validatePatch } from "../../../sound/validatePatch.ts";
import { patchPrograms } from "../../../graph/preparePatch.ts";
import { PATCH_KEY } from "../../state/storageKeys.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { SavedSound } from "../../state/types.ts";
import type { PatchActions } from "./createPatchActions.ts";
export function useSoundLibrary(
  { state, editVersion, setNotice }: DocumentController,
  { patch }: PatchActions,
) {
  const patchInput = useRef<HTMLInputElement>(null),
    patchRequest = useRef(0);
  const [saved, setSaved] = useState<SavedSound[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(PATCH_KEY) || "[]")
        .slice(0, 30)
        .map((p: SavedSound) => ({
          name: String(p.name).slice(0, 40),
          patch: validatePatch(p.patch),
        }));
    } catch {
      return [];
    }
  });

  function savePatch() {
    const value = { name: state.patchName.trim(), patch: state.patch };
    if (!value.name) {
      setNotice("Name the sound before saving.");
      return;
    }
    const next = [value, ...saved.filter((p) => p.name !== value.name)].slice(
      0,
      30,
    );
    try {
      localStorage.setItem(PATCH_KEY, JSON.stringify(next));
      setSaved(next);
      setNotice("Sound saved in this browser.");
    } catch {
      setNotice("Storage unavailable. Export the patch instead.");
    }
  }
  async function importPatch(file: File) {
    const request = ++patchRequest.current,
      version = editVersion.current;
    const current = () =>
      request === patchRequest.current && version === editVersion.current;
    try {
      if (file.size > 100000)
        throw new Error("Patch files must be smaller than 100 KB.");
      const p = JSON.parse(await file.text());
      if (!current()) return;
      if (p.version !== 1) throw new Error("Unsupported patch version.");
      const imported = validatePatch(p.patch);
      await patchPrograms(imported);
      if (!current()) return;
      patch(imported, String(p.name || "Imported patch").slice(0, 40));
      setNotice("Patch imported.");
    } catch (error) {
      if (current()) setNotice(`Import failed: ${String(error)}`);
    }
  }
  return { saved, patchInput, savePatch, importPatch };
}
