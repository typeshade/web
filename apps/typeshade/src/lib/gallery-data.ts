// The gallery's contract, shared by the site's Worker (worker/index.ts), which takes a
// submission, the gallery's Worker (worker/gallery.ts), which serves gallery.typeshade.dev,
// and the page the build writes for it (src/components/pages/GalleryPage.astro). docs/cloudflare.md describes the whole.

/** Where the gallery answers. Its page is built at GALLERY_ROUTE on the site and served
 *  here by worker/gallery.ts, which writes each link to the address it answers at. */
export const GALLERY_ORIGIN = 'https://gallery.typeshade.dev';

/** The built list page, which worker/gallery.ts fills in with the approved entries. */
export const GALLERY_ROUTE = '/gallery/';

/** The still a submission carries: the canvas, cropped to fill this box. */
export const GALLERY_STILL_WIDTH = 640;
export const GALLERY_STILL_HEIGHT = 360;
/** The largest still the Worker keeps, in bytes, as it arrives (before base64). */
export const GALLERY_STILL_BYTES = 256 * 1024;

/** The orders the list page takes, as its `sort` query parameter. The first is the default. */
export const GALLERY_SORTS = ['recent', 'popular'] as const;
export type GallerySort = (typeof GALLERY_SORTS)[number];

/** Where an entry's still is kept in the DATA bucket. */
export const galleryStillKey = (id: string): string => `gallery/${id}`;

/** The file extension a still's address carries for its type. typeshade.dev's zone redirects a
 *  path with no extension to the same path with a trailing slash before any Worker runs, so a
 *  still answers at `/stills/<id>.<extension>`. */
const STILL_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

/** Where an entry's still answers, under `prefix` (`/stills` on the gallery, `/review/stills`
 *  on the review page). */
export const galleryStillPath = (prefix: string, id: string, type: string): string =>
  `${prefix}/${id}.${STILL_EXTENSIONS[type] ?? 'webp'}`;

/** The still's id in a path galleryStillPath wrote under `prefix`, or undefined. */
export function galleryStillId(prefix: string, path: string): string | undefined {
  if (!path.startsWith(`${prefix}/`)) return undefined;
  return /^([A-Za-z0-9_-]{8,43})\.(?:webp|jpg|png)$/.exec(path.slice(prefix.length + 1))?.[1];
}
