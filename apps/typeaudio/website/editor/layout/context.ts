import { createContext } from "react";
import type { Dimension, CodeMode } from "./types.ts";
import type { Sizes } from "./types.ts";
export const Context = createContext<{
  sizes: Sizes;
  size: (key: Dimension) => number;
  set: (key: Dimension, value: number | undefined) => void;
  save: () => void;
  reset: () => void;
  focused: boolean;
  focus: (value: boolean) => void;
  wide: boolean;
  codeMode: CodeMode;
  setCodeMode: (value: CodeMode) => void;
} | null>(null);
