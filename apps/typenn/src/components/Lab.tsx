import "../styles/training.css";
import {
  ThemeProvider,
  TextLink,
  Button,
  Field,
  NumberInput,
  Select,
  Tabs,
  EmptyState,
  Alert,
  Toolbar,
} from "@typeshade/site-ui/react";
import { Progress, Table } from "antd";
import { useTrainingLab } from "../hooks/useTrainingLab";
import {
  copyJson,
  formatBytes,
  formatTest,
  residencyText,
  statusLine,
} from "../lab/format";
import { type Preset, type TierPreference } from "../lab/train";
import type { Locale } from "../lab/types";
import KernelGraph from "./KernelGraph";
import { LineChart } from "./lab/LineChart";
import { TryModel } from "./lab/TryModel";
export default function Lab({ locale }: { locale: Locale }) {
  const {
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
  } = useTrainingLab(locale);
  return (
    <ThemeProvider>
      <div className="lab-app">
        <p className="lab-intro">{words.intro}</p>
        {notice && (
          <Alert tone="danger" live>
            {notice}
          </Alert>
        )}

        <section className="lab-section" aria-labelledby="lab-dataset">
          <h2 id="lab-dataset">{words.datasetTitle}</h2>
          <div className="lab-cards">
            {datasets.map((d) => {
              const m = manifests[d.id];
              const isLoading = loading?.id === d.id;
              const percent =
                isLoading && loading.total > 0
                  ? Math.round((100 * loading.loaded) / loading.total)
                  : 0;
              return (
                <article
                  key={d.id}
                  className={`lab-card${selected === d.id ? " is-selected" : ""}`}
                >
                  <button
                    type="button"
                    className="lab-card-select"
                    aria-pressed={selected === d.id}
                    onClick={() => selectDataset(d.id)}
                    disabled={running || graphBusy !== null}
                  >
                    <span className="lab-card-title">{d.title}</span>
                    <span className="lab-card-task">{d.task}</span>
                  </button>
                  {m && (
                    <dl className="lab-facts">
                      <dt>{words.counts}</dt>
                      <dd>
                        {m.splits.train.count.toLocaleString()} /{" "}
                        {m.splits.test.count.toLocaleString()}
                      </dd>
                      <dt>{words.bytes}</dt>
                      <dd>{formatBytes(d.totalBytes)}</dd>
                      {selected === d.id && residency?.id === d.id && (
                        <>
                          <dt>{words.residency}</dt>
                          <dd>{residencyText(residency, words)}</dd>
                        </>
                      )}
                      <dt>{words.license}</dt>
                      <dd>{m.license}</dd>
                      <dt>{words.citation}</dt>
                      <dd>{m.citation}</dd>
                      <dt>{words.source}</dt>
                      <dd>
                        {d.origin === "keras"
                          ? words.fromKeras
                          : words.fromMirror}
                      </dd>
                    </dl>
                  )}
                  <div className="lab-card-actions">
                    {isLoading ? (
                      <Progress
                        percent={percent}
                        size="small"
                        format={() =>
                          `${words.downloading} ${formatBytes(loading.loaded)} / ${formatBytes(loading.total)} (${percent}%)`
                        }
                      />
                    ) : loadedIds.includes(d.id) ? (
                      <span className="lab-note">{words.loaded}</span>
                    ) : (
                      <Button
                        size="small"
                        onClick={() =>
                          void ensureData(d.id).catch((cause) =>
                            setNotice(String(cause)),
                          )
                        }
                        disabled={running || loading !== null}
                      >
                        {words.download}
                      </Button>
                    )}
                    <span className="lab-note">
                      {cached[d.id] ? words.cachedNote : words.notCached}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
          {!mirrorUp && (
            <p className="lab-note" role="status">
              {words.mirrorDown}
            </p>
          )}
        </section>

        <section className="lab-section" aria-labelledby="lab-model">
          <h2 id="lab-model">{words.modelTitle}</h2>
          <div className="lab-form">
            <Field
              label={words.preset}
              disabled={running || presets.length < 2}
            >
              <Select<Preset>
                value={form.model}
                onChange={(value) => setForm({ ...form, model: value })}
                options={(presets.length ? presets : [form.model]).map((p) => ({
                  value: p,
                  label: words[p],
                }))}
              />
            </Field>
            <Field
              label={words.hidden}
              disabled={running || form.model === "cnn"}
            >
              <NumberInput
                min={1}
                max={4096}
                step={16}
                value={form.hidden}
                onChange={(v) => v && setForm({ ...form, hidden: v })}
              />
            </Field>
            <Field label={words.optimizer} disabled={running}>
              <Select
                value={form.optimizer}
                onChange={(v) => setForm({ ...form, optimizer: v })}
                options={[
                  { value: "adam", label: "Adam" },
                  { value: "sgd", label: "SGD" },
                ]}
              />
            </Field>
            <Field label={words.learningRate} disabled={running}>
              <NumberInput
                min={0.00001}
                max={1}
                step={0.0001}
                value={form.learningRate}
                onChange={(v) => v && setForm({ ...form, learningRate: v })}
              />
            </Field>
            <Field label={words.batchSize} disabled={running}>
              <NumberInput
                min={1}
                max={1024}
                value={form.batchSize}
                onChange={(v) => v && setForm({ ...form, batchSize: v })}
              />
            </Field>
            <Field label={words.epochs} disabled={running}>
              <NumberInput
                min={1}
                max={100}
                value={form.epochs}
                onChange={(v) => v && setForm({ ...form, epochs: v })}
              />
            </Field>
            <Field label={words.tier} disabled={running}>
              <Select<TierPreference>
                value={form.tier}
                onChange={(v) => setForm({ ...form, tier: v })}
                options={[
                  { value: "auto", label: words.auto },
                  { value: "cpu", label: words.cpu },
                  { value: "webgpu", label: words.webgpu },
                  { value: "webgl2", label: words.webgl2 },
                ]}
              />
            </Field>
          </div>
          {info && (
            <p className="lab-note">
              {info.id} · {form.model}
            </p>
          )}
          {(form.tier === "cpu" || activeTier === "cpu") &&
            (form.model === "cnn" || form.model === "bag") && (
              <p className="lab-note lab-warning" role="note">
                {words.slowCpu}
              </p>
            )}
        </section>

        <section className="lab-section" aria-labelledby="lab-run">
          <h2 id="lab-run">{words.runTitle}</h2>
          <div className="lab-run-bar">
            {running ? (
              <Button
                tone="danger"
                onClick={() => {
                  stopRef.current = true;
                  setStopping(true);
                }}
                disabled={stopping}
              >
                {stopping ? words.stopping : words.stop}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={() =>
                  void runTraining({ ...form, dataset: selected }).catch(
                    () => undefined,
                  )
                }
                disabled={!info}
              >
                {words.start}
              </Button>
            )}
            <span className="lab-status" role="status" aria-live="polite">
              {runError ? (
                <strong className="lab-error">
                  {words.errorTitle}: {runError}
                </strong>
              ) : progress ? (
                statusLine(progress, words)
              ) : running ? (
                words.preparing
              ) : (
                words.idle
              )}
            </span>
          </div>
          {progress && (
            <Progress
              percent={Math.round((100 * progress.done) / progress.totalSteps)}
              size="small"
            />
          )}
          <div className="lab-charts">
            <figure>
              <figcaption>{words.lossChart}</figcaption>
              <LineChart
                values={losses}
                smooth
                axisX={words.stepAxis}
                label={words.lossChart}
                empty={words.emptyLoss}
              />
            </figure>
            <figure>
              <figcaption>{words.metricChart}</figcaption>
              <LineChart
                values={metrics}
                axisX={words.epochAxis}
                label={words.metricChart}
                empty={words.emptyMetric}
                points
                lowerIsBetter={form.model === "regression"}
              />
            </figure>
          </div>
        </section>

        <section className="lab-section" aria-labelledby="lab-graph">
          <h2 id="lab-graph">{words.graphTitle}</h2>
          <p className="lab-note">
            {words.graphIntro}{" "}
            <TextLink href="https://github.com/typeshade/typenn#how-a-read-runs">
              {words.graphReadme} ↗
            </TextLink>
          </p>
          <Toolbar className="lab-graph-actions" label={words.graphTitle}>
            <Button
              onClick={() => void captureGraph("forward")}
              disabled={running || graphBusy !== null || activating !== null}
              loading={graphBusy === "forward"}
            >
              {words.graphForward}
            </Button>
            <Button
              onClick={() => void captureGraph("step")}
              disabled={running || graphBusy !== null || activating !== null}
              loading={graphBusy === "step"}
            >
              {words.graphStep}
            </Button>
          </Toolbar>
          {graphSource && (
            <p className="lab-note" data-testid="graph-source">
              {graphSource} {graphBatch}
            </p>
          )}
          {graphError && (
            <Alert tone="danger" live>
              {graphError}
            </Alert>
          )}
          {graphTabs.length ? (
            <Tabs
              label={words.graphTitle}
              value={String(graphTab)}
              onChange={(value) => setGraphTab(Number(value))}
              items={graphTabs.map((tab, index) => ({
                key: String(index),
                label: tab.title,
                children:
                  graphTab === index ? (
                    <KernelGraph
                      key={`${index}-${tab.title}`}
                      snapshot={tab.snapshot}
                      plan={tab.plan}
                      locale={locale}
                      label={`${words.graphTitle}: ${tab.title}`}
                    />
                  ) : null,
              }))}
            />
          ) : (
            <EmptyState>{words.graphEmpty}</EmptyState>
          )}
          {graphKind === "step" && (
            <p className="lab-note">
              {words.graphStepNote}
              {graphTabs.length < 2 && ` ${words.graphNoPlan2}`}
            </p>
          )}
        </section>

        <section className="lab-section" aria-labelledby="lab-results">
          <h2 id="lab-results">{words.resultsTitle}</h2>
          {results.length === 0 ? (
            <EmptyState>{words.noResults}</EmptyState>
          ) : (
            <Table
              size="small"
              pagination={false}
              scroll={{ x: "max-content" }}
              rowKey={(row) => `${row.finishedAt}-${row.config.dataset}`}
              dataSource={results}
              columns={[
                {
                  title: words.col.dataset,
                  render: (_, r) => r.config.dataset,
                },
                { title: words.col.model, render: (_, r) => r.config.model },
                {
                  title: words.col.tier,
                  render: (_, r) =>
                    r.fallbackReason ? `${r.tier} (${words.fallback})` : r.tier,
                },
                {
                  title: words.col.epochs,
                  render: (_, r) => `${r.epochs.length}/${r.config.epochs}`,
                },
                {
                  title: words.col.metric,
                  render: (_, r) =>
                    formatTest(r.test, r.config.model === "regression", locale),
                },
                {
                  title: words.col.time,
                  render: (_, r) => r.seconds.toFixed(1),
                },
                {
                  title: words.col.status,
                  render: (_, r) =>
                    r.completed
                      ? words.completed
                      : r.kind === "quick" && r.capped
                        ? words.quickStatus.replace("{steps}", String(r.steps))
                        : words.stopped,
                },
              ]}
            />
          )}
          <div className="lab-run-bar">
            <Button
              onClick={() =>
                void copyJson(resultsRef.current, words, setNotice)
              }
              disabled={results.length === 0}
            >
              {words.copyJson}
            </Button>
          </div>
        </section>

        <section className="lab-section" aria-labelledby="lab-try">
          <h2 id="lab-try">{words.tryTitle}</h2>
          {running ? (
            <p className="lab-note" role="status">
              {words.busyTry}
            </p>
          ) : session && session.data.info.id === selected ? (
            <TryModel
              key={`${selected}:${session.runId}`}
              session={session}
              words={words}
              locale={locale}
              manifest={manifests[selected]!}
            />
          ) : models[selected] ? (
            activating === selected ? (
              <p className="lab-note" role="status">
                {words.loadingModel}
              </p>
            ) : (
              <div className="lab-run-bar">
                <Button
                  variant="primary"
                  onClick={() => void activateModel(selected)}
                >
                  {words.loadModel}
                </Button>
              </div>
            )
          ) : (
            <div className="lab-try-empty">
              <p className="lab-note">
                {words.noModel.replace("{dataset}", info?.title ?? selected)}
              </p>
              <div className="lab-run-bar">
                <Button
                  variant="primary"
                  onClick={trainQuick}
                  disabled={!info || !manifest}
                >
                  {words.quickTrain}
                </Button>
              </div>
              <p className="lab-note">{words.quickNote}</p>
            </div>
          )}
        </section>
      </div>
    </ThemeProvider>
  );
}
export { defaultConfig } from "../lab/config";
export type { LabApi } from "../lab/types";
