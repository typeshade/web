import { useAppRoute } from "../hooks/session/useAppRoute.ts";
import { StartPage } from "./StartPage.tsx";
import { StudioPage } from "./StudioPage.tsx";

/** The start screen at `/` and the editor at `/studio/`, in one page without reloads. */
export function StudioApp() {
  const { route, enter, exit } = useAppRoute();
  return route.screen === "start" ? (
    <StartPage onEnter={enter} />
  ) : (
    <StudioPage key={route.key} launch={route.launch} onExit={exit} />
  );
}
