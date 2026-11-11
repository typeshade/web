import { useCallback, useEffect, useRef, useState } from "react";
import type { StartingPoint } from "../../../project/startingPoints.ts";
import { isStudioPath } from "../../shared/studioPath.ts";
import { isExample, RETIRED_EXAMPLES } from "../../../project/catalog.ts";

/** What the editor opens when it mounts. */
export type LaunchRequest =
  /** Open the example now; the previous work goes to Saved copies. */
  | { kind: "example"; id: string }
  | { kind: "copy"; id: string }
  | { kind: "file"; data: unknown }
  | { kind: "new"; template: StartingPoint }
  /** Return to the project the editor URL names, or to the working document. */
  | { kind: "resume" };

export type AppRoute =
  | { screen: "start" }
  | { screen: "editor"; launch: LaunchRequest; key: number };

let routes = 0;
/**
 * `/` is the start screen. `/?project=<id>`, the link published before the start screen,
 * still opens that example in the editor. The link of a retired example opens what replaced it
 * (`RETIRED_EXAMPLES`), or the start screen. `/studio/` and `/studio/video/` are the editor.
 */
function routeFromLocation(): AppRoute {
  if (isStudioPath(location.pathname))
    return { screen: "editor", launch: { kind: "resume" }, key: ++routes };
  const id = new URLSearchParams(location.search).get("project");
  if (!id) return { screen: "start" };
  if (isExample(id))
    return { screen: "editor", launch: { kind: "example", id }, key: ++routes };
  const template = RETIRED_EXAMPLES[id];
  if (template)
    return { screen: "editor", launch: { kind: "new", template }, key: ++routes };
  history.replaceState(history.state, "", "/");
  return { screen: "start" };
}

export function useAppRoute() {
  const [route, setRoute] = useState(routeFromLocation);
  const screen = useRef(route.screen);
  screen.current = route.screen;
  useEffect(() => {
    // The editor handles its own Back to the start screen, so it can keep the work first.
    const fn = () => {
      if (screen.current !== "start") return;
      const next = routeFromLocation();
      if (next.screen === "editor") setRoute(next);
    };
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);
  const enter = useCallback((launch: LaunchRequest) => {
    history.pushState(null, "", "/studio/");
    setRoute({ screen: "editor", launch, key: ++routes });
  }, []);
  const exit = useCallback(() => {
    if (location.pathname !== "/" || location.search)
      history.pushState(null, "", "/");
    setRoute({ screen: "start" });
  }, []);
  return { route, enter, exit };
}
