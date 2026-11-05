import type { Editor } from "./useEditor.ts";
import type { Cue } from "../video-model.ts";
import type { MenuItem } from "./interactions.tsx";
export function clipItems(e: Editor, cue: Cue, ids = [cue.id]): MenuItem[] {
  const many = ids.length > 1;
  return [
    {
      label: "Audition clip",
      disabled: !e.ready || !e.samples.has(cue.id),
      action: () => void e.auditionCue(cue.id),
    },
    {
      label: cue.audio ? "Clip properties" : "Edit sound",
      action: () => {
        e.selectCue(cue.id);
        if (cue.audio) e.renameCue(cue.id);
        else e.workspace("sound");
      },
    },
    { label: "Rename…", action: () => e.renameCue(cue.id) },
    { separator: true },
    {
      label: "Split at playhead",
      shortcut: "Ctrl/⌘ Shift D",
      action: () => e.splitClips(ids),
    },
    {
      label: "Move to playhead",
      action: () => e.moveClips(ids, e.transport.current() - cue.time),
    },
    {
      label: many ? "Mute selected layers" : "Mute layer",
      checked: e.state.scene.cues
        .filter((c) => ids.includes(c.id))
        .every((c) => c.muted),
      action: () => e.muteClips(ids),
    },
    {
      label: many ? "Duplicate selected layers" : "Duplicate layer",
      shortcut: "Alt-drag",
      disabled: e.state.scene.cues.length + ids.length > 24,
      action: () => e.moveClips(ids, 0.25, true),
    },
    { label: "Reset trim", action: () => e.resetTrim(ids) },
    { label: "Reset fades", action: () => e.resetFades(ids) },
    { separator: true },
    {
      label: many ? "Delete selected layers" : "Delete layer",
      shortcut: "Delete",
      danger: true,
      action: () => e.deleteClips(ids),
    },
  ];
}
