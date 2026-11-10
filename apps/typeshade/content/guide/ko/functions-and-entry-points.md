---
id: functions-and-entry-points
source: 3924bfe58f2d21905d5ad3ab67c32a12e18ac0fe8f00c0b9de701d6975791780
sourceLine: 585
rules: 1.4 AyrFRt9RzpqisjmBeAhKhYBPY_8uzSPYr2SvQfsZH8k=, 1.8 43bZ1DaVTE9M73oyG3SDoNOYOFJaT_vhpaVV8tUF4K0=, 6.6 v9R6bYC4u9FE8PK38m5uVaVvXQHjyaWMpH1XGuB7AWA=, 6.7 RHgMFWhF7JfCvwF5_NDsVqKVq6eCr6gGI4sXIByH9Q8=, 6.8 jWjZUCCE0mQuMIaUlYZya37HzqjWIaNgI9LICjNRoRk=, 8.1 ugDum55qOp8zOu08iFeRXe7bAbNGFjTioL6j88ZGoe4=, 8.5 Kq2hCdlup1NA0l4vhuwirKDHJRnVjrkr0ZK9UUZFYbQ=, 8.22 wnazXzoQOoPisUu8hL-Q08toqLE3nWvxFji7BZ7x4dc=
---

헬퍼 함수는 다른 함수에서 호출하며, 진입점은 버텍스·프래그먼트·컴퓨트 스테이지에서 실행합니다. 이 페이지는 함수 선언, 호출, 진입점, 모듈 구성을 설명합니다.

### 함수 선언하기

셰이더 함수는 모두 `function` 선언으로 작성합니다. 일반 헬퍼와 파이프라인이 실행하는 진입점에 같은 문법을 사용합니다. 매개변수에는 타입을 지정하며, 본문은 일반 TypeScript로 작성합니다.

```ts
"use typeshade";

// Helper: the return type is f32, the type the body returns.
export function distToSegment(p: vec2, a: vec2, b: vec2): f32 {
  const ab = b - a;
  const len2 = dot(ab, ab);
  const t = clamp(dot(p - a, ab) / max(len2, 1e-10), 0., 1.);
  const segDist = length(p - a - ab * t);
  return len2 < 1e-10 ? length(p - a) : segDist;
}
```

매개변수 이름으로 `sample`, `filter`, `texture`처럼 GLSL이 예약한 이름을 써도 됩니다. IR은 그
이름을 그대로 두고, GLSL 백엔드가 생성할 때 이름을 바꿉니다. 지역 함수(다른 함수 안에서 선언한 함수)와 함수를 인자로 받는 함수도 TypeScript의 형태 그대로 쓸 수 있습니다
(`docs/use-typeshade-surface.md` §14).

### 반환 타입

반환 타입을 생략하면 TypeScript가 본문에서 추론합니다. 모든 `return`의 값은 이 타입과 일치해야 하며, 일치하지 않으면 컴파일 오류가 발생합니다. 값을 반환하지 않는 본문의 타입은 `void`입니다.

```ts
"use typeshade";

declare const outputB: storage<array<f32>, "read_write">;

// Inferred: dot() yields f32, so luma returns f32.
export function luma(c: vec3) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Inferred too: this one writes into a storage buffer and returns no value, so it is void.
export function store(i: u32, v: f32) {
  outputB[i] = v;
}

// Written: a return from inside a branch is an ordinary return.
export function firstHit(d: f32): f32 {
  if (d < 0.) {
    return 0.;
  }
  return d;
}
```

### 함수 호출하기

함수 호출은 TypeScript와 같이 인자를 위치 순서대로 전달합니다. 컴파일러는 인자의 개수와 타입을 선언과 대조합니다. 파일에서 선언하거나 가져온 함수가 같은 이름의 내장 함수보다 우선합니다.

```ts
const d = distToSegment(uv, p0, p1);
```

매개변수의 기본값은 호출 지점에서 채워집니다. 함수는 다른 함수를 매개변수로 받을 수도 있으며,
호출할 때마다 그 자리의 스코프에 있는 함수 이름을 넘깁니다(`docs/use-typeshade-surface.md` §14).
WGSL에는 호출 스택이 없으므로 재귀는 거부됩니다.

