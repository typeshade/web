declare module "*live-kernel.shade.ts?audio-cpu" {
  export function liveBlock(
    out: Float32Array,
    state: Float32Array,
    clock: Uint32Array,
    params: Float32Array,
    frames: number,
    wave: Float32Array,
  ): void;
}
