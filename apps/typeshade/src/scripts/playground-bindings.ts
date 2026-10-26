// The bindings panel: one row for every resource and override the compiled module declares,
// and the control a reader supplies it with. A uniform field gets a slider, a picker or a
// matrix; a texture a picture; a sampler its filter and address mode; a storage buffer the
// pattern it starts from; an override its value.
//
// The panel keeps what the reader set by binding name, field name and type, so an edit that
// keeps a binding keeps its value, the way a live example keeps a control's value across a
// recompile. It hands the runtime plain data (src/lib/shader-bindings.ts) and the CPU oracle
// the same values in its own shape, so both engines draw from one set of numbers.
import type { ModuleDecl, StructDecl } from '../../vendor/shader-dsl/src/core/ir/nodes.ts';
import type { ShaderType } from '../../vendor/shader-dsl/src/core/ir/types.ts';
import { wgslLayout, type Reflection } from '../../vendor/shader-dsl/src/core/reflect.ts';
import {
  isPlotLayout,
  plotUniformValue,
  reservedValue,
  type ControlProp,
  type ControlProps,
} from '../lib/live-shader-contract.ts';
import {
  controlFor,
  isReserved,
  isPlotHostField,
  plotFontResource,
  suggestsColour,
} from '../lib/live-shader-compile-contract.ts';
import {
  componentCount,
  depthRamp,
  fieldShape,
  generateTexels,
  matrixPreset,
  patternValue,
  STORAGE_PATTERNS,
  textureSize,
  triangleVertices,
  type AddressMode,
  type FieldShape,
  type FilterMode,
  type MatrixPreset,
  type ResourceSpec,
  type SampleKind,
  type SamplerSpec,
  type StorageTextureSpec,
  TEXEL_BYTES,
  type StoragePattern,
  type TextureDim,
  type TextureSource,
  type TextureSpec,
  type VertexBufferSpec,
} from '../lib/shader-bindings.ts';
import type { UniformBlockLayout } from '../lib/shader-runtime.ts';

/** The words the panel prints. Read off the Playground's element like the rest of its copy. */
export interface BindingsCopy {
  readonly title: string;
  readonly empty: string;
  readonly runtime: string;
  readonly overrides: string;
  readonly source: string;
  readonly sources: Readonly<Record<TextureSource, string>>;
  readonly dropImage: string;
  readonly passOutput: string;
  readonly depthRamp: string;
  readonly filter: string;
  readonly address: string;
  readonly compare: string;
  readonly preset: string;
  readonly presets: Readonly<Record<MatrixPreset, string>>;
  readonly fill: string;
  readonly elements: string;
  readonly written: string;
  readonly size: string;
  readonly noControl: string;
  readonly hostOwned: string;
  readonly vertices: string;
}

type Binding = Reflection['bindGroups'][number]['entries'][number];

/** One uniform field the panel packs: where it sits and what shape its numbers take. A
 *  field of a nested struct or of an array of structs is one of these per leaf, named by its
 *  path (`key.dir`, `fills[1].colour`), so each gets the control its own type gets. */
interface PackedField {
  readonly name: string;
  readonly type: string;
  readonly offset: number;
  readonly shape: FieldShape;
  /** The last name on the path, which the controls are chosen by: `colour` for
   *  `fills[1].colour`. */
  readonly leaf: string;
  /** Where the value sits in the oracle's value of the binding: struct fields by name,
   *  array elements by index. Empty for a bare value, which is the binding itself. */
  readonly path: readonly (string | number)[];
}

/** One uniform buffer, a struct or a bare value, with its std140 fields. */
interface UniformBlock {
  readonly binding: Binding;
  /** The struct's name for a GLSL block, or '' for a bare value, which GLSL cannot declare. */
  readonly struct: string;
  readonly size: number;
  readonly fields: readonly PackedField[];
  /** True for a bare value: the shader reads the binding itself and not a field of it. */
  readonly bare: boolean;
}

/** One storage buffer, with its element's std430 layout. */
interface StorageBlock {
  readonly binding: Binding;
  readonly type: ShaderType;
  /** Elements in a runtime-sized array, the declared count in a fixed one, one otherwise. */
  readonly runtimeSized: boolean;
  readonly fixedLength: number;
  readonly elem: ShaderType;
  readonly stride: number;
}

// ── std430 and std140 layout of the types a buffer can hold ─────────────────────────────

const roundUp = (n: number, to: number): number => Math.ceil(n / to) * to;

/** Size and alignment of a type under std430, or std140 for `uniform`. */
function layoutOf(
  t: ShaderType,
  structs: ReadonlyMap<string, StructDecl>,
  kind: 'std140' | 'std430',
): { size: number; align: number } {
  switch (t.kind) {
    case 'scalar':
    case 'atomic':
      return { size: 4, align: 4 };
    case 'f64':
      return { size: 8, align: 8 };
    case 'vec':
      return { size: 4 * t.n, align: t.n === 2 ? 8 : 16 };
    case 'mat': {
      const column = t.rows === 2 ? 8 : 16;
      return { size: column * t.cols, align: kind === 'std140' ? 16 : column };
    }
    case 'struct': {
      const decl = structs.get(t.name);
      if (!decl) return { size: 0, align: 4 };
      const l = wgslLayout(decl, kind, structs);
      return { size: l.size, align: l.align };
    }
    case 'array': {
      const inner = layoutOf(t.elem, structs, kind);
      const stride = roundUp(inner.size, kind === 'std140' ? 16 : inner.align);
      return {
        size: stride * (t.size ?? 1),
        align: kind === 'std140' ? roundUp(inner.align, 16) : inner.align,
      };
    }
    default:
      return { size: 0, align: 4 };
  }
}

/** The DSL type key of an IR type, spelled the way reflect() spells a field's type. */
function keyOf(t: ShaderType): string {
  switch (t.kind) {
    case 'scalar':
      return t.scalar;
    case 'f64':
      return 'f64';
    case 'vec':
      return `vec${t.n}<${t.elem}>`;
    case 'mat':
      return `mat${t.cols}x${t.rows}<${t.elem}>`;
    case 'atomic':
      return `atomic<${t.elem}>`;
    case 'struct':
      return t.name;
    case 'array':
      return `array<${keyOf(t.elem)}${t.size ? `, ${t.size}` : ''}>`;
    default:
      return t.kind;
  }
}

/** The scalar numbers of one value of a type, flattened in declaration order, and where each
 *  sits in bytes from the value's own start. Integer and float are told apart so the bytes
 *  are written through the right view. */
interface Slot {
  readonly offset: number;
  readonly scalar: 'f32' | 'i32' | 'u32';
  /** A readable name for the table: the field path and the component. */
  readonly label: string;
}

function slotsOf(
  t: ShaderType,
  structs: ReadonlyMap<string, StructDecl>,
  kind: 'std140' | 'std430',
  base = 0,
  label = '',
): Slot[] {
  switch (t.kind) {
    case 'scalar':
      return [
        { offset: base, scalar: t.scalar === 'bool' ? 'u32' : (t.scalar as Slot['scalar']), label },
      ];
    case 'atomic':
      return [{ offset: base, scalar: t.elem, label }];
    case 'f64':
      return [
        { offset: base, scalar: 'f32', label: `${label}.hi` },
        { offset: base + 4, scalar: 'f32', label: `${label}.lo` },
      ];
    case 'vec': {
      const scalar = t.elem === 'bool' ? 'u32' : t.elem;
      return Array.from({ length: t.n }, (_, i) => ({
        offset: base + i * 4,
        scalar,
        label: `${label}.${'xyzw'[i]}`,
      }));
    }
    case 'mat': {
      const column = t.rows === 2 ? 8 : 16;
      const out: Slot[] = [];
      for (let c = 0; c < t.cols; c++)
        for (let r = 0; r < t.rows; r++)
          out.push({
            offset: base + c * column + r * 4,
            scalar: 'f32',
            label: `${label}[${c}][${r}]`,
          });
      return out;
    }
    case 'struct': {
      const decl = structs.get(t.name);
      if (!decl) return [];
      const l = wgslLayout(decl, kind, structs);
      return decl.fields.flatMap((f, i) =>
        slotsOf(
          f.type,
          structs,
          kind,
          base + l.fields[i]!.offset,
          label ? `${label}.${f.name}` : f.name,
        ),
      );
    }
    default:
      return [];
  }
}

