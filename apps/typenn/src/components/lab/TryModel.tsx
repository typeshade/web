import { Button, Input, TextArea, Field } from "@typeshade/site-ui/react";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { LoadedDataset, Manifest } from "../../lab/datasets";
import { MIRROR_BASE } from "../../lab/datasets";
import { formatTest } from "../../lab/format";
import { bagOf, encode, wordIndex } from "../../lab/text";
import { predict } from "../../lab/train";
import type { Locale, Session, Words } from "../../lab/types";

export function TryModel({
  session,
  words,
  locale,
  manifest,
}: {
  session: Session;
  words: Words;
  locale: Locale;
  manifest: Manifest;
}) {
  const { data, spec, result } = session;
  const task = manifest.task;
  return (
    <div className="lab-try">
      <p className="lab-note" data-testid="try-model">
        <strong>{words.modelUsed}:</strong> {data.info.title} ·{" "}
        {words.presetName[spec.preset]} · {words.testMetric}:{" "}
        {formatTest(result.test, spec.preset === "regression", locale)} ·{" "}
        {words.trainedAgo.replace(
          "{time}",
          relativeTime(result.finishedAt, locale),
        )}
      </p>
      {task === "image-classification" && (
        <ImageTry session={session} words={words} />
      )}
      {task === "text-classification" && (
        <TextTry session={session} words={words} />
      )}
      {task === "regression" && (
        <RegressionTry session={session} words={words} locale={locale} />
      )}
    </div>
  );
}

