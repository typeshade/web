// Client controller for the live MNIST learning lab.
// Data parsing, batch scheduling and drawing are browser JS; training kernels and
// prediction logits are produced exclusively by the packed TypeShade program.
import type { Pack } from '../../vendor/shader-dsl/src/core/manifest-types.ts';
import { fetchMnist, type MnistData } from './mnist-dataset.ts';
import {
  openMnistSession,
  type MnistSession,
} from '../../vendor/shader-dsl/journeys/mnist/browser-session.ts';
import type { Copy } from '../i18n/index.ts';
import { mnistTestSamples, validMnistEpochs } from '../lib/mnist-settings.ts';

type Words = Copy['mnist']['demo'];
type Tier = 'webgpu' | 'webgl2';
const inputs = 784;
const size = 28;
const batchSize = 16;

function required<T extends Element>(root: Element, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error('MNIST UI element missing: ' + selector);
  return el;
}

function createPixels(image: Uint8ClampedArray): Float32Array {
  const pixels = new Float32Array(inputs);
  for (let i = 0; i < inputs; i++) pixels[i] = image[i * 4] / 255;
  return pixels;
}

// A hidden tab can suspend animation frames. The timer keeps batch scheduling
// moving, and abort releases either wait without waiting for the tab to return.
function yieldToBrowser(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Cancelled', 'AbortError'));
      return;
    }
    let frame = 0;
    let timer = 0;
    const cleanup = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    };
    const resume = () => {
      cleanup();
      resolve();
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    frame = requestAnimationFrame(resume);
    timer = window.setTimeout(resume, 50);
  });
}

