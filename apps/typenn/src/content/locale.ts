export type Locale = "en" | "ko";

export function localizedPath(locale: Locale, path: string): string {
  if (locale === "en") return path;
  return `/ko${path === "/" ? "/" : path}`;
}
