import { useEffect, useRef, useState } from "react";
import { defaultConfig } from "../lab/config";
import { text } from "../lab/copy";
import {
  isCached,
  labels,
  listDatasets,
  loadDataset,
  loadManifest,
  type DatasetInfo,
  type LoadedDataset,
  type Manifest,
} from "../lab/datasets";
import { mergeSnapshots, sampleIndices } from "../lab/graph-layout";
import {
  isKerasDataset,
  kerasCached,
  kerasCardManifest,
  kerasDatasetInfos,
  loadKerasDataset,
} from "../lab/keras";
import {
  hostParameters,
  parameterChecksum,
  readGradients,
} from "../lab/runtime";
import {
  buildModel,
  fillInputs,
  inputSize,
  mulberry32,
  presetsFor,
  specFor,
  targetScale,
  train,
  type Device,
  type ModelSpec,
  type NN,
  type RunConfig,
  type RunResult,
} from "../lab/train";
import type {
  GraphKind,
  GraphTab,
  LabApi,
  Locale,
  ResidencyState,
  SavedModel,
  Session,
  Progress as TrainingProgress,
  Words,
} from "../lab/types";
import type { DeviceDataset, Module } from "../vendor/typenn/index.js";
/** The page state follows the training steps at most once in this many milliseconds. */
const LOSS_FLUSH_MS = 100;

declare global {
  interface Window {
    __typennLab?: LabApi;
  }
}

/** The five Keras datasets, then the mirrored entries of /data/index.json (never a Keras id twice). */
async function listAllDatasets(
  signal?: AbortSignal,
): Promise<{ list: DatasetInfo[]; mirrorUp: boolean }> {
  // A missing mirror must not hide the five Keras datasets, which need no mirror.
  let mirrorUp = true;
  const mirrored = await listDatasets(signal).then(
    (list) => list.filter((d) => !isKerasDataset(d.id)),
    (cause: unknown) => {
      console.warn("The dataset mirror is not available:", cause);
      mirrorUp = false;
      return [] as DatasetInfo[];
    },
  );
  return { list: [...kerasDatasetInfos(), ...mirrored], mirrorUp };
}

const NN_PROMISE = () => import("../vendor/typenn/index.js") as Promise<NN>;

