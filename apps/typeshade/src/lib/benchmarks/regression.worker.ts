import { regressionCatalog } from './regression-contract.ts';
import { APPLICATIONS } from './workloads.ts';
import { PROFILES, type Profile } from './definitions.ts';

self.onmessage = async ({ data }: { data: { profile: Profile; seed: number } }) => {
  if (!(data.profile in PROFILES)) return;
  const workers = [0, 1].map(
    () => new Worker(new URL('./version.worker.ts', import.meta.url), { type: 'module' }),
  );
  let sequence = 0;
  const request = (build: number, command: string, args: object = {}) =>
    new Promise<any>((resolve, reject) => {
      const id = ++sequence;
      const worker = workers[build]!;
      worker.onmessage = ({ data }) => {
        if (data.sequence !== id) return;
        if (data.error) reject(data);
        else resolve(data.value);
      };
      worker.onerror = () => reject({});
      worker.postMessage({ sequence: id, build, command, ...args });
    });
  const send = (data: unknown) => self.postMessage(data);
  try {
    const peers = [];
    const loadMs = [];
    for (let build = 0; build < 2; build++) {
      const x = await request(build, 'init');
      peers.push(x.metadata);
      loadMs.push(x.loadMs);
      if (x.unsupported) {
        send({ type: 'metadata', metadata: peers[0], peers, loadMs });
        send({ type: 'done', status: 'unsupported' });
        return;
      }
    }
    send({ type: 'metadata', metadata: peers[0], peers, loadMs });
    const config = PROFILES[data.profile];
    const cases = [...regressionCatalog.builds[0]!.cases.map((e) => e.id), ...APPLICATIONS];
    for (const n of config.sizes)
      for (const id of cases) {
        send({ type: 'progress', id, n });
        const order = [data.seed % 2, (data.seed + 1) % 2];
        const counts: number[] = [];
        for (const build of order) counts.push((await request(build, 'prepare', { id, n })).count);
        const count = Math.max(...counts);
        for (const build of order) await request(build, 'warmup', { count, warmup: config.warmup });
        for (let sample = 0; sample < config.samples; sample++)
          for (let j = 0; j < 2; j++) await request((data.seed + sample + j) % 2, 'sample');
        // Retain a complete pair together when cancellation interrupts a later case.
        const pair = [];
        for (let build = 0; build < 2; build++) pair.push((await request(build, 'finish')).row);
        for (const row of pair) send({ type: 'result', row });
      }
    send({ type: 'done', status: 'complete' });
  } catch (error: any) {
    if (error?.row) send({ type: 'result', row: error.row });
    send({ type: 'done', status: 'failed' });
  } finally {
    for (let i = 0; i < 2; i++) {
      try {
        await request(i, 'close');
      } catch {
        /* A failed worker may already be gone. */
      }
      workers[i]!.terminate();
    }
  }
};
