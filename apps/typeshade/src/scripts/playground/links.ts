import type { EmitChoice } from './contracts.ts';
export const hashParams = (): URLSearchParams =>
  new URLSearchParams(window.location.hash.replace(/^#/, ''));

/** The fragment: what to open, and the options to open it under. Only a setting that differs
 *  from the default is written, so a link to an untouched Playground stays short. */
export function writeHash(
  key: string,
  value: string,
  choice?: EmitChoice,
  more: string[] = [],
): void {
  const parts = [`${key}=${value}`, ...more];
  if (choice) {
    if (choice.level !== 'O2') parts.push(`opt=${choice.level}`);
    if (choice.parens !== 'full') parts.push(`parens=${choice.parens}`);
    if (choice.minify) parts.push('minify=1');
    if (choice.numbers !== true)
      parts.push(`numbers=${choice.numbers === 'f32' ? 'f32' : 'false'}`);
    if (choice.obfuscate) parts.push('obfuscate=1');
    if (choice.fp64Flavor !== 'float') parts.push(`fp64=${choice.fp64Flavor}`);
    if (choice.floatPrecision !== 'highp') parts.push(`precision=${choice.floatPrecision}`);
    if (choice.backend !== 'auto') parts.push(`backend=${choice.backend}`);
  }
  const url = new URL(window.location.href);
  url.hash = parts.join('&');
  window.history.replaceState(null, '', url);
}
