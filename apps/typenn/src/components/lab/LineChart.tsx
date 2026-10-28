import { useMemo } from "react";

export function LineChart({
  values,
  smooth = false,
  points = false,
  axisX,
  label,
  lowerIsBetter = false,
  empty,
}: {
  empty: string;
  values: number[];
  smooth?: boolean;
  points?: boolean;
  axisX: string;
  label: string;
  lowerIsBetter?: boolean;
}) {
  const width = 560;
  const height = 200;
  const pad = { left: 52, right: 12, top: 10, bottom: 28 };
  const series = useMemo(() => {
    if (!smooth) return values;
    let ema = values[0] ?? 0;
    return values.map((v) => (ema = 0.9 * ema + 0.1 * v));
  }, [values, smooth]);
  if (series.length === 0) {
    return (
      <svg
        className="lab-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
      >
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          className="lab-chart-empty"
        >
          {empty}
        </text>
      </svg>
    );
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const n = Math.max(series.length - 1, 1);
  const x = (i: number) => pad.left + (i / n) * (width - pad.left - pad.right);
  const y = (v: number) =>
    pad.top + (1 - (v - min) / span) * (height - pad.top - pad.bottom);
  const path = series
    .map(
      (v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`,
    )
    .join(" ");
  const ticks = [0, 0.5, 1].map((f) => min + f * span);
  return (
    <svg
      className="lab-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${label}, ${series.length}`}
    >
      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(tick)}
            y2={y(tick)}
            className="lab-grid"
          />
          <text
            x={pad.left - 6}
            y={y(tick) + 4}
            textAnchor="end"
            className="lab-axis"
          >
            {formatTick(tick)}
          </text>
        </g>
      ))}
      <text
        x={width - pad.right}
        y={height - 6}
        textAnchor="end"
        className="lab-axis"
      >
        {axisX}
        {lowerIsBetter ? " ↓" : ""}: {series.length}
      </text>
      <path d={path} className="lab-line" fill="none" />
      {points &&
        series.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={3.5} className="lab-dot" />
        ))}
    </svg>
  );
}

function formatTick(v: number) {
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString("en-US");
  return v.toPrecision(3);
}