function ImageTry({ session, words }: { session: Session; words: Words }) {
  const { data, model, device, spec } = session;
  const [h, w, c] = spec.inputShape as [number, number, number];
  const drawable = data.info.id === "mnist" || data.info.id === "fashion_mnist";
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [truth, setTruth] = useState<number | null>(null);
  const [top, setTop] = useState<{ label: string; p: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const classes = data.manifest.classes ?? [];

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d", { willReadFrequently: true });
    if (el && ctx) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, el.width, el.height);
    }
  }, [session]);

  function point(event: ReactPointerEvent<HTMLCanvasElement>) {
    const el = canvas.current!;
    const rect = el.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * el.width,
      y: ((event.clientY - rect.top) / rect.height) * el.height,
    };
  }

  function paint(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !canvas.current) return;
    const ctx = canvas.current.getContext("2d", { willReadFrequently: true })!;
    const { x, y } = point(event);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 1.1, 0, Math.PI * 2);
    ctx.fill();
    setTruth(null);
  }

  function clear() {
    const el = canvas.current;
    const ctx = el?.getContext("2d", { willReadFrequently: true });
    if (el && ctx) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, el.width, el.height);
    }
    setTruth(null);
    setTop(null);
  }

  function randomTest() {
    const el = canvas.current;
    const ctx = el?.getContext("2d", { willReadFrequently: true });
    if (!el || !ctx) return;
    const index = Math.floor(Math.random() * data.test.count);
    const size = h * w * c;
    const image = ctx.createImageData(w, h);
    for (let p = 0; p < h * w; p++) {
      for (let k = 0; k < 3; k++)
        image.data[p * 4 + k] =
          data.test.x[index * size + p * c + (c === 3 ? k : 0)]!;
      image.data[p * 4 + 3] = 255;
    }
    el.width = w;
    el.height = h;
    ctx.putImageData(image, 0, 0);
    setTruth(data.test.y[index]!);
    setTop(null);
    void classify();
  }

  async function classify() {
    const el = canvas.current;
    const ctx = el?.getContext("2d", { willReadFrequently: true });
    if (!el || !ctx) return;
    try {
      setError(null);
      const pixels = ctx.getImageData(0, 0, w, h).data;
      const values = new Float32Array(h * w * c);
      for (let p = 0; p < h * w; p++)
        for (let k = 0; k < c; k++)
          values[p * c + k] = pixels[p * 4 + (c === 3 ? k : 0)]! / 255;
      const probs = await predict(
        model,
        device,
        { values, shape: [1, h, w, c] },
        "probabilities",
      );
      setTop(topK(probs, classes, 3));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const displayScale = drawable ? 10 : 8;
  return (
    <div className="lab-image-try">
      <canvas
        ref={canvas}
        width={w}
        height={h}
        className="lab-canvas"
        style={{ width: w * displayScale, maxWidth: "100%", height: "auto" }}
        aria-label={drawable ? words.draw : data.info.title}
        onPointerDown={(e) => {
          if (!drawable) return;
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          paint(e);
        }}
        onPointerMove={(e) => paint(e)}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <div className="lab-try-side">
        {drawable ? <p className="lab-note">{words.draw}</p> : null}
        <div className="lab-run-bar">
          {drawable && <Button onClick={clear}>{words.clear}</Button>}
          <Button onClick={randomTest}>{words.randomTest}</Button>
          <Button variant="primary" onClick={() => void classify()}>
            {words.classify}
          </Button>
        </div>
        {truth !== null && (
          <p className="lab-note">
            {words.trueLabel}: {classes[truth] ?? truth}
          </p>
        )}
        {error && <p className="lab-error">{error}</p>}
        {top && <TopList title={words.top} rows={top} />}
      </div>
    </div>
  );
}

function TextTry({ session, words }: { session: Session; words: Words }) {
  const { data, model, device, spec } = session;
  const [review, setReview] = useState("");
  const [rows, setRows] = useState<{ label: string; p: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const vocab = useRef<{ index: Map<string, number>; list: string[] } | null>(
    null,
  );
  const classes = data.manifest.classes ?? [];

  async function classify() {
    try {
      setError(null);
      if (!vocab.current) {
        const list =
          data.vocabulary ??
          ((await (
            await fetch(
              `${MIRROR_BASE}${data.info.id}/${data.manifest.vocabularyFile?.file ?? "vocabulary.json"}`,
            )
          ).json()) as string[]);
        vocab.current = { list, index: wordIndex(list) };
      }
      const encoding = data.manifest.tokenEncoding!;
      const ids = encode(review, vocab.current.index, encoding);
      const size = spec.inputShape[0]!;
      const values = bagOf(ids, size);
      const probs = await predict(
        model,
        device,
        { values, shape: [1, size] },
        "probabilities",
      );
      setRows(topK(probs, classes, classes.length <= 3 ? classes.length : 3));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div className="lab-text-try">
      <Field label={words.reviewPlaceholder}>
        <TextArea
          rows={4}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder={words.reviewPlaceholder}
        />
      </Field>
      <div className="lab-run-bar">
        <Button variant="primary" onClick={() => void classify()}>
          {words.classify}
        </Button>
      </div>
      {error && <p className="lab-error">{error}</p>}
      {rows && <TopList title={words.probabilities} rows={rows} />}
    </div>
  );
}

function RegressionTry({
  session,
  words,
  locale,
}: {
  session: Session;
  words: Words;
  locale: Locale;
}) {
  const { data, model, device, spec, scale } = session;
  const features = data.manifest.features ?? [];
  const [values, setValues] = useState<string[]>(() =>
    rowValues(data, 0, features.length),
  );
  const [row, setRow] = useState<number | null>(0);
  const [predicted, setPredicted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const money = (v: number) =>
    `${v.toLocaleString(locale === "ko" ? "ko-KR" : "en-US", { maximumFractionDigits: 0 })} ${words.unit}`;

  function randomRow() {
    const index = Math.floor(Math.random() * data.test.count);
    setRow(index);
    setValues(rowValues(data, index, features.length));
    setPredicted(null);
  }

  async function predictPrice() {
    try {
      setError(null);
      const mean = spec.features!.mean;
      const std = spec.features!.std;
      const input = new Float32Array(features.length);
      values.forEach((value, f) => {
        const raw = Number(value);
        input[f] = (raw - mean[f]!) / (std[f] === 0 ? 1 : std[f]!);
      });
      const [out] = await predict(
        model,
        device,
        { values: input, shape: [1, features.length] },
        "value",
      );
      setPredicted(out! * scale!.std + scale!.mean);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  const actual = row === null ? null : data.test.y[row]!;
  return (
    <div className="lab-regression-try">
      <p className="lab-note">{words.features}</p>
      <div className="lab-features">
        {features.map((name, f) => (
          <Field key={name} label={name}>
            <Input
              value={values[f]}
              onChange={(e) =>
                setValues(values.map((v, i) => (i === f ? e.target.value : v)))
              }
              inputMode="decimal"
            />
          </Field>
        ))}
      </div>
      <div className="lab-run-bar">
        <Button onClick={randomRow}>{words.randomRow}</Button>
        <Button variant="primary" onClick={() => void predictPrice()}>
          {words.predictedPrice}
        </Button>
      </div>
      {error && <p className="lab-error">{error}</p>}
      {predicted !== null && (
        <p className="lab-result">
          <strong>
            {words.predictedPrice}: {money(predicted)}
          </strong>
          {actual !== null && row !== null ? (
            <span>
              {" "}
              · {words.actualPrice}: {money(actual)}
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
}

function relativeTime(iso: string, locale: Locale): string {
  const seconds = Math.round((Date.parse(iso) - Date.now()) / 1000);
  const format = new Intl.RelativeTimeFormat(locale === "ko" ? "ko" : "en", {
    numeric: "auto",
  });
  for (const [unit, size] of [
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ] as const)
    if (Math.abs(seconds) >= size)
      return format.format(Math.round(seconds / size), unit);
  return format.format(0, "second");
}

function rowValues(data: LoadedDataset, row: number, count: number): string[] {
  return Array.from({ length: count }, (_, f) =>
    String(data.test.x[row * count + f]),
  );
}

function TopList({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; p: number }[];
}) {
  return (
    <div className="lab-top">
      <p className="lab-note">{title}</p>
      <ol>
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <span>{(100 * row.p).toFixed(1)}%</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function topK(probs: Float32Array, classes: readonly string[], k: number) {
  return Array.from(probs, (p, i) => ({ i, p }))
    .sort((a, b) => b.p - a.p)
    .slice(0, k)
    .map(({ i, p }) => ({ label: classes[i] ?? String(i), p }));
}
