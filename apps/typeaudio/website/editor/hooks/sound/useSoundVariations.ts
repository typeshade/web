import { useRef, useState } from "react";
import { DEFAULT } from "../../../sound/defaultPatch.ts";
import { morphPatch } from "../../../exploration.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { PatchActions } from "./createPatchActions.ts";
export function useSoundVariations(
  { state, setNotice }: DocumentController,
  { patch }: PatchActions,
) {
  const snapshots = useRef({ a: { ...DEFAULT }, b: { ...DEFAULT } }),
    patchKey = JSON.stringify(state.patch);
  const [morphState, setMorphState] = useState<{
    value: number;
    key: string;
  }>();
  const morphAmount =
    morphState?.key === patchKey ? morphState.value : undefined;

  function randomize() {
    patch(
      {
        ...DEFAULT,
        shapeA: Math.floor(Math.random() * 4),
        shapeB: Math.floor(Math.random() * 4),
        frequency: [65.4, 110, 220, 440][Math.floor(Math.random() * 4)],
        cutoff: Math.round(500 + Math.random() * 5500),
        resonance: Math.round((0.6 + Math.random() * 2.5) * 10) / 10,
        blend: Math.random(),
        reverb: Math.random() > 0.5,
        delay: Math.random() > 0.5,
      },
      "Random sound",
    );
  }
  function snapshot(action: "store" | "recall", slot: "a" | "b") {
    if (action === "store") {
      snapshots.current[slot] = { ...state.patch };
      setMorphState({ value: slot === "a" ? 0 : 1, key: patchKey });
      setNotice(`Stored variation ${slot.toUpperCase()}.`);
    } else {
      patch({ ...snapshots.current[slot] });
      setMorphState({
        value: slot === "a" ? 0 : 1,
        key: JSON.stringify(snapshots.current[slot]),
      });
    }
  }
  const morph = (t: number) => {
    const next = morphPatch(snapshots.current.a, snapshots.current.b, t);
    patch(next);
    setMorphState({ value: t, key: JSON.stringify(next) });
  };
  return { morphAmount, randomize, snapshot, morph };
}
