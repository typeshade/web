import type { MenuItem } from "./types.ts";
import { useInteractions } from "../hooks/interactions/useInteractions.ts";
export function openContext(
  event:
    | React.MouseEvent<HTMLElement | SVGElement>
    | React.KeyboardEvent<HTMLElement | SVGElement>,
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
