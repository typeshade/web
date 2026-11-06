import { useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { MenuItem } from "../../interactions/types.ts";
import type { MenuState } from "../../interactions/types.ts";

export function ContextMenu({
  menu,
  menuRef,
  dismiss,
  choose,
}: {
  menu: MenuState;
  menuRef: React.RefObject<HTMLDivElement | null>;
  dismiss: (restore?: boolean) => void;
  choose: (item: MenuItem) => void;
}) {
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
  return createPortal(
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
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
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
                : (at + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) %
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
            role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
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
  );
}
