// The issue dialog (src/components/IssueDialog.astro). Its template's script imports this on
// the first Report a problem click. The Worker says first whether it takes reports here
// (/data/issues/, worker/index.ts): where it does, the dialog opens and Send posts the title,
// the description, the images, the page and the Playground's program there; where it does
// not, the link is followed to GitHub's own form, as it is with no script.
import type { Copy as SiteCopy } from '../i18n/index.ts';
import {
  isIssueRepo,
  ISSUE_FILE_NAME,
  ISSUE_FILES_MAX,
  ISSUE_IMAGE_BYTES,
  ISSUE_IMAGE_TYPES,
  ISSUE_IMAGES_MAX,
  ISSUE_PAGE,
  ISSUE_PROGRAM_MAX,
  type IssueAnswer,
  type IssueError,
  type IssueField,
  type IssueFile,
  type IssueRepo,
  type IssueStatus,
} from '../lib/issue-data.ts';
import { shortLink } from './example-data-client.ts';
import { currentProgram, type ReportProgram } from './report-context.ts';
import { decodeSource } from './source-link.ts';

type Copy = SiteCopy['issue']['runtime'];

interface Turnstile {
  render(box: HTMLElement, options: Record<string, unknown>): string | undefined;
  reset(widget?: string): void;
}

/** The Playground's program with its files read out of the fragment. */
interface Program extends ReportProgram {
  readonly files: readonly IssueFile[];
  /** Its files fit in the issue; a longer program goes as its link alone. */
  readonly fits: boolean;
}

async function readProgram(program: ReportProgram | undefined): Promise<Program | undefined> {
  if (!program || !ISSUE_PAGE.test(program.page)) return undefined;
  const params = new URLSearchParams(program.fragment);
  const code = params.get('code');
  const text = code ? await decodeSource(code) : undefined;
  if (text === undefined) return undefined;
  const name = ISSUE_FILE_NAME.test(program.file) ? program.file : 'main.shade.ts';
  const files: IssueFile[] = [{ name, text }];
  const packed = params.get('files');
  const others = packed ? await decodeSource(packed) : undefined;
  try {
    const parsed: unknown = JSON.parse(others ?? '{}');
    for (const [path, value] of Object.entries(parsed ?? {}))
      if (typeof value === 'string' && ISSUE_FILE_NAME.test(path))
        files.push({ name: path, text: value });
  } catch {
    // A link whose other files do not decode still carries its main file.
  }
  const kept = files.slice(0, ISSUE_FILES_MAX);
  const size = kept.reduce((sum, file) => sum + file.text.length, 0);
  return { ...program, files: kept, fits: size <= ISSUE_PROGRAM_MAX };
}

let asked: Promise<IssueStatus> | undefined;
/** Whether the Worker takes reports here, asked once per page. No answer is a no. */
const readStatus = (): Promise<IssueStatus> =>
  (asked ??= fetch('/data/issues/', { headers: { accept: 'application/json' } })
    .then(async (res) =>
      res.ok && res.headers.get('content-type')?.includes('application/json')
        ? ((await res.json()) as IssueStatus)
        : { open: false },
    )
    .catch(() => ({ open: false })));

async function post(body: FormData): Promise<IssueAnswer | undefined> {
  try {
    const res = await fetch('/data/issues/', { method: 'POST', body });
    if (!res.headers.get('content-type')?.includes('application/json')) return undefined;
    return (await res.json()) as IssueAnswer;
  } catch {
    return undefined;
  }
}

const icon = (path: string): SVGSVGElement => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', path);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', '2');
  line.setAttribute('stroke-linecap', 'round');
  svg.append(line);
  return svg;
};
const CROSS = 'M6 6l12 12M18 6L6 18';

interface Dialog {
  open(link: HTMLAnchorElement, status: IssueStatus): Promise<void>;
}

