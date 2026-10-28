// The issue dialog (src/components/IssueDialog.astro) and the Worker that files a reader's
// report as an issue on GitHub (worker/index.ts, docs/cloudflare.md) agree here on where a
// report goes and what a request carries. Types and constants only, so the Worker and the browser import it without
// the build-time libraries.

/** The repositories the dialog files into, by the key a request names. A request never names
 *  a repository itself, so the Worker writes only where this table says. */
export const ISSUE_REPOS = {
  compiler: 'typeshade/typeshade',
  site: 'typeshade/typeshade.github.io',
} as const;
export type IssueRepo = keyof typeof ISSUE_REPOS;

export const isIssueRepo = (key: unknown): key is IssueRepo =>
  typeof key === 'string' && Object.hasOwn(ISSUE_REPOS, key);

/** GitHub's own form for the repository: where a report link goes with no script, or where
 *  the Worker takes no reports. */
export const githubNewIssue = (repo: IssueRepo): string =>
  `https://github.com/${ISSUE_REPOS[repo]}/issues/new`;

/** The label every issue from the dialog carries, so the maintainers can find them. */
export const ISSUE_LABEL = 'site form';

/** The longest title and text the dialog takes. GitHub takes 256 and 65,536 characters; the
 *  rest of the body is the images, the program and where the issue came from. */
export const ISSUE_TITLE_MAX = 200;
export const ISSUE_TEXT_MAX = 8000;
/** The attached program's files together, and how many there may be. */
export const ISSUE_PROGRAM_MAX = 48 * 1024;
export const ISSUE_FILES_MAX = 8;
/** Images: how many, and how large each. The Worker keeps them in R2 and the issue shows them
 *  from /data/issue-images/, since GitHub's API takes no attachment. */
export const ISSUE_IMAGES_MAX = 4;
export const ISSUE_IMAGE_BYTES = 5 * 1024 * 1024;
/** What the image picker offers; the Worker reads the type from the file's own first bytes. */
export const ISSUE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;

/** The page an issue is about: a path on the site, and never `//`, which leaves it. */
export const ISSUE_PAGE = /^\/(?!\/)[A-Za-z0-9._~/-]{0,300}$/;
/** A file's name in the program, as the Playground's tabs name them. */
export const ISSUE_FILE_NAME = /^[A-Za-z0-9._/-]{1,160}$/;

/** One file of the program the Playground held, the file it runs first. */
export interface IssueFile {
  readonly name: string;
  readonly text: string;
}

/** The fields the dialog posts to /data/issues/ as multipart form data, each a string except
 *  `image`, which repeats once per image file. */
export type IssueField =
  | 'repo'
  | 'title'
  /** Optional: a title alone is an issue. */
  | 'text'
  /** The page the issue is about, a path on the site. */
  | 'page'
  /** The short link the Playground's program was stored under (/s/<id>/). */
  | 'share'
  /** The program, as JSON: IssueFile[], the file the Playground runs first. */
  | 'files'
  /** The compiler commit the page was built from. */
  | 'compiler'
  /** Cloudflare Turnstile's token, where the Worker asks for one. */
  | 'challenge'
  /** A field a person never sees and leaves empty. */
  | 'website'
  | 'image';

/** GET /data/issues/: whether the Worker takes reports here, and the Turnstile site key where
 *  it checks for a person first. */
export interface IssueStatus {
  readonly open: boolean;
  readonly challenge?: string;
}

/** Why the Worker opened no issue. `closed`: it holds no credential, or the host is not the
 *  site's. `invalid`: the request is not one the dialog sends. `image`: an image is too large
 *  or not an image. `challenge`: Turnstile did not pass. `limit`: too many issues from one
 *  address, or from the site today. `github`: GitHub refused it or did not answer. */
export type IssueError = 'closed' | 'invalid' | 'image' | 'challenge' | 'limit' | 'github';

/** POST /data/issues/'s answer: the issue, or why there is none. A pull request's preview
 *  checks the request and files nothing, and answers `preview`. */
export type IssueAnswer =
  | { readonly number: number; readonly url: string }
  | { readonly preview: true }
  | { readonly error: IssueError };
