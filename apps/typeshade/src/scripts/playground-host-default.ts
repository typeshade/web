// The host.ts a workspace opens with when its example brings none: a starter written from the
// module's host face (change 0062), so it type-checks against the module the reader holds.
//
//   - A module with a full-screen `@fragment` entry gets `animate(canvas)`, which draws that
//     entry into the canvas once a frame.
//   - A module with a `@compute` entry gets `run()`, which dispatches it once and logs the
//     bindings it wrote.
//   - An image kernel taking a sampled image, an RGBA8 storage texture, width and height gets
//     `run(canvas)`, which processes a generated image and draws the result.
//   - Any other module gets `run()`, which opens the program runtime and logs the entries of
//     the compiled program, the module's default export. Most of the gallery is this case: an
//     entry that reads the `uv` the fullscreen triangle hands it is not one a host can draw yet
//     (Rule 8.20), and hovering its name in the import says why.
//
// A binding's value is written from the TypeScript type the host face gives the bindings
// object, the first member of each union, so the call matches the module's own declaration.
// A field named `time` takes the clock, `resolution` or `size` the canvas's size and `mouse`
// its middle. A type no value can be written for (a texture, a sampler) sends the module to
// the last case. The text is code, so it is English in every locale.
import ts from 'typescript';
import type { HostExport } from '../../vendor/shader-dsl/src/language-service/index.ts';

/** How many elements an array binding gets in a starter dispatch. */
const ELEMENTS = 256;
const TYPED_ARRAYS = new Set([
  'Float32Array',
  'Float64Array',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Uint8Array',
  'Uint16Array',
  'Uint32Array',
]);

type Use = 'draw' | 'dispatch';

