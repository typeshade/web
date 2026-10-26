import { z } from 'zod';
import { parseAnyRecord as parseRecord } from '../src/lib/benchmarks/records.ts';
import {
  RECORD_BYTES,
  RETENTION_DAYS,
  HOURLY_LIMIT,
  DAILY_LIMIT,
} from '../src/lib/benchmarks/definitions.ts';

export const RETAINED_LIMIT = 10000;
const answer = (status: number, code: string, receipt?: { id: string; receivedAt: string }) =>
  new Response(JSON.stringify({ code, ...receipt }), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
const hash = async (s: string) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
const envelope = z.object({ consent: z.literal(true), record: z.unknown() }).strict();
async function body(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > RECORD_BYTES) {
      await reader.cancel();
      throw new Error('too-large');
    }
    chunks.push(value);
  }
  const data = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(data));
}
export async function cleanupBenchmarks(db: D1Database, now = Date.now()): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM benchmark_records WHERE expires <= ?').bind(now),
    db.prepare('DELETE FROM benchmark_rates WHERE expires <= ?').bind(now),
  ]);
}
/** No read endpoint for records. Maintainers export through authenticated Wrangler D1 access. */
export async function benchmarkRequest(
  request: Request,
  db: D1Database,
  now = Date.now(),
): Promise<Response> {
  if (new URL(request.url).pathname !== '/data/benchmarks/records/')
    return answer(404, 'not-found');
  if (request.method !== 'POST') return answer(405, 'method');
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    return answer(403, 'origin');
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json')
    return answer(415, 'content-type');
  if (Number(request.headers.get('content-length') ?? 0) > RECORD_BYTES)
    return answer(413, 'too-large');
  let record;
  try {
    record = parseRecord(envelope.parse(await body(request)).record);
  } catch (error) {
    return answer(
      error instanceof Error && error.message === 'too-large' ? 413 : 400,
      'invalid-record',
    );
  }
  // Client clocks are untrusted. Retention and limits use the server's time.
  const json = JSON.stringify(record);
  const digest = await hash(json);
  try {
    const existing = await db
      .prepare('SELECT digest, created FROM benchmark_records WHERE id = ?')
      .bind(record.id)
      .first<{ digest: string; created: number }>();
    if (existing)
      return answer(
        existing.digest === digest ? 200 : 409,
        existing.digest === digest ? 'duplicate' : 'conflict',
        existing.digest === digest
          ? { id: record.id, receivedAt: new Date(existing.created).toISOString() }
          : undefined,
      );
    const hour = Math.floor(now / 3600000);
    const day = Math.floor(now / 86400000);
    const address = request.headers.get('cf-connecting-ip') ?? 'unavailable';
    const key = `hour:${await hash(`${hour}:${address}`)}`;
    const consume = (id: string, max: number, expires: number) =>
      db
        .prepare(
          `INSERT INTO benchmark_rates (key, uses, expires) VALUES (?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET uses = uses + 1 WHERE uses < ? RETURNING uses`,
        )
        .bind(id, expires, max)
        .first();
    if (
      !(await consume(key, HOURLY_LIMIT, (hour + 1) * 3600000)) ||
      !(await consume(`day:${day}`, DAILY_LIMIT, (day + 1) * 86400000))
    )
      return answer(429, 'rate-limit');
    const inserted = await db
      .prepare(
        `INSERT OR IGNORE INTO benchmark_records (id, digest, created, expires, record)
      SELECT ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM benchmark_records) < ?`,
      )
      .bind(record.id, digest, now, now + RETENTION_DAYS * 86400000, json, RETAINED_LIMIT)
      .run();
    if (!inserted.meta.changes) {
      const row = await db
        .prepare('SELECT digest, created FROM benchmark_records WHERE id = ?')
        .bind(record.id)
        .first<{ digest: string; created: number }>();
      return row
        ? answer(
            row.digest === digest ? 200 : 409,
            row.digest === digest ? 'duplicate' : 'conflict',
            row.digest === digest
              ? { id: record.id, receivedAt: new Date(row.created).toISOString() }
              : undefined,
          )
        : answer(503, 'capacity');
    }
    return answer(201, 'stored', { id: record.id, receivedAt: new Date(now).toISOString() });
  } catch {
    return answer(503, 'unavailable');
  }
}
