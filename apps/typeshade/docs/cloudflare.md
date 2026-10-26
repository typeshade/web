# typeshade.dev on Cloudflare

The site is two things with two clocks:

- **The build.** `bun run build` turns the pinned compiler into `dist/`: every page, every
  example with its still, its goldens and both languages' words, checked against each other. A
  mismatch stops it, which is what keeps a built page true, and it moves when the pin moves.
- **The example data.** `scripts/publish-examples.ts` reads the compiler's examples at its
  `main`, gives each the site's words where the dictionaries have them, and uploads a release to
  R2. It fails soft where the build fails hard, and it moves when the compiler does.

A Cloudflare Worker serves both from one origin, so an example merged upstream is on the site
within the hour, before the pin bump and the build that make it a built page. It also opens the
issues a reader files from the site with no GitHub account (Issues, below). A second Worker
serves the gallery at its own address, `gallery.typeshade.dev`, from the same build and the
same data (The gallery, below).

## What serves what

| Path                                         | Served by                                                             |
| -------------------------------------------- | --------------------------------------------------------------------- |
| everything in `dist/`                        | Workers static assets; the Worker never runs                          |
| a retired route (`dist/_redirects`)          | Workers static assets: a 301 to the page that replaced it             |
| `/data/examples/`                            | the Worker: the current release's index (`ReleaseIndex`)              |
| `/data/examples/<id>/`                       | the Worker: one example with its file and its emitted text            |
| `/data/releases/`                            | the Worker: the releases D1 records, newest first                     |
| `/data/shares/` (POST)                       | the Worker: stores a Playground link in D1, answers its short link    |
| `/data/shares/<id>/`                         | the Worker: a share's page, views, and when it was made and opened    |
| `/data/gallery/`                             | the Worker: GET the approved entries; POST sends a share in, pending  |
| `/gallery/`, `/playground/gallery/`, `/ko/…` | the Worker: a redirect to `gallery.typeshade.dev`                     |
| `/data/notice/`                              | the Worker: the notice over every page, or null                       |
| `/data/issues/` (GET)                        | the Worker: whether the issue dialog takes reports here               |
| `/data/issues/` (POST)                       | the Worker: opens the dialog's issue on GitHub, answers its number    |
| `/data/issue-images/<name>`                  | the Worker: an image an issue shows, from R2                          |
| `/s/<id>/`                                   | the Worker: a redirect to the share's page at `#share=<id>`           |
| `/guide/examples/<id>/`, `/ko/...` built     | the static page, through the Worker                                   |
| `/guide/examples/<id>/`, `/ko/...` not built | the Worker: the template page, filled in from the release (see below) |

`wrangler.jsonc` binds three things to the Worker (`worker/index.ts`):

- `ASSETS`: `dist/`.
- `DATA`: the R2 bucket `typeshade-data`. A release is `releases/<release>/index.json` and
  `releases/<release>/examples/<id>.json`, shaped by `src/lib/example-data.ts`; the images the
  issues show are under `issue-images/`.
- `DB`: the D1 database `typeshade`. `releases` is the history and
  `settings.current_release` names the release the Worker serves
  (`worker/migrations/0001_releases.sql`); `shares` holds the Playground's short links
  (`0002_shares.sql`), with how often each was opened (`0003_share_views.sql`); `submissions` is the gallery's
  queue (`0004_gallery.sql`); `notices` holds the notice over every page (`0005_notices.sql`);
  `issues` holds the issues the dialog opened (`0006_issues.sql`).

## What a page does with the data

- **The gallery** (`/guide/examples/`) ends with a hidden section. `src/scripts/examples-runtime.ts`
  fetches the index and adds a tile for each `.shade.ts` example no tile on the page links to
  yet. A release published before the `fn()` registry left the site still lists the registry's
  examples; their pages redirect (`src/lib/retired-examples.mjs`), so they get no tile, and
  `scripts/publish-examples.ts` no longer publishes them.
