// The page's half of a host.ts run: the sandboxed frame the run happens in, and the messages it
// sends back. The frame is `<iframe sandbox="allow-scripts">` with no `allow-same-origin`, so its
// origin is opaque and the code in it reaches nothing of the page. It loads one script, the
// runtime bundle Vite builds from playground-host-frame.ts, after the build the language worker
// made of host.ts. A run ends by removing the frame, which takes its animation, its GPU device
// and its timers with it.
import frameScript from './playground-host-frame.ts?worker&url';
import type { FrameMessage, FramePlan } from './playground-host-frame.ts';

export type { FrameMessage, FramePlan };

/** What the page hears from a run: the frame's messages, and `unloaded` when the runtime
 *  bundle did not load in the frame. */
export type HostEvent = FrameMessage | { readonly kind: 'unloaded' };

export interface HostRun {
  readonly frame: HTMLIFrameElement;
  stop(): void;
}

/** A value written into an inline script: no `</script>` can close it early. */
const inline = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const attribute = (text: string): string => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** Puts a frame running `plan` into `container`, over what it holds. `background` is the colour
 *  the frame shows where host.ts draws nothing; `title` names the frame for assistive tech. */
export function startHostFrame(
  container: HTMLElement,
  plan: FramePlan,
  onEvent: (event: HostEvent) => void,
  options: { readonly background: string; readonly title: string },
): HostRun {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.dataset.hostFrame = '';
  frame.title = options.title;
  const script = new URL(frameScript, window.location.href).toString();
  frame.srcdoc =
    '<!doctype html><html><head><meta charset="utf-8">' +
    `<style>html,body{margin:0;height:100%;overflow:hidden;background:${options.background}}` +
    'canvas{display:block;width:100%;height:100%}</style></head><body><canvas></canvas>' +
    `<script>window.__typeshadeHost=${inline(plan)};</script>` +
    `<script src="${attribute(script)}" onerror="parent.postMessage({typeshadeHost:{kind:'unloaded'}},'*')"></script>` +
    '</body></html>';
  const listen = (event: MessageEvent): void => {
    if (event.source !== frame.contentWindow) return;
    const message = (event.data as { typeshadeHost?: HostEvent } | null)?.typeshadeHost;
    if (message && typeof message.kind === 'string') onEvent(message);
  };
  window.addEventListener('message', listen);
  container.append(frame);
  return {
    frame,
    stop() {
      window.removeEventListener('message', listen);
      frame.remove();
    },
  };
}
