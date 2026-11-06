import { SoundEngine, type Rendered } from "../../engine/SoundEngine.ts";
import type { Notice } from "../../state/types.ts";
import type { RefObject } from "react";
export interface SoundPlaybackContext {
  state: import("../../state/documentTypes.ts").EditorState;
  sound: RefObject<SoundEngine>;
  soundGeneration: RefObject<number>;
  latest: RefObject<{
    state: import("../../state/documentTypes.ts").EditorState;
    repeat: boolean;
    dry: boolean;
  }>;
  stopSound: () => void;
  setNotice: Notice;
  repeat: boolean;
  dry: boolean;
  backend: "cpu" | "webgpu";
  patchKey: string;
  renderLoop: boolean;
  setLive: (value: boolean) => void;
  setBusy: (value: boolean) => void;
  setMeter: (value: { frames: number; revision: number }) => void;
  setRendered: (value: (Rendered & { patchKey: string }) | undefined) => void;
}
