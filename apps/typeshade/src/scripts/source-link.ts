// A source file carried in a link's fragment, the way the Playground writes and reads it. It is
// deflated where the browser has CompressionStream and passed through where it does not; the
// first character says which, so a link written by one browser opens in another. A live
// example links its file to the Playground with the same encoding.

const PACKED = 'z';
const PLAIN = 'u';

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encodeSource(source: string): Promise<string> {
  // A Blob built from the string is already UTF-8, so the same bytes feed the compressed path
  // and the plain one.
  const plain = new Blob([source]);
  if (typeof CompressionStream === 'function') {
    try {
      const packed = plain.stream().pipeThrough(new CompressionStream('deflate-raw'));
      return PACKED + toBase64Url(new Uint8Array(await new Response(packed).arrayBuffer()));
    } catch {
      // A browser that has the constructor but refuses the format falls through.
    }
  }
  return PLAIN + toBase64Url(new Uint8Array(await plain.arrayBuffer()));
}

export async function decodeSource(text: string): Promise<string | undefined> {
  if (text.length < 2) return undefined;
  try {
    const bytes = fromBase64Url(text.slice(1));
    if (text.startsWith(PLAIN)) return new TextDecoder().decode(bytes);
    if (!text.startsWith(PACKED) || typeof DecompressionStream !== 'function') return undefined;
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return await new Response(stream).text();
  } catch {
    return undefined;
  }
}

/** The shape of the Playground's frame where a link names none. */
export const PLAYGROUND_ASPECT = '4/3';

/** An aspect a link may name, as `width/height` in small whole numbers, or undefined for
 *  anything else, so a fragment cannot put an arbitrary string into a style. */
export function parseAspect(text: string | null | undefined): [number, number] | undefined {
  const match = /^([1-9]\d?)\/([1-9]\d?)$/.exec(text ?? '');
  return match ? [Number(match[1]), Number(match[2])] : undefined;
}

/** What a live example shows beside its file: the shape of its canvas and its controls, the
 *  range and the value each one stands at. The Playground opens the file under them, so it
 *  draws the picture the page draws. */
export interface LinkedView {
  readonly aspect?: string;
  readonly files?: Readonly<Record<string, string>>;
  readonly fileName?: string;
  readonly controls?: Readonly<Record<string, unknown>>;
}

/** The Playground at `base`, opened on `source`, under `view` where it differs from the
 *  Playground's own. */
export async function playgroundLink(
  base: string,
  source: string,
  view: LinkedView = {},
): Promise<string> {
  const parts = [`code=${await encodeSource(source)}`];
  if (view.aspect && view.aspect !== PLAYGROUND_ASPECT && parseAspect(view.aspect))
    parts.push(`aspect=${view.aspect}`);
  if (view.controls && Object.keys(view.controls).length > 0)
    parts.push(`controls=${await encodeSource(JSON.stringify(view.controls))}`);
  if (view.files && Object.keys(view.files).length)
    parts.push(`files=${await encodeSource(JSON.stringify(view.files))}`);
  if (view.fileName) parts.push(`name=${encodeURIComponent(view.fileName)}`);
  return `${base}#${parts.join('&')}`;
}
