import { useEffect, useState } from "react";
import type { ScalarType, ScalarValue } from "typeaudio/function-graph";

export function ScalarInput({
  label,
  type,
  value,
  min,
  max,
  disabled,
  live = false,
  onCommit,
}: {
  label: string;
  type: ScalarType;
  value: ScalarValue;
  min?: number;
  max?: number;
  disabled?: boolean;
  live?: boolean;
  onCommit: (value: ScalarValue) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  if (type === "bool")
    return (
      <input
        aria-label={label}
        type="checkbox"
        checked={value === true}
        disabled={disabled}
        onChange={(event) => onCommit(event.target.checked)}
      />
    );
  function commit(input: HTMLInputElement) {
    if (
      input.value.trim() &&
      input.checkValidity() &&
      Number.isFinite(input.valueAsNumber) &&
      input.valueAsNumber !== value
    )
      onCommit(input.valueAsNumber);
  }
  return (
    <input
      aria-label={label}
      type="number"
      value={text}
      min={min ?? (type === "u32" ? 0 : undefined)}
      max={max}
      step={type === "f32" ? "any" : 1}
      disabled={disabled}
      onChange={(event) => {
        setText(event.target.value);
        if (live) commit(event.currentTarget);
      }}
      onBlur={(event) => {
        commit(event.currentTarget);
        if (!event.currentTarget.checkValidity() || !text.trim())
          setText(String(value));
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setText(String(value));
          event.currentTarget.blur();
        }
      }}
    />
  );
}
