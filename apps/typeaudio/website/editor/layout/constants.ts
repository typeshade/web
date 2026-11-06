export const KEY = "typeaudio.editor.layout.v1";

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
  code: {
    variable: "--code-width",
    min: 280,
    max: 700,
    label: "Resize code editor",
  },
} as const;
