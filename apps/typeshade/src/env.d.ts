/// <reference types="astro/client" />
/// <reference types="@webgpu/types" />

// The URL of the declarations the Playground's host.ts is checked against
// (scripts/playground-host-types.mjs).
declare module 'virtual:playground-host-types' {
  const url: string;
  export default url;
}
