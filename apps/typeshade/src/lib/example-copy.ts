// A few compiler example blurbs need a site-facing description: some are fragments, and some
// point to compiler-internal rule/change numbers a reader cannot open here. Keep the original
// generated text as the match key. A pin that changes one of these blurbs fails the build so
// the site copy can be reviewed against the new source instead of silently masking it.
const TILE_COPY: Readonly<Record<string, { readonly source: string; readonly text: string }>> = {
  'array-length': {
    source: 'The bounds guard every kernel over a runtime-sized storage array needs.',
    text: 'A bounds check for a kernel that processes a runtime-sized storage array.',
  },
  'array-methods': {
    source:
      'Three lights in an `array<Light, 3>`, lit with the methods a TypeScript author reaches for first (Rule 8.18, surface §63).',
    text: 'Three lights in an `array<Light, 3>`, shaded with the array methods TypeScript developers commonly use.',
  },
  'capsule-corp-namek-class': {
    source: 'A class-based conversion of a Dragon Ball Z Capsule Corp.',
    text: 'A TypeShade class-based scene of the Capsule Corp. spaceship on Namek.',
  },
  'class-builder': {
    source:
      '`a.at(p).tinted(c)` runs each call on `a`, in order, because a method whose every `return` is `return this` hands back its own object, and `new Disc().at(p).sized(r)` holds what `new` built in a temporary (Rule 8.10).',
    text: 'Shows how `return this` keeps a builder chain on the same object, while a chain starting with `new` uses a temporary.',
  },
  'class-parts': {
    source:
      '`ring.advance(dt)` moves the ring by calling `step` on the `Mover` it holds, so `advance` changes its own object and takes it by reference, whichever class `step` belongs to (Rule 8.10).',
    text: '`ring.advance(dt)` calls `step` on its `Mover` field and passes the changed object by reference.',
  },
  'compute-sync': {
    source: 'The three synchronisation builtins WGSL has and this surface lacked.',
    text: 'Three workgroup synchronization operations: compare-exchange, uniform load and texture barrier.',
  },
  'fp64-lane-stripes': {
    source: 'The `f64` surface as source.',
    text: 'A shader that compares emulated `f64` and `f32` precision at a large world coordinate.',
  },
  'higher-order': {
    source:
      '`cover` and `around4` take a distance field as a function, `f: Field`, and are compiled once for each function a call hands them, as a generic function is once per set of type arguments (Rule 8.18).',
    text: '`cover` and `around4` accept a distance-field function and compile a copy for each function passed to them.',
  },
  'inferred-returns': {
    source:
      'No function here writes a return type, and each returns what its body does, as TypeScript infers it (Rule 8.19).',
    text: 'Each function omits its return type, which TypeShade infers from the value its body returns.',
  },
  'integer-math': {
    source: 'The two builtins the registry called portable and are not.',
    text: 'Integer `abs` and `dot`, which GLSL ES 3.00 does not provide for these input types.',
  },
  'kernel-array-methods': {
    source:
      '`sumOfSquares`, `scale` and `firstAbove` reduce, write and search an array with the methods of `Array.prototype` a TypeScript developer writes first (change 0079).',
    text: '`sumOfSquares`, `scale` and `firstAbove` use array methods to reduce, write and search kernel data.',
  },
  'kernel-image-invert': {
    source:
      '`invert` reads a `texture_2d<f32>` and stores into a `texture_storage_2d`, which makes it a kernel function (Rule 8.22, change 0077).',
    text: '`invert` reads a `texture_2d<f32>` and writes the result to a `texture_storage_2d` in a kernel loop.',
  },
  'kernel-push': {
    source:
      '`strong` appends the index of each element above a threshold with `out.push(i)` (change 0078).',
    text: '`strong` uses `out.push(i)` to append the index of each element above a threshold.',
  },
  'kernel-set-unique': {
    source:
      "`labels` adds each nonzero pixel's label to a `Set<u32>` with `seen.add(...)` (change 0080), and `latest` keeps the last value set for each key in a `Map<u32, f32>`.",
    text: "`labels` collects nonzero pixel labels in a `Set<u32>`, while `latest` keeps each key's last value in a `Map<u32, f32>`.",
  },
  'loop-kernel': {
    source: "The roadmap's terrain.",
    text: 'A terrain kernel that processes each element of a runtime-sized output array.',
  },
  'normal-matrix': {
    source: 'Every `matCxR` is a type.',
    text: 'Uses `mat3` for a normal matrix, and demonstrates matrix truncation, transpose and multiplication.',
  },
  'packing-bitcast': {
    source: 'The portable builtins WGSL has that this surface lacked.',
    text: 'Examples of packing, bitcast and constructor operations available to TypeShade shaders.',
  },
  'voronoi-twin': {
    source: '`voronoi.ts` written in the source language, and the gate for issue #40.',
    text: 'A moving Voronoi pattern written in TypeScript syntax.',
  },
};

const TWIN_TILE_COPY: Readonly<Record<string, { readonly source: string; readonly text: string }>> =
  {
    'voronoi-twin': {
      source: 'Animated cellular noise.',
      text: 'A moving Voronoi pattern written in TypeScript syntax.',
    },
  };

const HOST_TILE_COPY: Readonly<Record<string, { readonly source: string; readonly text: string }>> =
  {
    'string-keys-record': {
      source:
        'A closed set of channel names becomes u32 ids, and a Record becomes an array in id order (change 0081).',
      text: 'A fixed set of channel names becomes `u32` ids, and a `Record` becomes an array in id order.',
    },
    'host-set-unique': {
      source:
        "Four kernel functions that take JavaScript's own `Set` and `Map` (change 0080), and the host that calls them.",
      text: 'Four kernel functions accept JavaScript `Set` and `Map` values, and a host calls them.',
    },
  };

const HOST_PAGE_REFERENCES: Readonly<Record<string, readonly string[]>> = {
  'host-draw': [' (Rule 8.24)'],
  'host-compute': [' (Rule 8.24)'],
  'host-kernel': [' (Rule 8.22)'],
  'host-resident': [' (Rule 11.8)'],
  'host-helper': [' (surface §64)'],
  'host-program': [' (Rules 11.10, 11.11)'],
  'loop-fuse': [' (change 0058)'],
  'string-keys-record': [' (change 0081)'],
  'host-set-unique': [' (change 0080)'],
};

function exactTile(
  id: string,
  source: string,
  map: Readonly<Record<string, { readonly source: string; readonly text: string }>>,
): string {
  const entry = map[id];
  if (!entry) return source;
  if (source !== entry.source)
    throw new Error(
      `[example-copy] generated description for '${id}' changed; review its site copy`,
    );
  return entry.text;
}

export const shadeTileCopy = (id: string, source: string): string =>
  exactTile(id, source, TILE_COPY);
export const twinTileCopy = (id: string, source: string): string =>
  exactTile(id, source, TWIN_TILE_COPY);
export const hostTileCopy = (id: string, source: string): string =>
  exactTile(id, source, HOST_TILE_COPY);

/** Remove only the exact compiler-internal citation recorded for this host example. */
export function hostPageCopy(id: string, source: string): string {
  let text = source;
  for (const reference of HOST_PAGE_REFERENCES[id] ?? []) {
    if (!text.includes(reference))
      throw new Error(`[example-copy] expected '${reference.trim()}' in '${id}' source blurb`);
    text = text.replace(reference, '');
  }
  return text.replace(/\s*\(change \d{4}\)/g, '').trim();
}
