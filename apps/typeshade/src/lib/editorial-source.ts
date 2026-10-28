/** Apply a site-owned correction to one exact upstream passage. Exact matches make a pin
 *  change visible: a vendor edit cannot silently leave a stale correction behind. */
export function editorialSourceText(
  source: string,
  original: string,
  replacement: string,
  label: string,
): string {
  const first = source.indexOf(original);
  if (first < 0 || source.indexOf(original, first + original.length) >= 0) {
    throw new Error(`[editorial] ${label}: expected exactly one matching source passage`);
  }
  return `${source.slice(0, first)}${replacement}${source.slice(first + original.length)}`;
}
