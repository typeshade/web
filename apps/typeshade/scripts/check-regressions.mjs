import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
export async function checkRegressions(page, url) {
  const reports = [];
  const active = JSON.parse(readFileSync('src/lib/benchmarks/regression-catalog.json', 'utf8'));
  // Bulk fault and visual runs avoid consuming the integration collector's hourly quota.
  await page.route('**/data/benchmarks/records/', (route) => {
    const body = route.request().postDataJSON();
    assert.equal(body.consent, true);
    reports.push(body.record);
    return route.fulfill({ json: { id: body.record.id, receivedAt: new Date().toISOString() } });
  });
  // Supply faults in the real nested-worker realm; Chromium does not route its script requests.
  const fault = async (patch) =>
    page.route('**/regression.worker-*.js', async (route) => {
      const response = await route.fetch();
      const bootstrap = `const NativeWorker=Worker;self.Worker=class extends NativeWorker {
      constructor(url,options) {
        const text='import '+JSON.stringify(String(url))+';\\nconst originalFetch=self.fetch.bind(self);self.fetch=(u,o)=>originalFetch(new URL(u,'+${JSON.stringify(JSON.stringify(url))}+'),o);\\n'+${JSON.stringify(patch)};
        super(URL.createObjectURL(new Blob([text],{type:'text/javascript'})),options);
      }
    };\n`;
      await route.fulfill({ response, body: bootstrap + (await response.text()) });
    });
  await page.goto(`${url}/benchmarks/`);
  const root = page.locator('[data-benchmarks]');
  const record = async () => JSON.parse(await root.locator('[data-record]').textContent());
  const run = async () => {
    const before = reports.length;
    await root.locator('[data-run]').click();
    await page.waitForFunction(
      () => document.querySelector('[data-benchmarks] [data-stop]').disabled,
      {},
      { timeout: 650000 },
    );
    await page.waitForFunction(() =>
      document
        .querySelector('[data-benchmarks] [data-send-status]')
        .textContent.startsWith('Results received.'),
    );
    assert.equal(reports.length, before + 1);
    assert.equal(reports.at(-1).id, (await record()).id);
    return record();
  };
  assert.equal(reports.length, 0);
  const quick = await run();
  writeFileSync('shots/benchmarks/unified-quick.json', JSON.stringify(quick, null, 2));
  assert.equal(quick.status, 'complete', JSON.stringify(quick.results.at(-1)));
  assert.equal(quick.results.length, 60);
  assert(
    quick.results.every(
      (r) =>
        r.status === 'passed' &&
        r.corruptionDetected &&
        r.checkedValues > 0 &&
        r.wallMs.length === 3,
    ),
  );
  assert(quick.results.filter((r) => r.kind === 'compiled').every((r) => r.gpuSubmissions > 0));
  assert(quick.results.some((r) => r.kind === 'resident' && r.readbackMs.length === 3));
  assert.equal(await root.locator('[data-section]:visible').count(), 4);
  assert.equal(quick.peers[1].runtime.tier, 'webgpu');
  assert.equal(quick.peers[1].runtime.build.revision, null);
  for (const count of [1, 4, 8]) {
    const pair = quick.results.filter((r) => r.id === `fields-${count}`);
    assert.equal(pair.length, 2);
    for (const row of pair) {
      assert.equal(row.checkedValues, row.n * 9);
      const build = active.builds[row.build === 'baseline' ? 0 : 1];
      assert.equal(row.inputBytes, row.n * (build.inputProjection ? count : 8) * 4);
      assert.equal(row.validationMs.length, 3);
      assert.equal(row.packingMs.length, 3);
      assert(row.uploadBytes.every((bytes) => bytes >= row.inputBytes + row.n * 4));
    }
  }
  for (const metric of ['validation', 'packing', 'upload']) {
    await root.locator('[data-metric]').selectOption(metric);
    assert.equal(await root.locator('[data-section="data"] [data-case^="fields-"]').count(), 3);
  }
  await root.locator('[data-metric]').selectOption('wall');
  assert.equal(await root.locator('[data-send]').isDisabled(), true);
  await root.locator('[data-profile]').selectOption('extended');
  const extended = await run();
  assert.equal(extended.status, 'complete');
  assert.equal(extended.results.length, 180);
  assert(extended.results.every((r) => r.wallMs.length === 15 && r.status === 'passed'));
  writeFileSync('shots/benchmarks/unified-extended.json', JSON.stringify(extended, null, 2));
  await root.locator('[data-profile]').selectOption('quick');
  // Each Run action sends the completed record once and shows a stable receipt.
  await run();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-benchmarks] [data-send-status]')
        .textContent.startsWith('Results received.'),
    {},
    { timeout: 20000 },
  );
  assert((await root.locator('[data-send-status]').textContent()).includes((await record()).id));
  assert(await root.locator('[data-send]').isDisabled());
  // Each version worker reports an unsupported adapter instead of zero timings.
  await fault('GPU.prototype.requestAdapter=async()=>null;');
  const unsupported = await run();
  assert.equal(unsupported.status, 'unsupported');
  assert.equal(unsupported.results.length, 0);
  await page.unroute('**/regression.worker-*.js');
  // Artifact bytes are checked before importing a runtime.
  await fault(
    "const fetchArtifact=self.fetch;self.fetch=async(u,o)=>{const r=await fetchArtifact(u,o);return String(u).includes('/benchmarks/artifacts/')?new Response((await r.text())+'/* modified */',{headers:r.headers}):r;};",
  );
  const corrupt = await run();
  assert.equal(corrupt.status, 'failed');
  assert.equal(corrupt.results.length, 0);
  await page.unroute('**/regression.worker-*.js');
  // Timestamp support can be absent without failing application correctness.
  await fault(
    "const has=GPUSupportedFeatures.prototype.has;GPUSupportedFeatures.prototype.has=function(n){return n==='timestamp-query'?false:has.call(this,n)};const extension=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(n){return n==='WEBGL_debug_renderer_info'?null:extension.call(this,n)};",
  );
  const noTiming = await run();
  assert.equal(noTiming.status, 'complete');
  assert(noTiming.results.every((r) => r.gpuNs === null));
  assert.equal(noTiming.metadata.webgl.debugExtension, false);
  assert.equal(noTiming.metadata.webgl.unmaskedRenderer, null);
  await page.unroute('**/regression.worker-*.js');
  // A corrupt GPU program automatically sends the failed run's diagnostic record.
  await fault(
    "const create=GPUDevice.prototype.createShaderModule;GPUDevice.prototype.createShaderModule=function(d){return create.call(this,{...d,code:d.code.replaceAll('out[i] = src[i].f0;','out[i] = src[i].f0 + 1.0;')});};",
  );
  const wrong = await run();
  assert.equal(wrong.status, 'failed');
  assert(wrong.results.some((r) => r.status === 'failed' && r.reason === 'validation'));
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-benchmarks] [data-send-status]')
        .textContent.startsWith('Results received.'),
    {},
    { timeout: 20000 },
  );
  await page.unroute('**/regression.worker-*.js');
  await root.locator('[data-profile]').selectOption('extended');
  await root.locator('[data-run]').click();
  await page.waitForFunction(
    () => document.querySelector('[data-benchmarks] [data-progress]').value > 0,
  );
  await root.locator('[data-stop]').click();
  const partial = await record();
  assert.equal(partial.status, 'cancelled');
  assert(partial.results.length > 0 && partial.results.length < 180);
  assert.equal(partial.results.length % 2, 0);
  await page.waitForFunction(() =>
    document
      .querySelector('[data-benchmarks] [data-send-status]')
      .textContent.startsWith('Results received.'),
  );
  assert.equal(reports.at(-1).id, partial.id);
  assert.equal(new Set(reports.map((r) => r.id)).size, reports.length);
  await page.unroute('**/data/benchmarks/records/');
  console.log(
    'unified benchmarks: actual GPU, host calls, resident chains, receipts, integrity, absent timings and cancellation passed',
  );
}
