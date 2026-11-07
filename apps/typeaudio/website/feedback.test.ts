import { describe, expect, it } from "vitest";
import impact from "../../../sources/typeaudio/fixtures/feedback/impact.json";
import tone from "../../../sources/typeaudio/fixtures/feedback/tone.json";
import { compileGraph } from "typeaudio/graph/compiler";
import {
  replayGraph,
  summarizeReplay,
  validateReproduction,
} from "typeaudio/feedback";
import { createGraphSnapshot } from "./feedback/createGraphSnapshot.ts";
import { DEFAULT } from "./sound/defaultPatch.ts";
import { renderSound } from "./sound-dsp.ts";

describe("engine reproduction adoption", () => {
  it.each([impact, tone])(
    "replays the engine's $capture fixture through public exports",
    (fixture) => {
      const input = validateReproduction(fixture);
      new Function(compileGraph(input.graph).code)();
      const result = replayGraph(input);
      expect(result.invalidSamples).toBe(0);
      expect(summarizeReplay(result).peak).toBeGreaterThan(0.01);
      expect(replayGraph(input).pcm).toEqual(result.pcm);
    },
  );

  it("replays the studio graph voice independently of the layer transport envelope", () => {
    const input = validateReproduction(impact);
    const snapshot = createGraphSnapshot(
      input.graph,
      0.6,
      0.1,
      input.versions,
      input.environment,
    );
    new Function(compileGraph(snapshot.graph).code)();
    // The studio adds a 30 ms end fade to each layer. Compare the graph voice before that envelope.
    const studio = renderSound({
      ...DEFAULT,
      graph: input.graph,
      volume: 0.6,
      duration: 0.5,
    }).wet;
    expect(replayGraph(snapshot).pcm).toEqual(studio.slice(0, snapshot.frames));
    expect(snapshot.capture).toBe("snapshot");
    expect(snapshot.events).toEqual([]);
    expect(snapshot).not.toHaveProperty("code");
    expect(snapshot.graph).not.toBe(input.graph);
  });
});
