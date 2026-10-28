/** Worked models use explicit fixtures, not GPU execution. Their inputs and assumptions
 * are rendered beside each result. The compiler reference below retains exact overloads. */
export interface OperationCase {
  input: string;
  output: string;
  before?: string;
  after?: string;
  word?: number;
  grid?: readonly (readonly (number | boolean)[])[];
  selected?: readonly [number, number];
}
export interface OperationModel {
  setup?: string;
  cases: readonly OperationCase[];
  related: readonly string[];
}
const show = (v: unknown): string => JSON.stringify(v);
const number = (v: number): string => Number(v.toPrecision(7)).toString();
const hex = (v: number): string => `0x${(v >>> 0).toString(16).padStart(8, '0')}`;
const baseGrid = [
  [0.75, 1],
  [0, 0.25],
];
const cases = (inputs: readonly string[], outputs: readonly string[]): OperationCase[] =>
  inputs.map((input, i) => ({ input, output: outputs[i] }));
const atomicNames = [
  'atomicLoad',
  'atomicStore',
  'atomicAdd',
  'atomicSub',
  'atomicMin',
  'atomicMax',
  'atomicAnd',
  'atomicOr',
  'atomicXor',
  'atomicExchange',
  'atomicCompareExchangeWeak',
];
const textureNames = [
  'textureSample',
  'textureLoad',
  'textureSampleLevel',
  'textureSampleBias',
  'textureSampleGrad',
  'textureGather',
  'textureSampleCompare',
  'textureSampleCompareLevel',
  'textureGatherCompare',
  'textureStore',
  'textureDimensions',
  'textureNumLayers',
  'textureNumSamples',
];
const bitNames = [
  'countOneBits',
  'reverseBits',
  'countLeadingZeros',
  'countTrailingZeros',
  'firstLeadingBit',
  'firstTrailingBit',
  'extractBits',
  'insertBits',
];
const bits = (x: number) => (x >>> 0).toString(2).padStart(32, '0');
export { bits as modelBits };

