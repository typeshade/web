import "../styles/theme-switch.css";
import { ConfigProvider, Switch, theme, type ThemeConfig } from "antd";
import { useEffect, useState, type ReactNode } from "react";

/** Each Astro island subscribes to the same document theme. */
export function useDocumentTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () =>
      setDark(
        document.documentElement.dataset.theme
          ? document.documentElement.dataset.theme === "dark"
          : media.matches,
      );
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    media.addEventListener("change", sync);
    sync();
    return () => {
      observer.disconnect();
      media.removeEventListener("change", sync);
    };
  }, []);
  return dark;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const dark = useDocumentTheme();
  const [tokens, setTokens] = useState<ThemeConfig["token"]>({
    colorPrimary: "#1677ff",
    borderRadius: 6,
    fontFamily: "sans-serif",
  });
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const value = (name: string, fallback: string) =>
      css.getPropertyValue(name).trim() || fallback;
    setTokens({
      colorPrimary: value("--ui-accent", "#0958d9"),
      colorError: value("--ui-danger", "#b42318"),
      colorText: value("--ui-text", dark ? "#f5f5f5" : "#141414"),
      colorTextSecondary: value(
        "--ui-text-muted",
        dark ? "#bfbfbf" : "#595959",
      ),
      colorBgContainer: value("--ui-surface", dark ? "#141414" : "#fff"),
      colorBgElevated: value("--ui-surface", dark ? "#141414" : "#fff"),
      colorBorder: value("--ui-border-control", "#8c8c8c"),
      colorTextDisabled: value("--ui-disabled-text", "#707070"),
      colorBgContainerDisabled: value(
        "--ui-surface-muted",
        dark ? "#1f1f1f" : "#fafafa",
      ),
      borderRadius: parseFloat(value("--ui-radius-control", "6")),
      controlHeight: parseFloat(value("--ui-control-height", "36")),
      controlHeightSM: parseFloat(value("--ui-control-height-small", "28")),
      controlHeightLG: parseFloat(value("--ui-control-height-large", "44")),
      fontSize: parseFloat(value("--ui-font-size-control", "14")),
      fontFamily: value("--ui-font-sans", "sans-serif"),
    });
  }, [dark]);
  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: tokens,
      }}
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
    if (saved === "dark" || saved === "light")
      document.documentElement.dataset.theme = saved;
  }, [storageKey]);
  function change(checked: boolean) {
    const value = checked ? "dark" : "light";
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
        className="ui-theme-switch"
        checked={dark}
        onChange={change}
        aria-label={dark ? lightLabel : darkLabel}
        size="small"
      />
    </ThemeProvider>
  );
}
