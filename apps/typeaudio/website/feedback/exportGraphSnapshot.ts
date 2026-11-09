import type { FeedbackVersions } from "typeaudio/feedback";
import type { Patch } from "../sound/types.ts";
import { createGraphSnapshot } from "./createGraphSnapshot.ts";
import { download } from "../editor/shared/download.ts";

declare const __TYPEAUDIO_VERSIONS__: FeedbackVersions;

export function exportGraphSnapshot(patch: Patch) {
  if (!patch.graph)
    throw new Error("Select a procedural graph to export a reproduction.");
  const snapshot = createGraphSnapshot(
    patch.graph,
    patch.volume,
    patch.duration,
    __TYPEAUDIO_VERSIONS__,
    {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
    },
  );
  download(
    new Blob([JSON.stringify(snapshot, null, 2) + "\n"], {
      type: "application/json",
    }),
    "typeaudio-graph-reproduction.json",
  );
}
