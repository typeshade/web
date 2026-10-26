import "../styles/lab.css";
import {
  ThemeProvider,
  Button,
  Field,
  NumberInput,
  Panel,
  Alert,
  Toolbar,
} from "@typeshade/site-ui/react";
import { useSfmLab } from "../hooks/useSfmLab";
import { Progress, Statistic, Typography, Upload } from "antd";
import { lazy, Suspense } from "react";
const SfmViewer = lazy(() => import("./SfmViewer"));

const { Text, Title } = Typography;

export default function SfmLab({ locale = "en" }: { locale?: "en" | "ko" }) {
  const {
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
  } = useSfmLab(locale);
  return (
    <ThemeProvider>
      <div className="lab-app">
        <Panel className="lab-panel">
          <Title level={4}>{ko ? "영상 입력" : "Video input"}</Title>
          <div className="sfm-inputs">
            <Upload
              disabled={busy}
              accept="video/*,application/json,.json"
              maxCount={1}
              beforeUpload={(f) => {
                terminateWorker();
                setFile(f);
                setSource(undefined);
                setFrames([]);
                setFrameData([]);
                setReconstruction(undefined);
                return false;
              }}
              showUploadList={{ showRemoveIcon: !busy }}
              onRemove={() => {
                terminateWorker();
                setFile(undefined);
                setSource(undefined);
                setFrames([]);
                setFrameData([]);
                setReconstruction(undefined);
                return true;
              }}
            >
              <Button disabled={busy}>
                {ko ? "영상 / 프레임 JSON 선택" : "Choose video / frame JSON"}
              </Button>
            </Upload>
            <Field
              label={ko ? "초점거리 / 영상 너비" : "Focal length / image width"}
              description={
                ko
                  ? "기본값 1.2는 가정값이며 실제 카메라 보정 데이터가 아닙니다."
                  : "The default ratio of 1.2 is an assumption, not calibrated camera metadata."
              }
              disabled={busy}
            >
              <NumberInput
                min={0.2}
                max={4}
                step={0.1}
                value={focal}
                onChange={(v) => setFocal(Number(v ?? 1.2))}
              />
            </Field>
            <Button disabled={!file || busy} onClick={sampleFrames}>
              {ko ? "분석 프레임 준비" : "Prepare analysis frames"}
            </Button>
            <Button disabled={busy} onClick={loadPyramidSample}>
              {ko ? "피라미드 영상 샘플" : "Load pyramid video sample"}
            </Button>
            <Button
              variant="primary"
              disabled={frameData.length < 2 || busy}
              onClick={runSfM}
            >
              {ko ? "GPU SfM 실행" : "Run GPU SfM"}
            </Button>
            {busy && workerRef.current && (
              <Button tone="danger" onClick={cancel}>
                {ko ? "취소" : "Cancel"}
              </Button>
            )}
          </div>
          <p className="field-help">
            {ko
              ? "18K 등 브라우저 디코더 한도를 넘는 원본은 python scripts/prepare-sfm-video.py input.mkv frames.json으로 준비한 뒤 JSON을 선택하세요. 기본 분석 해상도는 긴 변 512픽셀입니다."
              : "For sources such as 18K above browser decoder limits, run python scripts/prepare-sfm-video.py input.mkv frames.json and select the JSON. Default analysis resolution is 512 pixels on the long edge."}
          </p>
          {source && frameData.length > 0 && (
            <p className="field-help">
              {ko ? "원본" : "Source"} {source.width} × {source.height} ·{" "}
              {ko ? "분석" : "Analysis"} {frameData[0].width} ×{" "}
              {frameData[0].height} · {frameData.length}{" "}
              {ko ? "프레임" : "frames"}
            </p>
          )}
          <Alert className="sfm-notice">
            <strong>
              {ko
                ? "영상은 브라우저 안에서만 처리됩니다."
                : "Video stays in this browser."}
            </strong>
            <p>
              {ko
                ? "프레임 특징 추출, BRIEF 매칭과 기하 복원은 TypeShade WebGPU로 실행합니다. 화면 표시는 Three.js를 사용합니다."
                : "Frame features, BRIEF matching and geometric reconstruction run through TypeShade WebGPU. Three.js renders the result."}
            </p>
          </Alert>
          <div className="lab-status" role="status" aria-live="polite">
            {status ||
              (ko
                ? "영상을 선택한 뒤 프레임을 추출하세요."
                : "Choose a video and extract frames to begin.")}
          </div>
          {busy && <Progress percent={progress} status="active" />}
          {frames.length > 0 && (
            <div className="frame-grid">
              {frames.map((src, i) => (
                <figure key={i}>
                  <img src={src} alt={`${ko ? "프레임" : "Frame"} ${i + 1}`} />
                  <figcaption>
                    {i + 1} / {frameData.length} ·{" "}
                    {frameData[i]?.time.toFixed(2)}s
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <p className="sample-credit">
            {ko ? (
              <>
                샘플 출처: Blanka OG,{" "}
                <a href="https://www.pexels.com/video/drone-footage-of-a-pyramid-8134952/">
                  Pexels 드론 피라미드 영상
                </a>{" "}
                · <a href="https://www.pexels.com/license/">Pexels 라이선스</a>
              </>
            ) : (
              <>
                Sample: Blanka OG,{" "}
                <a href="https://www.pexels.com/video/drone-footage-of-a-pyramid-8134952/">
                  Drone Footage of a Pyramid on Pexels
                </a>{" "}
                · <a href="https://www.pexels.com/license/">Pexels License</a>
              </>
            )}
          </p>
          {reconstruction && (
            <>
              <div className="sfm-summary">
                <Statistic
                  title={ko ? "복원 시점" : "Registered views"}
                  value={reconstruction.views.length}
                  suffix={`/ ${frameData.length}`}
                />
                <Statistic
                  title={ko ? "희소 3D 점" : "Sparse landmarks"}
                  value={reconstruction.landmarks.length}
                />
                <Statistic
                  title={ko ? "평균 재투영 오차" : "Mean reprojection error"}
                  value={diagnostics?.meanReprojectionErrorPx ?? 0}
                  precision={3}
                  suffix="px"
                />
                <Statistic
                  title={
                    ko
                      ? "GPU 검출 특징 / 매칭 쌍"
                      : "Detected features / matched pairs"
                  }
                  value={`${featureCounts.reduce((a, b) => a + b, 0)} / ${matchedPairs}`}
                />
              </div>
              <div className="viewer-head">
                <Title level={4}>
                  {ko ? "복원된 희소 장면" : "Sparse reconstruction"}
                </Title>
                <Text type="secondary">
                  {ko
                    ? "마우스로 회전·확대할 수 있습니다. 점은 랜드마크, 주황색 선은 카메라입니다."
                    : "Drag to orbit and zoom. Points are landmarks; orange lines mark cameras."}
                </Text>
              </div>
              <Suspense
                fallback={
                  <div className="viewer viewer-loading">
                    Loading 3D viewer…
                  </div>
                }
              >
                <SfmViewer reconstruction={reconstruction} />
              </Suspense>
              <div className="run-details">
                <Text>
                  {ko
                    ? `미등록 시점: ${unregistered.length ? unregistered.join(", ") : "없음"}`
                    : `Unregistered views: ${unregistered.length ? unregistered.join(", ") : "none"}`}
                </Text>
                <Toolbar
                  label={ko ? "복원 결과 작업" : "Reconstruction actions"}
                >
                  <Button size="small" onClick={() => download("ply")}>
                    Export PLY
                  </Button>
                  <Button size="small" onClick={() => download("json")}>
                    Export JSON
                  </Button>
                  <details>
                    <summary>
                      {ko ? "GPU 실행 단계" : "GPU execution stages"}
                    </summary>
                    <pre>{JSON.stringify(stages, null, 2)}</pre>
                  </details>
                </Toolbar>
              </div>
            </>
          )}
        </Panel>
        <video ref={videoRef} muted playsInline hidden />
        <canvas ref={canvasRef} hidden />
        <Text type="secondary">
          {ko
            ? "영상은 네트워크로 전송되지 않습니다. 복원 결과는 재현 가능성을 위해 다운로드할 수 있습니다."
            : "Video is not sent over the network. The reconstruction stays available locally for inspection."}
        </Text>
      </div>
    </ThemeProvider>
  );
}
