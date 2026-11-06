import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { TooltipState } from "../../interactions/types.ts";
export function Tooltip({ tip }: { tip: TooltipState }) {
  const tipRef = useRef<HTMLDivElement>(null);
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
  return createPortal(
    <div
      id="studio-tooltip"
      ref={tipRef}
      className="studio-tooltip"
      role="tooltip"
    >
      {tip.text}
    </div>,
    document.body,
  );
}
