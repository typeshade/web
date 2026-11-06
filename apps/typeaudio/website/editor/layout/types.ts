export type Dimension = "project" | "inspector" | "dock" | "code";
export type CodeMode = "bottom" | "right" | "code";

export type Sizes = Partial<Record<Dimension, number>>;
