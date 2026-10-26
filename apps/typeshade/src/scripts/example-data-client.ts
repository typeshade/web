// The example data the Worker serves (worker/index.ts, docs/cloudflare.md), as the pages read
// it. Every read fails soft: `astro dev`, `astro preview` and a host with no Worker answer
// /data/ with a 404 or an HTML page, and a page then shows what its build has and no more.
import type { DataLocale, ExampleRecord, ReleaseIndex } from '../lib/example-data.ts';

async function get<T>(path: string): Promise<T | undefined> {
  try {
    const res = await fetch(path, { headers: { accept: 'application/json' } });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return undefined;
    return (await res.json()) as T;
  } catch {
    return undefined;
  }
}

let index: Promise<ReleaseIndex | undefined> | undefined;

/** The current release's index, fetched once per page. */
export const fetchIndex = (): Promise<ReleaseIndex | undefined> =>
  (index ??= get<ReleaseIndex>('/data/examples/'));

/** One example with its file and its emitted text. */
export const fetchExample = (id: string): Promise<ExampleRecord | undefined> =>
  /^[a-z0-9][a-z0-9-]*$/.test(id)
    ? get<ExampleRecord>(`/data/examples/${id}/`)
    : Promise.resolve(undefined);

/** The page's language, as the data keys its words. */
export const pageLocale = (): DataLocale => document.documentElement.lang as DataLocale;

/** A line's inline marks as DOM: a code span, and a link's text. Written with nodes, so the
 *  text from the data never reaches the page as markup. */
export function inlineNodes(text: string): Node[] {
  const nodes: Node[] = [];
  const plain = text.replace(/\[([^\]]*)\]\([^)]+\)/g, '$1');
  plain.split(/(`[^`]*`)/).forEach((part) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
      const code = document.createElement('code');
      code.textContent = part.slice(1, -1);
      nodes.push(code);
    } else if (part) nodes.push(document.createTextNode(part));
  });
  return nodes;
}

/** A short link (/s/<id>) to the page at `path` with `fragment`, which the Worker stores in D1.
 *  Undefined where there is no Worker, or it refuses: the caller keeps the long link. */
export async function shortLink(path: string, fragment: string): Promise<string | undefined> {
  try {
    const res = await fetch('/data/shares/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ path, fragment }),
    });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return undefined;
    const { url } = (await res.json()) as { url?: unknown };
    return typeof url === 'string' ? url : undefined;
  } catch {
    return undefined;
  }
}

/** The fragment a short link stores (/data/shares/<id>/), which the Playground opens for
 *  `#share=<id>`. Undefined where there is no Worker or no such share. */
export async function fetchShare(id: string): Promise<string | undefined> {
  if (!/^[A-Za-z0-9_-]{8,43}$/.test(id)) return undefined;
  const share = await get<{ fragment?: unknown }>(`/data/shares/${id}/`);
  return typeof share?.fragment === 'string' ? share.fragment : undefined;
}

/** What became of a gallery submission: queued (or already queued), refused for the day, or
 *  not sent at all (no Worker, a refusal, the network). */
export type SubmitOutcome = 'sent' | 'already' | 'limit' | 'failed';

/** Sends the page at `path` with `fragment` to the gallery under `title`, with the still of its
 *  canvas in base64 where the Playground took one, and it waits there for the maintainer's
 *  approval (worker/index.ts). */
export async function submitToGallery(entry: {
  readonly path: string;
  readonly fragment: string;
  readonly title: string;
  readonly author: string;
  readonly locale: DataLocale;
  readonly still?: string;
}): Promise<SubmitOutcome> {
  try {
    const res = await fetch('/data/gallery/', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(entry),
    });
    if (res.status === 429) return 'limit';
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return 'failed';
    return res.status === 201 ? 'sent' : 'already';
  } catch {
    return 'failed';
  }
}

/** The notice over every page (worker/migrations/0005_notices.sql). */
export interface SiteNotice {
  readonly id: number;
  readonly text: Readonly<Record<DataLocale, string>>;
  readonly href: string | null;
}

/** The current notice, or undefined when there is none or no Worker to ask. */
export const fetchNotice = async (): Promise<SiteNotice | undefined> =>
  (await get<{ notice: SiteNotice | null }>('/data/notice/'))?.notice ?? undefined;
