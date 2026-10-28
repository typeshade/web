// The notice over every page (src/components/SiteNotice.astro): the Worker's current notice,
// in the page's language, as text and at most one link. A closed notice is remembered in this
// browser by its id, so the next notice shows again.
import { fetchNotice, type SiteNotice } from './example-data-client.ts';
import type { DataLocale } from '../lib/example-data.ts';

const DISMISSED = 'typeshade-notice-dismissed';

function dismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED);
  } catch {
    return null;
  }
}

function remember(id: number): void {
  try {
    localStorage.setItem(DISMISSED, String(id));
  } catch {
    // A browser that keeps nothing shows the notice again on the next page.
  }
}

/** A link the notice may carry: a path on the site or an https address. */
const safeHref = (href: string | null): string | null =>
  href && /^(\/(?!\/)|https:\/\/)/.test(href) ? href : null;

function paint(bar: HTMLElement, notice: SiteNotice, locale: DataLocale): boolean {
  const text = bar.querySelector('[data-notice-text]');
  const close = bar.querySelector('[data-notice-dismiss]');
  const words = notice.text[locale] || notice.text.en;
  if (!(text instanceof HTMLElement) || !(close instanceof HTMLButtonElement) || !words)
    return false;
  const href = safeHref(notice.href);
  if (href) {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = words;
    text.replaceChildren(link);
  } else text.textContent = words;
  close.addEventListener('click', () => {
    remember(notice.id);
    bar.hidden = true;
  });
  return true;
}

export function initNotice(): void {
  const bar = document.querySelector<HTMLElement>('[data-site-notice]');
  if (!bar) return;
  const locale = (bar.dataset.locale ?? 'en') as DataLocale;
  void fetchNotice().then((notice) => {
    if (!notice || dismissed() === String(notice.id)) return;
    if (paint(bar, notice, locale)) bar.hidden = false;
  });
}