### 진입점

진입점은 스테이지 속성 `@vertex`, `@fragment`, `@compute([…])` 가운데 정확히 하나를 앞에 쓴 최상위 함수
선언입니다. 진입점의 이름은 선언의 이름입니다. 컴퓨트 진입점은 워크그룹 크기를 속성의 인자로 `@compute([64])`나
`@compute([8, 8])`처럼 적습니다. 인자 없이 쓴 `@compute`는 기본값 64를 씁니다. 변경 0111의 스테이지
호출(`export const main = compute([64], function main(…) { … })`)은 `TS8028`로 거부되며, 진입점에 붙인
`export default`도 마찬가지입니다(변경 0130, 0140). `tshc migrate`는 둘 다 속성 형태로 바꿔 씁니다.

```ts
"use typeshade";

const WINDOW: u32 = 8;

declare const params: uniform<vec4u>;
declare const input: storage<array<f32>>;
declare const output: storage<array<f32>, "read_write">;

@compute([64])
export function reduceWindows(gid: builtin<"global_invocation_id">): void {
  const idx = gid.x;
  if (idx >= params.x) {
    return;
  }
  const base = idx * WINDOW;
  let acc = 0.;
  for (let k: u32 = 0; k < WINDOW; k++) {
    acc += input[base + k];
  }
  output[idx] = acc;
}
```

가드는 평범한 `return`으로 마지막 문장 전에 함수를 빠져나갑니다. 조기 반환은
[제어 흐름](/guide/authoring/control-flow/)에서 다룹니다.

