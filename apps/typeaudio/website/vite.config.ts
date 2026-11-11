import { defineConfig } from 'vite';
import { typeshade } from 'typeshade/vite';
import { audioCpu } from './audio-cpu-plugin.ts';
import { engineAliases, feedbackVersions } from '../scripts/engine-config.ts';
export default defineConfig({
  root: 'website',
  resolve: { alias: engineAliases },
  define: { __TYPEAUDIO_VERSIONS__: JSON.stringify(feedbackVersions()) },
  plugins: [audioCpu(), typeshade()],
  // Keep the resident registry and fuse executor in one worker module. A split chunk
  // can import the entry again under a different URL, creating a second runtime.
  worker: {
    format: 'es',
    plugins: () => [audioCpu(), typeshade()],
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2022', rollupOptions: { input: { main: 'website/index.html', studio: 'website/studio/index.html', video: 'website/studio/video/index.html' } } },
});
