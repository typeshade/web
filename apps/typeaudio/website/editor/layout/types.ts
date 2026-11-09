export type Dimension = "project" | "inspector" | "dock" | "code" | "codeDock";
export type CodeMode = "bottom" | "right" | "code";

export type Sizes = Partial<Record<Dimension, number>>;
