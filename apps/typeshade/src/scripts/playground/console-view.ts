import type { ConsoleEvent } from '../../../vendor/shader-dsl/src/core/console.ts';
import type { ConsoleTier } from '../../../vendor/shader-dsl/src/core/console-print.ts';
import type { PlaygroundCopy } from './contracts.ts';
import { fillNumbers } from './view-helpers.ts';
export const CONSOLE_SHOWN = 500;
export function createConsoleView(
  consolePane: Element | null,
  copy: PlaygroundCopy,
  sourceLine: (event: ConsoleEvent) => string,
  backendName: (backend: 'webgpu' | 'cpu') => string,
) {
  /** The Console tab. A report is sentences that say where its lines came from, and lists of
   *  the lines. Only the first CONSOLE_SHOWN of a list are drawn; a sentence says the rest. */

  const shown = (v: unknown): string =>
    typeof v === 'string' ? v : typeof v === 'number' ? String(v) : JSON.stringify(v);
  const sentence = (text: string): HTMLParagraphElement => {
    const p = document.createElement('p');
    p.textContent = text;
    return p;
  };
  /** The file and line a console call was written on, as `file:line` (surface §66): the file
   *  by the name its tab has, and the line as the editor numbers it, past the prelude the file
   *  the canvas runs is compiled with. Empty for an event with no span. */
  /** One list of console lines, marked with `block` for a check to find. Each line leads with
   *  where it ran, the way a host's printed console line does (surface §66): the tier that ran
   *  it, the file and line of the call, then its invocation, unless `at` says otherwise. */
  const consoleList = (
    events: readonly ConsoleEvent[],
    block: string,
    tier: ConsoleTier,
    at: (e: ConsoleEvent, index: number) => string = (e) =>
      e.invocation ? `[${e.invocation.join(', ')}]` : '',
  ): HTMLElement[] => {
    if (events.length === 0) return [];
    const list = document.createElement('ol');
    list.dataset.consoleBlock = block;
    const span = (className: string, text: string): HTMLSpanElement => {
      const node = document.createElement('span');
      node.className = className;
      node.textContent = text;
      return node;
    };
    events.slice(0, CONSOLE_SHOWN).forEach((e, index) => {
      const li = document.createElement('li');
      if (e.method === 'warn' || e.method === 'error') li.className = e.method;
      const label = span('tier', tier);
      label.dataset.tier = tier;
      const body =
        e.method === 'table' && e.args.length === 1 && typeof e.args[0] === 'object'
          ? consoleTable(e.args[0], shown)
          : document.createElement('span');
      if (!(body instanceof HTMLTableElement)) body.textContent = e.args.map(shown).join(' ');
      li.append(label, span('source', sourceLine(e)), span('at', at(e, index)), body);
      list.append(li);
    });
    return events.length > CONSOLE_SHOWN
      ? [list, sentence(fillNumbers(copy.consoleMore, { more: events.length - CONSOLE_SHOWN }))]
      : [list];
  };
  /** How many reports the tab has shown, so a check can wait for the next one. */
  let consolePaints = 0;
  /** Replace the tab's contents with one report. `report` says what it is and where it ran,
   *  and a capture adds how many lines came back and how many were dropped, for a check that
   *  waits on one. */
  const paintConsole = (
    report: { readonly report: string; readonly lines?: number; readonly dropped?: number },
    ...parts: (HTMLElement | HTMLElement[])[]
  ): void => {
    if (!(consolePane instanceof HTMLElement)) return;
    consolePane.replaceChildren(...parts.flat());
    consolePane.dataset.report = report.report;
    consolePane.dataset.paint = String(++consolePaints);
    if (report.lines === undefined) delete consolePane.dataset.lines;
    else consolePane.dataset.lines = String(report.lines);
    if (report.dropped === undefined) delete consolePane.dataset.dropped;
    else consolePane.dataset.dropped = String(report.dropped);
  };

  /** The lines the last compute run delivered, in the order the CPU runs the invocations
   *  (surface §66). */
  const showConsole = (
    events: readonly ConsoleEvent[],
    dropped: number,
    backend: 'webgpu' | 'cpu',
  ): void => {
    const name = backendName(backend);
    if (events.length === 0 && dropped === 0) {
      paintConsole(
        { report: `compute/${backend}`, lines: 0, dropped: 0 },
        sentence(fillNumbers(copy.consoleNone, { backend: name })),
      );
      return;
    }
    paintConsole(
      { report: `compute/${backend}`, lines: events.length, dropped },
      sentence(fillNumbers(copy.consoleLines, { lines: events.length, backend: name })),
      consoleList(events, 'lines', backend === 'webgpu' ? 'GPU' : 'CPU'),
      dropped > 0 ? [sentence(fillNumbers(copy.consoleDropped, { dropped }))] : [],
    );
  };

  /** A `console.table` value as the browser's own console lays one out (changes/0019): a row per
   *  array element or struct field, and a column per field or component when the rows are
   *  structs or vectors, else one value column. A matrix arrives as its columns already. */
  const consoleTable = (value: unknown, shown: (v: unknown) => string): HTMLTableElement => {
    const rows: [string, unknown][] = Array.isArray(value)
      ? value.map((v, i) => [String(i), v])
      : Object.entries(value as Record<string, unknown>);
    const columns: string[] = [];
    for (const [, v] of rows) {
      if (v === null || typeof v !== 'object') continue;
      for (const k of Object.keys(v)) if (!columns.includes(k)) columns.push(k);
    }
    const table = document.createElement('table');
    const cell = (tag: 'th' | 'td', text: string): HTMLTableCellElement => {
      const c = document.createElement(tag);
      c.textContent = text;
      return c;
    };
    const head = document.createElement('tr');
    head.append(cell('th', copy.consoleIndex));
    for (const k of columns.length > 0 ? columns : [copy.consoleValue]) head.append(cell('th', k));
    table.append(head);
    for (const [key, v] of rows) {
      const tr = document.createElement('tr');
      tr.append(cell('th', key));
      if (columns.length === 0) tr.append(cell('td', shown(v)));
      else {
        const o = (v !== null && typeof v === 'object' ? v : {}) as Record<string, unknown>;
        for (const k of columns) tr.append(cell('td', k in o ? shown(o[k]) : ''));
      }
      table.append(tr);
    }
    return table;
  };

  return { sentence, consoleList, paintConsole, showConsole, consoleTable };
}
