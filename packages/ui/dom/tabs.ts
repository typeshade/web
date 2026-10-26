/** Roving focus for an existing tab strip. Panel content stays with its owner. */
export function bindTabs(
  tabs: HTMLButtonElement[],
  activate: (index: number, focus: boolean) => void,
) {
  const cleanup: (() => void)[] = [];
  tabs.forEach((tab, index) => {
    const click = () => {
      if (!tab.disabled) activate(index, false);
    };
    const key = (event: KeyboardEvent) => {
      const enabled = tabs
        .map((item, i) => (!item.disabled && !item.hidden ? i : -1))
        .filter((i) => i >= 0);
      const position = enabled.indexOf(index);
      const rtl = getComputedStyle(tab).direction === "rtl";
      const vertical =
        tab.closest('[role="tablist"]')?.getAttribute("aria-orientation") ===
        "vertical";
      const forward = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
      const backward = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
      let next: number | undefined;
      if (event.key === "Home") next = enabled[0];
      else if (event.key === "End") next = enabled.at(-1);
      else if (event.key === forward)
        next = enabled[(position + 1) % enabled.length];
      else if (event.key === backward)
        next = enabled[(position - 1 + enabled.length) % enabled.length];
      if (next === undefined) return;
      event.preventDefault();
      activate(next, true);
    };
    tab.addEventListener("click", click);
    tab.addEventListener("keydown", key);
    cleanup.push(() => {
      tab.removeEventListener("click", click);
      tab.removeEventListener("keydown", key);
    });
  });
  return () => cleanup.forEach((dispose) => dispose());
}

/** Progressive tabs: every panel remains readable until enhancement runs. */
export function enhanceTabs(group: HTMLElement) {
  if (group.dataset.uiTabsReady !== undefined) return;
  const list = group.querySelector<HTMLElement>('[role="tablist"]');
  if (!list) return;
  const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  if (!tabs.length) return;
  const select = (index: number, focus: boolean) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      const panel = document.getElementById(
        tab.getAttribute("aria-controls") ?? "",
      );
      if (panel) {
        panel.hidden = i !== index;
        panel.tabIndex = 0;
      }
    });
    if (focus) tabs[index]?.focus();
  };
  const dispose = bindTabs(tabs, select);
  group.dataset.uiTabsReady = "";
  group.dataset.ready = "";
  const selected = tabs.findIndex(
    (t) => !t.disabled && t.getAttribute("aria-selected") === "true",
  );
  const initial =
    selected < 0 ? tabs.findIndex((t) => !t.disabled && !t.hidden) : selected;
  if (initial >= 0) select(initial, false);
  return dispose;
}