export function operationModel(name: string): OperationModel | undefined {
  if (atomicNames.includes(name)) {
    const state = [5, 0, 0xffffffff];
    const operands = [3, 1, 1];
    return {
      setup: 'location: atomic<u32>',
      cases: state.map((old, i) => {
        const v = operands[i];
        if (name === 'atomicCompareExchangeWeak') {
          const expected = i === 1 ? 1 : old;
          const output =
            expected === old
              ? `({ old_value: ${old}, exchanged: true }, stored = ${v})\n({ old_value: ${old}, exchanged: false }, stored = ${old})`
              : `({ old_value: ${old}, exchanged: false }, stored = ${old})`;
          return { input: `${name}(location, ${expected}, ${v})`, output, before: show(old) };
        }
        const next: Record<string, number> = {
          atomicLoad: old,
          atomicStore: v,
          atomicAdd: (old + v) >>> 0,
          atomicSub: (old - v) >>> 0,
          atomicMin: Math.min(old, v),
          atomicMax: Math.max(old, v),
          atomicAnd: (old & v) >>> 0,
          atomicOr: (old | v) >>> 0,
          atomicXor: (old ^ v) >>> 0,
          atomicExchange: v,
        };
        return {
          input: `${name}(location${name === 'atomicLoad' ? '' : `, ${v}`})`,
          output: name === 'atomicStore' ? 'void' : show(old),
          before: show(old),
          after: show(next[name]),
        };
      }),
      related: atomicNames.filter((x) => x !== name).slice(0, 5),
    };
  }
  if (textureNames.includes(name)) {
    const related = textureNames.filter((x) => x !== name).slice(0, 5);
    if (name === 'textureDimensions')
      return {
        cases: cases(
          ['texture_2d: 8 × 4', 'texture_3d: 8 × 4 × 2', 'texture_cube: 4 × 4 × 6'],
          ['vec2u(8, 4)', 'vec3u(8, 4, 2)', 'vec2u(4, 4)'],
        ),
        related,
      };
    if (name === 'textureNumLayers')
      return {
        cases: cases(
          [
            'texture_2d_array: layers = 1',
            'texture_2d_array: layers = 4',
            'texture_cube_array: cubes = 3',
          ],
          ['1', '4', '3'],
        ),
        related,
      };
    if (name === 'textureNumSamples')
      return {
        cases: cases(
          [
            'texture_multisampled_2d: 8 × 8; samples = 4',
            'texture_multisampled_2d: 64 × 32; samples = 4',
            'texture_depth_multisampled_2d: 8 × 8; samples = 4',
          ],
          ['4', '4', '4'],
        ),
        related,
      };
    if (name === 'textureStore')
      return {
        setup: 'texture_storage_2d<"r32float", "write">; value = vec4(0.5, 0, 0, 1)',
        cases: [
          [0, 0],
          [1, 0],
          [1, 1],
        ].map(([x, y]) => {
          const grid = baseGrid.map((r) => [...r]);
          grid[1 - y][x] = 0.5;
          return {
            input: `textureStore(tex, vec2i(${x}, ${y}), value)`,
            output: 'void',
            before: show(baseGrid[1 - y][x]),
            after: '0.5',
            grid,
            selected: [x, 1 - y] as const,
          };
        }),
        related,
      };
    if (name === 'textureLoad')
      return {
        setup: 'texture_2d<f32>; level = 0',
        cases: [
          [0, 0],
          [1, 0],
          [1, 1],
        ].map(([x, y]) => ({
          input: `textureLoad(tex, vec2i(${x}, ${y}), 0).r`,
          output: show(baseGrid[1 - y][x]),
          grid: baseGrid,
          selected: [x, 1 - y] as const,
        })),
        related,
      };
    if (name === 'textureGather')
      return {
        setup: 'channel = 0; uv = vec2(0.5, 0.5); level = 0',
        cases: [
          baseGrid,
          [
            [1, 0],
            [0, 1],
          ],
          [
            [0.5, 0.5],
            [0.5, 0.5],
          ],
        ].map((grid) => ({
          input: 'textureGather(0, tex, smp, uv)',
          output: `vec4(${[grid[0][0], grid[0][1], grid[1][1], grid[1][0]].join(', ')})`,
          grid,
        })),
        related,
      };
    if (name.includes('Compare'))
      return {
        setup:
          'depth = [[0.75, 1], [0, 0.25]]; compare = less-equal; filter = linear; level = 0; uv = vec2(0.5, 0.5)',
        cases: [0.2, 0.5, 0.8].map((ref) => {
          const pass = baseGrid.map((row) => row.map((d) => ref <= d));
          return {
            input: `${name}(tex, smp, uv, ${ref})`,
            output: name.includes('Gather')
              ? `vec4(${[pass[0][0], pass[0][1], pass[1][1], pass[1][0]].map(Number).join(', ')})`
              : number(pass.flat().filter(Boolean).length / 4),
            grid: pass,
          };
        }),
        related,
      };
    if (name === 'textureSample')
      return {
        setup: 'filter = linear; address = clamp-to-edge; level = 0',
        cases: cases(
          ['uv = vec2(0.25, 0.25)', 'uv = vec2(0.5, 0.5)', 'uv = vec2(0.75, 0.75)'],
          ['0', '0.5', '1'],
        ).map((c, i) => ({
          ...c,
          grid: baseGrid,
          selected: i === 0 ? [0, 1] : i === 2 ? [1, 0] : undefined,
        })),
        related,
      };
    const inputs =
      name === 'textureSampleLevel'
        ? ['level = 0', 'level = 1', 'level = 0; uv = vec2(0.75, 0.75)']
        : name === 'textureSampleBias'
          ? ['implicit = 0; bias = 0', 'implicit = 0; bias = 1', 'implicit = 0; bias = -1']
          : [
              'ddx = vec2(0.5, 0); ddy = vec2(0, 0.5)',
              'ddx = vec2(1, 0); ddy = vec2(0, 1)',
              'ddx = vec2(0.25, 0); ddy = vec2(0, 0.25)',
            ];
    return {
      setup: 'uv = vec2(0.25, 0.25); filter = linear; mip = nearest; levels = [2 × 2, 1 × 1]',
      cases: cases(
        inputs,
        name === 'textureSampleLevel' ? ['0', '0.5', '1'] : ['0', '0.5', '0'],
      ).map((c, i) => ({ ...c, grid: i === 1 ? [[0.5]] : baseGrid })),
      related,
    };
  }
  if (bitNames.includes(name))
    return {
      setup: 'e: u32; offset = 4; count = 4; newbits = 3',
      cases: [0, 16, 181].map((x) => {
        const binary = bits(x);
        const result: Record<string, number> = {
          countOneBits: [...binary].filter((b) => b === '1').length,
          reverseBits: parseInt([...binary].reverse().join(''), 2) >>> 0,
          countLeadingZeros: Math.clz32(x),
          countTrailingZeros: x === 0 ? 32 : 31 - Math.clz32((x & -x) >>> 0),
          firstLeadingBit: x === 0 ? 0xffffffff : 31 - Math.clz32(x),
          firstTrailingBit: x === 0 ? 0xffffffff : 31 - Math.clz32((x & -x) >>> 0),
          extractBits: (x >>> 4) & 15,
          insertBits: ((x & ~240) | (3 << 4)) >>> 0,
        };
        const v = result[name];
        return {
          input: `${name}(${x}${name === 'insertBits' ? ', 3, 4, 4' : name === 'extractBits' ? ', 4, 4' : ''})`,
          output: `${v} = ${hex(v)}`,
          word: x,
        };
      }),
      related: bitNames.filter((x) => x !== name).slice(0, 4),
    };
  if (/^(un)?pack/.test(name)) return packingModel(name);
  if (name === 'dot4U8Packed' || name === 'dot4I8Packed') {
    const signed = name === 'dot4I8Packed';
    const samples = signed
      ? [
          [
            [-1, 2, -3, 4],
            [4, -3, 2, -1],
          ],
          [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
          ],
          [
            [-2, -2, -2, -2],
            [-2, -2, -2, -2],
          ],
        ]
      : [
          [
            [1, 2, 3, 4],
            [4, 3, 2, 1],
          ],
          [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
          ],
          [
            [2, 2, 2, 2],
            [2, 2, 2, 2],
          ],
        ];
    return {
      cases: samples.map(([a, b]) => ({
        input: `a = ${show(a)}; b = ${show(b)}`,
        output: `${a.map((v, i) => `(${v} × ${b[i]})`).join(' + ')} = ${a.reduce((s, v, i) => s + v * b[i], 0)}`,
      })),
      related: [signed ? 'unpack4xI8' : 'unpack4xU8', signed ? 'pack4xI8' : 'pack4xU8', 'dot'],
    };
  }
  if (/^(dpd[xy]|fwidth)(Coarse|Fine)?$/.test(name))
    return {
      setup: 'f(px, py) = a × px + b × py + c',
      cases: [
        [0, 0, 5],
        [0.25, 0, 0],
        [0.25, -0.5, 1],
      ].map(([a, b, c]) => ({
        input: `a = ${a}; b = ${b}; c = ${c}`,
        output: show(
          name.startsWith('dpdx') ? a : name.startsWith('dpdy') ? b : Math.abs(a) + Math.abs(b),
        ),
        grid: [
          [c, c + a],
          [c + b, c + a + b],
        ],
      })),
      related: ['dpdx', 'dpdy', 'fwidth'].filter((x) => x !== name),
    };
  if (
    ['workgroupBarrier', 'storageBarrier', 'textureBarrier', 'workgroupUniformLoad'].includes(name)
  )
    return {
      setup: 'A, B ∈ workgroup W; C ∈ workgroup V; W ≠ V',
      cases:
        name === 'workgroupUniformLoad'
          ? cases(
              [
                'W: write(value = 7) → workgroupUniformLoad(value)',
                'W: write(value = 0) → workgroupUniformLoad(value)',
                'W: value = 7; V: value = 3',
              ],
              ['W: [7, 7]', 'W: [0, 0]', 'W: [7, 7]; V: [3, 3]'],
            )
          : cases(
              [
                `W: A.write → ${name}() → B.read`,
                `W: A.write → ${name}() → A.read`,
                `W.${name}(); V.${name}()`,
              ],
              ['A.write ≺ B.read', 'A.write ≺ A.read', 'scope(W) ≠ scope(V)'],
            ),
      related: [
        'workgroupBarrier',
        'storageBarrier',
        'textureBarrier',
        'workgroupUniformLoad',
      ].filter((x) => x !== name),
    };
  const matrix = /^mat([234])(?:x([234]))?f?$/.exec(name);
  if (matrix) {
    const columns = Number(matrix[1]),
      rows = Number(matrix[2] ?? matrix[1]);
    return {
      cases: [0, 1, 2].map((mode) => {
        const grid = Array.from({ length: rows }, (_, r) =>
          Array.from({ length: columns }, (_, c) =>
            mode === 0 ? 0 : mode === 1 ? c * rows + r + 1 : Number(r === c),
          ),
        );
        const values = Array.from({ length: columns }, (_, c) => grid.map((row) => row[c])).flat();
        return {
          input: mode === 0 ? `${name}()` : `${name}(${values.map((v) => `${v}.`).join(', ')})`,
          output: show(grid),
          grid,
        };
      }),
      related: ['transpose', 'determinant', `vec${rows}`],
    };
  }
  const vector = /^vec([234])(f64|[fiub])?$/.exec(name);
  if (vector) {
    const size = Number(vector[1]),
      kind = vector[2] ?? 'f';
    const value = (n: number): number | boolean => (kind === 'b' ? n !== 0 : n);
    const literal = (n: number) =>
      kind === 'b'
        ? show(value(n))
        : kind === 'i' || kind === 'u' || kind === 'f64'
          ? `${kind === 'i' ? 'i32' : kind === 'u' ? 'u32' : 'f64'}(${n}.)`
          : `${n}.`;
    return {
      cases: [1, 2, 0].map((mode) => {
        const values = Array.from({ length: size }, (_, i) => value(mode === 2 ? i + 1 : mode));
        return {
          input:
            mode === 2
              ? `${name}(${Array.from({ length: size }, (_, i) => literal(i + 1)).join(', ')})`
              : `${name}(${literal(mode)})`,
          output: show(values),
          grid: [values],
        };
      }),
      related: ['length', 'normalize', 'dot'],
    };
  }
  const fixed: Record<string, OperationModel> = {
    reflect: {
      setup: 'n = vec3(0, 1, 0)',
      cases: cases(
        ['i = vec3(0.6, -0.8, 0)', 'i = vec3(1, 0, 0)', 'i = vec3(0, -1, 0)'],
        ['vec3(0.6, 0.8, 0)', 'vec3(1, 0, 0)', 'vec3(0, 1, 0)'],
      ),
      related: ['refract', 'dot', 'normalize'],
    },
    refract: {
      setup: 'i = vec3(0.6, -0.8, 0); n = vec3(0, 1, 0)',
      cases: [1, 0.5, 2].map((eta) => {
        const k = 1 - eta * eta * (1 - 0.8 * 0.8);
        return {
          input: `refract(i, n, ${eta})`,
          output:
            k < 0 ? 'vec3(0, 0, 0)' : `vec3(${number(eta * 0.6)}, ${number(-Math.sqrt(k))}, 0)`,
        };
      }),
      related: ['reflect', 'normalize', 'dot'],
    },
    faceForward: {
      setup: 'n = nref = vec3(0, 1, 0)',
      cases: cases(
        ['i = vec3(0, -1, 0)', 'i = vec3(0, 1, 0)', 'i = vec3(1, 0, 0)'],
        ['vec3(0, 1, 0)', 'vec3(0, -1, 0)', 'vec3(0, -1, 0)'],
      ),
      related: ['dot', 'reflect', 'normalize'],
    },
    cross: {
      cases: cases(
        [
          'cross(vec3(1, 0, 0), vec3(0, 1, 0))',
          'cross(vec3(0, 1, 0), vec3(1, 0, 0))',
          'cross(vec3(1, 0, 0), vec3(2, 0, 0))',
        ],
        ['vec3(0, 0, 1)', 'vec3(0, 0, -1)', 'vec3(0, 0, 0)'],
      ),
      related: ['dot', 'length', 'normalize'],
    },
    transpose: {
      cases: [0, 1, 2].map((k) => {
        const grid = Array.from({ length: 4 }, (_, r) =>
          Array.from({ length: 4 }, (_, c) =>
            k === 0 ? c * 4 + r + 1 : k === 1 ? Number(r === c) : 0,
          ),
        );
        const output = grid[0].map((_, c) => grid.map((row) => row[c]));
        return {
          input: `M = ${show(grid)}`,
          output: `transpose(M) = ${show(output)}`,
          grid: output,
        };
      }),
      related: ['mat4', 'determinant'],
    },
    determinant: {
      cases: [
        [2, 3, 4, 1],
        [-1, 1, 1, 1],
        [1, 0, 1, 1],
      ].map((diag) => ({
        input: `M = diag(${diag.join(', ')})`,
        output: `determinant(M) = ${diag.reduce((a, b) => a * b, 1)}`,
        grid: diag.map((v, r) => diag.map((_, c) => (r === c ? v : 0))),
      })),
      related: ['transpose', 'mat4'],
    },
    any: {
      cases: [
        [false, false],
        [false, true],
        [true, true],
      ].map((v) => ({
        input: `any(vec2b(${v.join(', ')}))`,
        output: show(v.some(Boolean)),
        grid: [v],
      })),
      related: ['all', 'none', 'select'],
    },
    all: {
      cases: [
        [false, false],
        [false, true],
        [true, true],
      ].map((v) => ({
        input: `all(vec2b(${v.join(', ')}))`,
        output: show(v.every(Boolean)),
        grid: [v],
      })),
      related: ['any', 'none', 'select'],
    },
    none: {
      cases: [
        [1, 2, 3],
        [-1, 2, 3],
        [-1, -2, -3],
      ].map((v) => ({
        input: `none(array(${v.join(', ')}), (x) => x < 0)`,
        output: show(!v.some((x) => x < 0)),
        grid: [v],
      })),
      related: ['any', 'all'],
    },
    sum: {
      cases: [
        [1, 2, 3],
        [-1, 0, 1],
        [0, 0, 0],
      ].map((v) => ({
        input: `sum(array(${v.join(', ')}))`,
        output: show(v.reduce((a, b) => a + b, 0)),
        grid: [v],
      })),
      related: ['zip', 'array'],
    },
    zip: {
      setup: 'xs = array(1, 2, 3)',
      cases: [
        [4, 5, 6],
        [0, 0, 0],
        [-1, -1, -1],
      ].map((v) => ({
        input: `zip(xs, array(${v.join(', ')}), (a, b) => a * b)`,
        output: show(v.map((x, i) => x * (i + 1))),
        grid: [v.map((x, i) => x * (i + 1))],
      })),
      related: ['sum', 'array'],
    },
    select: {
      cases: cases(
        [
          'select(10, 20, false)',
          'select(10, 20, true)',
          'select(vec2(10, 10), vec2(20, 20), vec2b(true, false))',
        ],
        ['10', '20', 'vec2(20, 10)'],
      ),
      related: ['any', 'all', 'bool'],
    },
    bool: {
      cases: [-1, 0, 0.25].map((x) => ({ input: `bool(${x})`, output: show(x !== 0) })),
      related: ['select', 'i32', 'u32'],
    },
    f32: {
      cases: [0.1, 16777216, 16777217].map((x) => ({
        input: `f32(${x})`,
        output: show(Math.fround(x)),
      })),
      related: ['f64', 'quantizeToF16', 'bitcast'],
    },
    i32: {
      cases: [-1.9, 0, 1.9].map((x) => ({ input: `i32(${x})`, output: show(Math.trunc(x)) })),
      related: ['u32', 'trunc', 'bitcast'],
    },
    u32: {
      cases: [0, 1.9, 100.5].map((x) => ({ input: `u32(${x})`, output: show(Math.trunc(x)) })),
      related: ['i32', 'trunc', 'bitcast'],
    },
    f64: {
      cases: [0.1, 1.5, 16777217].map((x) => ({
        input: `f64(f32(${x}))`,
        output: show(Math.fround(x)),
      })),
      related: ['f32', 'vec2f64'],
    },
    bitcast: {
      cases: [0, 1, -2].map((x) => {
        const data = new DataView(new ArrayBuffer(4));
        data.setFloat32(0, x);
        const word = data.getUint32(0);
        return { input: `bitcast<u32>(${x}.)`, output: hex(word), word };
      }),
      related: ['f32', 'u32', 'pack2x16float'],
    },
    random: {
      cases: [0, 1, 2].map((x) => {
        const s = Math.sin(x * 12.9898) * 43758.5453123;
        return {
          input: `fract(sin(${x} × 12.9898) × 43758.5453123)`,
          output: number(s - Math.floor(s)),
        };
      }),
      related: ['fract', 'sin'],
    },
    quantizeToF16: {
      cases: cases(
        ['quantizeToF16(1.0001)', 'quantizeToF16(1.0007)', 'quantizeToF16(0.5)'],
        ['1', '1.0009765625', '0.5'],
      ),
      related: ['f32', 'pack2x16float', 'unpack2x16float'],
    },
    array: {
      cases: cases(
        ['array(1., 2., 3.)', 'array<f32, 3>()', 'array(vec2(1., 0.), vec2(0., 1.))'],
        ['[1, 2, 3]', '[0, 0, 0]', '[[1, 0], [0, 1]]'],
      ),
      related: ['fill', 'sum', 'zip'],
    },
    fill: {
      cases: cases(
        ['fill<f32, 3>(0.)', 'fill<f32, 3>(2.)', 'fill<vec2, 2>(vec2(1., 2.))'],
        ['[0, 0, 0]', '[2, 2, 2]', '[[1, 2], [1, 2]]'],
      ),
      related: ['array', 'sum'],
    },
    uniform: {
      setup: 'class Params { scale: f32; }\ndeclare const u: uniform<Params>;',
      cases: cases(
        [
          'host: u.scale = 1; shader: u.scale',
          'host: u.scale = 2; shader: u.scale',
          'host: u.scale = 0; shader: u.scale',
        ],
        ['1', '2', '0'],
      ),
      related: ['storage', 'array'],
    },
    storage: {
      setup: 'declare const xs: storage<array<f32>, "read_write">;',
      cases: cases(
        [
          'host: xs = [1, 2, 3]; shader: xs[1]',
          'host: xs = [1, 2, 3]; shader: xs[1] = 7',
          'host: xs = [1, 2, 3]; shader: xs[0] = 0',
        ],
        ['2', '[1, 7, 3]', '[0, 2, 3]'],
      ),
      related: ['uniform', 'arrayLength', 'atomicAdd'],
    },
    arrayLength: {
      setup: 'stride = 4 bytes; array offset = 0',
      cases: cases(
        ['binding range = 16 bytes', 'binding range = 32 bytes', 'binding range = 64 bytes'],
        ['4', '8', '16'],
      ),
      related: ['storage', 'array'],
    },
  };
  return fixed[name];
}

