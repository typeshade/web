// Tools needed after a reader opens source, edits code or reads diagnostics.
import { errorLink, linkedMessage } from './error-links.ts';
export { mountEditor } from './live-shader-editor.ts';
export { highlight } from './live-shader-highlight.ts';

interface Diagnostic {
  readonly text: string;
  readonly code?: string;
  readonly line?: number;
}

/** Upgrade plain diagnostics with line navigation and reference links. */
export function paintDiagnostics(
  host: HTMLElement,
  list: readonly Diagnostic[],
  copy: { readonly lineAt: string; readonly errorsHref: string },
  jumpTo: (line: number) => void,
  note?: string,
): void {
  const element = (tag: string, className: string, text?: string): HTMLElement => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  host.textContent = '';
  for (const message of list) {
    const line = element('div', 'live-message');
    if (message.line !== undefined) {
      const jump = element(
        'button',
        'live-jump',
        copy.lineAt.replace('{line}', String(message.line)),
      );
      jump.setAttribute('type', 'button');
      jump.addEventListener('click', () => jumpTo(message.line!));
      line.append(jump, document.createTextNode('  '));
    }
    const code = message.code ? errorLink(copy.errorsHref, message.code, 'live-error-code') : null;
    if (code) line.append(code, document.createTextNode(' '));
    line.append(...linkedMessage(copy.errorsHref, message.text, 'live-error-code'));
    host.append(line);
  }
  if (note) host.append(element('div', 'live-note', note));
}
