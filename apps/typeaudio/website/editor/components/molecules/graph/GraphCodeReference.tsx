export function GraphCodeReference() {
  return (
    <details className="graph-code-reference">
      <summary>Code reference</summary>
      <p>
        Read input (audio), time (seconds since Retrigger), sampleRate (48000),
        and exposed parameters p0–p3. Assign out. The four scalar values
        state0–state3 persist between samples and reset on Retrigger.
      </p>
      <p>
        Use scalar variables, assignments and if statements. Functions:{" "}
        <code>
          sin, cos, abs, min, max, clamp, fract, floor, ceil, sqrt, exp, exp2,
          pow, tanh, mix, select, f32, u32, i32
        </code>
        .
      </p>
      <p>
        A Code node allows 1800 characters and 350 syntax elements. Loops,
        imports, arrays and helper functions are unavailable. Each graph
        supports 16 nodes and two Code nodes. Unapplied drafts stay in this
        session.
      </p>
    </details>
  );
}
