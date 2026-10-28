import {
  useEffect,
  useId,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { bindTabs } from "../dom/tabs";

export function Toolbar({
  label,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return (
    <div
      {...props}
      className={`ui-toolbar ${className}`}
      role="group"
      aria-label={label}
    />
  );
}
export function Panel({
  className = "",
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <section {...props} className={`ui-panel ${className}`} />;
}
export function EmptyState({
  children,
  busy = false,
  className = "",
}: {
  children: ReactNode;
  busy?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`ui-empty-state ${className}`}
      role={busy ? "status" : undefined}
      aria-busy={busy || undefined}
    >
      {children}
    </div>
  );
}
export function Alert({
  tone = "info",
  live = false,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: "info" | "danger" | "success";
  live?: boolean;
}) {
  return (
    <div
      {...props}
      className={`ui-alert ${className}`}
      data-tone={tone}
      role={live ? (tone === "danger" ? "alert" : "status") : undefined}
    />
  );
}
export type TabItem = {
  key: string;
  label: ReactNode;
  children: ReactNode;
  disabled?: boolean;
};
export function Tabs({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const list = useRef<HTMLDivElement>(null);
  const active = items.some((item) => item.key === value && !item.disabled)
    ? value
    : items.find((item) => !item.disabled)?.key;
  useEffect(() => {
    if (!list.current) return;
    const tabs = [
      ...list.current.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ];
    return bindTabs(tabs, (index, focus) => {
      onChange(items[index].key);
      if (focus) tabs[index].focus();
    });
  }, [items, onChange]);
  return (
    <div className="ui-tabs">
      <div className="ui-tablist" role="tablist" aria-label={label} ref={list}>
        {items.map((item, index) => (
          <button
            type="button"
            role="tab"
            key={item.key}
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={active === item.key}
            tabIndex={active === item.key ? 0 : -1}
            disabled={item.disabled}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.key}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={active !== item.key}
          tabIndex={0}
        >
          {item.children}
        </div>
      ))}
    </div>
  );
}