- **An example's page.** The build also renders `/guide/examples/runtime-example/`, a template:
  `ExamplePage.astro` with the dictionary's stand-in words, both corpora's halves, `noindex`
  and out of the sitemap and the search index. For an example the build does not have, the
  Worker serves that page through `HTMLRewriter`: the title, the meta description, the
  canonical and alternate URLs, the heading, the line under it, the file, and either the
  Playground seeded with the file (a `.shade.ts` example) or the source and emitted tabs (an
  `fn()` example). The template itself answers 404.
- **The Playground** adds the release's `.shade.ts` examples it does not have to its picker, in
  a group of their own, so `#example=<id>` opens one.

- **Share** in the Playground writes the file and its options into the page's fragment, as it
  always has, then posts the page's path and that fragment to `/data/shares/` and copies the
  short link it gets back, `typeshade.dev/s/<id>/`. It ends in a slash as every route does, so
  it opens in one redirect, not two. The id is the first eight characters of the SHA-256 of the
  two, so the same file shared twice is one row and one link; a different share that already
  holds those eight characters takes a longer id. The Worker takes only the Playground and an
  example's page, in either language, and a fragment that starts `code=`, of 64 KB at most;
  anything else, or no Worker, and Share copies the long link, which carries the whole file and
  opens with no service at all.
- **A short link opens by its id.** `/s/<id>/` redirects to the share's page at `#share=<id>`,
  and the Playground fetches the stored fragment from `/data/shares/<id>/` before it opens. The
  file never rides in the redirect: a large one once made a `Location` of 20 KB that did not
  open. After Share, the address bar holds `#share=<id>` too.
- **A short link's views.** Each open of `/s/<id>/` adds one to the share's `views` and sets
  `last_opened_at`, after the redirect is sent; the redirect is `no-store`, so a browser that
  opens it again is counted again. `/data/shares/<id>/` answers the count. A cron
  (`triggers.crons` in `wrangler.jsonc`, daily at 03:17 UTC) deletes the shares nobody has
  opened for a year (`SHARE_TTL_DAYS`); a link never opened counts from the day
  it was made. The shares most opened:

  ```bash
  bunx wrangler d1 execute typeshade --remote \
    --command "SELECT id, path, views, last_opened_at FROM shares ORDER BY views DESC LIMIT 20"
  ```

- **The gallery** (`gallery.typeshade.dev`, below). Submit, beside Share in the Playground,
  asks for a title and, if the reader wants, a name, stores the file as a share and posts it to
  `/data/gallery/` with a still of the canvas, where it waits as `pending`. A title is at most
  60 characters and a name 40 (`GALLERY_TITLE_MAX` and `GALLERY_AUTHOR_MAX` in
  `src/lib/example-data.ts`); one address sends at most five in a day, counted by a hash of the
  address, which is never stored itself. A share sent to the gallery is never expired by the
  cron.

Without the Worker (`astro dev`, `astro preview`), `/data/` does not answer JSON
and every page shows what its build has.

A page filled in from the data compiles in the reader's browser with the compiler the build
pinned. A new example that needs a compiler change the pin does not have yet shows that
compiler's diagnostics until the pin moves. The emitted tabs of an `fn()` example are the
compiler's own goldens at the published commit, so they are right either way.

## The notice

A notice is one line under the header of every page, in the reader's language, changed with a
row in D1 and no build (`src/components/SiteNotice.astro`). The Worker serves the newest row
that is active and whose window holds the current time, and keeps that answer in the edge cache
for a minute, so a change shows within a minute. A reader who closes a notice does not see it
again in that browser; the next notice shows. Post one, with an optional link (a path on the site
or an `https://` address) and an optional window:

```bash
bunx wrangler d1 execute typeshade --remote --command \
  "INSERT INTO notices (text_en, text_ko, href, ends_at) VALUES ('TypeShade 0.1.0 is out.', 'TypeShade 0.1.0을 공개했습니다.', 'https://github.com/typeshade/typeshade/releases', '2026-10-31T00:00:00Z')"
```

