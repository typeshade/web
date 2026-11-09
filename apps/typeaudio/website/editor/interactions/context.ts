import { createContext } from "react";
import type { MenuItem } from "./types.ts";
export const Context = createContext<{
  menuKey?: string;
  openMenu: (
    key: string,
    label: string,
    items: MenuItem[],
    point: { x: number; y: number },
    origin?: HTMLElement | SVGElement | null,
  ) => void;
  closeMenu: () => void;
} | null>(null);
