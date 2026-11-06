import { useEffect, useRef, useState } from "react";
import type { TooltipState } from "../../interactions/types.ts";
export function useTooltip(menuRef: React.RefObject<HTMLDivElement | null>) {
  const [tip, setTip] = useState<TooltipState>(),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    hovering = useRef<HTMLElement | undefined>(undefined),
    pressed = useRef(false);
  function hideTip() {
    clearTimeout(timer.current);
    hovering.current = undefined;
    setTip(undefined);
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
    const close = () => hideTip();
    window.addEventListener("blur", close);
    window.addEventListener("resize", close);
    document.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("blur", close);
      window.removeEventListener("resize", close);
      document.removeEventListener("scroll", close, true);
    };
  }, []);
  return { tip, hideTip };
}