function packingModel(name: string): OperationModel {
  const unpack = name.startsWith('unpack'),
    half = name.includes('float');
  const lanes = name.includes('4x') ? 4 : 2;
  const width = 32 / lanes;
  const norm = name.includes('norm'),
    signed = name.includes('snorm') || name.includes('I8');
  const clamp = name.includes('Clamp');
  const max = signed ? 2 ** (width - 1) - 1 : 2 ** width - 1;
  const mask = 2 ** width - 1;
  const inputs = half
    ? [
        [0, 1],
        [-1, 0.5],
        [2, -2],
      ]
    : norm
      ? [
          Array.from({ length: lanes }, (_, i) => (i % 2 === 0 ? (signed ? -1 : 0) : 1)),
          Array(lanes).fill(0),
          Array(lanes).fill(0.25),
        ]
      : [
          Array.from({ length: lanes }, (_, i) => i + 1),
          Array(lanes).fill(signed ? -1 : 255),
          Array(lanes).fill(signed ? 130 : 300),
        ];
  const halfBits = new Map([
    [0, 0],
    [1, 0x3c00],
    [-1, 0xbc00],
    [0.5, 0x3800],
    [2, 0x4000],
    [-2, 0xc000],
  ]);
  return {
    cases: inputs.map((values) => {
      const encoded = values.map((v) =>
        half
          ? halfBits.get(v)!
          : norm
            ? Math.round(Math.max(signed ? -1 : 0, Math.min(1, v)) * max) & mask
            : (clamp ? Math.max(signed ? -128 : 0, Math.min(max, v)) : v) & mask,
      );
      const word = encoded.reduce((acc, x, i) => (acc | (x << (i * width))) >>> 0, 0);
      const decoded = encoded.map((v, i) => {
        if (half) return values[i];
        const integer = signed && v >= 2 ** (width - 1) ? v - 2 ** width : v;
        return norm ? Math.max(-1, integer / max) : integer;
      });
      const vector = `${half || norm ? `vec${lanes}` : signed ? 'vec4i' : 'vec4u'}(${values.join(', ')})`;
      return {
        input: unpack ? `${name}(${hex(word)})` : `${name}(${vector})`,
        output: unpack ? `[${decoded.map(number).join(', ')}]` : hex(word),
        word,
        grid: [unpack ? decoded : values],
      };
    }),
    related: [
      unpack ? name.replace('unpack', 'pack') : name.replace('pack', 'unpack').replace('Clamp', ''),
      'bitcast',
    ].filter((x) => x !== name),
  };
}