// ── the reader's values, kept across recompiles ─────────────────────────────────────────

interface TextureChoice {
  source: TextureSource;
  solid: number[];
  /** The dropped image, scaled to the texture's size, or undefined until one is dropped. */
  image?: ImageData;
}

interface SamplerChoice {
  filter: FilterMode;
  address: AddressMode;
}

interface StorageChoice {
  pattern: StoragePattern;
  length: number;
}

/** A small palette the vector fields start from, so two colour fields do not begin as the same
 *  grey and a gradient between them is a gradient. */
const START_COLOURS: readonly (readonly number[])[] = [
  [0.96, 0.55, 0.2, 1],
  [0.18, 0.42, 0.86, 1],
  [0.3, 0.75, 0.45, 1],
  [0.85, 0.3, 0.55, 1],
];

const hex = (v: readonly number[]): string =>
  `#${[0, 1, 2]
    .map((i) =>
      Math.round(Math.min(1, Math.max(0, v[i] ?? 0)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
const fromHex = (text: string): number[] =>
  [1, 3, 5].map((i) => parseInt(text.slice(i, i + 2), 16) / 255);

function el(tag: string, className?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function select(
  options: readonly (readonly [string, string])[],
  value: string,
  label: string,
): HTMLSelectElement {
  const node = document.createElement('select');
  for (const [v, text] of options) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = text;
    node.append(o);
  }
  node.value = value;
  node.setAttribute('aria-label', label);
  return node;
}

function numberBox(value: number, label: string, step = 'any'): HTMLInputElement {
  const node = document.createElement('input');
  node.type = 'number';
  node.step = step;
  node.value = String(Number(value.toFixed(4)));
  node.setAttribute('aria-label', label);
  return node;
}

export interface BindingsHooks {
  /** A uniform value moved: the pass that is drawing packs it on its next frame. */
  readonly values: () => void;
  /** A texture, a sampler or a buffer changed: the pass has to be built again. */
  readonly resources: () => void;
  /** An override changed: the program has to be emitted again. */
  readonly overrides: () => void;
}

export class BindingsModel {
  private reflection: Reflection | undefined;
  private module: ModuleDecl | undefined;
  private structs = new Map<string, StructDecl>();
  private uniforms: UniformBlock[] = [];
  private storage: StorageBlock[] = [];
  private samplers: Binding[] = [];
  private textures: Binding[] = [];
  /** Where the panel was last drawn, so a picture dropped on the canvas can redraw it. */
  private host: HTMLElement | undefined;
  /** The passes drawn before the program (compiler change 0026). A texture named like one
   *  reads that pass's output, so the panel binds it there and offers no picture for it. */
  private passes: ReadonlySet<string> = new Set();

  /** The names of the passes the workspace draws before the program, in draw order. */
  setPasses(names: readonly string[]): void {
    this.passes = new Set(names);
  }
  private storageTextures: Binding[] = [];
  /** Bindings the panel has nothing to put in, by name. */
  private unfillable: string[] = [];
  /** Bindings the module marks as the host's, which the panel fills with a stand-in. */
  private hostOwned = new Set<string>();
  /** The vertex entry's `@location` inputs, which read a vertex buffer. */
  private vertexInputs: { name: string; type: string; location: number }[] = [];

  private readonly values = new Map<string, number[]>();
  private readonly textureChoices = new Map<string, TextureChoice>();
  private readonly samplerChoices = new Map<string, SamplerChoice>();
  private readonly storageChoices = new Map<string, StorageChoice>();
  private readonly storageSizes = new Map<string, number>();
  private readonly overrideValues = new Map<string, number>();
  /** Built texels by binding, so a redraw that did not change a texture does not rebuild it. */
  private readonly texelCache = new Map<string, TextureSpec>();
  private readonly cpuImages = new Map<
    string,
    { width: number; height: number; texels: Uint8Array<ArrayBuffer> }
  >();
  private readonly cpuImageLoads = new Map<string, Promise<void>>();

  /** Only CPU consumers decode atlas pixels on the host; GPU-only views upload the image directly. */
  needsCpuResources(): boolean {
    return this.resources(false).some(
      (resource) =>
        resource.kind === 'texture' && resource.imageUrl && !this.cpuImages.has(resource.imageUrl),
    );
  }

  async prepareCpuResources(): Promise<void> {
    await Promise.all(
      this.resources(false).flatMap((resource) => {
        if (
          resource.kind !== 'texture' ||
          !resource.imageUrl ||
          this.cpuImages.has(resource.imageUrl)
        )
          return [];
        const url = resource.imageUrl;
        let pending = this.cpuImageLoads.get(url);
        if (!pending) {
          pending = (async () => {
            const response = await fetch(url);
            if (!response.ok)
              throw new Error(`Cannot load texture '${resource.name}' (${response.status}).`);
            const bitmap = await createImageBitmap(await response.blob(), {
              premultiplyAlpha: 'none',
              colorSpaceConversion: 'none',
            });
            const scratch = document.createElement('canvas');
            try {
              scratch.width = bitmap.width;
              scratch.height = bitmap.height;
              const context = scratch.getContext('2d', { willReadFrequently: true });
              if (!context) throw new Error('Cannot decode the texture pixels.');
              // This canvas decodes a texture asset. All chart graphics remain TypeShade output.
              context.drawImage(bitmap, 0, 0);
              const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height);
              this.cpuImages.set(url, {
                width: bitmap.width,
                height: bitmap.height,
                texels: new Uint8Array(pixels.data.buffer),
              });
            } finally {
              bitmap.close();
              scratch.width = scratch.height = 0;
            }
          })();
          this.cpuImageLoads.set(url, pending);
          void pending.catch(() => this.cpuImageLoads.delete(url));
        }
        return [pending];
      }),
    );
  }

  /** The ranges a live example's link carried, by field name (`setControls`). */
  private linkedProps: ControlProps = {};
  /** Starting values an example brings for the next module read, by field name. */
  private pendingSeed: Readonly<Record<string, readonly number[]>> | undefined;
  /** What the last dispatch wrote, by binding name, for the rows under each buffer. */
  private results = new Map<string, string>();

  constructor(
    private readonly copy: BindingsCopy,
    private readonly hooks: BindingsHooks,
  ) {}

  /** Hand over the starting values of the example about to be opened. They are applied on the
   *  next `update`, the compile of that example's file. */
  seed(values: Readonly<Record<string, readonly number[]>>): void {
    this.pendingSeed = values;
  }

  /** The range and step a live example gives each of its fields, carried by its link to the
   *  Playground, so a slider here runs over the range the page's runs over. Empty for every
   *  other file, whose fields take the contract's defaults. */
  setControls(props: ControlProps): void {
    this.linkedProps = props;
  }

  /** What a live example's link says about one field, for a field the module declares at the
   *  top of its block. */
  private propOf(field: PackedField): ControlProp | undefined {
    return field.name === field.leaf ? this.linkedProps[field.name] : undefined;
  }

  /** Read a newly compiled module. Values the reader set survive for every binding and field
   *  that still exists with the same type. */
  update(reflection: Reflection | undefined, module: ModuleDecl | undefined): void {
    this.reflection = reflection;
    this.module = module;
    this.structs = new Map((module?.structs ?? []).map((s) => [s.name, s]));
    this.uniforms = [];
    this.storage = [];
    this.samplers = [];
    this.textures = [];
    this.storageTextures = [];
    this.unfillable = [];
    this.hostOwned = new Set();
    this.results = new Map();
    this.vertexInputs = [];
    if (!reflection) return;
    const vertex = reflection.entries.find((e) => e.stage === 'vertex');
    for (const field of vertex?.io.inputs ?? []) {
      if (typeof field.location === 'number')
        this.vertexInputs.push({ name: field.name, type: field.type, location: field.location });
    }
    const typeOf = (name: string): ShaderType | undefined =>
      module?.bindings.find((b) => b.name === name)?.type as ShaderType | undefined;
    for (const group of reflection.bindGroups) {
      for (const entry of group.entries) {
        // The compiler's fp64 guard is the runtime's to fill, and the page never shows it.
        if (entry.name === '_fp64') continue;
        // A binding the host owns is declared in the emitted program all the same, so the
        // page fills it like any other of its kind and says whose it is.
        if (entry.owner === 'host') this.hostOwned.add(entry.name);
        switch (entry.resourceKind) {
          case 'uniform-buffer': {
            const block = this.uniformBlock(entry, typeOf(entry.name));
            if (block) this.uniforms.push(block);
            else this.unfillable.push(entry.name);
            break;
          }
          case 'storage-buffer': {
            const block = this.storageBlock(entry, typeOf(entry.name));
            if (block) this.storage.push(block);
            else this.unfillable.push(entry.name);
            break;
          }
          case 'texture':
            this.textures.push(entry);
            break;
          case 'sampler':
            this.samplers.push(entry);
            break;
          case 'storage-texture':
            this.storageTextures.push(entry);
            break;
        }
      }
    }
    // An example that was just opened brings its own starting values, and they win over
    // whatever the fields held under the example before.
    const seed = this.pendingSeed;
    this.pendingSeed = undefined;
    for (const block of seed ? this.uniforms : []) {
      for (const field of block.fields) {
        const v = seed![block.bare ? block.binding.name : field.name];
        if (v && v.length === componentCount(field.shape))
          this.values.set(this.fieldKey(block, field), [...v]);
      }
    }
    // Start every value that is not already set, in the order the fields appear, so the start
    // colours go to the first vector fields a module declares.
    let colour = 0;
    for (const block of this.uniforms) {
      for (const field of block.fields) {
        const key = this.fieldKey(block, field);
        if (this.values.has(key) || this.hostField(block, field)) continue;
        this.values.set(
          key,
          this.startValue(field, () => START_COLOURS[colour++ % START_COLOURS.length]!),
        );
      }
    }
    for (const o of reflection.overrides) {
      const key = `${o.name}|${o.type}`;
      if (!this.overrideValues.has(key))
        this.overrideValues.set(
          key,
          typeof o.default === 'boolean' ? Number(o.default) : o.default,
        );
    }
  }

  private uniformBlock(entry: Binding, type: ShaderType | undefined): UniformBlock | undefined {
    if (entry.structName) {
      const layout = this.reflection?.uniforms.find((u) => u.name === entry.structName);
      const decl = this.structs.get(entry.structName);
      if (!layout) return undefined;
      const fields: PackedField[] = [];
      for (const [i, f] of layout.fields.entries()) {
        const shape = fieldShape(f.type);
        if (shape) {
          fields.push({
            name: f.name,
            type: f.type,
            offset: f.offset,
            shape,
            leaf: f.name,
            path: [f.name],
          });
          continue;
        }
        // A nested struct or an array of them: one field per leaf, at the leaf's own offset.
        const declared = decl?.fields[i];
        const leaves =
          declared?.name === f.name
            ? this.leaves(declared.type as ShaderType, f.name, f.offset, [f.name])
            : null;
        if (!leaves) return undefined;
        fields.push(...leaves);
      }
      return { binding: entry, struct: entry.structName, size: layout.size, fields, bare: false };
    }
    // A bare value bound as a uniform, `var<uniform> scale: f32`. It lays out like a struct of
    // one field at offset 0, which is what the runtime packs.
    if (!type) return undefined;
    const fields = this.leaves(type, entry.name, 0, []);
    if (!fields) return undefined;
    const { size } = layoutOf(type, this.structs, 'std140');
    return {
      binding: entry,
      struct: '',
      size: roundUp(Math.max(size, 4), 16),
      fields,
      bare: fields.length === 1 && fields[0]!.path.length === 0,
    };
  }

  /** A uniform value as the fields the panel packs: itself when it has a control of its own,
   *  and otherwise every field of a struct and every element of a fixed array, down to the
   *  values that do, at their std140 offsets. Null for a value with a leaf nothing can fill,
   *  an emulated double inside a struct among them, whose layout the fp64 lowering owns. */
  private leaves(
    t: ShaderType,
    name: string,
    offset: number,
    path: readonly (string | number)[],
  ): PackedField[] | null {
    const key = keyOf(t);
    const shape = fieldShape(key);
    const leaf = String(path.findLast((step) => typeof step === 'string') ?? name);
    if (shape && (path.length <= 1 || shape.scalar !== 'f64'))
      return [{ name, type: key, offset, shape, leaf, path }];
    if (t.kind === 'struct') {
      const decl = this.structs.get(t.name);
      if (!decl) return null;
      const layout = wgslLayout(decl, 'std140', this.structs);
      const out: PackedField[] = [];
      for (const [i, f] of decl.fields.entries()) {
        const inner = this.leaves(
          f.type as ShaderType,
          `${name}.${f.name}`,
          offset + layout.fields[i]!.offset,
          [...path, f.name],
        );
        if (!inner) return null;
        out.push(...inner);
      }
      return out;
    }
    if (t.kind === 'array' && t.size !== undefined) {
      const stride = roundUp(layoutOf(t.elem, this.structs, 'std140').size, 16);
      const out: PackedField[] = [];
      for (let i = 0; i < t.size; i++) {
        const inner = this.leaves(t.elem, `${name}[${i}]`, offset + i * stride, [...path, i]);
        if (!inner) return null;
        out.push(...inner);
      }
      return out;
    }
    return null;
  }

  private storageBlock(entry: Binding, type: ShaderType | undefined): StorageBlock | undefined {
    if (!type) return undefined;
    const runtimeSized = type.kind === 'array' && type.size === undefined;
    const elem = type.kind === 'array' ? type.elem : type;
    const inner = layoutOf(elem, this.structs, 'std430');
    if (inner.size === 0) return undefined;
    const stride = type.kind === 'array' ? roundUp(inner.size, inner.align) : inner.size;
    const fixedLength = type.kind === 'array' ? (type.size ?? 0) : 1;
    return { binding: entry, type, runtimeSized, fixedLength, elem, stride };
  }

  private plotBlock(block: UniformBlock): boolean {
    return !block.bare && isPlotLayout(block);
  }

  private plotFont(block: UniformBlock): boolean {
    return block.binding.name === 'font' && this.uniforms.some((entry) => this.plotBlock(entry));
  }

  private hostField(block: UniformBlock, field: PackedField): boolean {
    return (
      isReserved(field.name, field.type) ||
      (!block.bare && isPlotHostField(block, field)) ||
      (this.plotFont(block) && field.name === 'pixelRatio' && field.type === 'f32')
    );
  }

  private fieldKey(block: UniformBlock, field: PackedField): string {
    return block.bare
      ? `${block.binding.name}|${field.type}`
      : `${block.binding.name}.${field.name}|${field.type}`;
  }

  private startValue(field: PackedField, nextColour: () => readonly number[]): number[] {
    const { shape } = field;
    if (shape.array) {
      // An array starts every element where a lone field of its type would.
      const one = controlFor({
        name: field.leaf,
        type: shape.rows === 1 ? shape.scalar : `vec${shape.rows}<${shape.scalar}>`,
        offset: 0,
      });
      return Array.from({ length: shape.columns }, (_, i) =>
        shape.scalar === 'f32' && shape.rows >= 3
          ? [...nextColour()].slice(0, shape.rows)
          : [...(one?.value ?? [0])].map(
              (v) => v * (shape.rows === 1 ? (i + 1) / shape.columns : 1),
            ),
      ).flat();
    }
    if (shape.columns > 1) return matrixPreset('identity', shape);
    if (shape.scalar === 'f32' && shape.rows >= 3) return [...nextColour()].slice(0, shape.rows);
    const control = controlFor(
      { name: field.leaf, type: field.type, offset: field.offset },
      this.propOf(field),
    );
    if (control) return [...control.value];
    return Array.from({ length: componentCount(shape) }, () => 0);
  }

  // ── what the engines read ──────────────────────────────────────────────────────────────

  /** The first uniform block the render pass packs every frame, as the runtime's layout
   *  spells it, or undefined when the module binds none. */
  private primaryUniform(): UniformBlock | undefined {
    return this.uniforms.find((block) => this.plotBlock(block)) ?? this.uniforms[0];
  }

  renderBlock(): UniformBlockLayout | undefined {
    const block = this.primaryUniform();
    return block ? this.blockLayout(block) : undefined;
  }

  /** Every uniform block after the first, which the render pass packs every frame too. */
  moreBlocks(): UniformBlockLayout[] {
    return this.uniforms
      .filter((block) => block !== this.primaryUniform())
      .map((block) => this.blockLayout(block));
  }

  private blockLayout(block: UniformBlock): UniformBlockLayout {
    return {
      size: block.size,
      block: block.struct,
      group: block.binding.group,
      binding: block.binding.binding,
      instance: block.binding.name,
      fields: block.fields.map((f) => ({ name: f.name, type: f.type, offset: f.offset })),
    };
  }

  /** Preserve the viewport carried by a function graph link on GPU and CPU. */
  private linkedPlotValue(name: string, block: UniformBlock): number[] | null {
    if (name === 'plotBlend' && this.linkedProps.plotBlend) {
      const mode = block.fields.find((field) => field.name === 'view3d');
      if (mode) {
        const value = this.values.get(this.fieldKey(block, mode));
        if (value) return [value[0] ? 1 : 0];
      }
    }
    const count = ['plotBlend', 'plotCenterZ'].includes(name)
      ? 1
      : ['plotCenter', 'plotSpan', 'plotRotation', 'plotPan', 'cameraLens'].includes(name)
        ? 2
        : 0;
    const value = this.linkedProps[name]?.value;
    return count && Array.isArray(value) && value.length === count && value.every(Number.isFinite)
      ? [...value]
      : null;
  }

  /** The numbers one field of a uniform block holds this frame, laid out the way the runtime
   *  writes them: a matrix column padded to four floats where std140 pads it, an f64 split
   *  into the two floats the emulation reads. Reserved fields are the page's to fill. The
   *  block is the first unless `instance` names another. */
  renderValue(
    name: string,
    seconds: number,
    width: number,
    height: number,
    pointer: readonly [number, number],
    instance?: string,
    clock?: { readonly frame: number; readonly delta: number },
  ): number[] | null {
    const block =
      instance === undefined
        ? this.primaryUniform()
        : this.uniforms.find((b) => b.binding.name === instance);
    const field = block?.fields.find((f) => f.name === name);
    if (!block || !field) return null;
    if (this.plotFont(block) && name === 'pixelRatio') return [1];
    if (isPlotHostField(block, field)) {
      const rotation = this.linkedPlotValue('plotRotation', block) ?? [0.65, 0.45];
      const center = this.linkedPlotValue('plotCenter', block) ?? [0, 0];
      const span = this.linkedPlotValue('plotSpan', block) ?? [1, 1];
      const supplied =
        this.linkedPlotValue(name, block) ??
        plotUniformValue(name, rotation, [center[0]! - span[0]! / 2, center[0]! + span[0]! / 2]);
      if (supplied) return [...supplied];
    }
    if (!block.bare && this.hostField(block, field)) {
      const v =
        this.linkedPlotValue(name, block) ??
        reservedValue(name, seconds, width, height, pointer, clock);
      if (!v) return null;
      // A registry example's `mouse` is a vec4 of [x, y, down, used]; the rest stay 0.
      return [
        ...v,
        ...Array.from({ length: Math.max(0, componentCount(field.shape) - v.length) }, () => 0),
      ];
    }
    return this.std140Numbers(field, this.values.get(this.fieldKey(block, field)) ?? []);
  }

  private std140Numbers(field: PackedField, raw: readonly number[]): number[] {
    const { shape } = field;
    if (shape.scalar === 'f64') {
      // An emulated double is two floats, the value rounded and what the rounding lost. A
      // vector of them is its hi half and then its lo half, the lo one on the next vec2 or
      // vec4 boundary, the way the lowering lays the struct out.
      const hi = Array.from({ length: shape.rows }, (_, i) => Math.fround(raw[i] ?? 0));
      const lo = hi.map((h, i) => Math.fround((raw[i] ?? 0) - h));
      if (shape.rows === 1) return [hi[0]!, lo[0]!];
      const half = shape.rows === 2 ? 2 : 4;
      return [...hi, ...Array.from({ length: half - shape.rows }, () => 0), ...lo];
    }
    if (shape.columns === 1) return [...raw];
    const stride = shape.array || shape.rows !== 2 ? 4 : 2;
    const out: number[] = [];
    for (let c = 0; c < shape.columns; c++) {
      for (let r = 0; r < stride; r++)
        out.push(r < shape.rows ? (raw[c * shape.rows + r] ?? 0) : 0);
    }
    return out;
  }

  /** Every resource a pass binds beyond the uniform blocks the render path packs every
   *  frame. A dispatch has no frame, so for compute each block is handed over as bytes. */
  resources(forCompute: boolean): ResourceSpec[] {
    const out: ResourceSpec[] = [];
    this.uniforms.forEach((block) => {
      if (!forCompute) return;
      out.push({
        kind: 'uniform-buffer',
        name: block.binding.name,
        group: block.binding.group,
        binding: block.binding.binding,
        bytes: this.packUniform(block),
      });
    });
    for (const t of this.textures) out.push(this.textureSpec(t));
    for (const s of this.samplers) out.push(this.samplerSpec(s));
    for (const b of this.storage) {
      out.push({
        kind: 'storage-buffer',
        name: b.binding.name,
        group: b.binding.group,
        binding: b.binding.binding,
        readOnly: b.binding.access !== 'read_write',
        bytes: this.packStorage(b),
      });
    }
    for (const t of this.storageTextures) out.push(this.storageTextureSpec(t));
    return out;
  }

  private storageTextureSpec(t: Binding): StorageTextureSpec {
    const side = this.storageSizes.get(t.name) ?? 128;
    return {
      kind: 'storage-texture',
      name: t.name,
      group: t.group,
      binding: t.binding,
      format: t.storageFormat ?? 'rgba8unorm',
      access: t.storageAccess ?? 'write-only',
      width: side,
      height: side,
    };
  }

  /** The value of every override, by name, for the WebGPU pipeline and the GLSL emit. */
  constants(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const o of this.reflection?.overrides ?? [])
      out[o.name] = this.overrideValues.get(`${o.name}|${o.type}`) ?? Number(o.default);
    return out;
  }

  /** Whether any override is away from its default, which is when the emit has to carry it. */
  overridesMoved(): boolean {
    return (this.reflection?.overrides ?? []).some(
      (o) =>
        (this.overrideValues.get(`${o.name}|${o.type}`) ?? Number(o.default)) !== Number(o.default),
    );
  }

  /** The three vertices the vertex entry's inputs read, or null when an input is of a type a
   *  float buffer cannot hold. Undefined when the entry reads none. */
  vertexBuffer(): VertexBufferSpec | null | undefined {
    if (this.vertexInputs.length === 0) return undefined;
    return triangleVertices(this.vertexInputs);
  }

  /** The same three vertices, per input, in the oracle's shape: a number or an array. */
  cpuAttributes(): Record<string, (number | number[])[]> {
    const spec = this.vertexBuffer();
    if (!spec) return {};
    const out: Record<string, (number | number[])[]> = {};
    this.vertexInputs.forEach((input, k) => {
      const a = spec.attributes[k]!;
      out[input.name] = [0, 1, 2].map((v) => {
        const at = (v * spec.stride + a.offset) / 4;
        const values = Array.from(spec.data.subarray(at, at + a.components));
        return a.components === 1 ? values[0]! : values;
      });
    });
    return out;
  }

  /** Every binding the panel has no value for. */
  missing(): readonly string[] {
    return this.unfillable;
  }

  hasStorage(): boolean {
    return this.storage.length > 0 || this.storageTextures.length > 0;
  }

  /** The uniform and storage values in the CPU oracle's own shape: a struct as an object, a
   *  vector as an array, a matrix as its columns run together, an array as a list. Keyed by
   *  binding name, for `setBinding`. */
  cpuBindings(
    seconds: number,
    width: number,
    height: number,
    pointer: readonly [number, number],
    pixelRatio = 1,
  ): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const block of this.uniforms) {
      const valueOf = (field: PackedField): unknown => {
        let v: number[];
        if (!block.bare && this.hostField(block, field)) {
          const r =
            this.plotFont(block) && field.name === 'pixelRatio'
              ? [pixelRatio]
              : (this.renderValue(
                  field.name,
                  seconds,
                  width,
                  height,
                  pointer,
                  block.binding.name,
                ) ?? []);
          v = [
            ...r,
            ...Array.from({ length: Math.max(0, componentCount(field.shape) - r.length) }, () => 0),
          ];
        } else {
          v = this.values.get(this.fieldKey(block, field)) ?? [];
        }
        if (field.shape.array) {
          const { rows, columns } = field.shape;
          return Array.from({ length: columns }, (_, i) =>
            rows === 1 ? (v[i] ?? 0) : v.slice(i * rows, i * rows + rows),
          );
        }
        return field.shape.rows === 1 && field.shape.columns === 1 ? (v[0] ?? 0) : v;
      };
      // Each value is put where its path says, so a nested struct arrives as nested objects
      // and an array of structs as a list of them, the shape the oracle reads a struct in.
      let value: unknown = undefined;
      for (const field of block.fields) {
        if (field.path.length === 0) {
          value = valueOf(field);
          continue;
        }
        value ??= typeof field.path[0] === 'number' ? [] : {};
        let at = value as Record<string | number, unknown>;
        field.path.forEach((step, k) => {
          if (k === field.path.length - 1) {
            at[step] = valueOf(field);
            return;
          }
          at[step] ??= typeof field.path[k + 1] === 'number' ? [] : {};
          at = at[step] as Record<string | number, unknown>;
        });
      }
      out[block.binding.name] = value;
    }
    for (const b of this.storage) out[b.binding.name] = this.cpuStorage(b);
    // A texture and a sampler are bound as the same data the GPU is handed: the texels, and
    // the filter and address mode. src/scripts/playground-oracle-textures.ts reads them.
    for (const t of this.textures) {
      const spec = this.textureSpec(t);
      const image = spec.imageUrl ? this.cpuImages.get(spec.imageUrl) : undefined;
      out[t.name] = image
        ? { ...spec, width: image.width, height: image.height, texels: [image.texels] }
        : spec;
    }
    for (const s of this.samplers) out[s.name] = this.samplerSpec(s);
    // A storage texture is the texels a dispatch writes, zero to start with as the GPU's are,
    // in the format's own bytes; src/scripts/playground-oracle-textures.ts reads and writes them.
    for (const t of this.storageTextures) {
      const spec = this.storageTextureSpec(t);
      out[t.name] = {
        ...spec,
        bytes: new Uint8Array(spec.width * spec.height * (TEXEL_BYTES[spec.format] ?? 4)),
      };
    }
    return out;
  }

  private cpuStorage(b: StorageBlock): unknown {
    const length = this.lengthOf(b);
    const choice = this.storageChoice(b);
    const one = (i: number, t: ShaderType): unknown => {
      switch (t.kind) {
        case 'scalar':
        case 'atomic': {
          const integer = t.kind === 'atomic' || t.scalar !== 'f32';
          // An f32 element is the value the GPU's buffer holds, rounded to 32 bits, so the
          // oracle reads what the GPU reads; a double here made a CPU run log and compute
          // with inputs WebGPU never saw.
          const v = patternValue(choice.pattern, i, length, integer);
          return integer ? v : Math.fround(v);
        }
        case 'vec':
          return Array.from({ length: t.n }, (_, c) => {
            const v = patternValue(choice.pattern, i * t.n + c, length * t.n, t.elem !== 'f32');
            return t.elem === 'f32' ? Math.fround(v) : v;
          });
        case 'struct': {
          const decl = this.structs.get(t.name);
          return Object.fromEntries(
            (decl?.fields ?? []).map((f) => [f.name, one(i, f.type as ShaderType)]),
          );
        }
        default:
          return 0;
      }
    };
    if (b.type.kind !== 'array') return one(0, b.type);
    return Array.from({ length }, (_, i) => one(i, b.elem));
  }

  private lengthOf(b: StorageBlock): number {
    if (!b.runtimeSized) return b.fixedLength;
    return this.storageChoice(b).length;
  }

  /** How many invocations a compute entry should run over: the longest array it is handed, or
   *  the storage texture's texels. */
  invocations(): number {
    let n = 0;
    for (const b of this.storage) if (b.type.kind === 'array') n = Math.max(n, this.lengthOf(b));
    for (const t of this.storageTextures) {
      const side = this.storageSizes.get(t.name) ?? 128;
      n = Math.max(n, side * side);
    }
    return Math.max(1, n);
  }

  /** The storage texture the canvas should show after a dispatch, if any. */
  firstStorageTexture(): string | undefined {
    return this.storageTextures.find((t) => t.storageAccess !== 'read-only')?.name;
  }

  /** Decode what a dispatch wrote into a buffer, as rows for the panel and numbers for the
   *  plot. The plot takes the first number of every element. */
  readBack(name: string, bytes: Uint8Array): { rows: string[]; series: number[] } {
    const b = this.storage.find((s) => s.binding.name === name);
    if (!b) return { rows: [], series: [] };
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const slots = slotsOf(b.elem, this.structs, 'std430');
    const read = (at: number, scalar: Slot['scalar']): number =>
      at + 4 > view.byteLength
        ? NaN
        : scalar === 'f32'
          ? view.getFloat32(at, true)
          : scalar === 'i32'
            ? view.getInt32(at, true)
            : view.getUint32(at, true);
    const count = b.type.kind === 'array' ? this.lengthOf(b) : 1;
    const rows: string[] = [];
    const series: number[] = [];
    for (let i = 0; i < count; i++) {
      const base = i * b.stride;
      const numbers = slots.map((s) => read(base + s.offset, s.scalar));
      series.push(numbers[0] ?? NaN);
      if (rows.length < 12) {
        const shown =
          slots.length === 1
            ? fmt(numbers[0]!)
            : slots.map((s, k) => `${s.label.replace(/^\./, '')}=${fmt(numbers[k]!)}`).join(' ');
        rows.push(b.type.kind === 'array' ? `[${i}] ${shown}` : shown);
      }
    }
    return { rows, series };
  }

  /** The CPU oracle's arrays after a dispatch, in the same rows and series as `readBack`. */
  readCpu(name: string, value: unknown): { rows: string[]; series: number[] } {
    const b = this.storage.find((s) => s.binding.name === name);
    if (!b) return { rows: [], series: [] };
    const list = Array.isArray(value) && b.type.kind === 'array' ? value : [value];
    const flat = (v: unknown): number[] =>
      typeof v === 'number'
        ? [v]
        : Array.isArray(v)
          ? v.flatMap(flat)
          : v && typeof v === 'object'
            ? Object.values(v).flatMap(flat)
            : [NaN];
    const rows: string[] = [];
    const series: number[] = [];
    list.forEach((v, i) => {
      const numbers = flat(v);
      series.push(numbers[0] ?? NaN);
      if (rows.length < 12) {
        const shown = numbers.length === 1 ? fmt(numbers[0]!) : numbers.map(fmt).join(' ');
        rows.push(b.type.kind === 'array' ? `[${i}] ${shown}` : shown);
      }
    });
    return { rows, series };
  }

  /** Every writable storage buffer, by name. */
  writableStorage(): string[] {
    return this.storage.filter((b) => b.binding.access === 'read_write').map((b) => b.binding.name);
  }

  /** The rows a dispatch left, shown under the buffer they came from on the next paint. */
  showResults(results: ReadonlyMap<string, string>): void {
    this.results = new Map(results);
  }

  // ── packing ────────────────────────────────────────────────────────────────────────────

  private packUniform(block: UniformBlock): Uint8Array<ArrayBuffer> {
    const bytes = new Uint8Array(block.size);
    const f32 = new Float32Array(bytes.buffer);
    const i32 = new Int32Array(bytes.buffer);
    const u32 = new Uint32Array(bytes.buffer);
    for (const field of block.fields) {
      const numbers =
        this.hostField(block, field) && !block.bare
          ? []
          : this.std140Numbers(field, this.values.get(this.fieldKey(block, field)) ?? []);
      const base = field.offset / 4;
      numbers.forEach((n, k) => {
        if (field.shape.scalar === 'i32') i32[base + k] = Math.round(n);
        else if (field.shape.scalar === 'u32' || field.shape.scalar === 'bool')
          u32[base + k] = Math.max(0, Math.round(n));
        else f32[base + k] = n;
      });
    }
    return bytes;
  }

  private packStorage(b: StorageBlock): Uint8Array<ArrayBuffer> {
    const length = this.lengthOf(b);
    const total = b.type.kind === 'array' ? b.stride * Math.max(1, length) : b.stride;
    const bytes = new Uint8Array(roundUp(Math.max(total, 4), 4));
    const view = new DataView(bytes.buffer);
    const choice = this.storageChoice(b);
    const slots = slotsOf(b.elem, this.structs, 'std430');
    const count = b.type.kind === 'array' ? length : 1;
    for (let i = 0; i < count; i++) {
      slots.forEach((s, k) => {
        const integer = s.scalar !== 'f32';
        const v = patternValue(choice.pattern, i * slots.length + k, count * slots.length, integer);
        const at = i * b.stride + s.offset;
        if (s.scalar === 'f32') view.setFloat32(at, v, true);
        else if (s.scalar === 'i32') view.setInt32(at, v, true);
        else view.setUint32(at, Math.max(0, v), true);
      });
    }
    return bytes;
  }

  // ── textures ───────────────────────────────────────────────────────────────────────────

  private textureKey(t: Binding): string {
    return `${t.name}|${t.textureDim}|${t.textureDepth ? 'depth' : t.textureElem}`;
  }

  private textureChoice(t: Binding): TextureChoice {
    const key = this.textureKey(t);
    let choice = this.textureChoices.get(key);
    if (!choice) {
      const dim = t.textureDim ?? '2d';
      const source: TextureSource =
        dim === 'cube' || dim === 'cube-array'
          ? 'faces'
          : dim === '3d' || dim === '1d'
            ? 'gradient'
            : 'checker';
      choice = { source, solid: [0.96, 0.55, 0.2, 1] };
      this.textureChoices.set(key, choice);
    }
    return choice;
  }

  private textureSpec(t: Binding): TextureSpec {
    if (t.name === 'glyphAtlas' && this.uniforms.some((block) => this.plotBlock(block)))
      return plotFontResource(t);
    // A pass's output has no texels here: the runtime binds the pass's own target, the size
    // of the canvas (compiler change 0026).
    if (this.passes.has(t.name) && !t.textureDepth && (t.textureDim ?? '2d') === '2d')
      return {
        kind: 'texture',
        name: t.name,
        group: t.group,
        binding: t.binding,
        dim: '2d',
        sample: 'float',
        width: 0,
        height: 0,
        layers: 1,
        texels: [],
        pass: t.name,
      };
    const key = this.textureKey(t);
    // The texels are kept by name, dimension and kind, so a reader's picture survives an edit;
    // where the texture sits is read from this module, since another example can declare a
    // texture of the same name at another binding.
    const cached = this.texelCache.get(key);
    if (cached) return { ...cached, group: t.group, binding: t.binding };
    const dim = (t.textureDim ?? '2d') as TextureDim;
    const sample: SampleKind = t.textureDepth
      ? 'depth'
      : t.textureElem === 'u32'
        ? 'uint'
        : t.textureElem === 'i32'
          ? 'sint'
          : 'float';
    const { width, height, layers } = textureSize(dim);
    const choice = this.textureChoice(t);
    const texels: Uint8Array<ArrayBuffer>[] = [];
    const depth: Float32Array<ArrayBuffer>[] = [];
    for (let k = 0; k < layers; k++) {
      if (sample === 'depth') {
        depth.push(depthRamp(width, height, k, layers));
        continue;
      }
      if (choice.source === 'image' && choice.image) {
        texels.push(new Uint8Array(choice.image.data.buffer.slice(0)));
        continue;
      }
      const source = choice.source === 'image' ? 'checker' : choice.source;
      texels.push(generateTexels(source, width, height, k, layers, choice.solid));
    }
    const spec: TextureSpec = {
      kind: 'texture',
      name: t.name,
      group: t.group,
      binding: t.binding,
      dim,
      sample,
      width,
      height,
      layers,
      texels,
      ...(sample === 'depth' ? { depth } : {}),
    };
    this.texelCache.set(key, spec);
    return spec;
  }

  private samplerSpec(s: Binding): SamplerSpec {
    const choice = this.samplerChoice(s);
    return {
      kind: 'sampler',
      name: s.name,
      group: s.group,
      binding: s.binding,
      comparison: s.samplerComparison === true,
      filter: choice.filter,
      address: choice.address,
    };
  }

  private samplerChoice(s: Binding): SamplerChoice {
    const key = `${s.name}|${s.samplerComparison ? 'cmp' : 'plain'}`;
    let choice = this.samplerChoices.get(key);
    if (!choice) {
      choice = { filter: 'linear', address: 'repeat' };
      this.samplerChoices.set(key, choice);
    }
    return choice;
  }

  private storageChoice(b: StorageBlock): StorageChoice {
    const key = `${b.binding.name}|${keyOf(b.type)}`;
    let choice = this.storageChoices.get(key);
    if (!choice) {
      // A buffer the entry only reads starts as a ramp. One it writes starts at zero where it
      // holds an atomic, since a count has to start from nothing, and random elsewhere, so an
      // entry that updates its elements in place has something to update.
      const atomic =
        /atomic/.test(keyOf(b.elem)) ||
        (b.elem.kind === 'struct' && slotsHaveAtomic(b.elem, this.structs));
      choice = {
        pattern: b.binding.access !== 'read_write' ? 'ramp' : atomic ? 'zeros' : 'random',
        length: 256,
      };
      this.storageChoices.set(key, choice);
    }
    return choice;
  }

  // ── the panel ──────────────────────────────────────────────────────────────────────────

  /** Paint the panel into `host`: a head row per binding, `@group(g) @binding(b) name: kind`,
   *  and the control under it. */
  render(host: HTMLElement): void {
    this.host = host;
    host.textContent = '';
    const reflection = this.reflection;
    const rows = el('div', 'binding-rows');
    const overrides = reflection?.overrides ?? [];
    const any =
      this.vertexInputs.length +
      this.uniforms.length +
      this.textures.length +
      this.samplers.length +
      this.storage.length +
      this.storageTextures.length +
      overrides.length +
      this.unfillable.length;
    host.hidden = !reflection || any === 0;
    if (host.hidden) return;
    host.append(el('p', 'bindings-title', this.copy.title));

    const head = (binding: Binding, kind: string): HTMLElement => {
      const row = el('div', 'binding');
      row.dataset.bindingName = binding.name;
      row.tabIndex = -1;
      const name = el('div', 'binding-head');
      name.append(
        el('span', 'binding-slot', `@group(${binding.group}) @binding(${binding.binding})`),
      );
      name.append(el('code', 'binding-name', binding.name));
      name.append(el('span', 'binding-kind', kind));
      row.append(name);
      if (this.hostOwned.has(binding.name))
        row.append(el('p', 'binding-note', this.copy.hostOwned));
      rows.append(row);
      return row;
    };

    if (this.vertexInputs.length > 0) {
      const box = el('div', 'binding');
      for (const input of this.vertexInputs) {
        const line = el('div', 'binding-head');
        line.append(el('span', 'binding-slot', `@location(${input.location})`));
        line.append(el('code', 'binding-name', input.name));
        line.append(el('span', 'binding-kind', input.type));
        box.append(line);
      }
      box.append(el('p', 'binding-note', this.copy.vertices));
      rows.append(box);
    }
    for (const block of this.uniforms) {
      const row = head(
        block.binding,
        block.bare ? block.fields[0]!.type : `uniform<${block.struct}>`,
      );
      for (const field of block.fields) row.append(this.fieldControl(block, field));
    }
    for (const t of this.textures) {
      const kind = `texture_${t.textureDepth ? 'depth_' : ''}${(t.textureDim ?? '2d').replace('-', '_')}${t.textureDepth ? '' : `<${t.textureElem ?? 'f32'}>`}`;
      head(t, kind).append(
        t.name === 'glyphAtlas' && this.uniforms.some((block) => this.plotBlock(block))
          ? el('p', 'binding-note', this.copy.runtime)
          : this.textureControl(t),
      );
    }
    for (const s of this.samplers)
      head(s, s.samplerComparison ? 'sampler_comparison' : 'sampler').append(
        this.samplerControl(s),
      );
    for (const b of this.storage) {
      head(b.binding, `storage<${keyOf(b.type)}, ${b.binding.access ?? 'read'}>`).append(
        this.storageControl(b),
      );
    }
    for (const t of this.storageTextures) {
      head(t, `texture_storage_2d<${t.storageFormat}, ${t.storageAccess}>`).append(
        this.storageTextureControl(t),
      );
    }
    if (overrides.length > 0) {
      const box = el('div', 'binding');
      const title = el('div', 'binding-head');
      title.append(el('span', 'binding-kind', this.copy.overrides));
      box.append(title);
      for (const o of overrides) box.append(this.overrideControl(o));
      rows.append(box);
    }
    if (this.unfillable.length > 0)
      rows.append(el('p', 'binding-note', `${this.copy.noControl} ${this.unfillable.join(', ')}`));
    host.append(rows);
  }

  private line(label: string, className = 'binding-line'): HTMLElement {
    const row = el('div', className);
    row.append(el('code', 'binding-field', label));
    return row;
  }

  private fieldControl(block: UniformBlock, field: PackedField): HTMLElement {
    const row = this.line(block.bare ? '' : field.name);
    if (!block.bare && this.hostField(block, field)) {
      row.append(el('span', 'binding-runtime', this.copy.runtime));
      return row;
    }
    const key = this.fieldKey(block, field);
    const value = this.values.get(key) ?? [];
    const set = (i: number, v: number): void => {
      const slot = this.values.get(key);
      if (!slot) return;
      slot[i] = v;
      this.hooks.values();
    };
    const { shape } = field;
    const controls = el('span', 'binding-controls');
    row.append(controls);

    if (shape.array) {
      // An array: one line per element, each with the control a lone field of its type gets.
      const list = el('span', 'binding-array');
      for (let e = 0; e < shape.columns; e++) {
        const item = el('span', 'binding-controls');
        item.append(el('code', 'binding-label', `[${e}]`));
        const one = controlFor({
          name: field.leaf,
          type: shape.rows === 1 ? shape.scalar : `vec${shape.rows}<${shape.scalar}>`,
          offset: 0,
        });
        for (let c = 0; c < shape.rows; c++) {
          const i = e * shape.rows + c;
          if (!one || one.kind === 'stepper') {
            const box = numberBox(
              value[i] ?? 0,
              `${field.name}[${e}] ${c}`,
              shape.scalar === 'f32' ? 'any' : '1',
            );
            box.addEventListener('input', () => {
              const n = Number(box.value);
              if (Number.isFinite(n)) set(i, n);
            });
            item.append(box);
          } else {
            item.append(
              this.slider(
                shape.rows > 1 ? `${field.name}[${e}] ${'xyzw'[c]}` : `${field.name}[${e}]`,
                value[i] ?? 0,
                one.min[c] ?? 0,
                one.max[c] ?? 1,
                one.step[c] ?? 0.002,
                (n) => set(i, n),
              ),
            );
          }
        }
        list.append(item);
      }
      controls.append(list);
      return row;
    }

    if (shape.columns > 1) {
      // A matrix: a preset, and the numbers themselves, one column per row of inputs, since the
      // page and the shader both read a matrix column by column.
      const presets: MatrixPreset[] = ['identity', 'camera', 'turn'];
      const pick = select(
        [['', '…'], ...presets.map((p) => [p, this.copy.presets[p]] as const)],
        '',
        `${field.name} ${this.copy.preset}`,
      );
      const grid = el('span', 'binding-matrix');
      grid.style.setProperty('--rows', String(shape.rows));
      const boxes: HTMLInputElement[] = [];
      for (let c = 0; c < shape.columns; c++) {
        for (let r = 0; r < shape.rows; r++) {
          const i = c * shape.rows + r;
          const box = numberBox(value[i] ?? 0, `${field.name} [${c}][${r}]`);
          box.addEventListener('input', () => {
            const n = Number(box.value);
            if (Number.isFinite(n)) set(i, n);
          });
          boxes.push(box);
          grid.append(box);
        }
      }
      pick.addEventListener('change', () => {
        if (!pick.value) return;
        const next = matrixPreset(pick.value as MatrixPreset, shape);
        next.forEach((n, i) => {
          boxes[i]!.value = String(Number(n.toFixed(4)));
          set(i, n);
        });
        pick.value = '';
      });
      controls.append(pick, grid);
      return row;
    }

    if (
      shape.scalar === 'f64' ||
      shape.scalar === 'bool' ||
      ((shape.scalar === 'i32' || shape.scalar === 'u32') && shape.rows > 1)
    ) {
      for (let i = 0; i < componentCount(shape); i++) {
        const box =
          shape.scalar === 'bool'
            ? document.createElement('input')
            : numberBox(value[i] ?? 0, `${field.name} ${i}`, shape.scalar === 'f64' ? 'any' : '1');
        if (shape.scalar === 'bool') {
          box.type = 'checkbox';
          box.checked = (value[i] ?? 0) !== 0;
          box.setAttribute('aria-label', `${field.name} ${i}`);
          box.addEventListener('change', () => set(i, box.checked ? 1 : 0));
        } else {
          box.addEventListener('input', () => {
            const n = Number(box.value);
            if (Number.isFinite(n)) set(i, n);
          });
        }
        controls.append(box);
      }
      return row;
    }

    const control = controlFor(
      { name: field.leaf, type: field.type, offset: field.offset },
      this.propOf(field),
    );
    if (!control) {
      controls.append(el('span', 'binding-runtime', this.copy.noControl));
      return row;
    }
    if (control.kind === 'stepper') {
      const box = numberBox(value[0] ?? 0, field.name, '1');
      box.min = String(control.min[0]);
      box.max = String(control.max[0]);
      box.addEventListener('input', () => {
        const n = Number(box.value);
        if (Number.isFinite(n)) set(0, Math.round(n));
      });
      controls.append(box);
      return row;
    }
    if (shape.rows >= 3 && suggestsColour(field.leaf)) {
      // A colour, by the contract's rule: one picker for the channels, and a slider for alpha.
      const picker = document.createElement('input');
      picker.type = 'color';
      picker.value = hex(value);
      picker.setAttribute('aria-label', field.name);
      picker.addEventListener('input', () => fromHex(picker.value).forEach((n, i) => set(i, n)));
      controls.append(picker);
      if (shape.rows === 4)
        controls.append(
          this.slider(`${field.name} a`, value[3] ?? 1, 0, 1, 0.002, (n) => set(3, n)),
        );
      return row;
    }
    for (let i = 0; i < control.components; i++) {
      controls.append(
        this.slider(
          control.components > 1 ? `${field.name} ${'xyzw'[i]}` : field.name,
          value[i] ?? 0,
          control.min[i] ?? 0,
          control.max[i] ?? 1,
          control.step[i] ?? 0.002,
          (n) => set(i, n),
        ),
      );
    }
    return row;
  }

  private slider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onInput: (n: number) => void,
    event: 'input' | 'change' = 'input',
  ): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.dataset.uniform = label;
    input.setAttribute('aria-label', label);
    input.addEventListener(event, () => onInput(Number(input.value)));
    return input;
  }

  private textureControl(t: Binding): HTMLElement {
    const row = this.line('', 'binding-line');
    const controls = el('span', 'binding-controls');
    row.append(controls);
    if (this.passes.has(t.name)) {
      controls.append(
        el('span', 'binding-runtime', this.copy.passOutput.replace('{name}', t.name)),
      );
      return row;
    }
    if (t.textureDepth) {
      controls.append(el('span', 'binding-runtime', this.copy.depthRamp));
      return row;
    }
    const choice = this.textureChoice(t);
    const key = this.textureKey(t);
    const changed = (): void => {
      this.texelCache.delete(key);
      this.hooks.resources();
    };
    const pick = select(
      (['checker', 'gradient', 'noise', 'solid', 'faces', 'image'] as const).map(
        (s) => [s, this.copy.sources[s]] as const,
      ),
      choice.source,
      `${t.name} ${this.copy.source}`,
    );
    pick.dataset.textureSource = t.name;
    controls.append(pick);
    const colour = document.createElement('input');
    colour.type = 'color';
    colour.value = hex(choice.solid);
    colour.setAttribute('aria-label', `${t.name} ${this.copy.sources.solid}`);
    colour.hidden = choice.source !== 'solid';
    colour.addEventListener('input', () => {
      choice.solid = [...fromHex(colour.value), 1];
      changed();
    });
    controls.append(colour);
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.setAttribute('aria-label', `${t.name} ${this.copy.dropImage}`);
    file.hidden = choice.source !== 'image';
    const take = async (blob: Blob): Promise<void> => {
      if (!(await this.takeImage(t, blob))) return;
      pick.value = 'image';
      colour.hidden = true;
      file.hidden = false;
    };
    file.addEventListener('change', () => {
      const f = file.files?.[0];
      if (f) void take(f);
    });
    row.addEventListener('dragover', (event) => {
      event.preventDefault();
      row.classList.add('dragging');
    });
    row.addEventListener('dragleave', () => row.classList.remove('dragging'));
    row.addEventListener('drop', (event) => {
      event.preventDefault();
      row.classList.remove('dragging');
      const f = event.dataTransfer?.files?.[0];
      if (f && f.type.startsWith('image/')) void take(f);
    });
    controls.append(file);
    pick.addEventListener('change', () => {
      choice.source = pick.value as TextureSource;
      colour.hidden = choice.source !== 'solid';
      file.hidden = choice.source !== 'image';
      if (choice.source === 'image' && !choice.image) file.click();
      changed();
    });
    return row;
  }

  /** Scales `blob` to the texture's size and binds it as that texture's picture. False, and
   *  the texture as it was, when the browser cannot decode it. */
  private async takeImage(t: Binding, blob: Blob): Promise<boolean> {
    const { width, height } = textureSize((t.textureDim ?? '2d') as TextureDim);
    try {
      const bitmap = await createImageBitmap(blob);
      const scratch = document.createElement('canvas');
      scratch.width = width;
      scratch.height = height;
      const context = scratch.getContext('2d');
      if (!context) return false;
      context.drawImage(bitmap, 0, 0, width, height);
      const choice = this.textureChoice(t);
      choice.image = context.getImageData(0, 0, width, height);
      choice.source = 'image';
      this.texelCache.delete(this.textureKey(t));
      this.hooks.resources();
      return true;
    } catch {
      // An image the browser cannot decode leaves the texture as it was.
      return false;
    }
  }

  /** The texture a picture dropped on the canvas goes to: the first sampled 2D texture the
   *  module declares, the channel a Shadertoy pane's first input is. Undefined when there is
   *  none, since a depth, cube or 3D texture takes no single picture. */
  imageTarget(): string | undefined {
    return this.textures.find(
      (t) => !t.textureDepth && (t.textureDim ?? '2d') === '2d' && !this.passes.has(t.name),
    )?.name;
  }

  /** Binds a picture dropped on the canvas to `imageTarget()`, and redraws the panel so its
   *  row shows the picture as the texture's source. The name it went to, or undefined. */
  async dropImage(blob: Blob): Promise<string | undefined> {
    const t = this.textures.find((x) => x.name === this.imageTarget());
    if (!t || !(await this.takeImage(t, blob))) return undefined;
    if (this.host) this.render(this.host);
    return t.name;
  }

  private samplerControl(s: Binding): HTMLElement {
    const row = this.line('', 'binding-line');
    const controls = el('span', 'binding-controls');
    row.append(controls);
    const choice = this.samplerChoice(s);
    const filter = select(
      [
        ['linear', 'linear'],
        ['nearest', 'nearest'],
      ],
      choice.filter,
      `${s.name} ${this.copy.filter}`,
    );
    filter.addEventListener('change', () => {
      choice.filter = filter.value as FilterMode;
      this.hooks.resources();
    });
    const address = select(
      [
        ['repeat', 'repeat'],
        ['clamp-to-edge', 'clamp-to-edge'],
        ['mirror-repeat', 'mirror-repeat'],
      ],
      choice.address,
      `${s.name} ${this.copy.address}`,
    );
    address.addEventListener('change', () => {
      choice.address = address.value as AddressMode;
      this.hooks.resources();
    });
    controls.append(
      el('span', 'binding-label', this.copy.filter),
      filter,
      el('span', 'binding-label', this.copy.address),
      address,
    );
    if (s.samplerComparison)
      controls.append(el('span', 'binding-runtime', `${this.copy.compare} less-equal`));
    return row;
  }

  private storageControl(b: StorageBlock): HTMLElement {
    const box = el('div', 'binding-storage');
    const row = this.line('', 'binding-line');
    const controls = el('span', 'binding-controls');
    row.append(controls);
    const choice = this.storageChoice(b);
    const pattern = select(
      STORAGE_PATTERNS.map((p) => [p, p] as const),
      choice.pattern,
      `${b.binding.name} ${this.copy.fill}`,
    );
    pattern.addEventListener('change', () => {
      choice.pattern = pattern.value as StoragePattern;
      this.hooks.resources();
    });
    controls.append(el('span', 'binding-label', this.copy.fill), pattern);
    if (b.runtimeSized) {
      const length = numberBox(choice.length, `${b.binding.name} ${this.copy.elements}`, '1');
      length.min = '1';
      length.max = '65536';
      length.addEventListener('change', () => {
        const n = Math.round(Number(length.value));
        if (!Number.isFinite(n) || n < 1) return;
        choice.length = Math.min(65536, n);
        this.hooks.resources();
      });
      controls.append(el('span', 'binding-label', this.copy.elements), length);
    }
    box.append(row);
    const result = this.results.get(b.binding.name);
    if (result !== undefined) {
      const out = el('pre', 'binding-result', result);
      out.dataset.result = b.binding.name;
      box.append(el('span', 'binding-label', this.copy.written), out);
    }
    return box;
  }

  private storageTextureControl(t: Binding): HTMLElement {
    const box = el('div', 'binding-storage');
    const row = this.line('', 'binding-line');
    const controls = el('span', 'binding-controls');
    row.append(controls);
    const side = this.storageSizes.get(t.name) ?? 128;
    const size = select(
      [
        ['64', '64 × 64'],
        ['128', '128 × 128'],
        ['256', '256 × 256'],
      ],
      String(side),
      `${t.name} ${this.copy.size}`,
    );
    size.addEventListener('change', () => {
      this.storageSizes.set(t.name, Number(size.value));
      this.hooks.resources();
    });
    controls.append(el('span', 'binding-label', this.copy.size), size);
    box.append(row);
    const result = this.results.get(t.name);
    if (result !== undefined)
      box.append(
        el('span', 'binding-label', this.copy.written),
        el('pre', 'binding-result', result),
      );
    return box;
  }

  private overrideControl(o: Reflection['overrides'][number]): HTMLElement {
    const row = this.line(o.name);
    const controls = el('span', 'binding-controls');
    row.append(controls);
    const key = `${o.name}|${o.type}`;
    const value = this.overrideValues.get(key) ?? Number(o.default);
    if (o.type === 'bool') {
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = value !== 0;
      box.setAttribute('aria-label', o.name);
      box.addEventListener('change', () => {
        this.overrideValues.set(key, box.checked ? 1 : 0);
        this.hooks.overrides();
      });
      controls.append(box);
      return row;
    }
    const integer = o.type === 'i32' || o.type === 'u32';
    const box = numberBox(value, o.name, integer ? '1' : 'any');
    box.dataset.override = o.name;
    box.addEventListener('change', () => {
      const n = Number(box.value);
      if (!Number.isFinite(n)) return;
      this.overrideValues.set(key, integer ? Math.round(n) : n);
      this.hooks.overrides();
    });
    controls.append(box);
    if (o.type === 'f32') {
      controls.append(
        this.slider(
          `${o.name} slider`,
          value,
          Math.min(0, value),
          Math.max(1, value),
          0.002,
          (n) => {
            box.value = String(Number(n.toFixed(4)));
            this.overrideValues.set(key, n);
            this.hooks.overrides();
            // Each value is a new pipeline, so the slider settles before one is built.
          },
          'change',
        ),
      );
    }
    return row;
  }
}

/** Whether a struct holds an atomic anywhere in it. */
function slotsHaveAtomic(t: ShaderType, structs: ReadonlyMap<string, StructDecl>): boolean {
  if (t.kind === 'atomic') return true;
  if (t.kind === 'array') return slotsHaveAtomic(t.elem, structs);
  if (t.kind !== 'struct') return false;
  return (structs.get(t.name)?.fields ?? []).some((f) =>
    slotsHaveAtomic(f.type as ShaderType, structs),
  );
}

const fmt = (n: number): string =>
  Number.isInteger(n) ? String(n) : Number.isFinite(n) ? n.toPrecision(4) : String(n);
