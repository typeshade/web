import { WAVE_SIZE } from "./designer.ts";

type Expr = (phase: number) => number;
/** A bounded expression language, compiled once to a wave table outside audio processing.
 * No JavaScript evaluation, property access, loops or runtime user code. */
export function waveFromExpression(text: string): number[] {
  if (!text.trim() || text.length > 512)
    throw new Error("Enter a wave expression of up to 512 characters.");
  const tokens =
    text.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-zA-Z]+|\*\*|[^\s]/g) ||
    [];
  let at = 0,
    depth = 0;
  const functions: Record<string, (x: number) => number> = {
    sin: Math.sin,
    cos: Math.cos,
    tanh: Math.tanh,
    abs: Math.abs,
    sqrt: Math.sqrt,
    exp: Math.exp,
  };
  function primary(): Expr {
    if (++depth > 32) throw new Error("The expression is too deeply nested.");
    const token = tokens[at++];
    let result: Expr;
    if (token === "+" || token === "-") {
      const x = primary();
      result = token === "-" ? (p) => -x(p) : x;
    } else if (token === "(") {
      result = expression();
      if (tokens[at++] !== ")") throw new Error("Missing closing parenthesis.");
    } else if (token === "phase") result = (p) => p;
    else if (token === "pi") result = () => Math.PI;
    else if (token && Object.hasOwn(functions, token)) {
      if (tokens[at++] !== "(") throw new Error("Functions need parentheses.");
      const arg = expression(),
        fn = functions[token]!;
      if (tokens[at++] !== ")") throw new Error("Missing closing parenthesis.");
      result = (p) => fn(arg(p));
    } else if (
      token &&
      /^(?:\d|\.)/.test(token) &&
      Number.isFinite(Number(token))
    ) {
      const value = Number(token);
      result = () => value;
    } else
      throw new Error(
        `Unknown token: ${token || "end of expression"}. Use phase, pi, sin, cos, tanh, abs, sqrt or exp.`,
      );
    depth--;
    return result;
  }
  function power(): Expr {
    const a = primary();
    if (tokens[at] === "**") {
      at++;
      const b = primary();
      return (p) => a(p) ** b(p);
    }
    return a;
  }
  function product(): Expr {
    let a = power();
    while (["*", "/"].includes(tokens[at] || "")) {
      const op = tokens[at++],
        left = a,
        b = power();
      a = op === "*" ? (p) => left(p) * b(p) : (p) => left(p) / b(p);
    }
    return a;
  }
  function expression(): Expr {
    let a = product();
    while (["+", "-"].includes(tokens[at] || "")) {
      const op = tokens[at++],
        left = a,
        b = product();
      a = op === "+" ? (p) => left(p) + b(p) : (p) => left(p) - b(p);
    }
    return a;
  }
  const evaluate = expression();
  if (at !== tokens.length) throw new Error(`Unexpected token: ${tokens[at]}.`);
  const wave = Array.from({ length: WAVE_SIZE }, (_, i) =>
    evaluate(i / WAVE_SIZE),
  );
  if (wave.some((x) => !Number.isFinite(x)))
    throw new Error(
      "The expression must produce finite samples for every phase.",
    );
  const mean = wave.reduce((a, b) => a + b, 0) / WAVE_SIZE;
  const peak = wave.reduce((m, x) => Math.max(m, Math.abs(x - mean)), 0);
  if (peak < 1e-8)
    throw new Error("The expression produces no alternating signal.");
  return wave.map((x) => (x - mean) / peak);
}