워크그룹 크기에는 `override<u32>` 이름을 사용할 수도 있습니다. 같은 이름을 워크그룹 임시 배열의
바깥 길이에도 사용합니다. 일반 TypeScript 호스트 코드는 입력 형태에 따라 특수화 값을 고른 뒤
`program.compute(entry, { constants })`나 가져온 진입점의 선택적 세 번째 인자
`entry(bindings, groups, { constants })`로 전달합니다. 프로그램 파이프라인은 확정된
`pipeline.workgroupShape`를 반환합니다. `device.fuse()` 안을 포함한 진입점 호출은 선택한
모양을 사용하며, 전달한 워크그룹 개수는 변경하지 않습니다. 소스 형태, 제한, 호스트 호출은
[`docs/use-typeshade-surface.md` §3](docs/use-typeshade-surface.md#3-entries--stage-attributes-and-explicit-builtins),
[`§15`](docs/use-typeshade-surface.md#15-textures-samplers-and-overrides),
[`§24`](docs/use-typeshade-surface.md#24-module-variables),
[`§69`](docs/use-typeshade-surface.md#69-running-a-compiled-program)에 설명되어 있습니다.

### 스테이지 매개변수

스테이지는 매개변수로 입력을 받습니다. `builtin<"id">`는 하드웨어가 제공하는 `"vertex_index"`, `"position"`,
`"global_invocation_id"` 같은 값을 선언하며, 그 타입은 WGSL이 그 값에 정한 타입입니다. `builtin<…>`이 없는
매개변수는 사용자가 정의한 입력입니다. 버텍스 진입점에서는 버텍스 속성이고, 프래그먼트 진입점에서는 스테이지 사이를
오가는 값이며 버텍스 결과에서 이름이 같은 필드의 location을 받습니다. location은 컴파일러가 정합니다.
`location<n, T>`는 번호를 직접 적으며, 버텍스 진입점이 없는 파일의 프래그먼트 진입점은 이 번호를 적습니다. 같은
형태를 두 스테이지가 공유하는 IO 구조체, 곧 인터페이스나 클래스의 필드에도 사용합니다. 보간 모드는
[레이아웃과 리소스](/guide/authoring/layouts-and-resources/)에서 설명합니다.

```ts
"use typeshade";

interface VsOut {
  pos: builtin<"position">;
  uv: location<0, vec2>;
}

interface Gradient {
  top: vec4;
  bottom: vec4;
  mixBias: f32;
}

declare const u: uniform<Gradient>;

@vertex
export function vsFull(idx: builtin<"vertex_index">): VsOut {
  let pos = vec2(-1., -1.);
  if (idx == 1) {
    pos = vec2(3., -1.);
  } else if (idx == 2) {
    pos = vec2(-1., 3.);
  }
  return { pos: vec4(pos, 0., 1.), uv: vec2((pos.x + 1.) * 0.5, (pos.y + 1.) * 0.5) };
}

@fragment
export function fsGradient(vo: VsOut): vec4 {
  const t = vo.uv.y + u.mixBias;
  const rgb = mix(u.bottom.rgb, u.top.rgb, t);
  return vec4(rgb, 1.);
}
```

구조체 없이 값만 돌려주는 프래그먼트 진입점은 따로 적지 않아도 첫 번째 색상 어태치먼트인
location 0을 받습니다. 구조체 없이 `vec4`만 돌려주는 버텍스 진입점은 위치를 반환합니다.
구조체를 돌려주는 진입점은 구조체 필드에 속성을 붙입니다.

### 모듈 조립하기

파일 하나가 모듈 하나입니다. 파일의 함수, 구조체, 상수, 리소스가 함께 생성됩니다. WGSL에는
파일이 선언한 모든 함수가 파일에 선언된 순서대로 들어갑니다. WGSL에서는 뒤에 선언된 함수를
불러도 되기 때문입니다. GLSL 스테이지에는 그 스테이지의 진입점이 닿는 함수만 들어가며, GLSL ES
3.00의 요구대로 불리는 함수가 부르는 함수보다 앞에 놓입니다.

파일은 다른 TypeScript 모듈처럼 다른 셰이더 파일의 내보내기를 가져옵니다. 컴파일 대상 파일과 직접 또는 간접적으로
가져오는 셰이더 파일이 하나의 프로그램과 모듈을 구성합니다. 일반 import는 컴파일 대상 파일이 사용하는 선언을
가져오며, 헬퍼, 구조체, 상수, 바인딩이 여기에 포함됩니다. 관련 없는 진입점은 포함되지 않습니다. 반면 순수 루트 별칭은
최종 대상을 그대로 보존합니다([다른 셰이더 모듈을 가져오는 모듈](#a-shader-module-that-imports-another) 참고).

```ts
// noise.shade.ts
"use typeshade";

export function hash(p: vec2): f32 {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// clouds.shade.ts
"use typeshade";

import { hash } from "./noise.shade.ts";

@fragment
export function fs(uv: location<0, vec2>): vec4 {
  return vec4(hash(uv), hash(uv * 2.), 0., 1.);
}
```

이런 프로그램을 컴파일하는 호스트 호출은
[다른 셰이더 모듈을 가져오는 모듈](#a-shader-module-that-imports-another)에 있습니다.

### 모듈 안 함수의 이름

함수는 두 타깃 모두에서 선언한 이름으로 생성됩니다. 단, 타깃의 예약어이면 이름을 바꿉니다. WGSL에서 `use`라는 함수는 `use_`로 생성됩니다. 내장 함수와 이름이 같은 진입점도 이름이 바뀝니다. 기록에는 원래 이름과 생성된 이름이 모두 있으므로, 호스트는 작성한 이름으로 파이프라인을 생성합니다.

컴파일러가 헬퍼에 다른 이름을 붙이는 경우는 두 가지가 더 있습니다. 첫째, 직접 만든 `fract`처럼 내장
함수와 이름이 같은 헬퍼는 `fract_`로 생성되고, 그 선언을 거치는 모든 호출도 함께 바뀝니다.
WGSL에서는 내장 함수가 가려지고, GLSL ES 3.00은 다시 선언하는 것을 거부하기 때문입니다. 둘째,
한 프로그램의 두 파일이 같은 이름의 비공개 헬퍼를 각각 선언하면 두 번째 헬퍼는 자기만의 이름으로
생성됩니다. CPU 오라클은 각 함수를 파일이 붙인 이름으로 부릅니다. 타깃마다 예약한 이름은
`docs/use-typeshade-surface.md` §62에 있습니다.
