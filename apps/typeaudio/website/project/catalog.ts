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

export function projectUrl(id: string): string {
  if (!PROJECTS.some((p) => [p.id + "-A", p.id + "-B"].includes(id)))
    throw new Error("Unknown example project.");
  return `/projects/${id}.json`;
}
