import type { ReflectedField } from '../playground-raster.ts';
/** How the zero of a type reads in an argument field, and how what is typed back reads as a
 *  value. A vector is a comma-separated list, which is how the source spells one too. */
export const argText = (value: unknown): string =>
  Array.isArray(value) ? value.join(', ') : String(value);

export function parseArg(text: string, zero: unknown): unknown {
  const trimmed = text.trim();
  if (typeof zero === 'boolean') {
    if (/^(?:true|1)$/i.test(trimmed)) return true;
    if (/^(?:false|0)$/i.test(trimmed)) return false;
    throw new Error('not a boolean');
  }
  const parts = trimmed.split(',').map((part) => Number(part.trim()));
  if (parts.length === 0 || parts.some((part) => !Number.isFinite(part)))
    throw new Error('not a number');
  if (Array.isArray(zero)) {
    if (parts.length !== zero.length) throw new Error('wrong length');
    return parts;
  }
  if (parts.length !== 1) throw new Error('not a single number');
  return parts[0];
}

/** How a field reads on one line: `name: type` and the attribute that placed it, when it has one. */
export function fieldLabel(field: ReflectedField): { text: string; attr: string } {
  const text =
    field.name && field.type ? `${field.name}: ${field.type}` : (field.type ?? field.name ?? '');
  if (field.builtin) return { text, attr: `@builtin(${field.builtin})` };
  if (typeof field.location === 'number') return { text, attr: `@location(${field.location})` };
  return { text, attr: '' };
}

/** A returned value as the pane prints it: arrays inline, everything else as JSON. */
export function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => formatValue(v)).join(', ')}]`;
  if (value && typeof value === 'object') {
    return `{ ${Object.entries(value)
      .map(([k, v]) => `${k}: ${formatValue(v)}`)
      .join(', ')} }`;
  }
  return typeof value === 'number'
    ? String(Number(value.toFixed(6)))
    : (JSON.stringify(value) ?? String(value));
}

export function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One `label   value` line. */
export function ioRow(
  label: string,
  text: string,
  attr = '',
  valueClass = 'io-value',
): HTMLElement {
  const row = el('div', 'io-row');
  row.append(el('span', 'io-label', label));
  const value = el('span', valueClass, text);
  if (attr) {
    value.append(document.createTextNode('  '));
    value.append(el('span', 'attr', attr));
  }
  row.append(value);
  return row;
}

/** Monaco's one-based cursor position. */

export const fillNumbers = (text: string, values: Record<string, string | number>): string =>
  text.replace(/\{(\w+)\}/g, (whole, key: string) => String(values[key] ?? whole));
