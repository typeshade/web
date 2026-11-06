import type { StudioCommand } from "./types.ts";

export function searchCommands(commands: StudioCommand[], query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return commands
    .filter((c) =>
      words.every((word) =>
        `${c.group} ${c.label}`.toLowerCase().includes(word),
      ),
    )
    .sort((a, b) => Number(!!a.disabled) - Number(!!b.disabled));
}
