import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export type MenuItem =
  | {
      label: string;
      action: () => void;
      id?: string;
      shortcut?: string;
      disabled?: boolean;
      checked?: boolean;
      danger?: boolean;
    }
  | { separator: true };
type MenuState = {
  key: string;
  label: string;
  x: number;
  y: number;
  items: MenuItem[];
  origin: HTMLElement | null;
};
const Context = createContext<{
  menuKey?: string;
  openMenu: (
    key: string,
    label: string,
    items: MenuItem[],
    point: { x: number; y: number },
    origin?: HTMLElement | null,
  ) => void;
  closeMenu: () => void;
} | null>(null);
export function useInteractions() {
  const value = useContext(Context);
  if (!value) throw new Error("Interactions provider is missing.");
  return value;
}

export function InteractionProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<MenuState>();
  const [tip, setTip] = useState<{
    text: string;
    anchor: HTMLElement;
    described: HTMLElement;
  }>();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hovering = useRef<HTMLElement | undefined>(undefined);
  const pressed = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null),
    tipRef = useRef<HTMLDivElement>(null);
  const currentMenu = useRef(menu);
  currentMenu.current = menu;
  function hideTip() {
    clearTimeout(timer.current);
    hovering.current = undefined;
    setTip(undefined);
  }
  function dismiss(restore = false) {
    const origin = currentMenu.current?.origin;
    setMenu(undefined);
    if (restore)
      queueMicrotask(() => {
        if (origin?.isConnected) origin.focus({ preventScroll: true });
      });
  }
  useEffect(() => {
    const show = (event: Event) => {
      const target =
        event.target instanceof HTMLElement ? event.target : undefined;
      const anchor = target?.closest<HTMLElement>(
        ".studio-app [data-tooltip], .studio-app button[aria-label]",
      );
      if (
        !anchor ||
        pressed.current ||
        menuRef.current ||
        (event instanceof PointerEvent &&
          (event.pointerType === "touch" || event.buttons !== 0))
      )
        return;
      if (hovering.current === anchor) return;
      hideTip();
      hovering.current = anchor;
      timer.current = setTimeout(
        () =>
          setTip({
            text: anchor.dataset.tooltip || anchor.getAttribute("aria-label")!,
            anchor,
            described: event.type === "focusin" ? target! : anchor,
          }),
        event.type === "focusin" ? 100 : 450,
      );
    };
    const leave = (event: Event) => {
      const next = (event as FocusEvent).relatedTarget;
      if (next instanceof Node && hovering.current?.contains(next)) return;
      hideTip();
    };
    const pointer = (event: PointerEvent) => {
      pressed.current = true;
      hideTip();
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        dismiss();
    };
    const release = () => {
      pressed.current = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") hideTip();
    };
    document.addEventListener("pointerover", show);
    document.addEventListener("focusin", show);
    document.addEventListener("pointerout", leave);
    document.addEventListener("focusout", leave);
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("pointerup", release, true);
    document.addEventListener("pointercancel", release, true);
    window.addEventListener("blur", release);
    document.addEventListener("keydown", escape);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener("pointerover", show);
      document.removeEventListener("focusin", show);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusout", leave);
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("pointerup", release, true);
      document.removeEventListener("pointercancel", release, true);
      window.removeEventListener("blur", release);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    const close = () => {
      hideTip();
      dismiss();
    };
    const scroll = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) close();
    };
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    document.addEventListener("scroll", scroll, true);
    return () => {
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", scroll, true);
    };
  }, []);
  useLayoutEffect(() => {
    if (!menu || !menuRef.current) return;
    const node = menuRef.current,
      rect = node.getBoundingClientRect();
    node.style.left = `${Math.max(8, Math.min(menu.x, innerWidth - rect.width - 8))}px`;
    node.style.top = `${Math.max(8, Math.min(menu.y, innerHeight - rect.height - 8))}px`;
    node
      .querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus({ preventScroll: true });
  }, [menu]);
  useLayoutEffect(() => {
    if (!tip || !tipRef.current) return;
    const node = tipRef.current,
      anchor = tip.anchor.getBoundingClientRect(),
      rect = node.getBoundingClientRect();
    node.style.left = `${Math.max(8, Math.min(anchor.left + (anchor.width - rect.width) / 2, innerWidth - rect.width - 8))}px`;
    node.style.top = `${anchor.top > rect.height + 12 ? anchor.top - rect.height - 8 : Math.min(innerHeight - rect.height - 8, anchor.bottom + 8)}px`;
    const previous = tip.described.getAttribute("aria-describedby");
    tip.described.setAttribute(
      "aria-describedby",
      [previous, "studio-tooltip"].filter(Boolean).join(" "),
    );
    return () => {
      if (previous) tip.described.setAttribute("aria-describedby", previous);
      else tip.described.removeAttribute("aria-describedby");
    };
  }, [tip]);
  function choose(item: MenuItem) {
    if ("separator" in item || item.disabled) return;
    const origin = currentMenu.current?.origin;
    dismiss();
    if (origin?.isConnected) origin.focus({ preventScroll: true });
    item.action();
  }
  return (
    <Context.Provider
      value={{
        menuKey: menu?.key,
        openMenu: (key, label, items, point, origin) => {
          hideTip();
          setMenu({
            key,
            label,
            items,
            ...point,
            origin: origin ?? (document.activeElement as HTMLElement),
          });
        },
        closeMenu: () => dismiss(),
      }}
    >
      {children}
      {menu &&
        createPortal(
          <div
            ref={menuRef}
            className="studio-context-menu"
            role="menu"
            aria-label={menu.label}
            style={{ left: menu.x, top: menu.y }}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.ctrlKey || event.metaKey) {
                dismiss();
                return;
              }
              event.stopPropagation();
              const buttons = [
                ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
                  "button:not(:disabled)",
                ),
              ];
              const at = buttons.indexOf(
                document.activeElement as HTMLButtonElement,
              );
              if (event.key === "Escape") {
                event.preventDefault();
                dismiss(true);
              } else if (event.key === "Tab") {
                dismiss();
                menu.origin?.focus({ preventScroll: true });
              } else if (
                ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const index =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? buttons.length - 1
                      : (at +
                          (event.key === "ArrowDown" ? 1 : -1) +
                          buttons.length) %
                        buttons.length;
                buttons[index]?.focus();
              } else if (
                event.key.length === 1 &&
                !event.ctrlKey &&
                !event.metaKey &&
                event.key !== " "
              ) {
                const match = [
                  ...buttons.slice(at + 1),
                  ...buttons.slice(0, at + 1),
                ].find((b) =>
                  b.textContent
                    ?.trim()
                    .toLowerCase()
                    .startsWith(event.key.toLowerCase()),
                );
                if (match) {
                  event.preventDefault();
                  match.focus();
                }
              }
            }}
          >
            {menu.items.map((item, i) =>
              "separator" in item ? (
                <div key={i} role="separator" />
              ) : (
                <button
                  key={i}
                  id={item.id}
                  type="button"
                  role={
                    item.checked === undefined ? "menuitem" : "menuitemcheckbox"
                  }
                  aria-checked={item.checked}
                  disabled={item.disabled}
                  className={item.danger ? "danger" : ""}
                  tabIndex={-1}
                  onClick={() => choose(item)}
                >
                  <span className="menu-check">{item.checked ? "✓" : ""}</span>
                  <span>{item.label}</span>
                  {item.shortcut && <kbd>{item.shortcut}</kbd>}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
      {tip &&
        !menu &&
        createPortal(
          <div
            id="studio-tooltip"
            ref={tipRef}
            className="studio-tooltip"
            role="tooltip"
          >
            {tip.text}
          </div>,
          document.body,
        )}
    </Context.Provider>
  );
}

export function openContext(
  event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>,
  open: ReturnType<typeof useInteractions>["openMenu"],
  key: string,
  label: string,
  items: MenuItem[],
) {
  event.preventDefault();
  event.stopPropagation();
  const rect = event.currentTarget.getBoundingClientRect();
  const origin =
    event.currentTarget.tabIndex >= 0
      ? event.currentTarget
      : event.target instanceof HTMLElement && event.target.tabIndex >= 0
        ? event.target
        : (document.activeElement as HTMLElement);
  open(
    key,
    label,
    items,
    {
      x: ("clientX" in event && event.clientX) || rect.left + 16,
      y: ("clientY" in event && event.clientY) || rect.top + rect.height / 2,
    },
    origin,
  );
}
