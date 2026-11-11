export const PROJECTS = [
  {
    id: "frieren-red",
    variants: { A: "Compressed mineral core", B: "Rougher turbulent core" },
    title: "Red containment",
    range: "00:20–00:30",
    layers: 15,
    detail: "Edit the core, fracture, defence and moving layers.",
  },
  {
    id: "frieren-force",
    variants: {
      A: "Compact pressure with body",
      B: "Shorter pressure impulse",
    },
    title: "Unseen force",
    range: "02:16.5–02:29.7",
    layers: 17,
    detail: "Edit the quiet space, force, body travel and column impact.",
  },
  {
    id: "frieren-finale",
    variants: {
      A: "Dry fibres losing coherence",
      B: "More resonant dissolution",
    },
    title: "Final beam and dissolution",
    range: "02:53–03:09.3",
    layers: 15,
    detail: "Edit the sustained beam, debris and dissolving material.",
  },
] as const;

/** The function-graph example: the same source as the Function sound starting point. */
export const FUNCTION_EXAMPLE = {
  id: "function-impact",
  title: "Function impact",
  detail:
    "A noise burst through a resonant body, written as four TypeShade modules with Body pitch, Resonance damping and Strength controls.",
} as const;

export function projectUrl(id: string): string {
  if (id === "function-impact") return "/projects/function-impact.json";
  if (!PROJECTS.some((p) => [p.id + "-A", p.id + "-B"].includes(id)))
    throw new Error("Unknown example project.");
  return `/projects/${id}.json`;
}
