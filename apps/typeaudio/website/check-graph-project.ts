import { initialGraph } from "./graph/recipes.ts";
import { DEFAULT } from "./sound/defaultPatch.ts";
import example from "./public/projects/unseen-force-wall-hit.json";

/**
 * A picture project with one procedural (node network) sound, for the browser checks of
 * contextual graph editing. It takes the example's picture, room and first position. The code
 * node of the procedural starting point has the id `impact`.
 */
export function graphProject() {
  const scene = example.scene;
  return {
    schema: "typeaudio.project",
    version: 1,
    scene: {
      version: 1,
      name: "Graph study",
      media: scene.media,
      start: scene.start,
      end: scene.start + 4,
      loop: false,
      original: 0,
      effects: 1,
      cues: [
        {
          id: "impact-cue",
          name: "Impact",
          time: scene.start + 0.5,
          gain: 0.8,
          muted: false,
          patch: { ...DEFAULT, graph: initialGraph(), duration: 2, volume: 0.65 },
          space: scene.cues[0].space,
        },
      ],
      space: scene.space,
      origin: {
        id: "graph-study",
        revision: "browser-check",
        author: "TypeAudio browser check",
        notes: "A picture project with one procedural sound.",
      },
    },
  };
}
