import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Register custom scales from styles/tailwind.css so utilities such as
// min-h-ui-control and rounded-ui-control participate in conflict resolution.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: [
        "ui-2",
        "ui-3",
        "ui-4",
        "ui-6",
        "ui-control",
        "ui-control-small",
        "ui-control-large",
      ],
      radius: ["ui-control", "ui-panel"],
    },
  },
});

/** Consumer utilities override recipe defaults without depending on CSS order. */
export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs));
}