Take it down, or list what is there:

```bash
bunx wrangler d1 execute typeshade --remote --command "UPDATE notices SET active = 0 WHERE active = 1"
bunx wrangler d1 execute typeshade --remote --command "SELECT id, text_en, href, starts_at, ends_at, active FROM notices ORDER BY id DESC"
```

## The gallery

`gallery.typeshade.dev` is a Worker of its own, `typeshade-gallery` (`wrangler.gallery.jsonc`,
`worker/gallery.ts`). It serves the same `dist/` and binds the same bucket and database, and it
runs before the assets on every request:

| Path                          | Served by                                                                 |
| ----------------------------- | ------------------------------------------------------------------------- |
| `/`, `/ko/`                   | the approved entries, each card opening it in the Playground; `?sort=`    |
| `/<id>/`, `/ko/<id>/`         | an entry's old page: a redirect to `typeshade.dev/s/<id>/`, where it runs |
| `/stills/<id>.webp`           | an approved entry's still, from R2 (`gallery/<id>`)                       |
| `/review/`                    | the maintainer's queue, behind Cloudflare Access (below)                  |
| `/sitemap.xml`, `/robots.txt` | the gallery's own                                                         |
| a file of the build's         | the static asset, as the site serves it (the CSS, the scripts, the fonts) |
| anything else                 | a redirect to the same path on `typeshade.dev`                            |

The list is built as a template on the site, `/gallery/` in both languages
(`GalleryPage.astro`), with `noindex` and out of the sitemap and the search index. The site's
Worker redirects that route, and the gallery's old address `/playground/gallery/`, to
`gallery.typeshade.dev`. The gallery's Worker fills the template in with `HTMLRewriter` and
writes every link to the address it answers at: the gallery's route becomes its own path, and
every other link on the page goes to `typeshade.dev`. An entry's id is its share's. A card opens
the entry in the Playground through its short link, `typeshade.dev/s/<id>/`, where it runs.
There is no page per entry: an entry once had one, which only repeated the card and sent the
reader on to the Playground, and its address now redirects there. The views an entry shows are
the times it was opened through the short link. The
notice on the gallery's pages comes from the site (`/data/notice/` redirects there, with CORS);
the issue dialog takes no reports on the gallery's host and links to GitHub's own form.

The still is the Playground's canvas, drawn once more and copied in the same task, cropped to
640 by 360 and sent as WebP (JPEG where the browser writes no WebP) of at most 256 KB
(`src/lib/gallery-data.ts`). The site's Worker keeps it under `gallery/<id>` in the bucket and
its type in `submissions.thumbnail` (`worker/migrations/0007_gallery_pages.sql`), only while
the submission is pending and has none, so nothing changes what an approved entry shows. An
entry with no still, as the ones sent in before this, shows a panel in two colours from its id.
`gallery-setup.yml` (Actions > gallery-setup > Run workflow, task `stills`) gives every
approved entry without one a still. The job builds the site, and `scripts/gallery-stills.ts`
opens each share on that build in Chromium, at its page and fragment, photographs the canvas
and puts it in R2. It does not open `typeshade.dev`: Cloudflare answers a headless browser on a
CI runner with its challenge page ("Just a moment..."). No view is counted.

Deploying the gallery is the second step of `deploy.yml`'s `cloudflare` job
(`wrangler deploy -c wrangler.gallery.jsonc`). Its route makes `gallery.typeshade.dev` the
Worker's custom domain, which creates the DNS record and the certificate on the first deploy;
the API token's Workers Routes edit and DNS edit on the zone cover it.

## Reviewing the gallery

