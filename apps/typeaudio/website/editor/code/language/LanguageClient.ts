import type {
  LanguageDocument,
  LanguageMethod,
  LanguageReply,
  LanguageResults,
} from "./types.ts";

/** Owns one lazy language worker. Its lifetime follows the editor's models, not audio playback. */
export class LanguageClient {
  private worker?: Worker;
  private nextId = 0;
  private documents = new Set<string>();
  private pending = new Map<
    number,
    {
      uri: string;
      version: number;
      resolve: (value: LanguageResults[LanguageMethod]) => void;
      reject: (error: Error) => void;
      cleanup: () => void;
    }
  >();

  retain(uri: string) {
    this.documents.add(uri);
  }
  release(uri: string) {
    this.documents.delete(uri);
    this.worker?.postMessage({ close: uri });
    for (const [id, request] of this.pending) {
      if (request.uri !== uri) continue;
      this.pending.delete(id);
      request.cleanup();
      request.reject(new Error("Code document closed."));
    }
    if (!this.documents.size) {
      this.worker?.terminate();
      this.worker = undefined;
    }
  }
  private fail(message: string) {
    this.worker?.terminate();
    this.worker = undefined;
    for (const request of this.pending.values()) {
      request.cleanup();
      request.reject(new Error(message));
    }
    this.pending.clear();
  }
  request<K extends LanguageMethod>(
    method: K,
    document: LanguageDocument,
    options: {
      position?: { line: number; character: number };
      newName?: string;
      signal?: AbortSignal;
    } = {},
  ): Promise<LanguageResults[K]> {
    if (options.signal?.aborted)
      return Promise.reject(new Error("Language request cancelled."));
    if (!this.worker) {
      this.worker = new Worker(
        new URL("./language.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker.onerror = () =>
        this.fail(
          "The TypeShade language service could not load. Retry analysis.",
        );
      this.worker.onmessageerror = () =>
        this.fail("The language service returned an unreadable response.");
      this.worker.onmessage = ({ data }: MessageEvent<LanguageReply>) => {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        this.pending.delete(data.id);
        pending.cleanup();
        if (data.uri !== pending.uri || data.version !== pending.version)
          pending.reject(
            new Error(
              "The language service returned a stale document response.",
            ),
          );
        else if (data.error) pending.reject(new Error(data.error));
        else pending.resolve(data.result);
      };
    }
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const abort = () => {
        const request = this.pending.get(id);
        if (!request) return;
        this.pending.delete(id);
        request.cleanup();
        reject(new Error("Language request cancelled."));
      };
      const timer = setTimeout(
        () => this.fail("TypeShade analysis timed out. Retry analysis."),
        20000,
      );
      const cleanup = () => {
        clearTimeout(timer);
        options.signal?.removeEventListener("abort", abort);
      };
      this.pending.set(id, {
        uri: document.uri,
        version: document.version,
        resolve: (value) => resolve(value as LanguageResults[K]),
        reject,
        cleanup,
      });
      options.signal?.addEventListener("abort", abort, { once: true });
      try {
        this.worker!.postMessage({
          id,
          method,
          document,
          position: options.position,
          newName: options.newName,
        });
      } catch {
        this.fail(
          "The TypeShade language service could not receive this document. Retry analysis.",
        );
      }
    });
  }
}

export const languageClient = new LanguageClient();
