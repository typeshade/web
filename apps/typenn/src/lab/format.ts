import type { Progress, ResidencyState, Words, Locale } from "./types";
import type { Metrics, RunResult } from "./train";

export function statusLine(p: Progress, words: Words) {
  const elapsed = formatDuration(p.elapsedSeconds);
  const rate = p.done / Math.max(p.elapsedSeconds, 1e-9);
  const eta = formatDuration((p.totalSteps - p.done) / Math.max(rate, 1e-9));
  const status = String(words.status)
    .replace("{epoch}", String(p.epoch))
    .replace("{epochs}", String(p.epochs))
    .replace("{step}", String(p.step))
    .replace("{steps}", String(p.stepsPerEpoch));
  return `${status} · ${Math.round(p.samplesPerSecond)} ${words.rate} · ${words.eta} ${eta} · ${words.elapsed} ${elapsed}`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds)) return "--:--";
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function residencyText(state: ResidencyState, words: Words): string {
  const { residency, bytes } = state;
  if (residency.tier === "device")
    return words.residencyDevice
      .replace("{shards}", String(residency.shards.train))
      .replace("{size}", formatBytes(bytes));
  return words.residencyHost.replace("{reason}", residency.reason ?? "");
}

export function formatBytes(bytes: number) {
  if (bytes >= 1 << 20) return `${(bytes / (1 << 20)).toFixed(1)} MiB`;
  return `${(bytes / 1024).toFixed(0)} KiB`;
}

export function formatTest(test: Metrics, regression: boolean, locale: Locale) {
  if (test.rmse === undefined && test.accuracy === undefined) return "-";
  if (regression)
    return `RMSE ${Math.round(test.rmse ?? 0).toLocaleString(locale === "ko" ? "ko-KR" : "en-US")} USD · MAE ${Math.round(test.mae ?? 0).toLocaleString(locale === "ko" ? "ko-KR" : "en-US")} USD`;
  return `${((test.accuracy ?? 0) * 100).toFixed(2)}%`;
}

export async function copyJson(
  results: RunResult[],
  words: Words,
  notice: (message: string | null) => void,
) {
  try {
    await navigator.clipboard.writeText(JSON.stringify(results, null, 2));
    notice(words.copied);
  } catch {
    notice(words.copyFailed);
  }
}
