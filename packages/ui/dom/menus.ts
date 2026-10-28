import { focusableElements } from "./focus";
/** Navigation disclosures retain native links and Tab order; they are not application menus. */
export function bindDisclosureMenus(
  menus: HTMLDetailsElement[],
  modal?: HTMLDetailsElement,
) {
  const cleanup: (() => void)[] = [];
  let overflow: string | undefined;
  const sync = () => {
    if (modal?.open && overflow === undefined) {
      overflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
    } else if (!modal?.open && overflow !== undefined) {
      document.documentElement.style.overflow = overflow;
      overflow = undefined;
    }
  };
  for (const menu of menus) {
    const toggle = () => {
      if (menu.open)
        for (const other of menus) if (other !== menu) other.open = false;
      sync();
    };
    menu.addEventListener("toggle", toggle);
    cleanup.push(() => menu.removeEventListener("toggle", toggle));
  }
  const click = (event: MouseEvent) => {
    for (const menu of menus)
      if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
    sync();
  };
  const key = (event: KeyboardEvent) => {
    const open = menus.find((menu) => menu.open);
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      open.open = false;
      open.querySelector<HTMLElement>(":scope > summary")?.focus();
      sync();
    } else if (event.key === "Tab" && open === modal) {
      const focusable = focusableElements(open);
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  };
  document.addEventListener("click", click);
  document.addEventListener("keydown", key);
  sync();
  return () => {
    cleanup.forEach((dispose) => dispose());
    document.removeEventListener("click", click);
    document.removeEventListener("keydown", key);
    if (overflow !== undefined)
      document.documentElement.style.overflow = overflow;
  };
}
