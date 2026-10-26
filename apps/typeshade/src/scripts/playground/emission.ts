import { packModule } from '../../../vendor/shader-dsl/src/index.ts';
import type { emitModule } from '../../../vendor/shader-dsl/src/core/backends/wgsl.ts';
import {
  emitGlslStages,
  type GlslEmitOptions,
} from '../../../vendor/shader-dsl/src/core/backends/glsl.ts';
import type { EmitOptions } from '../../../vendor/shader-dsl/src/core/emit.ts';
import type { ModuleDecl } from '../../../vendor/shader-dsl/src/core/ir/nodes.ts';
import { minify, obfuscate } from '../../../vendor/shader-dsl/src/emit-prod.ts';
import type { EmitChoice } from './contracts.ts';
// ── The emit options ───────────────────────────────────────────────────────────────────────

/** The options both backends share. `minify` and `obfuscate` are plugins, so they ride in
 *  `plugins`. `obfuscate()` is the compiler's own preset and expands to four plugins, the
 *  last of them a `minify({ numbers: 'f32' })`; the reader's own minify follows it, because
 *  the text-stage hooks run in array order and the reader's number mode is the one they
 *  chose. Running minify twice changes nothing the first run did not already do. */
export const sharedEmitOptions = (choice: EmitChoice): EmitOptions => {
  const plugins = [
    ...(choice.obfuscate ? obfuscate() : []),
    ...(choice.minify ? [minify({ numbers: choice.numbers })] : []),
  ];
  return {
    parens: choice.parens,
    fp64Flavor: choice.fp64Flavor,
    ...(plugins.length > 0 ? { plugins } : {}),
  };
};

/** WGSL at the chosen level. `emitModuleAt` takes a level and no other options, and
 *  `emitModule` takes the options at O2, so O0 and O1 reach the compiler with the level
 *  alone. The note under the options bar says so where a reader can see it. */
export const programManifest = (module: ModuleDecl, choice: EmitChoice, console = false) =>
  packModule(module, {
    console,
    emit:
      choice.level === 'O2'
        ? { ...sharedEmitOptions(choice), level: choice.level }
        : { level: choice.level },
  });
export const emitWgsl = (module: Parameters<typeof emitModule>[0], choice: EmitChoice): string =>
  programManifest(module, choice).wgsl;

/** Both GLSL stages. The GLSL backend fixes its own optimizer at a fixpoint, so it takes the
 *  options and no level. */
export const emitGlsl = (
  module: Parameters<typeof emitGlslStages>[0],
  choice: EmitChoice,
  overrideValues?: Readonly<Record<string, number>>,
): { vertex: string; fragment: string } | { failed: string } => {
  // An override the reader moved is pinned as a hard `#define`; one left at its default keeps
  // the `#ifndef` guard the emit writes, so an untouched module emits the bytes it always did.
  const options: GlslEmitOptions = {
    ...sharedEmitOptions(choice),
    floatPrecision: choice.floatPrecision,
    ...(overrideValues ? { overrideValues } : {}),
  };
  try {
    return emitGlslStages(module, options);
  } catch (error) {
    // A module the GLSL backend cannot express at all, a uniform scalar among them. The
    // reason is kept, since WebGL2 has to say why it has nothing to run.
    return { failed: error instanceof Error ? error.message : String(error) };
  }
};