export function useTrainingLab(locale: Locale) {
  const t: Words = text[locale];
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [mirrorUp, setMirrorUp] = useState(true);
  const [manifests, setManifests] = useState<Record<string, Manifest>>({});
  const [cached, setCached] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState("mnist");
  const [form, setForm] = useState<RunConfig>(() => defaultConfig("mnist"));
  const [loading, setLoading] = useState<{
    id: string;
    loaded: number;
    total: number;
  } | null>(null);
  const [loadedIds, setLoadedIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [losses, setLosses] = useState<number[]>([]);
  const [metrics, setMetrics] = useState<number[]>([]);
  const [graphTabs, setGraphTabs] = useState<GraphTab[]>([]);
  const [graphTab, setGraphTab] = useState(0);
  const [graphBusy, setGraphBusy] = useState<GraphKind | null>(null);
  const [graphSource, setGraphSource] = useState<string | null>(null);
  const [graphKind, setGraphKind] = useState<GraphKind | null>(null);
  const [graphBatch, setGraphBatch] = useState<string | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [results, setResults] = useState<RunResult[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [residency, setResidency] = useState<ResidencyState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [activeTier, setActiveTier] = useState<string | null>(null);
  // The last trained model of each dataset id. It lives in this page only.
  const [models, setModels] = useState<Record<string, SavedModel>>({});
  const [activating, setActivating] = useState<string | null>(null);
  const runSeq = useRef(0);
  // Counts the activations and the selections: a load that is no longer the latest one stops.
  const activation = useRef(0);

  const memory = useRef(new Map<string, LoadedDataset>());
  const runningRef = useRef(false);
  const stopRef = useRef(false);
  // The losses of the run, appended in O(1) at each step. The page state takes a copy at most
  // once in LOSS_FLUSH_MS, so a step does not copy the array or render the page.
  const lossBuffer = useRef<number[]>([]);
  const latestProgress = useRef<TrainingProgress | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const resultsRef = useRef<RunResult[]>([]);
  const runRef = useRef<(config: RunConfig) => Promise<RunResult>>(async () => {
    throw new Error("The lab is not ready.");
  });
  const readyResolve = useRef<() => void>(() => {});
  const readyPromise = useRef<Promise<void>>(
    new Promise<void>((resolve) => (readyResolve.current = resolve)),
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { list, mirrorUp: up } = await listAllDatasets();
        if (!alive) return;
        setDatasets(list);
        setMirrorUp(up);
        const loaded = await Promise.all(
          list.map(
            async (info) =>
              [
                info.id,
                isKerasDataset(info.id)
                  ? kerasCardManifest(info.id)
                  : await loadManifest(info.id),
              ] as const,
          ),
        );
        if (!alive) return;
        const byId = Object.fromEntries(loaded);
        setManifests(byId);
        const flags = await Promise.all(
          list.map(
            async (info) =>
              [
                info.id,
                isKerasDataset(info.id)
                  ? await kerasCached(info.id)
                  : await isCached(info.id, byId[info.id]!),
              ] as const,
          ),
        );
        if (alive) setCached(Object.fromEntries(flags));
      } catch (cause) {
        if (alive)
          setNotice(cause instanceof Error ? cause.message : String(cause));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const api: LabApi = {
      ready: readyPromise.current,
      datasets: async () => (await listAllDatasets()).list,
      run: async (config) => {
        const full = { ...defaultConfig(config.dataset), ...config };
        return runRef.current(full);
      },
      stop: () => (stopRef.current = true),
      get results() {
        return resultsRef.current;
      },
    };
    window.__typennLab = api;
    readyResolve.current();
    return () => {
      delete window.__typennLab;
      const current = sessionRef.current;
      sessionRef.current = null;
      if (current) void endSession(current);
    };
  }, []);

  /** Dispose the session's dataset, then its device. Every session change goes through here. */
  function endSession(ended: Session | null): Promise<void> {
    ended?.dataset?.dispose();
    return ended ? ended.device.dispose() : Promise.resolve();
  }

  /** Drop the arrays of every dataset except `keep` and the one the live session uses. */
  function releaseDatasets(keep: string) {
    const inUse = sessionRef.current?.data.info.id;
    for (const id of [...memory.current.keys()])
      if (id !== keep && id !== inUse) memory.current.delete(id);
    setLoadedIds((ids) => ids.filter((id) => memory.current.has(id)));
  }

  async function ensureData(id: string): Promise<LoadedDataset> {
    const known = memory.current.get(id);
    if (known) return known;
    setLoading({ id, loaded: 0, total: 1 });
    try {
      const options = {
        onProgress: (loaded: number, total: number) =>
          setLoading({ id, loaded, total }),
      };
      const data = isKerasDataset(id)
        ? await loadKerasDataset(id, options)
        : await loadDataset(id, options);
      memory.current.set(id, data);
      setLoadedIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
      setCached((flags) => ({ ...flags, [id]: true }));
      return data;
    } finally {
      setLoading(null);
    }
  }

  /** Move the steps buffered since the last flush into the page state: one render, not one per step. */
  function flushSteps() {
    if (flushTimer.current !== null) clearTimeout(flushTimer.current);
    flushTimer.current = null;
    setProgress(latestProgress.current);
    setLosses(lossBuffer.current.slice());
  }

  async function runTraining(config: RunConfig): Promise<RunResult> {
    if (runningRef.current) throw new Error(t.running);
    runningRef.current = true;
    stopRef.current = false;
    setStopping(false);
    setRunning(true);
    setRunError(null);
    lossBuffer.current = [];
    latestProgress.current = null;
    setLosses([]);
    setMetrics([]);
    setProgress(null);
    setActiveTier(null);
    setForm({
      ...config,
      maxSteps: undefined,
      maxEvalBatches: undefined,
      kind: undefined,
    });
    // A run replaces the live session: a load still in flight stops.
    activation.current++;
    setActivating(null);
    setSelected(config.dataset);
    let device: Device | undefined;
    // The device dataset of this run: it moves into the session when the run keeps a model.
    let ownDataset: DeviceDataset | undefined;
    try {
      const data = await ensureData(config.dataset);
      const nn = await NN_PROMISE();
      const previous = sessionRef.current;
      sessionRef.current = null;
      setSession(null);
      await endSession(previous);
      releaseDatasets(config.dataset);
      device = await nn.device({ device: config.tier });
      setActiveTier(device.backend.name);
      const trainDevice = device;
      const spec = specFor(data, config);
      const scale =
        config.model === "regression" ? targetScale(data.train) : undefined;
      let model: Module | undefined;
      const totalSteps =
        config.epochs * Math.ceil(data.train.count / config.batchSize);
      const result = await train(config, data, nn, trainDevice, {
        shouldStop: () => stopRef.current,
        onModel: (m) => (model = m),
        onDataset: (d) => {
          ownDataset = d;
          setResidency({
            id: config.dataset,
            residency: d.residency,
            bytes: d.bytes,
          });
        },
        onStep: (info) => {
          const done = (info.epoch - 1) * info.stepsPerEpoch + info.step;
          lossBuffer.current.push(info.loss);
          latestProgress.current = {
            ...info,
            totalSteps,
            done,
            epochs: config.epochs,
          };
          if (flushTimer.current === null)
            flushTimer.current = setTimeout(flushSteps, LOSS_FLUSH_MS);
        },
        onEpoch: (info) => setMetrics((values) => [...values, info.testMetric]),
      });
      resultsRef.current = [...resultsRef.current, result];
      setResults(resultsRef.current);
      if (model) {
        const runId = `run-${++runSeq.current}`;
        const saved: SavedModel = {
          runId,
          config,
          spec,
          params: await hostParameters(model),
          scale,
          result,
        };
        setModels((previous) => ({ ...previous, [config.dataset]: saved }));
        const next: Session = {
          runId,
          model,
          device: trainDevice,
          data,
          spec,
          scale,
          result,
          dataset: ownDataset,
        };
        ownDataset = undefined;
        sessionRef.current = next;
        setSession(next);
        device = undefined;
      }
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setRunError(message);
      throw cause;
    } finally {
      // The steps of the last 100 ms reach the page before the run ends.
      if (latestProgress.current !== null) flushSteps();
      // A dataset that no session holds (a failed run, or a run without a kept model) is freed here.
      ownDataset?.dispose();
      if (device) await device.dispose().catch(() => undefined);
      runningRef.current = false;
      setRunning(false);
      setStopping(false);
    }
  }
  runRef.current = runTraining;

  /** Rebuild a saved model on the one live device, on the tier the form shows, load its parameters and make it the session. */
  async function activateModel(id: string) {
    const saved = models[id];
    if (!saved || runningRef.current) return;
    const token = ++activation.current;
    const stale = () => token !== activation.current || runningRef.current;
    setActivating(id);
    let device: Device | undefined;
    try {
      const data = await ensureData(id);
      const nn = await NN_PROMISE();
      if (stale()) return;
      const previous = sessionRef.current;
      sessionRef.current = null;
      setSession(null);
      await endSession(previous);
      releaseDatasets(id);
      device = await nn.device({ device: form.tier });
      if (stale()) return;
      const model = buildModel(saved.spec, nn).to(device);
      const parameters = model.parameters();
      if (parameters.length !== saved.params.length)
        throw new Error(
          `The saved model has ${saved.params.length} parameters, the build has ${parameters.length}.`,
        );
      for (let i = 0; i < parameters.length; i++)
        await parameters[i]!.assign(saved.params[i]!);
      // Another selection or a run came in while the weights loaded: this model is not wanted.
      if (stale()) return;
      model.eval();
      const next: Session = {
        runId: saved.runId,
        model,
        device,
        data,
        spec: saved.spec,
        scale: saved.scale,
        result: saved.result,
      };
      sessionRef.current = next;
      setSession(next);
      device = undefined;
    } catch (cause) {
      if (!stale())
        setNotice(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (device) await device.dispose().catch(() => undefined);
      if (token === activation.current) setActivating(null);
    }
  }

  /** The quick model of the selected dataset: its preset, a short budget and the chosen tier. */
  function trainQuick() {
    void runTraining({
      ...defaultConfig(selected),
      tier: form.tier,
      maxSteps: 200,
      maxEvalBatches: 4,
      kind: "quick",
    }).catch(() => undefined);
  }

  /**
   * Draw the graph of one read, on a seeded random batch of the test split. The forward reads the
   * logits. The step view splits the work of one training step in two reads: it reads the loss
   * (plan 1), runs backward(), then reads all gradients in one plan (plan 2). A real step runs
   * both in the plan of optimizer.step({ alsoRead: [loss] }). The view updates nothing. A trained model of this page is
   * used when its dataset is selected, and its parameters stay bit-identical; otherwise a fresh
   * model is built and disposed afterwards.
   */
  async function captureGraph(kind: GraphKind) {
    if (runningRef.current || graphBusy || activating !== null) return;
    setGraphBusy(kind);
    setGraphError(null);
    let fresh: Device | undefined;
    try {
      const nn = await NN_PROMISE();
      const data = await ensureData(selected);
      const current = sessionRef.current;
      const trained = current !== null && current.data.info.id === selected;
      const config = form.dataset === selected ? form : defaultConfig(selected);
      let model: Module;
      let device: Device;
      let spec: ModelSpec;
      if (current && trained) {
        model = current.model;
        device = current.device;
        spec = current.spec;
      } else {
        spec = specFor(data, config);
        fresh = await nn.device({ device: config.tier });
        device = fresh;
        model = buildModel(spec, nn).to(device);
      }
      const parameters = model.parameters();
      const wasTraining = model.isTraining();
      const n = Math.min(config.batchSize, data.test.count);
      const indices = sampleIndices(
        data.test.count,
        n,
        mulberry32(config.seed),
      );
      const size = inputSize(spec);
      const batch = fillInputs(
        data.test,
        indices,
        spec,
        new Float32Array(n * size),
      );
      const input = device.tensor(batch.subarray(0, n * size), {
        shape: [n, ...spec.inputShape],
      });
      const source = trained ? t.graphTrained : t.graphFresh;
      const before = await parameterChecksum(parameters);
      // An optimizer that reads the gradients and updates nothing: zeroGrad() frees them.
      const reader = nn.optim.SGD(parameters, { lr: 1 });
      try {
        if (kind === "forward") {
          model.eval();
          const logits = model.forward(input);
          const snapshot = nn.graph(logits);
          await logits.data();
          const plan = device.lastPlan;
          await logits.disposeGraph(parameters);
          setGraphTabs([{ title: t.graphForwardTab, snapshot, plan }]);
        } else {
          model.train();
          await reader.zeroGrad();
          const logits = model.forward(input);
          const loss =
            spec.preset === "regression"
              ? (() => {
                  const scale = targetScale(data.train);
                  return new nn.MSELoss().forward(
                    logits,
                    Float32Array.from(
                      indices,
                      (i) => (data.test.y[i]! - scale.mean) / scale.std,
                    ),
                  );
                })()
              : new nn.CrossEntropyLoss().forward(
                  logits,
                  labels(data.test, indices),
                );
          const snapshot = nn.graph(loss);
          await loss.data();
          const forwardPlan = device.lastPlan;
          // backward() is lazy. Plan 2 reads every gradient in one plan, as the plan of step() computes them.
          await loss.backward();
          const gradients = parameters.flatMap((p) => (p.grad ? [p.grad] : []));
          const gradientSnapshot = mergeSnapshots(gradients.map(nn.graph));
          const read = await readGradients(reader);
          const gradientPlan = read ? device.lastPlan : undefined;
          await loss.disposeGraph(parameters);
          await reader.zeroGrad();
          const tabs: GraphTab[] = [
            { title: t.graphTab1, snapshot, plan: forwardPlan },
          ];
          if (gradientPlan && gradientPlan !== forwardPlan)
            tabs.push({
              title: t.graphTab2,
              snapshot: gradientSnapshot,
              plan: gradientPlan,
            });
          setGraphTabs(tabs);
        }
        const after = await parameterChecksum(parameters);
        if (after !== before)
          throw new Error(
            `The parameters changed (checksum ${before} to ${after}).`,
          );
        setGraphTab(0);
        setGraphKind(kind);
        setGraphSource(source);
        setGraphBatch(
          t.graphBatch
            .replace("{n}", String(n))
            .replace("{seed}", String(config.seed))
            .replace("{sum}", after),
        );
      } finally {
        await reader.zeroGrad().catch(() => undefined);
        if (wasTraining) model.train();
        else model.eval();
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      setGraphError(`${t.graphError} ${message}`);
    } finally {
      if (fresh) await fresh.dispose().catch(() => undefined);
      setGraphBusy(null);
    }
  }

  function selectDataset(id: string) {
    if (running || graphBusy) return;
    // The dataset of the live session is for the old selection: free it now. The model stays.
    const live = sessionRef.current;
    if (live?.dataset && live.data.info.id !== id) {
      live.dataset.dispose();
      const kept: Session = { ...live, dataset: undefined };
      sessionRef.current = kept;
      setSession(kept);
    }
    setResidency(null);
    releaseDatasets(id);
    setSelected(id);
    setForm({ ...defaultConfig(id), tier: form.tier });
    activation.current++;
    setActivating(null);
    if (sessionRef.current?.data.info.id !== id && models[id])
      void activateModel(id);
  }

  const info = datasets.find((d) => d.id === selected);
  const manifest = manifests[selected];
  const presets = manifest ? presetsFor(manifest.task) : [];
  const words: Words = t;
  return {
    datasets,
    mirrorUp,
    manifests,
    cached,
    selected,
    form,
    setForm,
    loading,
    loadedIds,
    running,
    progress,
    losses,
    metrics,
    graphTabs,
    graphTab,
    setGraphTab,
    graphBusy,
    graphSource,
    graphKind,
    graphBatch,
    graphError,
    results,
    runError,
    session,
    residency,
    notice,
    setNotice,
    stopping,
    setStopping,
    activeTier,
    models,
    activating,
    stopRef,
    resultsRef,
    ensureData,
    runTraining,
    activateModel,
    trainQuick,
    captureGraph,
    selectDataset,
    info,
    manifest,
    presets,
    words,
  };
}
