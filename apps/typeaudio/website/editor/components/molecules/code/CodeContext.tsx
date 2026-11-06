import type { GraphParameter } from "typeaudio/graph";

export function CodeContext({
  parameters,
  generated,
}: {
  parameters: readonly GraphParameter[];
  generated: boolean;
}) {
  return generated ? (
    <p className="code-context-generated">
      Compiled graph · Read only · Edit a node’s Sample code to change the
      sound.
    </p>
  ) : (
    <details className="code-context">
      <summary>
        <strong>Sample code</strong>
        <span>
          Runs once per sample · Assign <code>out</code>
        </span>
        <span>Inputs &amp; state</span>
      </summary>
      <div className="code-bindings">
        <p>
          <code>input: f32</code> Audio from the connected input.{" "}
          <code>out: f32</code> This node’s output.
        </p>
        <p>
          <code>time: f32</code> Seconds since Retrigger.{" "}
          <code>sampleRate: f32</code> 48000 Hz.
        </p>
        <p>
          {[0, 1, 2, 3].map((i) => (
            <span className="code-binding" key={i}>
              <code>p{i}</code> {parameters[i]?.name ?? "Unassigned (0)"}
            </span>
          ))}
        </p>
        <p>
          <code>state0…state3: f32</code> Values kept between samples. Retrigger
          resets them to zero.
        </p>
        <p>
          Declare local variables for intermediate values. Apply code checks
          this node’s audio limits and updates the sound; typing only changes
          your draft.
        </p>
      </div>
    </details>
  );
}
