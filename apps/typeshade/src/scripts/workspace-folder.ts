// The Playground's workspace as a folder a reader opens in VS Code: the files as they are in the
// tabs, host.ts among them, `typeshade.json` naming the main file and the pass graph, a
// `tsconfig.json` over the shader files, and `.vscode/extensions.json` recommending the extension. The folder layout is
// the one vscode-typeshade's docs/playground-bridge.md §2.1 proposes, and it holds nothing the
// Playground's link does not also carry (DESIGN.md, Playground, "The link").

/** One pass of the graph, in draw order: its name and the file it is drawn from. */
export interface FolderPass {
  readonly name: string;
  readonly path: string;
}

/** The extension's id on the Marketplace and on Open VSX. */
const EXTENSION = 'typeshade.vscode-typeshade';

const json = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

/** Every file of the folder by its path in it, the main file at the root, and host.ts beside it
 *  when the workspace holds one. */
export function workspaceFolder(
  main: { readonly path: string; readonly text: string },
  files: Readonly<Record<string, string>>,
  passes: readonly FolderPass[],
  host?: string,
): Record<string, string> {
  return {
    [main.path]: main.text,
    ...(host !== undefined ? { 'host.ts': host } : {}),
    ...files,
    'typeshade.json': json({
      main: main.path,
      ...(passes.length > 0 ? { passes: passes.map((p) => ({ name: p.name, file: p.path })) } : {}),
    }),
    'tsconfig.json': json({
      compilerOptions: {
        module: 'esnext',
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        experimentalDecorators: true,
        strict: true,
        noEmit: true,
      },
      include: ['**/*.shade.ts'],
    }),
    '.vscode/extensions.json': json({ recommendations: [EXTENSION] }),
  };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A zip archive of the files, stored without compression: the files are a few kilobytes of
 *  text, and a stored archive needs no library. Every entry carries 1980-01-01 00:00, the
 *  earliest time a zip can name, so the same workspace gives the same bytes. Names are UTF-8
 *  (general purpose flag bit 11). */
export function zipStored(files: Readonly<Record<string, string>>): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const DOS_DATE = (0 << 9) | (1 << 5) | 1;
  for (const [path, text] of Object.entries(files)) {
    const name = encoder.encode(path);
    const data = encoder.encode(text);
    const crc = crc32(data);
    const head = new Uint8Array(30 + name.length);
    const h = new DataView(head.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint16(4, 20, true);
    h.setUint16(6, 0x0800, true);
    h.setUint16(8, 0, true);
    h.setUint16(10, 0, true);
    h.setUint16(12, DOS_DATE, true);
    h.setUint32(14, crc, true);
    h.setUint32(18, data.length, true);
    h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true);
    h.setUint16(28, 0, true);
    head.set(name, 30);
    const entry = new Uint8Array(46 + name.length);
    const e = new DataView(entry.buffer);
    e.setUint32(0, 0x02014b50, true);
    e.setUint16(4, 20, true);
    e.setUint16(6, 20, true);
    e.setUint16(8, 0x0800, true);
    e.setUint16(10, 0, true);
    e.setUint16(12, 0, true);
    e.setUint16(14, DOS_DATE, true);
    e.setUint32(16, crc, true);
    e.setUint32(20, data.length, true);
    e.setUint32(24, data.length, true);
    e.setUint16(28, name.length, true);
    e.setUint32(42, offset, true);
    entry.set(name, 46);
    local.push(head, data);
    central.push(entry);
    offset += head.length + data.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const d = new DataView(end.buffer);
  d.setUint32(0, 0x06054b50, true);
  d.setUint16(8, central.length, true);
  d.setUint16(10, central.length, true);
  d.setUint32(12, centralSize, true);
  d.setUint32(16, offset, true);
  const parts = [...local, ...central, end];
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
