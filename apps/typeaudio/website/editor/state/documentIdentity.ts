import { IDENTITY_KEY } from "./storageKeys.ts";

/**
 * The example or saved copy the working document was opened from. A new project or an
 * imported file has no identity: the working document itself is the project.
 */
export type DocumentIdentity =
  | { kind: "example"; id: string }
  | { kind: "copy"; id: string };

const PARAM = { example: "project", copy: "copy" } as const;

export function readIdentity(): DocumentIdentity | undefined {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw);
    if (
      (value?.kind === "example" || value?.kind === "copy") &&
      typeof value.id === "string" &&
      value.id.length > 0 &&
      value.id.length <= 100
    )
      return { kind: value.kind, id: value.id };
  } catch {
    /* An unreadable identity only means the URL names no project. */
  }
  return undefined;
}

export function writeIdentity(identity: DocumentIdentity | undefined) {
  try {
    if (identity) localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    else localStorage.removeItem(IDENTITY_KEY);
  } catch {
    /* The document save reports storage failures; the URL then names no project. */
  }
}

/** `?project=<example id>` or `?copy=<saved copy id>`; empty for the working document. */
export function identitySearch(identity: DocumentIdentity | undefined) {
  return identity
    ? `?${PARAM[identity.kind]}=${encodeURIComponent(identity.id)}`
    : "";
}

export function identityFromSearch(
  search: string,
): DocumentIdentity | undefined {
  const params = new URLSearchParams(search);
  const example = params.get(PARAM.example),
    copy = params.get(PARAM.copy);
  if (example) return { kind: "example", id: example };
  if (copy) return { kind: "copy", id: copy };
  return undefined;
}

export function sameIdentity(
  a: DocumentIdentity | undefined,
  b: DocumentIdentity | undefined,
) {
  return a?.kind === b?.kind && a?.id === b?.id;
}
