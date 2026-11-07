/** A second editable Code node carries the authored amplitude envelope. */
export function envelopeCode(
  points: [number, number][],
  duration: number,
): string {
  const lines = [
    "const phase: f32 = clamp(time / p2, 0, 1);",
    "let level: f32 = 0;",
  ];
  for (let i = 1; i < points.length; i++) {
    const [at, value] = points[i],
      [before, previous] = points[i - 1];
    const start = before / duration,
      end = at / duration;
    lines.push(
      `${i === 1 ? "if" : "else if"} (phase <= ${end}) { level = ${previous} + (phase - ${start}) * ${(value - previous) / (end - start)}; }`,
    );
  }
  lines.push(`out = input * clamp(level, 0, 1);`);
  return lines.join("\n");
}
