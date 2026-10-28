import { controlDialog } from '@typeshade/site-ui/dom/dialog';
import { shortLink, submitToGallery, pageLocale } from '../example-data-client.ts';
import { provideProgram } from '../report-context.ts';
import { writeHash } from './links.ts';
import type { PlaygroundCopy } from './contracts.ts';
interface SharingOptions {
  root: HTMLElement;
  share: HTMLButtonElement;
  copyOutput: HTMLButtonElement;
  copy: PlaygroundCopy;
  publishSource: () => Promise<void>;
  captureStill: () => Promise<string | undefined>;
  getFileName: () => string | undefined;
  getOutput: () => string;
}
export function bindSharing({
  root,
  share,
  copyOutput,
  copy,
  publishSource,
  captureStill,
  getFileName,
  getOutput,
}: SharingOptions) {
  const flash = (button: HTMLButtonElement, word: string, back: string): void => {
    button.textContent = word;
    window.setTimeout(() => {
      button.textContent = back;
    }, 1400);
  };

  /** The link Share copies: the short one the Worker stores (/s/<id>, docs/cloudflare.md), or
   *  the page's own URL, which carries the whole file, where there is no Worker to store it. */
  const shareLink = async (): Promise<string> => {
    await publishSource();
    const { pathname, hash, href } = window.location;
    const link = await shortLink(pathname, hash.replace(/^#/, ''));
    // The address bar follows the short link, so a reload or a copy of it stays short too.
    const id = link && /\/s\/([A-Za-z0-9_-]+)\/?$/.exec(link)?.[1];
    if (id) writeHash('share', id);
    return link ?? href;
  };

  share.addEventListener('click', () => {
    // Safari keeps the click's permission to write the clipboard only for a write started in
    // the handler, so the link goes in as a promise where the browser takes one.
    const link = shareLink();
    const written =
      typeof ClipboardItem === 'function' && ClipboardItem.supports?.('text/plain') !== false
        ? navigator.clipboard
            .write([
              new ClipboardItem({
                'text/plain': link.then((text) => new Blob([text], { type: 'text/plain' })),
              }),
            ])
            .catch(async () => navigator.clipboard.writeText(await link))
        : link.then((text) => navigator.clipboard.writeText(text));
    void written.then(() => flash(share, copy.shared, copy.share)).catch(() => {});
  });

  // Submit: the file goes to the gallery as a share with a title and a still of the canvas, and
  // waits there for the maintainer's approval (worker/index.ts). The dialog stays open to say what happened.
  const submitButton = root.querySelector('[data-submit]');
  const submitDialog = root.querySelector('[data-submit-dialog]');
  const submitForm = root.querySelector('[data-submit-form]');
  const submitStatus = root.querySelector('[data-submit-status]');
  const submitSend = root.querySelector('[data-submit-send]');
  const submitCancel = root.querySelector('[data-submit-cancel]');
  if (
    submitButton instanceof HTMLButtonElement &&
    submitDialog instanceof HTMLDialogElement &&
    submitForm instanceof HTMLFormElement &&
    submitStatus instanceof HTMLElement &&
    submitSend instanceof HTMLButtonElement &&
    submitCancel instanceof HTMLButtonElement
  ) {
    const say = (text: string): void => {
      submitStatus.textContent = text;
      submitStatus.hidden = !text;
    };
    const submitModal = controlDialog(submitDialog);
    submitButton.addEventListener('click', () => {
      say('');
      submitSend.hidden = false;
      submitSend.disabled = false;
      submitCancel.textContent = copy.submit.cancel;
      submitModal.open(submitButton);
    });
    submitCancel.addEventListener('click', () => submitModal.close());
    submitForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const fields = new FormData(submitForm);
      const title = String(fields.get('title') ?? '').trim();
      if (!title) return;
      submitSend.disabled = true;
      say(copy.submit.sending);
      void publishSource()
        .then(async () =>
          submitToGallery({
            path: window.location.pathname,
            fragment: window.location.hash.replace(/^#/, ''),
            title,
            author: String(fields.get('author') ?? '').trim(),
            locale: pageLocale(),
            still: await captureStill().catch(() => undefined),
          }),
        )
        .then((outcome) => {
          say(copy.submit[outcome]);
          const done = outcome === 'sent' || outcome === 'already';
          submitSend.hidden = done;
          submitSend.disabled = done;
          if (done) {
            submitCancel.textContent = copy.submit.close;
            submitForm.reset();
          }
        });
    });
  }

  // The issue dialog (src/scripts/issue-dialog.ts) takes the program this page holds, carried
  // in the fragment the way Share carries it. While the gallery is up, no program is open.
  provideProgram(async () => {
    const file = getFileName();
    if (root.dataset.view === 'gallery' || !file) return undefined;
    await publishSource();
    return {
      page: window.location.pathname,
      fragment: window.location.hash.replace(/^#/, ''),
      file,
    };
  });

  copyOutput.addEventListener('click', () => {
    void navigator.clipboard
      .writeText(getOutput())
      .then(() => flash(copyOutput, copy.copied, copy.copy))
      .catch(() => {});
  });

  return { shareLink };
}
