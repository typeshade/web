import type { DatasetInfo, LoadedDataset } from "./datasets";
import type {
  ModelSpec,
  Device,
  RunConfig,
  RunResult,
  StepInfo,
} from "./train";
import type {
  DevicePlan,
  GraphSnapshot,
  Module,
  DeviceDataset,
  Residency,
} from "../vendor/typenn/index.js";

export type Locale = "en" | "ko";

export type Words = typeof import("./copy").text.en;

export type GraphKind = "forward" | "step";

export interface GraphTab {
  readonly title: string;
  readonly snapshot: GraphSnapshot | null;
  readonly plan: DevicePlan | undefined;
}

export interface Session {
  /** Names the run that trained the model. The Try section is keyed by it. */
  readonly runId: string;
  readonly model: Module;
  readonly device: Device;
  readonly data: LoadedDataset;
  readonly spec: ModelSpec;
  readonly scale: { mean: number; std: number } | undefined;
  readonly result: RunResult;
  /** The device dataset of the run that trained the model. Disposed when the session ends. */
  readonly dataset?: DeviceDataset;
}

export interface ResidencyState {
  readonly id: string;
  readonly residency: Residency;
  readonly bytes: number;
}

export interface SavedModel {
  readonly runId: string;
  readonly config: RunConfig;
  readonly spec: ModelSpec;
  /** The trainable parameters in the order of model.parameters(). */
  readonly params: readonly Float32Array[];
  readonly scale: { mean: number; std: number } | undefined;
  readonly result: RunResult;
}

export interface Progress extends StepInfo {
  readonly totalSteps: number;
  readonly done: number;
  readonly epochs: number;
}

export interface LabApi {
  ready: Promise<void>;
  datasets(): Promise<DatasetInfo[]>;
  run(config: Partial<RunConfig> & { dataset: string }): Promise<RunResult>;
  stop(): void;
  readonly results: RunResult[];
}
