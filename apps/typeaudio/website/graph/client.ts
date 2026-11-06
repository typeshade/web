import { graphKey, type SoundGraph } from "./model.ts";
import type { GraphProgram } from "./compiler.ts";
import type { Patch } from "../designer.ts";
let worker: Worker | undefined,
  nextId = 0;
const waiting = new Map<
  number,
  {
    resolve: (p: GraphProgram) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
const cache = new Map<string, Promise<GraphProgram>>();
function fail(message: string) {
  worker?.terminate();
  worker = undefined;
  cache.clear();
  for (const p of waiting.values()) {
    clearTimeout(p.timer);
    p.reject(new Error(message));
  }
  waiting.clear();
}
export function prepareGraph(graph: SoundGraph): Promise<GraphProgram> {
  const key = graphKey(graph),
    cached = cache.get(key);
  if (cached) return cached;
  if (!worker) {
    worker = new Worker(new URL("./compiler.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onerror = () => fail("Graph compiler failed. Retry Apply.");
    worker.onmessage = ({ data }) => {
      const request = waiting.get(data.id);
      if (!request) return;
      waiting.delete(data.id);
      clearTimeout(request.timer);
      if (data.error) request.reject(new Error(data.error));
      else request.resolve(data.program);
    };
  }
  const id = ++nextId;
  const promise = new Promise<GraphProgram>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        fail("Graph compilation timed out. Simplify the Code nodes and retry."),
      30000,
    );
    waiting.set(id, { resolve, reject, timer });
    worker!.postMessage({ id, graph });
  });
  if (cache.size >= 16) cache.delete(cache.keys().next().value!);
  cache.set(key, promise);
  void promise.catch(() => {
    if (cache.get(key) === promise) cache.delete(key);
  });
  return promise;
}
export async function patchPrograms(p: Patch): Promise<GraphProgram[]> {
  const graphs = [p, ...p.layers.map((l) => l.patch)].flatMap((p) =>
    p.graph ? [p.graph] : [],
  );
  return Promise.all(
    [...new Map(graphs.map((g) => [graphKey(g), g])).values()].map(
      prepareGraph,
    ),
  );
}
export async function loadGraphModule(
  code: string,
  install: (url: string) => Promise<unknown>,
) {
  const url = URL.createObjectURL(
    new Blob([code], { type: "text/javascript" }),
  );
  try {
    await install(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function disposeGraphCompiler() {
  fail("Graph compiler closed.");
}
