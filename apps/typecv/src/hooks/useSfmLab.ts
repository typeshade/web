import { useEffect, useRef, useState } from 'react';
import { cameraInSourcePixels, parsePreparedVideo } from '../lib/sfm-input';
type SampledFrame = {
  id: number;
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  time: number;
  sourceWidth?: number;
  sourceHeight?: number;
};
type Reconstruction = {
  views: {
    id: number;
    pose: { R: Float64Array; t: Float64Array };
    camera: { fx: number; fy: number; cx: number; cy: number };
  }[];
  landmarks: { xyz: Float64Array }[];
};

export function useSfmLab(locale: 'en' | 'ko') {
  const ko = locale === 'ko';
  const [file, setFile] = useState<File>();
  const [source, setSource] = useState<{ name: string; width: number; height: number }>();
  const [frames, setFrames] = useState<string[]>([]);
  const [frameData, setFrameData] = useState<SampledFrame[]>([]);
  const [reconstruction, setReconstruction] = useState<Reconstruction>();
  const [diagnostics, setDiagnostics] = useState<any>();
  const [unregistered, setUnregistered] = useState<number[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [featureCounts, setFeatureCounts] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [focal, setFocal] = useState(1.2);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | undefined>(undefined);
  const jobRef = useRef(0);
  const timeoutRef = useRef<number | undefined>(undefined);
  const terminateWorker = () => {
    workerRef.current?.terminate();
    workerRef.current = undefined;
  };
  useEffect(
    () => () => {
      terminateWorker();
      window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  async function sampleFrames() {
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.json')) {
      await loadPreparedFrames(file);
      return;
    }
    terminateWorker();
    setReconstruction(undefined);
    setDiagnostics(undefined);
    setBusy(true);
    setFrames([]);
    setFrameData([]);
    setStatus(
      ko ? '브라우저에서 영상 메타데이터를 읽는 중…' : 'Reading video metadata in this browser…',
    );
    const video = videoRef.current!;
    const url = URL.createObjectURL(file);
    video.src = url;
    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () =>
          reject(new Error(ko ? '영상 디코딩에 실패했습니다.' : 'Video decoding failed.'));
      });
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration < 1)
        throw new Error(ko ? '영상 길이가 너무 짧습니다.' : 'The video is too short.');
      const canvas = canvasRef.current!;
      setSource({ name: file.name, width: video.videoWidth, height: video.videoHeight });
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      // Bound the feature workload of uploaded video frames.
      const scale = Math.min(1, 512 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const times = Array.from({ length: 8 }, (_, i) => duration * (i / 7));
      const thumbs: string[] = [],
        sampled: SampledFrame[] = [];
      for (const time of times) {
        setStatus(
          `${ko ? '프레임 디코딩' : 'Decoding frame'} ${thumbs.length + 1}/8 · ${time.toFixed(2)} s`,
        );
        await new Promise<void>((resolve, reject) => {
          video.onseeked = () => resolve();
          video.onerror = () => reject(new Error('Video seek failed.'));
          video.currentTime = Math.min(time, duration - 0.05);
        });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        sampled.push({
          id: sampled.length,
          width: canvas.width,
          height: canvas.height,
          pixels: image.data.slice(),
          time,
          sourceWidth: video.videoWidth,
          sourceHeight: video.videoHeight,
        });
        thumbs.push(canvas.toDataURL('image/jpeg', 0.78));
      }
      setFrames(thumbs);
      setFrameData(sampled);
      setStatus(
        ko
          ? '8개 프레임을 준비했습니다. GPU SfM 실행을 선택하세요.'
          : 'Eight frames are ready. Start the GPU SfM run.',
      );
    } catch (err) {
      setStatus(
        `${err instanceof Error ? err.message : String(err)} ${
          ko
            ? '브라우저가 원본을 디코딩하지 못하면 prepare-sfm-video.py로 만든 JSON을 선택하세요.'
            : 'If this browser cannot decode the source, select JSON prepared with prepare-sfm-video.py.'
        }`,
      );
    } finally {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  }

  async function loadPreparedFrames(input: File) {
    terminateWorker();
    setBusy(true);
    setFrames([]);
    setFrameData([]);
    setReconstruction(undefined);
    setDiagnostics(undefined);
    try {
      if (input.size > 64 * 1024 * 1024) throw new RangeError('Frame bundle exceeds 64 MiB.');
      const prepared = parsePreparedVideo(await input.text());
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const sampled: SampledFrame[] = [];
      for (const frame of prepared.frames) {
        const bitmap = await createImageBitmap(await (await fetch(frame.image)).blob());
        try {
          if (bitmap.width !== frame.width || bitmap.height !== frame.height)
            throw new RangeError('Encoded frame dimensions do not match the bundle.');
          canvas.width = frame.width;
          canvas.height = frame.height;
          ctx.drawImage(bitmap, 0, 0);
          sampled.push({
            id: frame.id,
            width: frame.width,
            height: frame.height,
            time: frame.time,
            pixels: ctx.getImageData(0, 0, frame.width, frame.height).data,
            sourceWidth: prepared.source.width,
            sourceHeight: prepared.source.height,
          });
        } finally {
          bitmap.close();
        }
      }
      setSource(prepared.source);
      setFrames(prepared.frames.map((frame) => frame.image));
      setFrameData(sampled);
      setStatus(
        ko
          ? `${sampled.length}개 분석 프레임을 준비했습니다. GPU SfM 실행을 선택하세요.`
          : `${sampled.length} analysis frames are ready. Start the GPU SfM run.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  async function loadPyramidSample() {
    terminateWorker();
    setBusy(true);
    setReconstruction(undefined);
    setStatus(
      ko
        ? 'Pexels 피라미드 영상의 샘플 프레임을 불러오는 중…'
        : 'Loading sample frames from the Pexels pyramid video…',
    );
    try {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const times = [0, 1, 2, 4, 8, 12, 16, 20],
        thumbs: string[] = [],
        sampled: SampledFrame[] = [];
      for (let i = 0; i < times.length; i++) {
        const response = await fetch(`/sample/pyramid/frame-${String(i).padStart(2, '0')}.jpg`);
        if (!response.ok) throw new Error(`Sample frame ${i + 1} could not be loaded.`);
        const bitmap = await createImageBitmap(await response.blob());
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data.slice();
        sampled.push({ id: i, width: canvas.width, height: canvas.height, pixels, time: times[i] });
        thumbs.push(canvas.toDataURL('image/jpeg', 0.78));
      }
      setFrames(thumbs);
      setFrameData(sampled);
      setSource({
        name: 'Pexels pyramid sample',
        width: sampled[0].width,
        height: sampled[0].height,
      });
      setStatus(
        ko
          ? '실제 드론 영상에서 추출한 8개 프레임을 준비했습니다.'
          : 'Eight frames extracted from the real drone video are ready.',
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function runSfM() {
    if (frameData.length < 2 || busy) return;
    setBusy(true);
    setProgress(0);
    setReconstruction(undefined);
    setStatus(ko ? 'TypeShade WebGPU 초기화 중…' : 'Opening TypeShade WebGPU…');
    const worker =
      workerRef.current ??
      new Worker(new URL('../workers/sfm.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    let settled = false;
    let lastDetail = 'WebGPU initialization';
    const finish = (keepWorker = false) => {
      if (settled) return;
      settled = true;
      if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
      setBusy(false);
      if (!keepWorker && workerRef.current === worker) {
        worker.terminate();
        workerRef.current = undefined;
      }
    };
    const armTimeout = () => {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setStatus(
          ko
            ? `2분 동안 진행 응답이 없어 대기를 종료했습니다. 마지막 단계: ${lastDetail}`
            : `Stopped waiting after 2 minutes without progress. Last step: ${lastDetail}`,
        );
        finish();
      }, 120_000);
    };
    armTimeout();
    const id = ++jobRef.current;
    worker.onmessage = (event: MessageEvent<any>) => {
      const message = event.data;
      if (message.id !== id || settled) return;
      if (message.type === 'progress') {
        lastDetail = message.detail ?? message.stage;
        armTimeout();
        const value =
          message.stage === 'features'
            ? 5 + (35 * message.completed) / message.total
            : message.stage === 'matches'
              ? 40 + (35 * message.completed) / message.total
              : 80;
        setProgress(Math.round(message.progress ?? value));
        const stage =
          message.stage === 'features'
            ? ko
              ? 'GPU 특징 추출'
              : 'GPU feature extraction'
            : message.stage === 'matches'
              ? ko
                ? 'GPU 디스크립터 매칭'
                : 'GPU descriptor matching'
              : ko
                ? '증분 SfM 복원'
                : 'Incremental SfM';
        setStatus(
          `${stage} · ${message.detail ?? `${message.completed}/${message.total}`}${message.features ? ` · ${message.features} ${ko ? '특징' : 'features'}` : ''}`,
        );
      } else if (message.type === 'result') {
        setReconstruction(message.reconstruction);
        setDiagnostics(message.diagnostics);
        setUnregistered(message.unregistered);
        setStages(message.stages);
        setFeatureCounts(message.featureCounts);
        setMatchedPairs(message.matchedPairs);
        setProgress(100);
        setStatus(ko ? 'GPU SfM 복원이 완료되었습니다.' : 'GPU SfM reconstruction completed.');
        finish(true);
      } else if (message.type === 'error') {
        setStatus(`${ko ? '복원 실패' : 'Reconstruction failed'}: ${message.message}`);
        finish();
      }
    };
    worker.onerror = (event) => {
      setStatus(`${ko ? '워커 오류' : 'Worker error'}: ${event.message}`);
      finish();
    };
    const transferableFrames = frameData.map((frame) => ({
      ...frame,
      pixels: frame.pixels.slice(),
    }));
    worker.postMessage(
      { id, frames: transferableFrames, focalRatio: focal },
      transferableFrames.map((frame) => frame.pixels.buffer),
    );
  }

  function cancel() {
    if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
    terminateWorker();
    setBusy(false);
    setStatus(ko ? 'GPU 작업을 취소했습니다.' : 'GPU run cancelled.');
  }

  function download(format: 'json' | 'ply') {
    if (!reconstruction) return;
    let text: string;
    let name: string;
    if (format === 'json') {
      text = JSON.stringify(
        {
          source: file?.name ?? 'Pexels pyramid sample',
          sourceVideo: source,
          analysisFrames: frameData.map(
            ({ id, width, height, time, sourceWidth, sourceHeight }) => ({
              id,
              width,
              height,
              time,
              sourceWidth,
              sourceHeight,
            }),
          ),
          assumedFocalRatio: focal,
          diagnostics,
          unregistered,
          views: reconstruction.views.map((view) => ({
            id: view.id,
            camera: view.camera,
            sourceCamera: (() => {
              const frame = frameData.find((candidate) => candidate.id === view.id);
              return frame
                ? cameraInSourcePixels(view.camera, frame, {
                    width: frame.sourceWidth ?? frame.width,
                    height: frame.sourceHeight ?? frame.height,
                  })
                : view.camera;
            })(),
            pose: { R: Array.from(view.pose.R), t: Array.from(view.pose.t) },
          })),
          landmarks: reconstruction.landmarks.map((point) => Array.from(point.xyz)),
        },
        null,
        2,
      );
      name = 'typecv-reconstruction.json';
    } else {
      const xyz = reconstruction.landmarks.map((point) => [...point.xyz]);
      const cameras = reconstruction.views.map((view) => {
        const { R, t } = view.pose;
        return [
          -(R[0] * t[0] + R[3] * t[1] + R[6] * t[2]),
          -(R[1] * t[0] + R[4] * t[1] + R[7] * t[2]),
          -(R[2] * t[0] + R[5] * t[1] + R[8] * t[2]),
        ];
      });
      const vertices = [
        ...xyz.map((v) => `${v.join(' ')} 105 177 255`),
        ...cameras.map((v) => `${v.join(' ')} 255 180 84`),
      ];
      text = `ply\nformat ascii 1.0\nelement vertex ${vertices.length}\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n${vertices.join('\n')}\n`;
      name = 'typecv-reconstruction.ply';
    }
    const url = URL.createObjectURL(
      new Blob([text], {
        type: format === 'json' ? 'application/json' : 'application/octet-stream',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return {
    ko,
    file,
    setFile,
    source,
    setSource,
    frames,
    setFrames,
    frameData,
    setFrameData,
    reconstruction,
    setReconstruction,
    diagnostics,
    unregistered,
    stages,
    featureCounts,
    matchedPairs,
    progress,
    status,
    focal,
    setFocal,
    busy,
    videoRef,
    canvasRef,
    workerRef,
    terminateWorker,
    sampleFrames,
    loadPyramidSample,
    runSfM,
    cancel,
    download,
  };
}
