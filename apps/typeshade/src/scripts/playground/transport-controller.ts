import type { MountedShader } from '../../lib/shader-runtime.ts';
import type { BindingsModel } from '../playground-bindings.ts';
import type { PlaygroundCopy } from './contracts.ts';
import { el } from './view-helpers.ts';
interface TransportState {
  readonly mounted: MountedShader | undefined;
  readonly bindings: BindingsModel;
}
/** Owns playback time and viewport controls; compiler and workspace state stay elsewhere. */
export function createTransportController(
  root: HTMLElement,
  copy: PlaygroundCopy,
  state: TransportState,
) {
  const w = copy.workspace;
  const frame = root.querySelector('[data-gpu-frame]');

  /** The shader clock when it is held: under `prefers-reduced-motion`, at the three seconds a
   *  live example holds it at, or wherever a check pins it to compare two engines on one
   *  frame. Null lets it run. The rasteriser draws at this time, or at 0 when it runs. */
  let frozen: number | null =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 3
      : null;

  /** The transport's clock over the runtime's. The runtime counts seconds from its mount and
   *  the canvas draws at that count less `clockOffset`, which Restart moves to the count it
   *  has reached; Pause holds the drawn time at `clockHeld` until Play takes it up again from
   *  there. A check's `frozen` wins over both. */
  let clockOffset = 0;

  let clockHeld: number | null = null;

  let runtimeSeconds = 0;

  const shaderClock = (seconds: number): number => {
    runtimeSeconds = seconds;
    return frozen ?? clockHeld ?? Math.max(0, seconds - clockOffset);
  };

  const playButton = root.querySelector('[data-play]');

  const restartButton = root.querySelector('[data-restart]');

  const clockOut = root.querySelector('[data-clock]');

  const fpsOut = root.querySelector('[data-fps]');

  const fullscreenButton = root.querySelector('[data-fullscreen]');

  const dropHint = root.querySelector('[data-drop-hint]');

  const shownTime = (): number => frozen ?? clockHeld ?? Math.max(0, runtimeSeconds - clockOffset);

  const paintClock = (): void => {
    if (clockOut instanceof HTMLElement) clockOut.textContent = `${shownTime().toFixed(2)}s`;
  };

  const syncPlay = (): void => {
    if (!(playButton instanceof HTMLButtonElement)) return;
    const held = clockHeld !== null;
    const word = held ? w.play : w.pause;
    playButton.setAttribute('aria-pressed', String(held));
    playButton.setAttribute('aria-label', word);
    playButton.title = word;
    playButton.querySelector('[data-icon-pause]')?.toggleAttribute('hidden', held);
    playButton.querySelector('[data-icon-play]')?.toggleAttribute('hidden', !held);
  };

  if (playButton instanceof HTMLButtonElement) {
    playButton.addEventListener('click', () => {
      if (clockHeld === null) clockHeld = shownTime();
      else {
        clockOffset = runtimeSeconds - clockHeld;
        clockHeld = null;
      }
      syncPlay();
      paintClock();
      // Pause holds the frame with the clock, so a pass that reads its frame before stands
      // still with it (compiler change 0026).
      state.mounted?.holdFrames(clockHeld !== null);
      state.mounted?.redraw();
    });
  }

  if (restartButton instanceof HTMLButtonElement) {
    restartButton.addEventListener('click', () => {
      clockOffset = runtimeSeconds;
      if (clockHeld !== null) clockHeld = 0;
      // Back to frame 0, and every pass's output dropped, so a pass that reads its frame
      // before starts again from nothing (compiler change 0026).
      state.mounted?.restart();
      paintClock();
      state.mounted?.redraw();
    });
  }

  // The readout follows the canvas four times a second, and the rate is the frames the mount
  // counted over the last second. Nothing is written while the tool is out of view.
  let lastFrames = 0;

  let lastSample = performance.now();

  window.setInterval(() => {
    if (document.hidden || root.dataset.view === 'gallery') return;
    paintClock();
    const now = performance.now();
    if (now - lastSample < 1000) return;
    const frames = state.mounted?.frames ?? 0;
    const rate =
      state.mounted && state.mounted.backend !== 'none'
        ? ((frames - lastFrames) * 1000) / (now - lastSample)
        : 0;
    lastFrames = frames;
    lastSample = now;
    if (fpsOut instanceof HTMLElement)
      fpsOut.textContent = rate > 0 && clockHeld === null ? `${Math.round(rate)} fps` : '';
  }, 250);

  if (fullscreenButton instanceof HTMLButtonElement && frame instanceof HTMLElement) {
    fullscreenButton.hidden = typeof frame.requestFullscreen !== 'function';
    fullscreenButton.addEventListener('click', () => {
      if (document.fullscreenElement === frame) void document.exitFullscreen().catch(() => {});
      else void frame.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === frame;
      fullscreenButton.setAttribute('aria-label', on ? w.exitFullscreen : w.fullscreen);
      fullscreenButton.title = on ? w.exitFullscreen : w.fullscreen;
    });
  }

  // A picture dropped on the canvas goes to the module's first 2D texture, the way a
  // Shadertoy pane takes a file on its first channel. The line under the transport names the
  // texture while the module has one.
  const syncDropHint = (): void => {
    if (!(dropHint instanceof HTMLElement)) return;
    const target = state.bindings.imageTarget();
    dropHint.hidden = target === undefined;
    dropHint.textContent = '';
    if (target === undefined) return;
    const [before, after] = w.dropHint.split(`\`{texture}\``);
    dropHint.append(before ?? '', el('code', undefined, target), after ?? '');
  };

  if (frame instanceof HTMLElement) {
    frame.addEventListener('dragover', (event) => {
      if (state.bindings.imageTarget() === undefined) return;
      event.preventDefault();
      frame.classList.add('dropping');
    });
    frame.addEventListener('dragleave', () => frame.classList.remove('dropping'));
    frame.addEventListener('drop', (event) => {
      frame.classList.remove('dropping');
      const file = event.dataTransfer?.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      event.preventDefault();
      void state.bindings.dropImage(file);
    });
  }
  return {
    shaderClock,
    syncPlay,
    syncDropHint,
    get frozen() {
      return frozen;
    },
    set frozen(value: number | null) {
      frozen = value;
    },
    get clockHeld() {
      return clockHeld;
    },
    resetMount() {
      clockOffset = 0;
      runtimeSeconds = 0;
    },
  };
}