/** The page's one dialog, made from the template on the first report. */
function makeDialog(): Dialog | undefined {
  const template = document.querySelector<HTMLTemplateElement>('template[data-issue-template]');
  const element = template?.content.firstElementChild?.cloneNode(true);
  if (!(element instanceof HTMLDialogElement)) return undefined;
  const dialog = element;
  document.body.append(dialog);
  const find = <T extends Element>(selector: string): T => dialog.querySelector<T>(selector)!;
  const form = find<HTMLFormElement>('[data-issue-form]');
  const title = find<HTMLInputElement>('#issue-title');
  const text = find<HTMLTextAreaElement>('#issue-text');
  const box = find<HTMLElement>('[data-issue-drop]');
  const add = find<HTMLButtonElement>('[data-issue-add]');
  const picker = find<HTMLInputElement>('[data-issue-files]');
  const attached = find<HTMLUListElement>('[data-issue-attached]');
  const trap = find<HTMLInputElement>('input[name="website"]');
  const challengeBox = find<HTMLElement>('[data-issue-challenge]');
  const status = find<HTMLElement>('[data-issue-status]');
  const cancel = find<HTMLButtonElement>('[data-issue-cancel]');
  const send = find<HTMLButtonElement>('[data-issue-send]');
  const copy = JSON.parse(form.dataset.copy ?? '{}') as Copy;
  const compiler = form.dataset.compiler;

  let repo: IssueRepo = 'compiler';
  let page: string | undefined;
  let program: Program | undefined;
  let keepProgram = true;
  let images: { readonly file: File; readonly url: string }[] = [];
  let known: IssueStatus | undefined;
  let done = false;

  const say = (words: string): void => {
    status.textContent = words;
  };

  /** The chips under the box: the program, then each image, each with its own remove. */
  const paint = (): void => {
    const items: HTMLLIElement[] = [];
    const remove = (label: string, action: () => void): HTMLButtonElement => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', label);
      button.append(icon(CROSS));
      button.addEventListener('click', () => {
        action();
        paint();
      });
      return button;
    };
    if (program && keepProgram) {
      const item = document.createElement('li');
      item.title = copy.program;
      const chip = document.createElement('span');
      chip.className = 'issue-chip';
      chip.textContent = program.files.map((file) => file.name).join(', ');
      item.append(
        chip,
        remove(copy.removeProgram, () => (keepProgram = false)),
      );
      items.push(item);
    }
    for (const image of images) {
      const item = document.createElement('li');
      const img = document.createElement('img');
      img.src = image.url;
      img.alt = image.file.name;
      item.append(
        img,
        remove(copy.removeImage, () => {
          URL.revokeObjectURL(image.url);
          images = images.filter((held) => held !== image);
          say('');
        }),
      );
      items.push(item);
    }
    attached.replaceChildren(...items);
    attached.hidden = items.length === 0;
  };

  const addImages = (files: Iterable<File>): void => {
    let refused = false;
    for (const file of files) {
      const kind = (ISSUE_IMAGE_TYPES as readonly string[]).includes(file.type);
      if (!kind || file.size > ISSUE_IMAGE_BYTES || images.length >= ISSUE_IMAGES_MAX) {
        refused = true;
        continue;
      }
      images.push({ file, url: URL.createObjectURL(file) });
    }
    say(refused ? copy.image : '');
    paint();
  };

  add.addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => {
    addImages(picker.files ?? []);
    picker.value = '';
  });
  // A screenshot pasted into either field, or dropped on the box, is an image like any other.
  dialog.addEventListener('paste', (event) => {
    const files = [...(event.clipboardData?.files ?? [])].filter((f) =>
      f.type.startsWith('image/'),
    );
    if (files.length === 0) return;
    event.preventDefault();
    addImages(files);
  });
  box.addEventListener('dragover', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    box.dataset.dragging = '';
  });
  box.addEventListener('dragleave', () => delete box.dataset.dragging);
  box.addEventListener('drop', (event) => {
    delete box.dataset.dragging;
    if (!event.dataTransfer?.files.length) return;
    event.preventDefault();
    addImages(event.dataTransfer.files);
  });
  // Ctrl or Command with Enter sends from either field.
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) form.requestSubmit(send);
  });

  // Cloudflare Turnstile, where the Worker asks for it. It shows itself only when it needs the
  // reader to act, and a token is good for one request.
  let token = '';
  let widget: string | undefined;
  let waiting: ((value: string) => void) | undefined;
  const take = (value: string): void => {
    token = value;
    waiting?.(value);
    waiting = undefined;
  };
  const turnstile = (): Turnstile | undefined =>
    (window as unknown as { turnstile?: Turnstile }).turnstile;
  const mountChallenge = (siteKey: string): void => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.addEventListener('load', () => {
      const root = document.documentElement;
      const dark = root.dataset.theme
        ? root.dataset.theme === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      widget = turnstile()?.render(challengeBox, {
        sitekey: siteKey,
        action: 'new-issue',
        theme: dark ? 'dark' : 'light',
        language: root.lang,
        appearance: 'interaction-only',
        callback: take,
        'expired-callback': () => take(''),
        'error-callback': () => take(''),
        'before-interactive-callback': () => (challengeBox.hidden = false),
        'after-interactive-callback': () => (challengeBox.hidden = true),
      });
    });
    document.head.append(script);
  };
  const challenge = (): Promise<string> =>
    token || !known?.challenge
      ? Promise.resolve(token)
      : new Promise((resolve) => {
          waiting = resolve;
          window.setTimeout(() => resolve(token), 8000);
        });

  let mounted = false;
  const applyStatus = (answer: IssueStatus): void => {
    known = answer;
    if (answer.challenge && !mounted) mountChallenge(answer.challenge);
    mounted = true;
  };

  /** What the reader reads when the Worker files nothing. */
  const told = (error: IssueError | undefined): string =>
    error === 'limit' || error === 'image' || error === 'challenge' ? copy[error] : copy.failed;

  const reset = (): void => {
    form.reset();
    for (const image of images) URL.revokeObjectURL(image.url);
    images = [];
    keepProgram = true;
    done = false;
    delete form.dataset.done;
    send.hidden = false;
    cancel.textContent = form.dataset.cancel ?? '';
    say('');
  };

  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (done) reset();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!done) void deliver();
  });

  const deliver = async (): Promise<void> => {
    send.disabled = true;
    say(copy.sending);
    const kept = keepProgram ? program : undefined;
    const link = kept ? await shortLink(kept.page, kept.fragment) : undefined;
    const share = link ? /\/s\/([^/]+)\/?$/.exec(new URL(link).pathname)?.[1] : undefined;
    const body = new FormData();
    const put = (name: IssueField, value: string | undefined): void => {
      if (value) body.set(name, value);
    };
    put('repo', repo);
    put('title', title.value);
    put('text', text.value);
    put('page', page);
    put('share', share);
    put('files', kept?.fits ? JSON.stringify(kept.files) : undefined);
    put('compiler', compiler);
    put('challenge', await challenge());
    put('website', trap.value);
    for (const image of images)
      body.append('image' satisfies IssueField, image.file, image.file.name);
    const answer = await post(body);
    token = '';
    if (widget !== undefined) turnstile()?.reset(widget);
    send.disabled = false;
    if (answer && !('error' in answer)) {
      done = true;
      form.dataset.done = '';
      send.hidden = true;
      cancel.textContent = form.dataset.close ?? '';
      say('preview' in answer ? copy.preview : copy.sent);
      cancel.focus();
      return;
    }
    // The draft stays, so the reader can send it again.
    say(told(answer?.error));
  };

  return {
    async open(link, answer) {
      if (done) reset();
      repo = isIssueRepo(link.dataset.report) ? link.dataset.report : 'compiler';
      page = ISSUE_PAGE.test(window.location.pathname) ? window.location.pathname : undefined;
      applyStatus(answer);
      program = await readProgram(await currentProgram());
      paint();
      if (!dialog.open) dialog.showModal();
      title.focus();
    },
  };
}

let made: Dialog | undefined;

/** Opens the dialog for a Report a problem link. Where the Worker takes no reports, or the
 *  page has no dialog, the link is followed: GitHub's own form, as with no script. */
export async function openIssueDialog(link: HTMLAnchorElement): Promise<void> {
  const answer = await readStatus();
  if (answer.open) made ??= makeDialog();
  if (answer.open && made) await made.open(link, answer);
  else window.location.assign(link.href);
}
