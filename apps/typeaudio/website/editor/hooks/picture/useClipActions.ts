import { useState } from "react";
import { SAMPLE_RATE } from "../../../sound/constants.ts";
import { MAX_CUES, cueRange, type Cue } from "../../../video-model.ts";
import { soundLength } from "../../../sound-design.ts";
import { selectionIds } from "../../state/documentProjection.ts";
import { selectDocument } from "../../state/selection.ts";
import {
  type SelectionMode,
  type Workspace,
} from "../../state/documentTypes.ts";
import { updateScene } from "../../state/documentUpdates.ts";
import { moveDelta, splitClip } from "../../clip-edit.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
import type { SceneSession } from "./useSceneSession.ts";
import type { SceneActions } from "./createSceneActions.ts";
export function useClipActions(
  { state, dispatch, setNotice }: DocumentController,
  { transport }: EditorResources,
  { latest, stopScene }: SceneSession,
  { scene }: SceneActions,
  workspace: (next: Workspace) => void,
) {
  function sourceDuration(c: Cue) {
    if (c.audio) return c.audio.frames / SAMPLE_RATE;
    const current = latest.current;
    return current.ready && current.samples.has(c.id)
      ? current.samples.get(c.id)!.length / SAMPLE_RATE
      : soundLength(c.patch);
  }
  function clipDuration(c: Cue) {
    return cueRange(c, sourceDuration(c)).duration;
  }
  function selectCue(id: string, mode?: SelectionMode) {
    const next = selectDocument(latest.current.state, id, mode);
    dispatch({ type: "select", id, mode });
    return selectionIds(next);
  }
  function deleteClips(ids = selectionIds(latest.current.state)) {
    scene((current) => ({
      ...current,
      cues: current.cues.filter((c) => !ids.includes(c.id)),
    }));
  }
  function moveClips(ids: string[], delta: number, copy = false) {
    if (
      copy &&
      latest.current.state.scene.cues.length + ids.length > MAX_CUES
    ) {
      setNotice("A composition can contain up to 24 sound layers.");
      return;
    }
    const copies = new Map(ids.map((id) => [id, crypto.randomUUID()]));
    stopScene();
    dispatch({
      type: "edit",
      edit: (d) => {
        const targets = d.scene.cues.filter((c) => ids.includes(c.id)),
          shift = moveDelta(targets, delta);
        if (
          !targets.length ||
          (copy && d.scene.cues.length + targets.length > MAX_CUES)
        )
          return d;
        if (copy) {
          const cues = targets.map((c) => ({
            ...c,
            id: copies.get(c.id)!,
            time: c.time + shift,
          }));
          return {
            ...d,
            selected: copies.get(d.selected) || cues[0]!.id,
            selection: cues.map((c) => c.id),
            scene: { ...d.scene, cues: [...d.scene.cues, ...cues] },
          };
        }
        return updateScene(d, (current) => ({
          ...current,
          cues: current.cues.map((c) =>
            ids.includes(c.id) ? { ...c, time: c.time + shift } : c,
          ),
        }));
      },
    });
  }
  function splitClips(ids = selectionIds(latest.current.state)) {
    const at = transport.current.current(),
      current = latest.current.state;
    const parts = new Map(
      current.scene.cues
        .filter((c) => ids.includes(c.id))
        .flatMap((c) => {
          const pair = splitClip(c, at, sourceDuration(c), crypto.randomUUID());
          return pair ? [[c.id, pair] as const] : [];
        }),
    );
    if (!parts.size) {
      setNotice(
        "Place the playhead inside a selected clip, at least 10 ms from either edge.",
      );
      return;
    }
    if (current.scene.cues.length + parts.size > MAX_CUES) {
      setNotice("Splitting these clips would exceed the 24-layer limit.");
      return;
    }
    stopScene();
    dispatch({
      type: "edit",
      edit: (d) => {
        const rights = [...parts.values()].map((pair) => pair[1].id);
        return {
          ...d,
          selected: rights[0]!,
          selection: rights,
          scene: {
            ...d.scene,
            cues: d.scene.cues.flatMap((c) => parts.get(c.id) || [c]),
          },
        };
      },
    });
    setNotice(
      "Split at playhead. Both pieces retain their source audio and fades.",
    );
  }
  function resetTrim(ids = selectionIds(latest.current.state)) {
    scene((current) => ({
      ...current,
      cues: current.cues.map((c) =>
        ids.includes(c.id)
          ? { ...c, sourceIn: 0, sourceOut: null, fadeAnchor: undefined }
          : c,
      ),
    }));
  }
  function resetFades(ids = selectionIds(latest.current.state)) {
    scene((current) => ({
      ...current,
      cues: current.cues.map((c) =>
        ids.includes(c.id)
          ? { ...c, fadeIn: 0, fadeOut: 0, fadeAnchor: undefined }
          : c,
      ),
    }));
  }
  function muteClips(ids = selectionIds(latest.current.state)) {
    const muted = !latest.current.state.scene.cues
      .filter((c) => ids.includes(c.id))
      .every((c) => c.muted);
    scene((current) => ({
      ...current,
      cues: current.cues.map((c) => (ids.includes(c.id) ? { ...c, muted } : c)),
    }));
  }
  function duplicateCue(target: string, at?: number) {
    const c = latest.current.state.scene.cues.find((c) => c.id === target);
    if (c) moveClips([target], at === undefined ? 0.25 : at - c.time, true);
  }
  const [renameRequest, setRenameRequest] = useState<{
    id: string;
    nonce: number;
  }>();
  function renameCue(id: string) {
    dispatch({ type: "select", id });
    workspace("picture");
    setRenameRequest({ id, nonce: performance.now() });
  }
  return {
    sourceDuration,
    clipDuration,
    selectCue,
    deleteClips,
    moveClips,
    splitClips,
    resetTrim,
    resetFades,
    muteClips,
    duplicateCue,
    renameCue,
    renameRequest,
    deleteCue: () => deleteClips(),
    deleteCueById: (id: string) => deleteClips([id]),
    duplicate: () => moveClips(selectionIds(latest.current.state), 0.25, true),
    selected: state.scene.cues.find((c) => c.id === state.selected),
    selectedIds: selectionIds(state),
  };
}
