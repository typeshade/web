import { ConfigProvider, Switch, theme } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';

/** Each Astro island subscribes to the same document theme. */
export function useDocumentTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () =>
      setDark(
        document.documentElement.dataset.theme
          ? document.documentElement.dataset.theme === 'dark'
          : media.matches,
      );
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    media.addEventListener('change', sync);
    sync();
    return () => {
      observer.disconnect();
      media.removeEventListener('change', sync);
    };
  }, []);
  return dark;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const dark = useDocumentTheme();
  const [tokens, setTokens] = useState({
    colorPrimary: '#1677ff',
    borderRadius: 6,
    fontFamily: 'sans-serif',
  });
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    setTokens({
      colorPrimary:
        css.getPropertyValue('--brand').trim() ||
        css.getPropertyValue('--color-accent').trim() ||
        '#1677ff',
      borderRadius: parseFloat(css.getPropertyValue('--ui-radius-control')) || 6,
      fontFamily: css.getPropertyValue('--ui-font-sans').trim() || 'sans-serif',
    });
  }, [dark]);
  return (
    <ConfigProvider
      theme={{ algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm, token: tokens }}
    >
      {children}
    </ConfigProvider>
  );
}

export function ThemeSwitch({
  storageKey,
  darkLabel,
  lightLabel,
  changeEvent,
}: {
  storageKey: string;
  darkLabel: string;
  lightLabel: string;
  changeEvent?: string;
}) {
  const dark = useDocumentTheme();
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(storageKey);
    } catch {
      /* Storage can be unavailable. */
    }
    if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved;
  }, [storageKey]);
  function change(checked: boolean) {
    const value = checked ? 'dark' : 'light';
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* The theme still works for this page. */
    }
    if (changeEvent) window.dispatchEvent(new Event(changeEvent));
  }
  return (
    <ThemeProvider>
      <Switch
        checked={dark}
        onChange={change}
        aria-label={dark ? lightLabel : darkLabel}
        size="small"
      />
    </ThemeProvider>
  );
}
