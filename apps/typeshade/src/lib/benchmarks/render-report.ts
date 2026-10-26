import type { Copy } from '../../i18n/index.ts';
import type { RegressionRecord } from './regression-contract.ts';
import { regressionRows } from './regression-contract.ts';
import { PROFILES } from './definitions.ts';
import { reportGroups, formatChange, type ReportMetric } from './report.ts';

export function renderReport(
  root: HTMLElement,
  record: RegressionRecord,
  copy: Copy['benchmarks'],
) {
  const get = <T extends HTMLElement>(name: string) => root.querySelector<T>(`[data-${name}]`)!;
  get('report').hidden = !record.results.length;
  get('empty').hidden = !!record.results.length;
  if (!record.results.length) return;
  const size = get<HTMLSelectElement>('size');
  const sizes = [...new Set(record.results.map((r) => r.n))].sort((a, b) => a - b);
  const chosen = Number(size.value);
  size.replaceChildren(...sizes.map((n) => new Option(n.toLocaleString(), String(n))));
  size.value = String(sizes.includes(chosen) ? chosen : sizes.at(-1));
  const metric = get<HTMLSelectElement>('metric').value as ReportMetric;
  const format = (value: number) =>
    metric === 'buffers' || metric === 'upload'
      ? value >= 1048576
        ? `${(value / 1048576).toFixed(2)} MiB`
        : `${(value / 1024).toFixed(2)} KiB`
      : metric === 'gpu'
        ? `${(value / 1000).toFixed(2)} µs`
        : `${value.toFixed(3)} ms`;
  const groups = reportGroups(record, Number(size.value), metric);
  const items = groups.flatMap((g) => g.items);
  const counts = (state: string) => items.filter((i) => i.state === state).length;
  get('verdict').textContent = copy.verdict
    .replace('{passed}', String(record.results.filter((r) => r.status === 'passed').length))
    .replace('{total}', String(regressionRows(PROFILES[record.profile].sizes, record.digest)));
  get('summary').textContent = items.some((i) => i.change !== null)
    ? copy.summary
        .replace('{lower}', String(counts('lower')))
        .replace('{higher}', String(counts('higher')))
        .replace('{similar}', String(counts('same') + counts('overlap')))
        .replace('{missing}', String(counts('unavailable')))
    : copy.pending;
  const template = get<HTMLTemplateElement>('item-template');
  for (const { section, items } of groups) {
    const figure = root.querySelector<HTMLElement>(`[data-section='${section}']`)!;
    figure.hidden = !items.length;
    const list = figure.querySelector('[data-items]')!;
    list.replaceChildren();
    const ranges = figure.querySelector('[data-ranges]')!;
    ranges.replaceChildren();
    const max =
      Math.ceil(
        Math.max(
          100,
          ...items.flatMap((i) =>
            i.change !== null
              ? [
                  (i.baseline!.high / i.baseline!.value) * 100,
                  (i.candidate!.high / i.baseline!.value) * 100,
                ]
              : [],
          ),
        ) / 25,
      ) * 25;
    figure.querySelector('[data-axis]')!.textContent = copy.axis.replace(
      '{max}',
      max.toLocaleString(),
    );
    for (const item of items) {
      const fragment = template.content.cloneNode(true) as DocumentFragment;
      const el = <T extends HTMLElement>(name: string) =>
        fragment.querySelector<T>(`[data-${name}]`)!;
      const row = fragment.querySelector('li')!;
      row.dataset.case = item.id;
      el('name').textContent = copy.caseNames[item.id as keyof typeof copy.caseNames] ?? item.id;
      el('change').textContent =
        item.change === null
          ? copy.unavailable
          : copy[item.state as 'lower' | 'higher' | 'same' | 'overlap'].replace(
              '{value}',
              formatChange(item.state === 'overlap' ? item.change : Math.abs(item.change)),
            );
      for (const build of ['baseline', 'candidate'] as const) {
        const m = item[build];
        el(`${build}-value`).textContent =
          `${copy[build]}: ${m ? format(m.value) : copy.unavailable}`;
        if (item.change !== null && m) {
          el(`${build}-bar`).style.width =
            `${(((m.value / item.baseline!.value) * 100) / max) * 100}%`;
          el(`${build}-range`).style.insetInlineStart =
            `${(((m.low / item.baseline!.value) * 100) / max) * 100}%`;
          el(`${build}-range`).style.width =
            `${((((m.high - m.low) / item.baseline!.value) * 100) / max) * 100}%`;
        }
      }
      el('bars').hidden = item.change === null;
      el('reference').style.insetInlineStart = `${(100 / max) * 100}%`;
      const range = document.createElement('li');
      range.textContent =
        (copy.caseNames[item.id as keyof typeof copy.caseNames] ?? item.id) +
        ': ' +
        (item.baseline && item.candidate
          ? copy.range
              .replace(
                '{baseline}',
                `${copy.baseline}: ${format(item.baseline.low)} – ${format(item.baseline.high)}`,
              )
              .replace(
                '{candidate}',
                `${copy.candidate}: ${format(item.candidate.low)} – ${format(item.candidate.high)}`,
              )
          : copy.unavailable);
      ranges.append(range);
      list.append(fragment);
    }
  }
}
