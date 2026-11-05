import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
export type Dimension = "project" | "inspector" | "dock";
const KEY = "typeaudio.editor.layout.v1";
export const DIMENSIONS = {
  project: {
    variable: "--project-width",
    min: 170,
    max: 380,
    label: "Resize project panel",
  },
  inspector: {
    variable: "--inspector-width",
    min: 240,
    max: 440,
    label: "Resize properties panel",
  },
  dock: {
    variable: "--timeline-height",
    min: 190,
    max: 520,
    label: "Resize timeline",
  },
} as const;
type Sizes = Partial<Record<Dimension, number>>;
function load(): Sizes {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");
    if (data?.version !== 1) return {};
    const sizes: Sizes = {};
    for (const key of Object.keys(DIMENSIONS) as Dimension[]) {
      const v = data.sizes?.[key],
        d = DIMENSIONS[key];
      if (typeof v === "number" && Number.isFinite(v))
        sizes[key] = Math.max(d.min, Math.min(d.max, v));
    }
    return sizes;
  } catch {
    return {};
  }
}
function apply(sizes: Sizes) {
  for (const key of Object.keys(DIMENSIONS) as Dimension[]) {
    const value = sizes[key],
      variable = DIMENSIONS[key].variable;
    if (value === undefined)
      document.documentElement.style.removeProperty(variable);
    else document.documentElement.style.setProperty(variable, `${value}px`);
  }
}
const Context = createContext<{
  sizes: Sizes;
  size: (key: Dimension) => number;
  set: (key: Dimension, value: number | undefined) => void;
  save: () => void;
  reset: () => void;
  focused: boolean;
  focus: (value: boolean) => void;
} | null>(null);
export function useWorkspaceLayout() {
  const value = useContext(Context);
  if (!value) throw new Error("Layout provider is missing.");
  return value;
}
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sizes, setSizes] = useState(load),
    [focused, focus] = useState(false),
    current = useRef(sizes);
  useLayoutEffect(() => {
    apply(sizes);
  }, [sizes]);
  useEffect(() => {
    const resize = () => {
      if (innerWidth <= 950) focus(false);
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  function save() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ version: 1, sizes: current.current }),
      );
    } catch {}
  }
  return (
    <Context.Provider
      value={{
        sizes,
        focused,
        focus,
        size: (key) =>
          sizes[key] ??
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              DIMENSIONS[key].variable,
            ),
          ),
        set: (key, value) => {
          const next = { ...current.current };
          if (value === undefined) delete next[key];
          else
            next[key] = Math.max(
              DIMENSIONS[key].min,
              Math.min(DIMENSIONS[key].max, value),
            );
          current.current = next;
          apply(next);
          setSizes(next);
        },
        save,
        reset: () => {
          current.current = {};
          apply({});
          setSizes({});
          focus(false);
          try {
            localStorage.removeItem(KEY);
          } catch {}
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
