// A heading's id. The pages that write their own headings use it, so the links in the
// outline on the right resolve to the heading they name. Letters and digits of any script
// are kept, so a Korean heading gets a Korean id, the way ko.vuejs.org writes them.
export function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}
