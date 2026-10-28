// Runtime values and control types shared by live samples and the Playground.
// Compilation, reflection and control generation live in live-shader-compile-contract.ts
// so readers who only view a figure do not download those functions.
import type { ShaderLayout } from './shader-runtime.ts';

/** What the runtime writes into a reserved field. `seconds` is the shader clock, `width` and
 *  `height` the drawing buffer in device pixels, `pointer` the 0 to 1 pointer position, and
 *  `clock` the frame count and the step since the frame before. */
export function reservedValue(
  field: string,
  seconds: number,
  width: number,
  height: number,
  pointer: readonly [number, number],
  clock: { readonly frame: number; readonly delta: number } = { frame: 0, delta: 0 },
): readonly number[] | null {
  if (field === 'time') return [seconds];
  if (field === 'resolution') return [width, height];
  if (field === 'mouse') return [pointer[0], pointer[1]];
  if (field === 'frame') return [clock.frame];
  if (field === 'timeDelta') return [clock.delta];
  if (field === 'plotCenter') return [0, 0];
  if (field === 'plotSpan') return [1, 1];
  if (field === 'plotRotation') return [0.65, 0.45];
  if (field === 'plotBlend') return [0];
  return null;
}

export const isPlotLayout = (layout: Pick<ShaderLayout, 'fields'>): boolean =>
  layout.fields.some((f) => f.name === 'plotCenter' && f.type === 'vec2<f32>') &&
  layout.fields.some((f) => f.name === 'plotSpan' && f.type === 'vec2<f32>');

/** CSS-pixel defaults for the low-level TypePlot renderer. The library owns the shaders. */
export function plotUniformValue(
  name: string,
  rotation: readonly number[] = [0.65, 0.45],
  bounds: readonly number[] = [-0.5, 0.5],
): readonly number[] | null {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  if (['model', 'inverseModel', 'axesModel', 'inverseAxesModel'].includes(name)) return identity;
  const yaw = Math.fround(rotation[0] ?? 0.65),
    pitch = Math.fround(rotation[1] ?? 0.45);
  switch (name) {
    case 'rotationBasis':
      return [Math.sin(yaw), Math.cos(yaw), Math.sin(pitch), Math.cos(pitch)];
    case 'plotPan':
      return [0, 0];
    case 'appearance':
      return [1, 1, 2, 11];
    case 'decorations':
      return [7];
    case 'labelStyle':
      return [1, 0.8, 0, 0];
    case 'decorationOpacity':
      return [1, 1, 1];
    case 'sceneOpacity':
      return [1, 1];
    case 'cameraLens':
      return [Math.tan(Math.PI / 8), 3];
    case 'plotCenterZ':
    case 'parameterFocusSeed':
    case 'surfaceDomainMode':
    case 'surfaceFlags':
      return [0];
    case 'parameterBounds':
      return [...bounds];
    case 'parameterMode':
      return [3];
    case 'curveQuality':
      return [128, 5];
    case 'curvePattern':
      return [0, 0.2, 0, 0.55];
    case 'curveTiles':
      return [0, 0, 16, 0];
    case 'surfaceBounds':
      return [-1, 1, -1, 1];
    case 'surfaceRange':
    case 'surfaceHeight':
      return [-1, 1];
    case 'surfaceDepth':
      return [0.001, 12];
    case 'surfaceRender':
      return [128, 6, 1, 1];
    default:
      return null;
  }
}

/** How one uniform field is shown. A `vec2<f32>` is a two-axis pad, a `vec3<f32>` or
 *  `vec4<f32>` the author marks as a colour is a colour picker, and the rest are one row
 *  each: a slider for a float, a stepper for an integer, a checkbox for a flag. */
export type ControlKind = 'slider' | 'stepper' | 'checkbox' | 'pad' | 'color';

/** The range, step, default and label a page gives one field. Every part is optional; what
 *  is left out comes from DEFAULTS. A vector field takes one number for every component, or
 *  one number for all of them. */
export interface ControlProp {
  /** The name the page prints beside the field name, from the dictionaries. */
  readonly label?: string;
  readonly min?: number | readonly number[];
  readonly max?: number | readonly number[];
  readonly step?: number | readonly number[];
  readonly value?: number | boolean | readonly number[];
  /** Show a `vec3<f32>` or `vec4<f32>` as a colour picker over 0 to 1 per channel. */
  readonly color?: boolean;
  /** Show a `u32` or `i32` as a checkbox that writes 1 or 0. WGSL has no `bool` in a uniform
   *  block, so this is how a live sample carries a flag. */
  readonly toggle?: boolean;
}

export type ControlProps = Readonly<Record<string, ControlProp>>;

/** One control on the page, and where it writes. `offset` is the field's std140 byte offset
 *  as `reflect()` reported it, and `scalar` is how the packer writes those bytes.
 *
 *  A control is only ever as fresh as the reflection it came from. A consumer that writes by
 *  `offset` re-reads the controls after every compile; one that writes by name can keep the
 *  values it has. */
export interface LiveControl {
  readonly field: string;
  readonly kind: ControlKind;
  /** The field's DSL type key, `'f32'` or `'vec3<f32>'`. */
  readonly type: string;
  readonly scalar: 'f32' | 'i32' | 'u32' | 'bool';
  readonly components: number;
  readonly offset: number;
  readonly label?: string;
  readonly min: readonly number[];
  readonly max: readonly number[];
  readonly step: readonly number[];
  readonly value: readonly number[];
}

// ── Packing ─────────────────────────────────────────────────────────────────

/** The current value of every control, keyed by field name. The page owns this object and
 *  the runtime reads it once per frame. */
export type ControlValues = Readonly<Record<string, readonly number[]>>;

/** The starting value of every control, as a page hands it to the runtime. */
export const initialValues = (controls: readonly LiveControl[]): Record<string, number[]> =>
  Object.fromEntries(controls.map((c) => [c.field, [...c.value]]));

/** Hold one number inside its control's range, on its step. A page runs a reader's input
 *  through this, so a typed number cannot write a value outside what the author allowed. */
export function clamp(control: LiveControl, index: number, raw: number): number {
  const min = control.min[index] ?? 0;
  const max = control.max[index] ?? 1;
  const step = control.step[index] ?? 0;
  if (!Number.isFinite(raw)) return min;
  const held = Math.min(max, Math.max(min, raw));
  const stepped = step > 0 ? Math.round((held - min) / step) * step + min : held;
  // A range whose span is not a whole number of steps would otherwise round past its own end.
  const inside = Math.min(max, Math.max(min, stepped));
  return control.scalar === 'f32' ? inside : Math.round(inside);
}