Nothing appears in the gallery until it is approved. `gallery.typeshade.dev/review/` lists
the submissions waiting, oldest first, each with its still, its source, the name and the
language it was sent in and a link that opens it in the Playground, then the approved and the
rejected, newest first. Approve and Reject set the status and `reviewed_at`; the title field
beside them corrects the title in the same step. Take down sets an approved entry back to
`rejected`. A decision shows on the gallery within a minute (its pages carry a minute of edge
cache).

The people who submit need no account. The page alone has a sign-in, and it is Cloudflare
Access's: Access stands in front of `/review/`, and the Worker checks the token Access adds to
each request (`Cf-Access-Jwt-Assertion`) against the team's keys and the application's
audience. Without both (`ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`) the page answers 403 to everyone.
`gallery-setup.yml` with task `access` and the reviewer's address sets it up
(`scripts/setup-gallery-access.ts`, which is safe to run again): the Zero Trust organization,
One-time PIN as the login method, a self-hosted application on `gallery.typeshade.dev/review`,
a policy that lets in that address alone, and the two values on `typeshade-gallery`. The
address is masked in the run's log and stored nowhere in the repository. It needs
`CLOUDFLARE_API_TOKEN` to carry Access: Organizations, Identity Providers, and Groups edit and
Access: Apps and Policies edit. Without them, the same by hand:

1. Cloudflare dashboard > Zero Trust > Access > Applications > Add an application >
   Self-hosted. Domain `gallery.typeshade.dev`, path `review`. A policy that allows the
   owner's email address, and One-time PIN (or GitHub) as the login method. Free for up to 50
   people.
2. Keep the application's Application Audience (AUD) tag and the team domain
   (`<team>.cloudflareaccess.com`, Zero Trust > Settings > Custom Pages).
3. After the gallery's Worker has been deployed once, from a checkout, after
   `bunx wrangler login`, in PowerShell:

   ```powershell
   ./scripts/setup-gallery-review.ps1
   ```

   It asks for the two values and puts them on `typeshade-gallery`.

The queue can still be read and changed by hand:

```bash
bunx wrangler d1 execute typeshade --remote --command \
  "SELECT share_id, title, author, created_at FROM submissions WHERE status = 'pending' ORDER BY created_at"
bunx wrangler d1 execute typeshade --remote --command \
  "UPDATE submissions SET status = 'approved', reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE share_id = '<share_id>'"
```

## Issues

Every "Report a problem" link opens a dialog on the page it is on: a title, a description if
the reader has one, images (a button, a paste or a drop), and Send (`IssueDialog.astro`,
`src/scripts/issue-dialog.ts`). The dialog's words are about the report alone: it says that
anyone can read what is sent, and thanks the reader once it is. Every documentation page
has one beside Edit this page, and it names the repository its text is written in (the
compiler, `typeshade/typeshade`, or this site); the footer's goes to the compiler, and so does
the Playground's header. The page's address goes along, and where the page holds a
Playground, so does its program, as a chip the reader can take out, in the fragment the way
Share carries it. With no script, the link is GitHub's own new-issue form.

The dialog asks `/data/issues/` whether the Worker takes reports before it opens. Where it
does, Send posts multipart form data there. The Worker opens the issue on GitHub under the
label `site form` and answers its number. The body starts with where it came from: the
dialog, the page, and the commit of the compiler the page was built from. The reader's words
follow, then the images, then the program: its short link (`/s/<id>/`), which the cron then
never expires, and each file.

GitHub's API takes no attachment, so the Worker keeps the images itself: in the `DATA` bucket
under `issue-images/`, named by their content, and served at `/data/issue-images/<name>` for a
year, which is where the issue shows them from. It takes PNG, JPEG, GIF and WebP, known by
their first bytes, up to 5 MB each and 4 to an issue (`ISSUE_IMAGE_BYTES`, `ISSUE_IMAGES_MAX`
in `src/lib/issue-data.ts`). The images a request stored are deleted again when GitHub does not
open its issue. An image stays when its issue is deleted; remove it by name:

```bash
bunx wrangler r2 object delete typeshade-data/issue-images/<name> --remote
```

