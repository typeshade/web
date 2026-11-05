import {
  MAX_AUDIO_ASSETS,
  MAX_LIBRARY_FRAMES,
  validateAudioRef,
  validatePcm,
  type AudioAsset,
  type AudioAssetRef,
} from "../audio-asset.ts";
export const AUDIO_DB = "typeaudio.audio.v1";
/** Immutable PCM is stored separately from small, undoable document references. */
export class AudioLibrary {
  private connection?: Promise<IDBDatabase>;
  private cache = new Map<string, Float32Array>();
  private db(): Promise<IDBDatabase> {
    if (!this.connection)
      this.connection = new Promise((resolve, reject) => {
        const request = indexedDB.open(AUDIO_DB, 1);
        let blocked = false;
        request.onupgradeneeded = () => {
          const db = request.result;
          db.createObjectStore("info", { keyPath: "id" });
          db.createObjectStore("pcm");
        };
        request.onsuccess = () => {
          const db = request.result;
          if (blocked) {
            db.close();
            return;
          }
          db.onversionchange = () => {
            db.close();
            this.connection = undefined;
            this.cache.clear();
          };
          resolve(db);
        };
        request.onerror = () => {
          this.connection = undefined;
          reject(
            new Error(
              "Audio storage is unavailable. Allow browser storage and try again.",
            ),
          );
        };
        request.onblocked = () => {
          blocked = true;
          this.connection = undefined;
          reject(
            new Error(
              "Close other TypeAudio tabs and retry to open audio storage.",
            ),
          );
        };
      });
    return this.connection;
  }
  async list(): Promise<AudioAssetRef[]> {
    const db = await this.db();
    return new Promise((resolve, reject) => {
      const req = db.transaction("info").objectStore("info").getAll();
      req.onsuccess = () => {
        try {
          resolve(req.result.map(validateAudioRef));
        } catch (error) {
          reject(error);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }
  async put(assets: AudioAsset[]): Promise<void> {
    if (!assets.length) return;
    for (const a of assets) {
      validateAudioRef(a);
      validatePcm(a.pcm);
      if (a.frames !== a.pcm.length)
        throw new Error("Audio source length mismatch.");
    }
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["info", "pcm"], "readwrite"),
        info = tx.objectStore("info"),
        req = info.getAll();
      let failure: Error | undefined;
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () =>
        reject(
          failure ??
            new Error(
              "Could not save audio. Free browser storage and try again.",
            ),
        );
      req.onsuccess = () => {
        const all = new Map<string, AudioAssetRef>(
          req.result.map((a: AudioAssetRef) => [a.id, a]),
        );
        for (const a of assets) all.set(a.id, validateAudioRef(a));
        if (
          all.size > MAX_AUDIO_ASSETS ||
          [...all.values()].reduce((n, a) => n + a.frames, 0) >
            MAX_LIBRARY_FRAMES
        ) {
          failure = new Error(
            "Audio library limit: 24 files and 120 seconds total. Remove unused audio and try again.",
          );
          tx.abort();
          return;
        }
        for (const a of assets) {
          info.put(validateAudioRef(a));
          tx.objectStore("pcm").put(a.pcm, a.id);
        }
      };
    });
    for (const a of assets) this.cache.set(a.id, a.pcm);
  }
  async read(ref: AudioAssetRef): Promise<Float32Array> {
    const cached = this.cache.get(ref.id);
    if (cached) {
      if (cached.length !== ref.frames)
        throw new Error("Audio source length mismatch.");
      return cached;
    }
    const db = await this.db();
    const pcm = await new Promise<Float32Array | undefined>(
      (resolve, reject) => {
        const req = db.transaction("pcm").objectStore("pcm").get(ref.id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );
    if (!pcm)
      throw new Error(
        `Missing audio: ${ref.name}. Import the original file or reopen a project with embedded audio.`,
      );
    validatePcm(pcm);
    if (pcm.length !== ref.frames)
      throw new Error("Audio source length mismatch.");
    this.cache.set(ref.id, pcm);
    return pcm;
  }
  async remove(id: string): Promise<void> {
    const db = await this.db();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["info", "pcm"], "readwrite");
      tx.objectStore("info").delete(id);
      tx.objectStore("pcm").delete(id);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(new Error("Could not remove audio from browser storage."));
    });
    this.cache.delete(id);
  }
  close() {
    void this.connection?.then(
      (db) => db.close(),
      () => {},
    );
    this.connection = undefined;
    this.cache.clear();
  }
}
