// A diagnostic code in the browser, as a link to its page at /reference/errors/. The
// Playground and the live examples print what the compiler at the pin reports, and every code
// it can report has a page, so the link is built from the code alone. `base` is that index in
// the reader's language, which the component writes into the element's copy.

const CODE = /^(?:TS8\d{3}|SD\d{4})$/;

/** The page of a `TS8…` or `SD…` code, or null for any other code (TypeScript's own). */
export function errorHref(base: string, code: string): string | null {
  return CODE.test(code) ? `${base}${code.toLowerCase()}/` : null;
}

/** A link to a code's page, in the code face the message around it is set in. */
export function errorLink(
  base: string,
  code: string,
  className?: string,
): HTMLAnchorElement | null {
  const href = errorHref(base, code);
  if (!href) return null;
  const a = document.createElement('a');
  a.href = href;
  a.textContent = code;
  if (className) a.className = className;
  return a;
}

/** A message as text and links: a backend's text quotes the core's code as `[SD0043]`, and
 *  that code links too. */
export function linkedMessage(base: string, text: string, className?: string): Node[] {
  const out: Node[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[(SD\d{4})\]/g)) {
    const link = errorLink(base, m[1]!, className);
    if (!link) continue;
    out.push(document.createTextNode(text.slice(last, m.index! + 1)), link);
    last = m.index! + 1 + m[1]!.length;
  }
  out.push(document.createTextNode(text.slice(last)));
  return out;
}
