import { useRef, useState } from "react";
import { validatePatch } from "../../../sound/validatePatch.ts";
import { patchPrograms } from "../../../graph/preparePatch.ts";
import { PATCH_KEY } from "../../state/storageKeys.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { SavedSound } from "../../state/types.ts";
import type { PatchActions } from "./createPatchActions.ts";
import { hasFunctionSources } from "../../../functions/hasFunctionSources.ts";
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
      if (file.size > 5_000_000)
        throw new Error("Sound files must be smaller than 5 MB.");
      const p = JSON.parse(await file.text());
      if (!current()) return;
      if (p.version !== 1 && p.version !== 2)
        throw new Error("Unsupported sound version.");
      const imported = validatePatch(p.patch);
      if (hasFunctionSources(imported) && p.version !== 2)
        throw new Error("Function sounds require sound file version 2.");
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
