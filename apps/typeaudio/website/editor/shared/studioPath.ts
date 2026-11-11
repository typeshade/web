/** The editor's folder routes. `/` is the start screen. */
export const studioPath = (workspace: "sound" | "picture") =>
  workspace === "picture" ? "/studio/video/" : "/studio/";

export const isStudioPath = (pathname: string) =>
  pathname === "/studio" || pathname.startsWith("/studio/");
