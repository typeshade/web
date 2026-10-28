import { parseAnyRecord } from './records.ts';
import { RECORD_BYTES } from './definitions.ts';
export type SendOutcome =
  | { status: 'sent'; id: string; receivedAt: string }
  | { status: 'failed'; code: 'consent' | 'invalid' | 'rate' | 'unavailable' | 'network' };
/** Requires authorization from the Run action. Validation precedes the network operation. */
export async function postBenchmarkRecord(
  value: unknown,
  consent: boolean,
  send: typeof fetch = fetch,
): Promise<SendOutcome> {
  if (!consent) return { status: 'failed', code: 'consent' };
  let record;
  let body: string;
  try {
    record = parseAnyRecord(value);
    body = JSON.stringify({ consent: true, record });
    if (new TextEncoder().encode(body).length > RECORD_BYTES)
      return { status: 'failed', code: 'invalid' };
  } catch {
    return { status: 'failed', code: 'invalid' };
  }
  try {
    const response = await send('/data/benchmarks/records/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body,
    });
    if (!response.ok)
      return {
        status: 'failed',
        code:
          response.status === 429 ? 'rate' : response.status === 503 ? 'unavailable' : 'invalid',
      };
    const receipt = await response.json();
    if (
      receipt.id !== record.id ||
      typeof receipt.receivedAt !== 'string' ||
      !Number.isFinite(Date.parse(receipt.receivedAt))
    )
      return { status: 'failed', code: 'invalid' };
    return { status: 'sent', id: receipt.id, receivedAt: receipt.receivedAt };
  } catch {
    return { status: 'failed', code: 'network' };
  }
}
