import { precisionExample, precisionCalculation } from '../lib/glsl-precision-model.ts';
const root = document.querySelector<HTMLElement>('[data-precision-guide]');
if (root) {
  const labels = JSON.parse(root.dataset.labels!) as Record<string, string>;
  const base = root.querySelector<HTMLSelectElement>('[data-precision-base]')!;
  const increment = root.querySelector<HTMLInputElement>('[data-precision-increment]')!;
  const put = (selector: string, value: string | number) => {
    root.querySelector(selector)!.textContent = String(value);
  };
  const update = () => {
    const coarse = precisionCalculation(
      Number(base.value),
      Number(increment.value),
      precisionExample.coarseBits,
    );
    const fine = precisionCalculation(
      Number(base.value),
      Number(increment.value),
      precisionExample.fineBits,
    );
    put('[data-precision-increment-value]', increment.value);
    put('[data-precision-coarse-sum]', coarse.sum);
    put('[data-precision-fine-sum]', fine.sum);
    put('[data-precision-coarse-result]', coarse.recovered);
    put('[data-precision-fine-result]', fine.recovered);
    put('[data-precision-summary]', `${labels.result}: ${coarse.recovered} / ${fine.recovered}`);
  };
  root.querySelector<HTMLFieldSetElement>('[data-precision-controls]')!.disabled = false;
  base.addEventListener('change', update);
  increment.addEventListener('input', update);
  const button = root.querySelector<HTMLButtonElement>('[data-precision-inspect]')!;
  const context = root.querySelector<HTMLSelectElement>('[data-precision-context]')!;
  const report = root.querySelector<HTMLElement>('[data-precision-report]')!;
  const body = root.querySelector<HTMLTableSectionElement>('[data-precision-report-body]')!;
  const clear = () => {
    delete root.dataset.precisionContext;
    report.hidden = true;
    body.replaceChildren();
    put('[data-precision-status]', labels.idle);
  };
  context.addEventListener('change', clear);
  button.disabled = false;
  button.addEventListener('click', () => {
    clear();
    const canvas = document.createElement('canvas');
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      gl = context.value === 'webgl2' ? canvas.getContext('webgl2') : canvas.getContext('webgl');
      if (!gl || gl.isContextLost()) {
        put('[data-precision-status]', labels.unavailable);
        return;
      }
      for (const [stageName, stage] of [
        [labels.vertex, gl.VERTEX_SHADER],
        [labels.fragment, gl.FRAGMENT_SHADER],
      ] as const) {
        for (const [tier, precision] of [
          ['lowp', gl.LOW_FLOAT],
          ['mediump', gl.MEDIUM_FLOAT],
          ['highp', gl.HIGH_FLOAT],
        ] as const) {
          const format = gl.getShaderPrecisionFormat(stage, precision);
          if (!format) throw new Error('precision-query');
          const values =
            format.precision > 0
              ? [format.rangeMin, format.rangeMax, format.precision]
              : [labels.unsupported, labels.unsupported, labels.unsupported];
          const row = document.createElement('tr');
          for (const [index, value] of [stageName, tier, ...values].entries()) {
            const cell = document.createElement('td');
            cell.dataset.label =
              root.querySelectorAll('[data-precision-report] th')[index].textContent ?? '';
            cell.textContent = String(value);
            row.append(cell);
          }
          body.append(row);
        }
      }
      report.hidden = false;
      root.dataset.precisionContext = context.value;
      put('[data-precision-status]', labels.ready);
    } catch {
      clear();
      put('[data-precision-status]', labels.error);
    } finally {
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    }
  });
}
