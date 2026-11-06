import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { KEY } from "../layout/constants.ts";
import { DIMENSIONS } from "../layout/constants.ts";
import { load } from "../layout/storage.ts";
import { apply } from "../layout/applyLayout.ts";
import { Context } from "../layout/context.ts";
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
