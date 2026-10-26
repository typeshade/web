// Expressive Code options. They live here rather than in astro.config.mjs because the
// <Code> component needs them serialisable, and the theme selector is a function: the
// light or dark code theme follows the page's data-theme, or the system when none is set.
//
// The copy button's tooltip is the one piece of chrome Expressive Code writes itself, so it
// carries the page's language: every <Code> is given its locale, and the words for each
// locale are set here. Node loads this file and cannot read src/i18n/*.ts, so the strings are
// repeated below and bun scripts/check-copy.ts fails the build when they drift from the
// dictionary they belong to (copy.code).
import { pluginFramesTexts } from 'expressive-code';
import { gpuTypesSyntax, typeshadeInjection } from './src/lib/typeshade-syntax.mjs';

/** The copy button's two strings per locale, checked against the dictionary by check-copy. */
export const codeUiTexts = {
  en: { copy: 'Copy to clipboard', copied: 'Copied' },
  ko: { copy: '클립보드로 복사', copied: '복사됨' },
};
for (const [locale, texts] of Object.entries(codeUiTexts)) {
  pluginFramesTexts.overrideTexts(locale, {
    copyButtonTooltip: texts.copy,
    copyButtonCopied: texts.copied,
  });
}

// A code frame in Ant Design's shape: an 8px box with a #f0f0f0 rule, a #fafafa title bar and
// no shadow. The values are resolved per theme instead of read from a CSS variable, because
// Expressive Code parses some of them (it derives the tab-bar and shadow colours from
// borderColor) and a var() would leave it nothing to parse.
const surfaces = {
  light: {
    border: '#f0f0f0',
    bar: '#fafafa',
    code: '#ffffff',
    text: 'rgba(0, 0, 0, 0.88)',
    quiet: 'rgba(0, 0, 0, 0.45)',
  },
  dark: {
    border: '#303030',
    bar: '#262626',
    code: '#1f1f1f',
    text: 'rgba(255, 255, 255, 0.85)',
    quiet: 'rgba(255, 255, 255, 0.45)',
  },
};
const surface =
  (key) =>
  ({ theme }) =>
    surfaces[theme.type === 'dark' ? 'dark' : 'light'][key];

export default {
  themes: ['github-light', 'github-dark'],
  themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
  defaultLocale: 'en',
  shiki: {
    // GPU Types is a first-class fence; TypeShade remains an injection into TS/TSX.
    langs: [gpuTypesSyntax, typeshadeInjection],
  },
  styleOverrides: {
    borderRadius: '8px',
    borderWidth: '1px',
    borderColor: surface('border'),
    codeBackground: surface('code'),
    codeFontSize: '0.8125rem',
    codeFontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    codePaddingBlock: '0.75rem',
    codePaddingInline: '1rem',
    uiFontSize: '0.875rem',
    uiFontFamily: "'IBM Plex Sans Variable', 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
    frames: {
      editorBackground: surface('code'),
      terminalBackground: surface('code'),
      editorTabBarBackground: surface('bar'),
      terminalTitlebarBackground: surface('bar'),
      editorActiveTabBackground: surface('code'),
      editorActiveTabForeground: surface('text'),
      editorActiveTabBorderColor: surface('border'),
      editorTabBarBorderBottomColor: surface('border'),
      terminalTitlebarForeground: surface('text'),
      terminalTitlebarBorderBottomColor: surface('border'),
      terminalTitlebarDotsForeground: surface('quiet'),
      editorActiveTabIndicatorTopColor: 'transparent',
      editorActiveTabIndicatorBottomColor: 'transparent',
      frameBoxShadowCssValue: 'none',
      shadowColor: 'transparent',
    },
  },
};
