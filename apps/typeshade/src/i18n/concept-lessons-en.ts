export interface ConceptLesson {
  meaning: string;
  use: string;
  example: string;
  caveat: string;
}

export const conceptLessonLabels = {
  use: 'When it helps',
  example: 'Worked example',
  caveat: 'Practical limits',
  reasoning: 'Example reasoning',
  availability: 'API availability check',
  result: 'Result',
  wgsl: 'WGSL',
  glsl: 'GLSL ES',
};

export const conceptLessons = {
  bridge: {
    meaning:
      'TypeScript host code prepares data and submits work through a browser GPU API. A shader describes the calculation each GPU invocation performs.',
    use: 'Use this split to decide where an operation belongs. The host handles application state and resource setup; shaders process the data made available to their stage.',
    example:
      'The host supplies an input array and a gain. Each shader invocation reads its own input element and writes the scaled value to a separate output element.',
    caveat:
      'TypeScript types check host code but do not submit GPU work. A shader still needs a compatible entry point, bound resources, and a draw or dispatch.',
  },
  cpuAndGpu: {
    meaning:
      'The CPU runs host code that prepares data and submits GPU commands. Each GPU invocation executes a shader entry point with local values and access to declared resources.',
    use: 'Independent element updates are a useful starting point. Give each invocation an index and an output location that it owns.',
    example:
      'Round the element count up to whole workgroups. The last workgroup includes extra invocations, so guard array access with the actual element count.',
    caveat:
      'Invocation order is not a coordination mechanism. Shared writes need a race-free algorithm, suitable atomics, or the synchronization allowed by the API. A workgroup barrier does not join separate workgroups.',
  },
  pipeline: {
    meaning:
      'A render pipeline transforms vertex data into candidate fragments and applies tests and output operations. A compute pipeline dispatches shader invocations directly to process resources.',
    use: 'Choose the stage from the job: place geometry in the vertex stage, shade covered locations in the fragment stage, or update indexed data in compute.',
    example:
      'Assume equal clip-space w at the triangle vertices. Interpolating their colours with the displayed weights gives a weighted colour at the fragment.',
    caveat:
      'Perspective interpolation generally depends on clip-space w. A fragment can also be discarded or fail depth and stencil tests, so running a fragment shader does not guarantee a stored pixel.',
  },
  webgpuAndWebgl2: {
    meaning:
      'WebGPU and WebGL 2 are browser APIs for GPU work. WebGPU exposes render and compute pipelines; WebGL 2 exposes a graphics pipeline based on OpenGL ES.',
    use: 'Choose from the operations your application needs and the devices you support. Native compute and storage-buffer atomics call for a suitable compute API. Existing GLSL rendering may fit WebGL 2.',
    example:
      'Check whether an adapter or context is available. If the WebGPU adapter is absent, a WebGL 2 path is useful only when its graphics operations can implement the workload.',
    caveat:
      'A successful availability check does not establish every feature, limit, or texture format you need. Handle device creation failures and test each backend on target devices. API choice alone does not predict performance.',
  },
  wgslAndGlsl: {
    meaning:
      'WGSL and GLSL are shader languages. In browser applications, WebGPU uses WGSL, while WebGL uses GLSL ES. Shader source describes a calculation within the API execution model.',
    use: 'Use the language accepted by the chosen API. When porting a shader, compare types and expressions together with entry-point inputs, outputs, and resource bindings.',
    example:
      'Both local expressions interpolate between the same scalar endpoints with the same weight. The result agrees even though the variable declarations use different syntax.',
    caveat:
      'Porting also requires checking buffer layouts, coordinate conventions, interpolation, and precision. GLSL ES default precision depends on the shader stage; WGSL follows its own type and accuracy rules.',
  },
} satisfies Record<string, ConceptLesson>;