/** A value of the type `node`, as source text, or undefined where none can be written. */
function valueOf(node: ts.TypeNode, name: string, use: Use): string | undefined {
  if (ts.isParenthesizedTypeNode(node) || ts.isTypeOperatorNode(node))
    return valueOf(node.type, name, use);
  if (ts.isUnionTypeNode(node)) return valueOf(node.types[0]!, name, use);
  if (node.kind === ts.SyntaxKind.NumberKeyword)
    return use === 'draw' && /^(time|t|seconds)$/i.test(name) ? 'time' : '1';
  if (node.kind === ts.SyntaxKind.BooleanKeyword) return 'false';
  if (ts.isTupleTypeNode(node)) {
    const types = node.elements.map((element) =>
      ts.isNamedTupleMember(element) ? element.type : element,
    );
    // A tuple of numbers is written with its type, so a value held in a `const` keeps it.
    const numbers = types.every((type) => type.kind === ts.SyntaxKind.NumberKeyword);
    const typed = (text: string): string =>
      numbers ? `${text} as [${types.map(() => 'number').join(', ')}]` : text;
    if (types.length === 2 && /^(resolution|size|viewport)$/i.test(name))
      return typed(use === 'draw' ? '[canvas.width, canvas.height]' : '[16, 16]');
    if (types.length === 2 && /^(mouse|cursor|center|centre)$/i.test(name))
      return typed('[0.5, 0.5]');
    const parts = types.map((type) => valueOf(type, '', use));
    return parts.every((part) => part !== undefined)
      ? typed(`[${parts.map((part) => (part === '1' ? '0' : part)).join(', ')}]`)
      : undefined;
  }
  if (ts.isTypeLiteralNode(node)) {
    const fields: string[] = [];
    for (const member of node.members) {
      if (!ts.isPropertySignature(member) || !member.type || !member.name) return undefined;
      const key = member.name.getText();
      const value = valueOf(member.type, key.replace(/^["']|["']$/g, ''), use);
      if (value === undefined) return undefined;
      fields.push(`${key}: ${value}`);
    }
    return fields.length === 0 ? '{}' : `{ ${fields.join(', ')} }`;
  }
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const type = node.typeName.text;
    if (!TYPED_ARRAYS.has(type)) return undefined;
    return use === 'dispatch' && type === 'Float32Array'
      ? `Float32Array.from({ length: ${ELEMENTS} }, (_, i) => i)`
      : `new ${type}(${ELEMENTS})`;
  }
  if (ts.isArrayTypeNode(node)) return '[]';
  return undefined;
}

/** The bindings object a call passes, written from its type's text. */
function bindingsValue(typeText: string, use: Use): string | undefined {
  const file = ts.createSourceFile('b.ts', `type B = ${typeText};`, ts.ScriptTarget.ES2022, true);
  const alias = file.statements[0];
  if (!alias || !ts.isTypeAliasDeclaration(alias)) return undefined;
  return valueOf(alias.type, '', use);
}

/** `text` as `//` comment lines of at most 100 columns. */
const comment = (text: string): string => {
  const lines: string[] = [];
  let line = '//';
  for (const word of text.split(' ')) {
    if (line.length + 1 + word.length > 100) {
      lines.push(line);
      line = '//';
    }
    line += ` ${word}`;
  }
  return [...lines, line].join('\n');
};

const HEADER = (file: string): string =>
  comment(
    `host.ts: the TypeScript an application writes around ${file}. It runs when you click Run, in a sandboxed frame with a canvas of its own, and its console lines go to the Console tab. The import is the shader module: hover a name to read what a host sees.`,
  );

/** The starter host.ts for the module at `file` (a name at the workspace's root), from the
 *  exports its host face lists. */
export function defaultHost(file: string, exports: readonly HostExport[]): string {
  const from = `./${file}`;
  for (const exported of exports) {
    if (exported.kind !== 'fragment') continue;
    const bindings = bindingsValue(exported.bindingsType, 'draw');
    if (bindings === undefined) continue;
    const name = exported.name;
    return `${HEADER(file)}
import { ${name} } from '${from}';

/** Draw \`${name}\` into the canvas once a frame. */
export function animate(canvas: HTMLCanvasElement): void {
  const frame = (ms: number): void => {
${/\btime\b/.test(bindings) ? '    const time = ms / 1000;\n' : ''}    void ${name}(canvas, ${bindings});
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
`;
  }
  for (const exported of exports) {
    if (exported.kind !== 'compute') continue;
    const bindings = bindingsValue(exported.bindingsType, 'dispatch');
    if (bindings === undefined) continue;
    const name = exported.name;
    const size = exported.entry.wg[0];
    return `${HEADER(file)}
import { ${name} } from '${from}';

/** Dispatch \`${name}\` once, and log the bindings it wrote. */
export async function run(): Promise<void> {
  const bindings = ${bindings};
  await ${name}(bindings, ${size > 1 ? `Math.ceil(${ELEMENTS} / ${size})` : ELEMENTS});
  console.log(bindings);
}
`;
  }
  for (const exported of exports) {
    if (exported.kind !== 'kernel') continue;
    const [src, dst, width, height] = exported.face.params;
    if (
      exported.face.params.length !== 4 ||
      src?.k !== 'texture' ||
      src.s !== 'texture_2d<f32>' ||
      dst?.k !== 'texture' ||
      dst.storage?.format !== 'rgba8unorm' ||
      !['write', 'read_write'].includes(dst.storage.access) ||
      width?.k !== 'value' ||
      width.type.k !== 'num' ||
      height?.k !== 'value' ||
      height.type.k !== 'num'
    )
      continue;
    const name = exported.name;
    return `${HEADER(file)}
import { createDevice } from 'typeshade/runtime';
import 'typeshade/fuse';
import { ${name} } from '${from}';

/** Process a colour gradient with \`${name}\`, and show the resulting image. */
export async function run(canvas: HTMLCanvasElement) {
  const width = 128;
  const height = 96;
  const image = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      image.data[i] = Math.round(255 * x / (width - 1));
      image.data[i + 1] = Math.round(255 * y / (height - 1));
      image.data[i + 2] = 64;
      image.data[i + 3] = 255;
    }
  }
  const device = await createDevice({ prefer: ['webgpu', 'cpu'] });
  try {
    const target = device.texture({ size: [width, height], format: 'rgba8unorm', storage: true });
    await device.fuse(() => {
      void ${name}(image, target, width, height);
    });
    const pixels = await target.read();
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')?.putImageData(
      new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0,
    );
    return { width, height, tier: device.tier };
  } finally {
    await device.dispose();
  }
}
`;
  }
  const names = exports.filter((e) => !(e.kind === 'never' && e.typeOnly)).map((e) => e.name);
  const named = names.length > 0 ? `, { ${names.join(', ')} }` : '';
  return `${HEADER(file)}
//
${comment(`${file} has no entry this starter can call, so it opens the program runtime and lists the entries of the compiled program, the module's default export.`)}
import { runtime } from 'typeshade/runtime';
import program${named} from '${from}';

/** Open the runtime, and log the program's entries. */
export async function run(): Promise<void> {
  const rt = await runtime();
  const entries = program.entries.map((entry) => \`\${entry.stage} \${entry.name}\`);
  console.log(\`\${entries.length} entries, runtime on \${rt.tier}:\`, entries.join(', '));
}
`;
}
