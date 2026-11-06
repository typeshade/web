export interface CodeDiagnostic {
  line: number;
  message: string;
}

/** Worker errors with an explicit node/line can be marked without guessing a location. */
export function codeDiagnostic(
  error: string,
  nodeName: string,
): CodeDiagnostic | undefined {
  const prefix = `${nodeName}, line `;
  const start = error.indexOf(prefix);
  if (start < 0) return;
  const match = error.slice(start + prefix.length).match(/^(\d+):\s*([\s\S]+)/);
  if (match) return { line: Number(match[1]), message: match[2]! };
}
