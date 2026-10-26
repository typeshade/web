// The gallery's rows, read the same way by the site's Worker (worker/index.ts, GET
// /data/gallery/) and by the gallery's own (worker/gallery.ts). Only an approved submission is
// ever read here.
import type { GallerySort } from '../src/lib/gallery-data.ts';

export interface GalleryRow {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  /** The page the share opens, /playground/ or an example's page, in either language. */
  readonly path: string;
  readonly fragment: string;
  readonly views: number;
  readonly approvedAt: string;
  /** The still's content type, or null for an entry sent in before the Playground took one. */
  readonly still: string | null;
}

interface Raw {
  id: string;
  title: string;
  author: string;
  path: string;
  fragment: string;
  views: number;
  approved_at: string;
  thumbnail: string | null;
}

const SELECT = `SELECT s.share_id AS id, s.title, s.author, h.path, h.fragment, h.views,
  COALESCE(s.reviewed_at, s.created_at) AS approved_at, s.thumbnail
  FROM submissions s JOIN shares h ON h.id = s.share_id
  WHERE s.status = 'approved'`;

const ORDER: Record<GallerySort, string> = {
  recent: 'approved_at DESC, id',
  popular: 'h.views DESC, approved_at DESC, id',
};

const row = (raw: Raw): GalleryRow => ({
  id: raw.id,
  title: raw.title,
  author: raw.author,
  path: raw.path,
  fragment: raw.fragment,
  views: raw.views,
  approvedAt: raw.approved_at,
  still: raw.thumbnail,
});

/** The approved entries in the order asked for, at most `limit` of them. */
export async function listEntries(
  db: D1Database,
  sort: GallerySort,
  limit: number,
): Promise<GalleryRow[]> {
  const { results } = await db
    .prepare(`${SELECT} ORDER BY ${ORDER[sort]} LIMIT ?`)
    .bind(limit)
    .all<Raw>();
  return results.map(row);
}

/** One approved entry, or null when there is none by that id or it is not approved. */
export async function findEntry(db: D1Database, id: string): Promise<GalleryRow | null> {
  const raw = await db.prepare(`${SELECT} AND s.share_id = ?`).bind(id).first<Raw>();
  return raw ? row(raw) : null;
}
