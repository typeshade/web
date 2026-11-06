import { useEffect, useRef, useState } from "react";
import type { MenuItem } from "../../interactions/types.ts";
import type { MenuState } from "../../interactions/types.ts";

export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState>(),
    menuRef = useRef<HTMLDivElement>(null),
    currentMenu = useRef(menu);
  currentMenu.current = menu;
  function dismiss(restore = false) {
    const origin = currentMenu.current?.origin;
    setMenu(undefined);
    if (restore)
      queueMicrotask(() => {
        if (origin?.isConnected) origin.focus({ preventScroll: true });
      });
  }
  function choose(item: MenuItem) {
    if ("separator" in item || item.disabled) return;
    const origin = currentMenu.current?.origin;
    dismiss();
    if (origin?.isConnected) origin.focus({ preventScroll: true });
    item.action();
  }
  useEffect(() => {
    const pointer = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node))
        dismiss();
    };
    document.addEventListener("pointerdown", pointer, true);
    return () => document.removeEventListener("pointerdown", pointer, true);
  }, []);
  useEffect(() => {
    const close = () => {
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
  function openMenu(
    key: string,
    label: string,
    items: MenuItem[],
    point: { x: number; y: number },
    origin?: HTMLElement | SVGElement | null,
  ) {
    setMenu({
      key,
      label,
      items,
      ...point,
      origin: origin ?? (document.activeElement as HTMLElement),
    });
  }
  return { menu, menuRef, openMenu, dismiss, choose };
}
