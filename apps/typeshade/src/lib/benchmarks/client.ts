import type { Copy } from '../../i18n/index.ts';
import type { Metadata } from './contract.ts';
import { regressionCatalog, regressionRows, type RegressionRecord } from './regression-contract.ts';
import { postBenchmarkRecord } from './send-record.ts';
import { INSTRUMENT_REVISION, WORKLOAD_REVISION } from './workloads.ts';
import { PROFILES, type Profile } from './definitions.ts';
import { renderReport } from './render-report.ts';

export function mountBenchmarks(root: HTMLElement): void {
  const get = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-${name}]`)!;
  const copy = JSON.parse(get('benchmark-copy').textContent!) as Copy['benchmarks'];
  const run = get<HTMLButtonElement>('run');
  const stop = get<HTMLButtonElement>('stop');
  const send = get<HTMLButtonElement>('send');
  const download = get<HTMLButtonElement>('download');
  const profile = get<HTMLSelectElement>('profile');
  const controls = get<HTMLFieldSetElement>('controls');
  const status = get('status');
  const progress = get<HTMLProgressElement>('progress');
  let worker: Worker | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let record: RegressionRecord | undefined;
  let sending = false;
  let received = false;
  const refresh = () => {
    run.disabled = !!worker || sending;
    stop.disabled = !worker;
    controls.disabled = !!worker || sending;
    send.disabled = !record || !!worker || sending || received;
    download.disabled = !record || !!worker;
  };
  const inspect = () => {
    if (!record) return;
    get('record').textContent = JSON.stringify(record, null, 2);
    const m = record.metadata;
    get('device').hidden = false;
    get('webgpu').textContent =
      [
        ...new Set(
          [m.webgpu.vendor, m.webgpu.architecture, m.webgpu.device, m.webgpu.description].filter(
            Boolean,
          ),
        ),
      ].join(', ') || copy.unavailable;
    get('webgl').textContent = m.webgl.unmaskedRenderer || m.webgl.renderer || copy.unavailable;
    get('software').hidden =
      ![m.webgpu.description, m.webgpu.device, m.webgpu.architecture].some((s) =>
        /swiftshader|llvmpipe|software rasterizer/i.test(s),
      ) && m.webgpu.fallback !== true;
  };
  const finish = (state: RegressionRecord['status']) => {
    worker?.terminate();
    worker = undefined;
    clearTimeout(timer);
    if (record) {
      record.status = state;
      record.finished = new Date().toISOString();
      inspect();
      renderReport(root, record, copy);
    }
    status.textContent = copy[state];
    progress.hidden = true;
    refresh();
    void sendRecord();
  };
  for (const name of ['metric', 'size'])
    get(name).addEventListener('change', () => {
      if (record) renderReport(root, record, copy);
    });
  stop.addEventListener('click', () => finish('cancelled'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && worker) finish('cancelled');
  });
  document.addEventListener('benchmark-start', (event) => {
    if ((event as CustomEvent).detail !== root && worker) finish('cancelled');
  });
  window.addEventListener('pagehide', () => {
    worker?.terminate();
    clearTimeout(timer);
  });
  run.addEventListener('click', () => {
    if (worker || sending) return;
    document.dispatchEvent(new CustomEvent('benchmark-start', { detail: root }));
    const p = profile.value as Profile;
    const empty: Metadata = {
      userAgent: navigator.userAgent.slice(0, 512),
      webgpu: {
        available: false,
        vendor: '',
        architecture: '',
        device: '',
        description: '',
        fallback: null,
        timestamps: false,
        features: [],
        limits: {
          maxBufferSize: 0,
          maxStorageBufferBindingSize: 0,
          maxComputeInvocationsPerWorkgroup: 0,
        },
      },
      webgl: {
        state: 'unavailable',
        debugExtension: false,
        vendor: null,
        renderer: null,
        unmaskedVendor: null,
        unmaskedRenderer: null,
      },
    };
    record = {
      schema: 2,
      revision: WORKLOAD_REVISION,
      instrument: INSTRUMENT_REVISION,
      digest: regressionCatalog.digest,
      workload: regressionCatalog.workload,
      builds: [regressionCatalog.builds[0]!.revision, regressionCatalog.builds[1]!.revision],
      runtimes: [
        regressionCatalog.builds[0]!.runtimeDigest,
        regressionCatalog.builds[1]!.runtimeDigest,
      ],
      id: crypto.randomUUID(),
      started: new Date().toISOString(),
      finished: new Date().toISOString(),
      profile: p,
      status: 'cancelled',
      orderSeed: crypto.getRandomValues(new Uint16Array(1))[0]!,
      metadata: empty,
      peers: [],
      loadMs: [],
      results: [],
    };
    received = false;
    get('send-status').textContent = '';
    get('size').replaceChildren();
    get('report').hidden = true;
    get('empty').hidden = false;
    get('device').hidden = true;
    get('software').hidden = true;
    get('record').textContent = '';
    progress.max = regressionRows(PROFILES[p].sizes);
    progress.value = 0;
    progress.hidden = false;
    status.textContent = copy.running;
    const instance = new Worker(new URL('./regression.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker = instance;
    instance.onmessage = ({ data }) => {
      if (worker !== instance || !record) return;
      if (data.type === 'metadata') {
        record.metadata = data.metadata;
        record.peers = data.peers;
        record.loadMs = data.loadMs;
        inspect();
      } else if (data.type === 'progress')
        status.textContent = `${copy.running}: ${copy.caseNames[data.id as keyof typeof copy.caseNames] ?? data.id}, ${data.n.toLocaleString()} (${record.results.length}/${progress.max})`;
      else if (data.type === 'result') {
        record.results.push(data.row);
        progress.value = record.results.length;
        status.textContent = `${copy.running}: ${record.results.length}/${progress.max}`;
      } else if (data.type === 'done') finish(data.status);
    };
    instance.onerror = () => {
      if (worker === instance) finish('failed');
    };
    worker.postMessage({ profile: p, seed: record.orderSeed });
    timer = setTimeout(() => {
      if (worker === instance) finish('cancelled');
    }, PROFILES[p].seconds * 1000);
    refresh();
  });
  download.addEventListener('click', () => {
    if (!record || worker) return;
    const href = URL.createObjectURL(
      new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = href;
    a.download = `typeshade-benchmark-${record.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  });
  const sendRecord = async () => {
    if (!record || worker || sending || received) return;
    sending = true;
    refresh();
    try {
      // Run authorizes this report through the notice beside the button.
      const outcome = await postBenchmarkRecord(record, true);
      if (outcome.status === 'failed') {
        get('send-status').textContent =
          outcome.code === 'rate' ? copy.rateLimited : copy.sendFailed;
      } else {
        received = true;
        get('send-status').textContent =
          copy.sent +
          ' ' +
          copy.receipt.replace('{id}', outcome.id).replace('{time}', outcome.receivedAt);
      }
    } catch {
      get('send-status').textContent = copy.sendFailed;
    } finally {
      sending = false;
      refresh();
    }
  };
  send.addEventListener('click', () => void sendRecord());
  refresh();
}
