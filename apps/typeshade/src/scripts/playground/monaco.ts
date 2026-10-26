import type {
  TypeshadeCompletionItem,
  TypeshadeDocumentSymbol,
  TypeshadeDiagnostic,
} from '../../../vendor/shader-dsl/src/language-service/index.ts';
// ── Monaco, from the CDN ───────────────────────────────────────────────────────────────────
// The editor is loaded the way its own samples load it, through its AMD loader. `MONACO_VS`
// is the directory the loader knows as `vs`, with no trailing slash: the loader joins
// `/editor/editor.main.js` onto it, and a trailing slash would make that a doubled separator
// the CDN answers with a 400.
export const MONACO_VERSION = '0.52.2';
export const MONACO_MIN = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min`;
export const MONACO_VS = `${MONACO_MIN}/vs`;

export function monacoWorkerUrl(_label: string): string {
  // A worker script fetched straight from the CDN is cross-origin, so each worker is a small
  // same-origin shim that names Monaco's own baseUrl and pulls the real worker in from there.
  //
  // Every label loads the same bootstrap. workerMain.js carries the AMD loader and reads the
  // module to run from the message Monaco sends it, so it serves the TypeScript worker and
  // the plain editor worker alike. Importing language/typescript/tsWorker.js directly, as
  // this did, hands the worker an AMD module with no loader under it, and the browser reports
  // that as the script failing to load; the CDN serves that file, so it read as a network
  // problem and was not one.
  //
  // baseUrl is the directory above vs, since the paths workerMain.js resolves start with vs/.
  const source =
    `self.MonacoEnvironment={baseUrl:${JSON.stringify(`${MONACO_MIN}/`)}};` +
    `importScripts(${JSON.stringify(`${MONACO_VS}/base/worker/workerMain.js`)});`;
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
}

export function loadMonaco(): Promise<any> {
  const w = window as any;
  if (w.monaco) return Promise.resolve(w.monaco);
  return new Promise((resolve, reject) => {
    const start = (): void => {
      const amdRequire = w.require;
      if (typeof amdRequire !== 'function') {
        reject(new Error('The Monaco loader ran without defining its AMD require.'));
        return;
      }
      amdRequire.config({ paths: { vs: MONACO_VS } });
      w.MonacoEnvironment = {
        getWorkerUrl: (_moduleId: string, label: string) => monacoWorkerUrl(label),
      };
      amdRequire(['vs/editor/editor.main'], () => resolve(w.monaco), reject);
    };
    const existing = document.querySelector('script[data-monaco-loader]');
    if (existing) {
      if (w.require) start();
      else existing.addEventListener('load', start, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = `${MONACO_VS}/loader.js`;
    script.async = true;
    script.dataset.monacoLoader = 'true';
    script.addEventListener('load', start, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error(`The Monaco loader did not load from ${MONACO_VS}/loader.js`)),
      { once: true },
    );
    document.head.appendChild(script);
  });
}

// ── The site's dark mode ───────────────────────────────────────────────────────────────────
// Base.astro puts the reader's choice on `documentElement.dataset.theme` and leaves it unset
// while the choice is the system's. Monaco keeps a theme of its own, so it is told which one
// on load, on the toggle, and when the system setting moves under an unset choice.
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

export function siteIsDark(): boolean {
  const chosen = document.documentElement.dataset.theme;
  return chosen ? chosen === 'dark' : darkQuery().matches;
}

export function followSiteTheme(monaco: any, repaint: () => void): void {
  const apply = () => {
    monaco.editor.setTheme(siteIsDark() ? 'typeshade-dark' : 'typeshade-light');
    repaint();
  };
  apply();
  new MutationObserver(apply).observe(document.documentElement, {
    attributeFilter: ['data-theme'],
  });
  darkQuery().addEventListener('change', apply);
}

export function completionKind(monaco: any, kind: TypeshadeCompletionItem['kind']): number {
  const kinds = monaco.languages.CompletionItemKind;
  const byKind: Record<TypeshadeCompletionItem['kind'], number> = {
    keyword: kinds.Keyword,
    type: kinds.TypeParameter,
    function: kinds.Function,
    attribute: kinds.Keyword,
    builtin: kinds.Constant,
    variable: kinds.Variable,
    field: kinds.Field,
    struct: kinds.Struct,
    resource: kinds.Variable,
    snippet: kinds.Snippet,
  };
  return byKind[kind] ?? kinds.Text;
}

export function symbolKind(monaco: any, kind: TypeshadeDocumentSymbol['kind']): number {
  const kinds = monaco.languages.SymbolKind;
  const byKind: Record<TypeshadeDocumentSymbol['kind'], number> = {
    function: kinds.Function,
    struct: kinds.Struct,
    field: kinds.Field,
    resource: kinds.Variable,
    constant: kinds.Constant,
    variable: kinds.Variable,
    parameter: kinds.Variable,
    entry: kinds.Function,
  };
  return byKind[kind] ?? kinds.Variable;
}

export function markerSeverity(monaco: any, severity: TypeshadeDiagnostic['severity']): number {
  const levels = monaco.MarkerSeverity;
  return severity === 'error'
    ? levels.Error
    : severity === 'warning'
      ? levels.Warning
      : severity === 'information'
        ? levels.Info
        : levels.Hint;
}

/** The service's semantic tokens, coloured. Monaco matches a semantic token against a theme
 *  rule by its type followed by its modifiers, `type.gpu` for a GPU type, so a decorator, a
 *  GPU type, an entry point and a bound resource each read as what the compiler says they
 *  are. The values are Monaco's own light and dark TypeScript palette, so nothing here is a
 *  colour the editor does not already use. */
export function defineTypeshadeThemes(monaco: any): void {
  const rules = (dark: boolean) => [
    { token: 'decorator', foreground: dark ? 'c586c0' : 'af00db' },
    { token: 'type', foreground: dark ? '4ec9b0' : '267f99' },
    { token: 'type.gpu', foreground: dark ? '4ec9b0' : '267f99', fontStyle: 'bold' },
    { token: 'struct', foreground: dark ? '4ec9b0' : '267f99' },
    { token: 'builtin', foreground: dark ? 'dcdcaa' : '795e26' },
    { token: 'resource', foreground: dark ? '9cdcfe' : '0070c1', fontStyle: 'italic' },
    { token: 'function', foreground: dark ? 'dcdcaa' : '795e26' },
    { token: 'function.entry', foreground: dark ? 'dcdcaa' : '795e26', fontStyle: 'bold' },
    { token: 'parameter', foreground: dark ? '9cdcfe' : '001080' },
    { token: 'variable', foreground: dark ? '9cdcfe' : '001080' },
    { token: 'property', foreground: dark ? '9cdcfe' : '001080' },
  ];
  monaco.editor.defineTheme('typeshade-light', {
    base: 'vs',
    inherit: true,
    rules: rules(false),
    colors: {},
  });
  monaco.editor.defineTheme('typeshade-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: rules(true),
    colors: {},
  });
}

// ── The source in the URL ──────────────────────────────────────────────────────────────────
// A link can carry the whole file in its fragment (`code=`), so the page opens it with no
// service to hand the source back. The encoding is src/scripts/source-link.ts, which a live
// example's link to the Playground writes too. Share stores that fragment with the Worker and
// copies a short link (/s/<id>, worker/index.ts), which opens the page at `#share=<id>`: the
// page fetches the fragment by its id, so the address stays short whatever the file's size.
// Where there is no Worker, Share copies the long link.
