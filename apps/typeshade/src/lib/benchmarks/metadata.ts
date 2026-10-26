import type { Metadata } from './contract.ts';
export function benchmarkMetadata(
  adapter: GPUAdapter | null,
  runtime?: Metadata['runtime'],
): Metadata {
  let webgl: Metadata['webgl'] = {
    state: 'unavailable',
    debugExtension: false,
    vendor: null,
    renderer: null,
    unmaskedVendor: null,
    unmaskedRenderer: null,
  };
  try {
    const gl = new OffscreenCanvas(1, 1).getContext('webgl2');
    if (gl) {
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const text = (key: number) => {
        const x: unknown = gl.getParameter(key);
        return typeof x === 'string' && x ? x.slice(0, 512) : null;
      };
      webgl = {
        state: 'available',
        debugExtension: !!debug,
        vendor: text(gl.VENDOR),
        renderer: text(gl.RENDERER),
        unmaskedVendor: debug ? text(debug.UNMASKED_VENDOR_WEBGL) : null,
        unmaskedRenderer: debug ? text(debug.UNMASKED_RENDERER_WEBGL) : null,
      };
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    /* Renderer details can be redacted. */
  }
  return {
    userAgent: navigator.userAgent.slice(0, 512),
    ...(runtime ? { runtime } : {}),
    webgl,
    webgpu: {
      available: !!adapter,
      vendor: adapter?.info.vendor ?? '',
      architecture: adapter?.info.architecture ?? '',
      device: adapter?.info.device ?? '',
      description: adapter?.info.description ?? '',
      fallback: adapter?.info.isFallbackAdapter ?? null,
      timestamps: adapter?.features.has('timestamp-query') ?? false,
      features: adapter ? [...adapter.features].sort() : [],
      limits: {
        maxBufferSize: adapter?.limits.maxBufferSize ?? 0,
        maxStorageBufferBindingSize: adapter?.limits.maxStorageBufferBindingSize ?? 0,
        maxComputeInvocationsPerWorkgroup: adapter?.limits.maxComputeInvocationsPerWorkgroup ?? 0,
      },
    },
  };
}
