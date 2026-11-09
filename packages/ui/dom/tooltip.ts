const bound = new WeakSet<HTMLElement>();
export function enhanceTooltips(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-ui-tooltip]").forEach((host) => {
    if (bound.has(host)) return;
    const trigger = host.querySelector<HTMLElement>("button, a");
    const text = host.dataset.uiTooltip;
    if (!trigger || !text) return;
    bound.add(host);
    const tip = document.createElement("div");
    tip.id = `ui-tooltip-${crypto.randomUUID()}`;
    tip.className = "ui-tooltip-content";
    tip.role = "tooltip";
    tip.textContent = text;
    tip.hidden = true;
    document.body.append(tip);
    const before = trigger.getAttribute("aria-describedby");
    trigger.setAttribute(
      "aria-describedby",
      [before, tip.id].filter(Boolean).join(" "),
    );
    let timer: ReturnType<typeof setTimeout>;
    let dismissed = false;
    const hide = () => {
      clearTimeout(timer);
      tip.hidden = true;
    };
    const show = () => {
      clearTimeout(timer);
      if (dismissed) return;
      const rect = trigger.getBoundingClientRect();
      if (
        rect.bottom <= 0 ||
        rect.top >= innerHeight ||
        rect.right <= 0 ||
        rect.left >= innerWidth
      ) {
        hide();
        return;
      }
      tip.hidden = false;
      const box = tip.getBoundingClientRect();
      tip.style.left = `${Math.max(8, Math.min(innerWidth - box.width - 8, rect.left))}px`;
      tip.style.top = `${rect.bottom + box.height + 8 > innerHeight ? Math.max(8, rect.top - box.height - 8) : rect.bottom + 8}px`;
    };
    trigger.addEventListener("mouseenter", () => {
      dismissed = false;
      show();
    });
    trigger.addEventListener("focus", () => {
      dismissed = false;
      show();
    });
    trigger.addEventListener("mouseleave", () => {
      timer = setTimeout(() => {
        if (document.activeElement !== trigger) hide();
      }, 120);
    });
    trigger.addEventListener("blur", hide);
    tip.addEventListener("mouseenter", () => clearTimeout(timer));
    tip.addEventListener("mouseleave", () => {
      if (document.activeElement !== trigger) hide();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !tip.hidden) {
        event.preventDefault();
        event.stopPropagation();
        dismissed = true;
        hide();
      }
    });
    const reposition = () => {
      if (tip.hidden) return;
      // Keyboard focus can scroll the trigger into view after its focus event.
      // Keep that hint attached; pointer-only hints still close on scrolling.
      if (document.activeElement === trigger) show();
      else hide();
    };
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
  });
}
