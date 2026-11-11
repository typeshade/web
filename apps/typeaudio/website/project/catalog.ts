/**
 * The published example projects. Each opens as an editable copy. The files are made by the
 * TypeAudio engine's exporters, and `public/projects/provenance.json` records each one's source.
 */
export const EXAMPLES = [
  {
    id: "unseen-force-wall-hit",
    title: "Unseen force: wall hit",
    status: "Work in progress",
    range: "02:16.5–02:32.2",
    layers: 12,
    detail:
      "A body hits a stone wall: twelve sound events from the TypeAudio engine, each a set of TypeShade function nodes with level controls. The rest of the passage is not here yet, so it sounds incomplete.",
  },
] as const;

export type ExampleId = (typeof EXAMPLES)[number]["id"];

export const isExample = (id: string): id is ExampleId =>
  EXAMPLES.some((p) => p.id === id);

/**
 * Examples that are no longer published, and what their old `/?project=` links open now.
 * `function-impact` was the same source as the Function sound starting point.
 */
export const RETIRED_EXAMPLES: Record<string, "function" | null> = {
  "function-impact": "function",
  "frieren-red-A": null,
  "frieren-red-B": null,
  "frieren-force-A": null,
  "frieren-force-B": null,
  "frieren-finale-A": null,
  "frieren-finale-B": null,
};

export function projectUrl(id: string): string {
  if (!isExample(id))
    throw new Error(
      id in RETIRED_EXAMPLES
        ? "This example is no longer published. Choose an example on the start screen."
        : "Unknown example project.",
    );
  return `/projects/${id}.json`;
}