GitHub shows an issue's images through its own image proxy, which can go on showing a copy for a
while after the object is gone; edit the image out of the issue, or delete the issue, as well.

The Worker holds the credential, so a reader needs no GitHub account:

- A GitHub App (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`) opens the issue as its bot. For each
  issue the Worker signs a JWT with the key and mints an installation token for that
  repository with Issues: write and nothing else, which it keeps until five minutes before it
  expires. The key can be the file GitHub downloads (`BEGIN RSA PRIVATE KEY`) or PKCS#8.
- Without an App, a fine-grained token (`GITHUB_TOKEN`) with Issues: Read and write on the two
  repositories opens it as the token's owner.

What stands between the dialog and GitHub:

- The request comes from the site itself (`Origin`), and a field hidden from people is empty.
- Five issues a day from one address and 20 from every reader together (`ISSUES_PER_ADDRESS`
  and `ISSUES_PER_DAY` in `worker/index.ts`), counted over the `issues` rows of the last day. An
  address is kept as a hash, the way the gallery keeps its senders.
- Cloudflare Turnstile (`TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`). The issues are
  public as soon as they are opened, with nobody approving them first, so on `typeshade.dev` the
  Worker takes no report without both keys: with a credential and no Turnstile, the links go to
  GitHub's own form. Under `wrangler dev` the dialog opens without them. The widget shows itself
  only when it needs the reader to act.
- The same title, text and images sent twice are one issue: the row's id is a hash of them.
- A mention (`@name`) in the reader's words is set as code, so the dialog notifies nobody. A
  code fence the reader leaves open is closed and an HTML comment is written out as text, so
  neither hides the images and the program under them.

Where the Worker takes no reports (no credential, no Turnstile on the site, `astro dev` or
`astro preview`), no dialog
opens: the link is followed to GitHub's own new-issue form, as it is with no script. Where the
Worker refuses a report or GitHub does, the dialog says why, or to try again later, and keeps
the draft.

A pull request's preview version answers at workers.dev with the production secrets, so it
opens no issue at all: the Worker opens one only at `typeshade.dev` and under `wrangler dev`.
On a preview the dialog opens as it does on the site and the Worker checks the report (the
fields, the images), then opens no issue, stores no image, counts nothing against the limits
and answers `preview`, which the dialog says in place of its thanks. Turnstile stays off
there, since its widget knows only `typeshade.dev`.

Setting it up is the owner's (the Worker's secrets and the App are account settings):

1. Create the App: Organization settings > Developer settings > GitHub Apps > New GitHub App.
   Homepage `https://typeshade.dev/`, Webhook off, Repository permissions > Issues: Read and
   write, installable on this account only. Generate a private key (a `.pem` file downloads),
   then Install App on `typeshade` for the two repositories.
2. Turnstile, which the site's dialog needs: Cloudflare dashboard > Turnstile > Add widget,
   hostname `typeshade.dev`, Managed. Keep its site key and secret key for the next step.
3. From a checkout, after `gh auth login` and `bunx wrangler login`, in PowerShell:

   ```powershell
   ./scripts/setup-issue-form.ps1 -AppId <App ID> -KeyFile <path to the .pem>
   ```

   It creates the `site form` label in both repositories and puts the secrets on the Worker
   (`wrangler secret put`), asking for the Turnstile keys at the prompt. The secrets take
   effect at once; the dialog opens issues from the first deploy that carries it.

The dialog's issues, newest first:

```bash
bunx wrangler d1 execute typeshade --remote \
  --command "SELECT repo, number, created_at FROM issues ORDER BY created_at DESC LIMIT 20"
```

## Headers

`public/_headers` sets the cache the static assets get: a year, immutable, for the files whose
names carry their content hash (`/_astro/`, Pagefind's fragments and index), and a week for the
fonts. Everything else keeps the asset handler's default, `max-age=0, must-revalidate`, so a
page is never older than the last deploy.

## Publishing a release

`.github/workflows/publish-examples.yml` runs at :23 and :53 every hour, on
`repository_dispatch: compiler-updated`, and by hand (Actions > publish-examples > Run
workflow, with a compiler ref). By hand, from a checkout with the Cloudflare variables set:

```bash
git -C vendor/shader-dsl fetch origin main && git -C vendor/shader-dsl checkout FETCH_HEAD
bun scripts/publish-examples.ts read      # the examples, at the compiler's main
git submodule update vendor/shader-dsl
bun scripts/publish-examples.ts words     # the site's words and page meta, at the pin
bun scripts/publish-examples.ts upload    # R2, then settings.current_release in D1
```

A release is named `<compiler commit>-<site commit>`, so a run whose two commits have not moved
uploads nothing (`--force` uploads anyway). To go back to an earlier release:

```bash
bunx wrangler d1 execute typeshade --remote \
  --command "UPDATE settings SET value = '<release>' WHERE key = 'current_release'"
```

The Worker reads the pointer at most once a minute, and `/data/` answers carry a minute of
edge cache.

## Deploying

`deploy.yml`'s `cloudflare` job deploys `dist/` and the Worker on every push to `main`
(`wrangler d1 migrations apply`, then `wrangler deploy`), and `cloudflare-preview` uploads a
version of each pull request under a preview URL of its own (the job summary has it).

The jobs need one secret, `CLOUDFLARE_API_TOKEN`: the account is `account_id` in
`wrangler.jsonc`, and the publisher reaches R2 and D1 through the same API wrangler does. It is
an organization secret of `typeshade` shared with this repository (Organization settings >
Secrets and variables > Actions); a repository secret of the same name would do as well.

The API token needs: Workers Scripts edit, Workers R2 Storage edit, D1 edit, and, for the
domain, Workers Routes edit and DNS edit on the `typeshade.dev` zone.

## The domain

`typeshade.dev` is the Worker's custom domain (Workers > typeshade-site > Settings > Domains &
Routes). It moved from GitHub Pages on 2026-09-28: the A and AAAA records that pointed at
GitHub Pages were removed and the custom domain attached in their place. The
`_github-pages-challenge-typeshade` TXT record stays, since it keeps the domain verified to the
organization on GitHub.

The Worker has no `workers.dev` address of its own (`workers_dev: false` in `wrangler.jsonc`),
so no second copy of the site answers outside the domain. A pull request's preview version still
answers at `pr-<n>-typeshade-site.<account>.workers.dev` (`preview_urls: true`).

## Locally

```bash
bun run build
bunx wrangler d1 migrations apply typeshade --local
bunx wrangler dev          # http://localhost:8787, with a local D1 and R2
```

The gallery runs beside it with `bunx wrangler dev -c wrangler.gallery.jsonc --port 8788`, on
the same local database. `REVIEW_LOCAL=1` in `.dev.vars` opens `/review/` there with no
Access.

`wrangler dev` starts with an empty local bucket and database; put a release in them with
`wrangler r2 object put --local` and `wrangler d1 execute --local`, or run it with `--remote`
against the real ones.

The issue dialog reads its secrets from `.dev.vars`, which git ignores. `GITHUB_API_URL` there
points the Worker at a stand-in for `api.github.com`, so a local run files nothing:

```bash
GITHUB_TOKEN=test
GITHUB_API_URL=http://localhost:9999
```

## Performance records

`POST /data/benchmarks/records/` stores a consented benchmark record in the existing `DB`
binding. Migration `0008_benchmarks.sql` adds its record and temporary rate tables. The
production deployment applies D1 migrations before deploying the Worker. A preview using
an unmigrated database answers `503` to collection; local results and downloads still work.

The daily cron also deletes expired benchmark records and rate entries. The collector has
no public record-reading endpoint. Maintainers export through authenticated Wrangler D1
access. [benchmarks.md](benchmarks.md) defines the limits, retention and export procedure.
