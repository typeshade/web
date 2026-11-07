import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { DEFAULT } from "../website/sound/defaultPatch.ts";
import { validateScene } from "../website/video-model.ts";
import { encodeProject } from "../website/project/encodeProject.ts";
import {
  createStudyGraph,
  type StudyLayer,
} from "./projects/createStudyGraph.ts";

const source = resolve(process.argv[2]);
const sessionBytes = await readFile(join(source, "session.json"));
const session = JSON.parse(sessionBytes.toString());
const delivery = JSON.parse(
  await readFile(join(source, "delivery-manifest.json"), "utf8"),
);
if (session.schema !== "typeaudio.sound-design-study" || session.version !== 1)
  throw new Error("Use the versioned Frieren study source directory.");
const out = resolve("website/public/projects");
await mkdir(out, { recursive: true });
const programs: Record<string, string> = {};
const sha = (data: string | Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
const artifacts = [];
for (const study of session.studies)
  for (const variant of study.variants) {
    const id = `frieren-${study.id}-${variant.id}`;
    const layers = study.layers as StudyLayer[];
    // Open on the principal source; all background and contact layers remain in the timeline.
    const hero =
      study.id === "red"
        ? "red-core"
        : study.id === "force"
          ? "force-pressure"
          : "finale-beam";
    const ordered = [...layers].sort(
      (a, b) => Number(b.id === hero) - Number(a.id === hero),
    );
    const cues = [];
    for (const original of ordered) {
      const layer: StudyLayer = {
        ...original,
        ...variant.changes[original.id],
      };
      programs[layer.family] ??= await readFile(
        join(source, "programs", layer.family + ".txt"),
        "utf8",
      );
      const graph = createStudyGraph(layer, programs[layer.family]);
      cues.push({
        id: layer.id,
        name: layer.role,
        time: layer.start,
        muted: false,
        gain: 10 ** (layer.gainDb / 20),
        patch: {
          ...structuredClone(DEFAULT),
          graph,
          duration: layer.duration,
          volume: 0.7,
          filter: false,
          distortion: false,
        },
        space: {
          points: layer.position.map(([time, x, y, z]) => ({ time, x, y, z })),
          spread: layer.spread,
          send: layer.roomSend,
        },
      });
    }
    const trim = delivery.variants.find(
      (v: { name: string }) => v.name === `${study.id}-${variant.id}`,
    ).gainDb;
    const scene = validateScene({
      version: 1,
      name: `Frieren · ${study.id} · ${variant.id}`,
      media: {
        kind: "youtube",
        name: "Frieren sound-design reference",
        id: "YHCqcyX9N3s",
      },
      start: study.range[0],
      end: study.range[1],
      loop: false,
      original: 0,
      effects: 1,
      cues,
      space: {
        room: session.room,
        listener: session.listener,
        gainDb: trim,
        highpassHz: 27,
      },
      origin: {
        id,
        revision: delivery.sourceCommit,
        author: "TypeAudio sound-design agent",
        notes: `${variant.label}. Editable procedural effects study; listening review pending. Source code and amplitude envelopes are separate Code nodes. The picture range excludes the review file's extra tail handle. YouTube alignment is approximate.`,
      },
    });
    const bytes = JSON.stringify(encodeProject(scene), null, 2) + "\n";
    await writeFile(join(out, id + ".json"), bytes);
    artifacts.push({
      id,
      bytes: Buffer.byteLength(bytes),
      sha256: sha(bytes),
      layers: cues.length,
    });
  }
await writeFile(
  join(out, "provenance.json"),
  JSON.stringify(
    {
      sourceRepository: "typeshade/typeaudio",
      sourceCommit: delivery.sourceCommit,
      sessionSha256: sha(sessionBytes),
      programs: Object.fromEntries(
        Object.entries(programs).map(([name, code]) => [name, sha(code)]),
      ),
      artifacts,
      note: "Source-only editable editions. Preview uses the editor's source taper and the stored picture range; it is not a bit-identical copy of the review master.",
    },
    null,
    2,
  ) + "\n",
);
console.log(`Exported ${artifacts.length} editable source projects.`);
