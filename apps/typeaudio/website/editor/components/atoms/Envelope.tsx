import { envelopeAt } from "../../../sound/envelopeAt.ts";
import { type Patch } from "../../../sound/types.ts";
export function Envelope({ patch: p }: { patch: Patch }) {
  const duration = p.duration + p.release;
  const path = Array.from({ length: 140 }, (_, i) => {
    const t = (i / 139) * duration;
    return `${i ? "L" : "M"}${(i / 139) * 300},${75 - envelopeAt(t, p) * 65}`;
  }).join(" ");
  return (
    <svg
      className="envelope"
      viewBox="0 0 300 80"
      role="img"
      aria-label="Amplitude envelope"
    >
      <path d={path} />
    </svg>
  );
}
