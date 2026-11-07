import type {
  FunctionGraphDocument,
  FunctionGraphProgram,
} from "typeaudio/function-graph";
import { functionSourceKey } from "./sourceKey.ts";
import type { FunctionProblem } from "./types.ts";

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
    resolve: (p: FunctionGraphProgram) => void;
    reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();
const cache = new Map<string, Promise<FunctionGraphProgram>>();

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
): Promise<FunctionGraphProgram> {
  const key = functionSourceKey(document),
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
  const result = new Promise<FunctionGraphProgram>((resolve, reject) => {
    const timer = setTimeout(disposeFunctionCompiler, 30000);
    pending.set(id, { resolve, reject, timer });
    worker!.postMessage({ id, document });
  });
  if (cache.size >= 16) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  void result.catch(() => {
    if (cache.get(key) === result) cache.delete(key);
  });
  return result;
}