export function mountMnist(root: HTMLElement): void {
  const packElement = required<HTMLScriptElement>(root, '[data-pack]');
  const pack = JSON.parse(packElement.textContent || 'null') as Pack;
  if (!pack?.entries?.length) throw new Error('TypeShade MNIST manifest not found');
  const words = JSON.parse(root.dataset.copy || 'null') as Words;
  const start = required<HTMLButtonElement>(root, '[data-start]');
  const cancel = required<HTMLButtonElement>(root, '[data-cancel]');
  const clear = required<HTMLButtonElement>(root, '[data-clear]');
  const sample = required<HTMLButtonElement>(root, '[data-sample]');
  const backend = required<HTMLSelectElement>(root, '[data-tier]');
  const countSelect = required<HTMLSelectElement>(root, '[data-count]');
  const epochsInput = required<HTMLInputElement>(root, '[data-epochs]');
  const epochsError = required<HTMLElement>(root, '[data-epochs-error]');
  const learningPhase = required<HTMLElement>(root, '[data-learning-phase]');
  const trainingBatch = required<HTMLElement>(root, '[data-training-batch]');
  const evaluationBatch = required<HTMLElement>(root, '[data-evaluation-batch]');
  const lossChart = required<SVGSVGElement>(root, '[data-loss-chart]');
  const accuracyChart = required<SVGSVGElement>(root, '[data-accuracy-chart]');
  const history: { epoch: number; loss: number; accuracy: number }[] = [];
  const status = required<HTMLElement>(root, '[data-status]');
  const progress = required<HTMLProgressElement>(root, '[data-progress]');
  const results = required<HTMLElement>(root, '[data-results]');
  const probabilities = required<HTMLElement>(root, '[data-probabilities]');
  const guess = required<HTMLElement>(root, '[data-guess]');
  const groundTruth = required<HTMLElement>(root, '[data-ground-truth]');
  const canvas = required<HTMLCanvasElement>(root, '[data-draw]');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('MNIST drawing canvas unavailable');
  let engine: MnistSession | undefined;
  let signalController: AbortController | undefined;
  let testing: MnistData | undefined;
  let currentSample = -1;
  let busy = false;
  let drawing = false;
  let predictionSequence = 0;
  let processedPixels: Float32Array = new Float32Array(inputs);

  const setStatus = (message: string) => {
    status.textContent = message;
  };
  const buttons = () => {
    start.disabled = busy;
    cancel.disabled = !busy;
    sample.disabled = busy || !testing || !engine;
    clear.disabled = busy;
    backend.disabled = busy;
    countSelect.disabled = busy;
    epochsInput.disabled = busy;
  };
  const svgNode = (tag: string, attributes: Record<string, string>, text?: string) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const renderCurves = () => {
    for (const [chart, metric, title] of [
      [lossChart, 'loss', words.lossCurve],
      [accuracyChart, 'accuracy', words.accuracyCurve],
    ] as const) {
      chart.replaceChildren(svgNode('title', {}, title));
      chart.append(svgNode('desc', {}, words.metricsExplanation));
      if (!history.length) {
        chart.append(
          svgNode(
            'text',
            { x: '12', y: '70', fill: 'currentColor', 'font-size': '12' },
            words.chartEmpty,
          ),
        );
        continue;
      }
      const ceiling =
        metric === 'accuracy' ? 1 : Math.max(1, ...history.map((point) => point.loss));
      const lastEpoch = Math.max(2, history[history.length - 1].epoch);
      const x = (epoch: number) => 48 + ((epoch - 1) / (lastEpoch - 1)) * 336;
      const y = (value: number) => 108 - (value / ceiling) * 90;
      chart.append(
        svgNode('path', {
          d: 'M48 18 V108 H384',
          fill: 'none',
          stroke: 'currentColor',
          opacity: '.4',
        }),
      );
      chart.append(
        svgNode(
          'text',
          { x: '2', y: '24', fill: 'currentColor', 'font-size': '12' },
          metric === 'accuracy' ? '100%' : ceiling.toFixed(2),
        ),
      );
      chart.append(
        svgNode('text', { x: '24', y: '110', fill: 'currentColor', 'font-size': '12' }, '0'),
      );
      chart.append(
        svgNode(
          'text',
          { x: '48', y: '130', fill: 'currentColor', 'font-size': '12' },
          words.epoch + ' 1',
        ),
      );
      chart.append(
        svgNode(
          'text',
          { x: '384', y: '130', fill: 'currentColor', 'font-size': '12', 'text-anchor': 'end' },
          words.epoch + ' ' + lastEpoch,
        ),
      );
      chart.append(
        svgNode('polyline', {
          points: history.map((point) => x(point.epoch) + ',' + y(point[metric])).join(' '),
          fill: 'none',
          stroke: 'var(--color-accent)',
          'stroke-width': '2',
        }),
      );
      for (const point of history) {
        const dot = svgNode('circle', {
          cx: String(x(point.epoch)),
          cy: String(y(point[metric])),
          r: '3',
          fill: 'var(--color-accent)',
          'data-epoch': String(point.epoch),
          'data-value': String(point[metric]),
        });
        dot.append(
          svgNode(
            'title',
            {},
            words.epoch +
              ' ' +
              point.epoch +
              ': ' +
              (metric === 'accuracy'
                ? (point.accuracy * 100).toFixed(1) + '%'
                : point.loss.toFixed(3)),
          ),
        );
        chart.append(dot);
      }
    }
  };
  epochsInput.addEventListener('input', () => {
    epochsInput.setAttribute('aria-invalid', 'false');
    epochsError.hidden = true;
    epochsError.textContent = '';
  });
  renderCurves();
  const resetCanvas = () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 19;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    processedPixels.fill(0);
    currentSample = -1;
    groundTruth.textContent = '';
    guess.textContent = '';
    probabilities.replaceChildren();
  };
  resetCanvas();
  buttons();

  const point = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  };
  const digitPixels = (): Float32Array => {
    const small = document.createElement('canvas');
    small.width = small.height = size;
    const smallContext = small.getContext('2d', { willReadFrequently: true });
    if (!smallContext) throw new Error('Cannot normalize handwritten digit');
    // Fit the written mark into a 20px box; MNIST digits are approximately
    // size-normalized inside their 28x28 frames.
    const source = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let left = canvas.width,
      top = canvas.height,
      right = -1,
      bottom = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (source.data[(y * canvas.width + x) * 4] < 30) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
    if (right < left) return new Float32Array(inputs);
    const width = right - left + 1,
      height = bottom - top + 1;
    const factor = 20 / Math.max(width, height);
    const fittedWidth = Math.max(1, Math.round(width * factor));
    const fittedHeight = Math.max(1, Math.round(height * factor));
    smallContext.fillStyle = '#000';
    smallContext.fillRect(0, 0, size, size);
    smallContext.drawImage(
      canvas,
      left,
      top,
      width,
      height,
      (size - fittedWidth) / 2,
      (size - fittedHeight) / 2,
      fittedWidth,
      fittedHeight,
    );
    return createPixels(smallContext.getImageData(0, 0, size, size).data);
  };
  const showBars = (values: Float32Array) => {
    probabilities.replaceChildren();
    for (let i = 0; i < 10; i++) {
      const row = document.createElement('li');
      const digit = document.createElement('span');
      digit.textContent = String(i);
      const bar = document.createElement('meter');
      bar.min = 0;
      bar.max = 1;
      bar.value = values[i];
      bar.setAttribute('aria-label', String(i));
      const percent = document.createElement('span');
      percent.textContent = (values[i] * 100).toFixed(1) + '%';
      row.append(digit, bar, percent);
      probabilities.append(row);
    }
  };
  const predict = async (pixels: Float32Array) => {
    if (!engine || busy) return;
    const current = ++predictionSequence;
    if (!pixels.some((value) => value > 0.01)) {
      guess.textContent = words.drawFirst;
      probabilities.replaceChildren();
      return;
    }
    try {
      const { probabilities, predicted } = await engine.predict(pixels);
      if (current !== predictionSequence) return;
      guess.textContent =
        words.prediction +
        ' ' +
        predicted +
        ' (' +
        (probabilities[predicted] * 100).toFixed(1) +
        '%)';
      showBars(probabilities);
    } catch (error) {
      if (current !== predictionSequence) return;
      setStatus(words.error + ': ' + String(error));
    }
  };
  canvas.addEventListener('pointerdown', (event) => {
    if (busy) return;
    canvas.setPointerCapture(event.pointerId);
    drawing = true;
    currentSample = -1;
    groundTruth.textContent = '';
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.01, p.y + 0.01);
    ctx.stroke();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drawing || busy) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  });
  const finish = () => {
    if (!drawing) return;
    drawing = false;
    processedPixels = digitPixels();
    void predict(processedPixels);
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
  clear.addEventListener('click', () => {
    predictionSequence++;
    resetCanvas();
    setStatus(engine ? words.drawPrompt : words.idle);
  });
  sample.addEventListener('click', () => {
    if (!testing || !engine || busy) return;
    currentSample = (currentSample + 1) % testing.labels.length;
    const image = testing.pixels.subarray(currentSample * inputs, (currentSample + 1) * inputs);
    const small = document.createElement('canvas');
    small.width = small.height = 28;
    const smallContext = small.getContext('2d');
    if (!smallContext) return;
    const data = smallContext.createImageData(size, size);
    for (let i = 0; i < inputs; i++) {
      const value = Math.round(image[i] * 255);
      data.data[i * 4] = value;
      data.data[i * 4 + 1] = value;
      data.data[i * 4 + 2] = value;
      data.data[i * 4 + 3] = 255;
    }
    smallContext.putImageData(data, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    groundTruth.textContent = words.actualLabel + ' ' + testing.labels[currentSample];
    processedPixels = image.slice();
    void predict(processedPixels);
  });
  const checkAbort = (signal: AbortSignal) => {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  };
  const evaluate = async (data: MnistData, signal: AbortSignal) => {
    if (!engine) throw new Error('Missing MNIST backend');
    let loss = 0,
      correct = 0;
    for (let offset = 0; offset < data.labels.length; offset += batchSize) {
      checkAbort(signal);
      const count = Math.min(batchSize, data.labels.length - offset);
      const stats = await engine.evaluateBatch(
        data.pixels.subarray(offset * inputs, (offset + count) * inputs),
        data.labels.subarray(offset, offset + count),
      );
      checkAbort(signal);
      evaluationBatch.textContent =
        words.evaluating +
        ': ' +
        words.batch +
        ' ' +
        Math.ceil((offset + count) / batchSize) +
        '/' +
        Math.ceil(data.labels.length / batchSize);
      await yieldToBrowser(signal);
      checkAbort(signal);
      loss += stats.loss * count;
      correct += stats.correct;
    }
    return { loss: loss / data.labels.length, accuracy: correct / data.labels.length };
  };
  cancel.addEventListener('click', () => {
    signalController?.abort();
    cancel.disabled = true;
    setStatus(words.stopping);
    learningPhase.textContent = words.stopping;
  });
  start.addEventListener('click', async () => {
    if (busy) return;
    const epochs = validMnistEpochs(epochsInput.value);
    if (epochs === undefined || epochsInput.validity.badInput) {
      epochsError.textContent = words.epochsError;
      epochsError.hidden = false;
      epochsInput.setAttribute('aria-invalid', 'true');
      epochsInput.focus();
      return;
    }
    const samples = Number(countSelect.value);
    const requested = backend.value;
    busy = true;
    buttons();
    predictionSequence++;
    drawing = false;
    signalController = new AbortController();
    const signal = signalController.signal;
    const started = performance.now();
    let succeeded = false;
    try {
      const previous = engine;
      engine = undefined;
      testing = undefined;
      if (previous) await previous.destroy();
      checkAbort(signal);
      progress.value = 0;
      progress.max = samples * epochs;
      results.replaceChildren();
      history.length = 0;
      renderCurves();
      trainingBatch.textContent = '';
      evaluationBatch.textContent = '';
      resetCanvas();
      setStatus(words.downloading);
      learningPhase.textContent = words.downloading;
      const trainData = await fetchMnist('train', samples, signal);
      checkAbort(signal);
      const testData = await fetchMnist('test', mnistTestSamples, signal);
      checkAbort(signal);
      setStatus(words.compiling);
      learningPhase.textContent = words.compiling;
      const choices: Tier[] = requested === 'auto' ? ['webgpu', 'webgl2'] : [requested as Tier];
      let lastError: unknown;
      for (const choice of choices) {
        checkAbort(signal);
        try {
          engine = await openMnistSession(pack, { tier: choice, batchSize });
          break;
        } catch (error) {
          lastError = error;
        }
      }
      checkAbort(signal);
      if (!engine) throw lastError ?? new Error('No TypeShade GPU backend available');
      testing = testData;
      for (let epoch = 1; epoch <= epochs; epoch++) {
        learningPhase.textContent = words.running + ': ' + words.epoch + ' ' + epoch + '/' + epochs;
        evaluationBatch.textContent = '';
        trainingBatch.textContent =
          words.running + ': ' + words.batch + ' 0/' + Math.ceil(samples / batchSize);
        for (let offset = 0; offset < samples; offset += batchSize) {
          checkAbort(signal);
          const count = Math.min(batchSize, samples - offset);
          await engine.trainBatch(
            trainData.pixels.subarray(offset * inputs, (offset + count) * inputs),
            trainData.labels.subarray(offset, offset + count),
            0.1,
          );
          progress.value = (epoch - 1) * samples + offset + count;
          trainingBatch.textContent =
            words.running +
            ': ' +
            words.batch +
            ' ' +
            Math.ceil((offset + count) / batchSize) +
            '/' +
            Math.ceil(samples / batchSize);
          checkAbort(signal);
          setStatus(
            words.running + ': ' + engine.tier + ', ' + words.epoch + ' ' + epoch + '/' + epochs,
          );
          await yieldToBrowser(signal);
        }
        checkAbort(signal);
        learningPhase.textContent =
          words.evaluating + ': ' + words.epoch + ' ' + epoch + '/' + epochs;
        setStatus(learningPhase.textContent);
        evaluationBatch.textContent =
          words.evaluating +
          ': ' +
          words.batch +
          ' 0/' +
          Math.ceil(testData.labels.length / batchSize);
        const metrics = await evaluate(testData, signal);
        checkAbort(signal);
        history.push({ epoch, ...metrics });
        renderCurves();
        const entry = document.createElement('li');
        entry.textContent =
          words.epoch +
          ' ' +
          epoch +
          '/' +
          epochs +
          ': ' +
          words.testAccuracy +
          ' ' +
          (metrics.accuracy * 100).toFixed(1) +
          '%, ' +
          words.loss +
          ' ' +
          metrics.loss.toFixed(3);
        results.append(entry);
      }
      checkAbort(signal);
      setStatus(
        words.completed +
          ': ' +
          engine.tier +
          ', ' +
          ((performance.now() - started) / 1000).toFixed(1) +
          's',
      );
      learningPhase.textContent =
        words.completed + ': ' + words.epoch + ' ' + epochs + '/' + epochs;
      currentSample = -1;
      succeeded = true;
    } catch (error) {
      // Keep controls locked until queued GPU work and destruction finish.
      const failed = engine;
      engine = undefined;
      testing = undefined;
      let cleanupError: unknown;
      try {
        if (failed) await failed.destroy();
      } catch (failure) {
        cleanupError = failure;
      }
      const message = signal.aborted ? words.cancelled : words.error + ': ' + String(error);
      setStatus(
        cleanupError ? message + '. ' + words.error + ': ' + String(cleanupError) : message,
      );
      learningPhase.textContent = signal.aborted ? words.cancelled : words.error;
    } finally {
      signalController = undefined;
      busy = false;
      buttons();
    }
    if (succeeded) sample.click();
  });
  addEventListener(
    'pagehide',
    () => {
      signalController?.abort();
      if (engine) void engine.destroy();
    },
    { once: true },
  );
}
