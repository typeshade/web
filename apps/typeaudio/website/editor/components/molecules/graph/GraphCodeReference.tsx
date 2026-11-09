import { SCALAR_FUNCTIONS } from "typeaudio/graph";

export function GraphCodeReference() {
  return (
    <details className="graph-code-reference">
      <summary>Audio-node limits &amp; math reference</summary>
      <p>
        Read input (audio), time (seconds since Retrigger), sampleRate (48000),
        and exposed parameters p0–p3. Assign out. The four scalar values
        state0–state3 persist between samples and reset on Retrigger.
      </p>
      <p>
        Use scalar variables, assignments and if statements. Functions:{" "}
        <code>{SCALAR_FUNCTIONS.join(", ")}</code>
        .
      </p>
      <p>
        TypeAudio Code nodes allow 1800 characters and 350 syntax elements.
        Loops, imports, arrays and helper functions cannot run in these nodes.
        These are audio-node limits, not TypeShade language limits. Each graph
        supports 16 nodes and two Code nodes. Unapplied drafts stay in this
        session.
      </p>
    </details>
  );
}
