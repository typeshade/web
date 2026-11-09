import type { FunctionGraphDocument } from "typeaudio/function-graph";
import { functionSourceKey } from "./sourceKey.ts";
import type {
  FunctionProblem,
  PreparedFunctions,
  CompositionRequest,
} from "./types.ts";

export class FunctionPreparationError extends Error {
  constructor(
    message: string,
    readonly problems: FunctionProblem[] = [],
  ) {
    super(message);
  }
}
let worker: Worker | undefined,
  sequence = 0;
const pending = new Map<
  number,
  {
    resolve: (p: PreparedFunctions) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
const cache = new Map<string, Promise<PreparedFunctions>>();

export function disposeFunctionCompiler() {
  worker?.terminate();
  worker = undefined;
  cache.clear();
  for (const entry of pending.values()) {
    clearTimeout(entry.timer);
    entry.reject(new Error("Function compiler stopped. Apply again to retry."));
  }
  pending.clear();
}

export function prepareFunctions(
  document: FunctionGraphDocument,
  synchronize = false,
  composition?: CompositionRequest,
): Promise<PreparedFunctions> {
  const key = `${synchronize ? "edit:" : ""}${functionSourceKey(document)}:${JSON.stringify(composition)}`,
    existing = cache.get(key);
  if (existing) return existing;
  if (!worker) {
    worker = new Worker(new URL("./compiler.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onerror = disposeFunctionCompiler;
    worker.onmessage = ({ data }) => {
      const entry = pending.get(data.id);
      if (!entry) return;
      pending.delete(data.id);
      clearTimeout(entry.timer);
      if (data.error)
        entry.reject(new FunctionPreparationError(data.error, data.problems));
      else entry.resolve(data.program);
    };
  }
  const id = ++sequence;
  const result = new Promise<PreparedFunctions>((resolve, reject) => {
    const timer = setTimeout(disposeFunctionCompiler, 30000);
    pending.set(id, { resolve, reject, timer });
    worker!.postMessage({ id, document, synchronize, composition });
  });
  if (cache.size >= 16) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  void result.catch(() => {
    if (cache.get(key) === result) cache.delete(key);
  });
  return result;
}
