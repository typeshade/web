// The editor a live example opens: the highlighted block Expressive Code already rendered,
// with a transparent textarea over it.
//
// Why this and not CodeMirror 6. CodeMirror, with its TypeScript language, history and line
// numbers, measures 404 KB minified and 133 KB gzipped as its own lazily loaded chunk; this
// file is part of the page's own module and costs a few kilobytes. On a phone a textarea is
// the platform's text field, so the caret, the selection handles and the keyboard are the
// ones the reader already knows. A Korean reader types through an input method, and an input
// method composes into a real text field without help: nothing here writes to the textarea's
// value while it is composing, so composition is left alone and only the layer underneath is
// redrawn.
//
// The alignment rule. The textarea never draws text of its own (the text is transparent, the
// caret is not), so it has to sit exactly over the highlighted lines, at every scroll offset.
// It is therefore placed over the block's non-scrolling wrapper and is the only thing on the
// page that scrolls: the highlighted layer is translated to follow it. Putting the overlay
// inside the scroller instead moves it twice, once with the scroller and once with its own
// content, which pulls the caret away from the glyph by the scroll distance.
//
// The metrics are measured off the rendered block, so Expressive Code's own padding and font
// stay the single source, and they are measured again whenever the box or the fonts change.

import { highlight } from './live-shader-highlight.ts';

export interface LiveEditor {
  /** What the reader has typed. */
  value(): string;
  /** Put the caret in the editor, at `index` when one is given. */
  focus(index?: number): void;
  /** Move the caret to a line and column, both one-based, for a diagnostic a reader clicks. */
  goTo(line: number, character: number): void;
  destroy(): void;
}

export interface EditorOptions {
  /** Every keystroke, after the highlighted layer has been redrawn. */
  readonly onInput: (source: string) => void;
  /** True while an input method is composing, when a recompile would see half a syllable. */
  readonly onComposing: (composing: boolean) => void;
  readonly ariaLabel: string;
}

const TAB = '  ';

/** Put the editor on one Expressive Code block. `pre` is the block's scroller, `code` the
 *  element holding its lines, and `host` the non-scrolling box the overlay sits in. */
export function mountEditor(
  host: HTMLElement,
  pre: HTMLElement,
  code: HTMLElement,
  source: string,
  opts: EditorOptions,
): LiveEditor {
  const area = document.createElement('textarea');
  area.className = 'live-input';
  area.value = source;
  area.spellcheck = false;
  area.autocapitalize = 'off';
  area.setAttribute('autocorrect', 'off');
  area.setAttribute('autocomplete', 'off');
  area.setAttribute('aria-label', opts.ariaLabel);
  area.setAttribute('data-live-input', '');

  // The block stops scrolling and the textarea takes over; the lines are moved to follow it.
  const preOverflow = pre.style.overflow;
  pre.style.overflow = 'hidden';
  host.appendChild(area);

  const follow = (): void => {
    code.style.transform = `translate(${-area.scrollLeft}px, ${-area.scrollTop}px)`;
  };

  const measure = (): void => {
    // The offset of the first rendered line inside the block, which is whatever padding
    // Expressive Code's stylesheet put there. Measured with the layer at rest.
    const previous = code.style.transform;
    code.style.transform = '';
    const anchor = code.querySelector<HTMLElement>('.ec-line .code') ?? code;
    const style = getComputedStyle(anchor);
    const hostBox = host.getBoundingClientRect();
    const anchorBox = anchor.getBoundingClientRect();
    area.style.font = style.font;
    area.style.fontFamily = style.fontFamily;
    area.style.fontSize = style.fontSize;
    area.style.lineHeight = style.lineHeight;
    area.style.letterSpacing = style.letterSpacing;
    area.style.tabSize = style.tabSize;
    area.style.paddingTop = `${anchorBox.top - hostBox.top}px`;
    area.style.paddingLeft = `${anchorBox.left - hostBox.left}px`;
    code.style.transform = previous;
    follow();
  };

  /** Redraw the layer under the caret, then let the page know. The copy button carries the
   *  code as an attribute, so it is moved on too. */
  const paint = (): void => {
    code.innerHTML = highlight(area.value);
    const copy = pre.parentElement?.querySelector<HTMLElement>('.copy button');
    if (copy) copy.dataset.code = area.value;
    measure();
    opts.onInput(area.value);
  };

  /** Put text in at the caret without losing the field's own undo history, which assigning
   *  to `value` throws away. */
  const insert = (text: string): void => {
    if (!document.execCommand('insertText', false, text)) {
      const { selectionStart, selectionEnd, value } = area;
      area.value = value.slice(0, selectionStart) + text + value.slice(selectionEnd);
      area.selectionStart = area.selectionEnd = selectionStart + text.length;
    }
  };

  const onInput = (): void => paint();
  const onScroll = (): void => follow();
  const onCompositionStart = (): void => opts.onComposing(true);
  const onCompositionEnd = (): void => {
    opts.onComposing(false);
    paint();
  };
  /** Tab indents. Escape hands the tab key back for one press, so a reader on a keyboard can
   *  always walk past the block, and Shift+Tab always leaves. */
  let tabEscapes = false;
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      tabEscapes = true;
      return;
    }
    if (e.key !== 'Tab') {
      // A modifier on its own is not the reader giving up on the escape hatch.
      if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta')
        tabEscapes = false;
      return;
    }
    if (tabEscapes || e.shiftKey) {
      tabEscapes = false;
      return;
    }
    e.preventDefault();
    insert(TAB);
    paint();
  };

  area.addEventListener('input', onInput);
  area.addEventListener('scroll', onScroll);
  area.addEventListener('keydown', onKeyDown);
  area.addEventListener('compositionstart', onCompositionStart);
  area.addEventListener('compositionend', onCompositionEnd);
  // The box moves with the window and the metrics move with the fonts, and the overlay has to
  // be measured again for both.
  const boxes = new ResizeObserver(() => measure());
  boxes.observe(host);
  void document.fonts?.ready.then(() => measure());
  measure();

  /** The character offset of a one-based line and column. */
  const offsetOf = (line: number, character: number): number => {
    const lines = area.value.split('\n');
    let at = 0;
    for (let i = 0; i < Math.min(line - 1, lines.length); i++) at += (lines[i]?.length ?? 0) + 1;
    return at + Math.max(0, character - 1);
  };

  return {
    value: () => area.value,
    focus(index) {
      // The caret is placed before the field takes focus. Focusing first leaves the caret at
      // the end of the text, and the browser scrolls the pane to the foot of the file on its
      // way there, which throws the reader's own line off the screen.
      if (index !== undefined) area.selectionStart = area.selectionEnd = index;
      area.focus();
    },
    goTo(line, character) {
      area.selectionStart = area.selectionEnd = offsetOf(line, character);
      area.focus();
    },
    destroy() {
      boxes.disconnect();
      area.removeEventListener('input', onInput);
      area.removeEventListener('scroll', onScroll);
      area.removeEventListener('keydown', onKeyDown);
      area.removeEventListener('compositionstart', onCompositionStart);
      area.removeEventListener('compositionend', onCompositionEnd);
      area.remove();
      code.style.transform = '';
      pre.style.overflow = preOverflow;
    },
  };
}
