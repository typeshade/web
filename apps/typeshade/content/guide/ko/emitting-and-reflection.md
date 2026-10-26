---
id: emitting-and-reflection
source: 16054602f63c26560685461877a2234afca846d4caaf058983c7e55a75acb76a
sourceLine: 1172
rules: 6.6 qXyf0FpXuS4xir_HpHadSIsWFZT2WtMx8M-wm9BvJOE=, 12.3 CjhXTenX6H0V0STxt5Bka_Sp7X0GVUeCZR9Mt1IqNvA=
---

이 페이지는 모듈을 WGSL, GLSL 스테이지 두 개, 호스트 프로그램에 결합할 모듈 조각(module fragment)으로 생성하는 방법을 설명합니다. 바인딩에 필요한 파이프라인 메타데이터를 읽는 방법도 다룹니다.

생성(emit)은 모듈의 IR을 특정 타깃의 소스로 변환합니다. 리플렉션은 같은 모듈에서 셰이더의 요구 사항을 데이터로 추출합니다. 호스트는 이를 읽어 버퍼 할당, 바인드 그룹 생성, 버텍스 레이아웃 설정에 사용하므로 선언을 수동으로 다시 작성할 필요가 없습니다. 두 기능 모두 IR을 읽기만 하며 입력 모듈은 변경하지 않습니다.

이 페이지의 예제는 다음 소스에서 `compile()`이 돌려준 모듈을 `m`이라는 이름으로 읽습니다.

```ts
"use typeshade";

interface Uniforms {
  time: f32;
  tint: vec4;
}

declare const u: uniform<Uniforms>;

class VsOut {
  @builtin("position") pos: vec4;
  @location(0) uv: vec2;
}

@vertex
export function vs(@location(0) xy: vec2): VsOut {
  return { pos: vec4(xy, 0., 1.), uv: xy * 0.5 + 0.5 };
}

@fragment
export function fs(vo: VsOut): vec4 {
  return u.tint * (0.5 + 0.5 * sin(u.time + vo.uv.x));
}
```

### WGSL 생성

`compile()`은 이미 WGSL을 `wgsl`로 반환합니다. `emitModule(m)`은 모듈에서 같은 문자열을
돌려주며, 빌드마다 달라지는 옵션을 받습니다. 최적화 수준, 괄호 모드, f64 방식, 플러그인 체인이
그런 옵션입니다. 생성 전 검사를 먼저 돌리므로,
검증에 실패하는 모듈이나 타깃이 지원하지 않는 기능을 쓰는 모듈은 생성을 호출하는 시점에
오류 코드가 붙은 오류를 던집니다.

```ts
import { compile, emitModule, emitModuleAt, emitIdentity } from 'typeshade'

const { module: m } = compile(source)
const wgsl = emitModule(m) // the same string as compile(source).wgsl

// The same module at an explicit optimization level. 'O2' is what emitModule runs and is
// byte-identical to it; 'O0' is the lowered module with no optimizer pass.
const naive = emitModuleAt(m, 'O0')

// A one-line identity for one emit configuration, for a build to compare:
emitIdentity('wgsl') // 'wgsl;parens=full;fp64=float;plugins=-#069d5f95'
```

생성 결과는 모듈과 설정에 따라 달라집니다. 괄호 모드, f64 방식, 고정된 오버라이드 값, 플러그인 체인은 모두 출력 바이트에 영향을 줍니다. 다른 설정으로 생성한 파일을 비교하면 모듈 변경과 무관한 diff가 생길 수 있습니다. `emitIdentity(target, opts)`는 설정을 읽을 수 있는 한 줄 요약과 다이제스트로 반환합니다. 아티팩트와 함께 기록해 빌드 후 비교합니다. 값이 같으면 생성 설정도 같으며, 값이 다르면 변경한 항목을 확인할 수 있습니다.

### GLSL ES 3.00 생성

WebGL2 프로그램은 따로 컴파일되는 셰이더 두 개로 이루어지므로, GLSL 백엔드는 호출 한 번에
스테이지 하나씩만 생성합니다. `emitGlslStages(m)`은 한 모듈의 두 스테이지를 한꺼번에
돌려주며, 두 스테이지에 공통인 하향 변환(lowering)은 한 번만 수행합니다. `compile()`이 `glsl`로
돌려주는 값이 바로 이 결과입니다.

```ts
import { emitGlslModule, emitGlslStages } from 'typeshade'

const { vertex, fragment } = emitGlslStages(m)

// One stage on its own, byte-identical to that member of the pair.
const fs = emitGlslModule(m, 'fragment')

// Omit the stage for the whole module in one string. It carries every entry point, so it
// is for reading and diffing and does not compile as a stage.
const whole = emitGlslModule(m)
```

문자열마다 `#version 300 es` 줄과 정밀도 프리앰블이 들어 있고, 선언은 그 스테이지가 실제로
쓰는 것만 담깁니다. 하향 변환은 결정적이라 두 스테이지가 공유하는 이름은 전부 같게 나오고,
그래서 둘을 링크할 수 있습니다. 한 스테이지 안에 진입점을 여러 개 담은 모듈이라면
`emitGlslStages`에 `vertexEntry`와 `fragmentEntry`도 넘길 수 있으며, 이름을 지정해도 하향
변환은 여전히 한 번입니다. GLSL은 스테이지마다 `main()`이 하나뿐이라, 이런 스테이지에서 진입점
이름을 지정하지 않으면 `emitGlslStages`와 `emitGlslModule` 모두 거부합니다. `compile()`은 이를
`TS8015` 경고로 알리고 `glsl`은 undefined로 둡니다. GLSL 쪽 함수는 WGSL 생성 옵션에 GLSL 전용 옵션을 더해 받습니다.
전체 목록은 `GlslEmitOptions` 참고 문서에 있습니다.

### 모듈 조각

모듈 조각은 버전 헤더 없이 선언과 헬퍼를 제공하는 프로그램의 일부입니다. 기본적으로 진입점도 포함하지 않습니다. 호스트가 최종 프로그램을 구성하고 생성된 텍스트를 결합할 때 사용합니다. GLSL 코드베이스의 `#include`를 대체할 수 있습니다. `emitGlslFragment(m, stage)`는 GLSL 조각을, `emitFragment(m)`은 WGSL 조각을 같은 구조로 반환합니다.

```ts
import { emitFragment, emitGlslFragment } from 'typeshade'

const f = emitGlslFragment(m, 'fragment')

f.source // 'struct VsOut {\n  vec4 pos;\n  vec2 uv;\n};…', the declarations and helpers
f.preamble // ['#version 300 es', 'precision highp float;', 'precision highp int;']
f.declares // { functions, structs, bindings, consts, overrides, entryPoints }
f.requires // [], the symbols this fragment calls and does not define

// Keep the entry points, and the WGSL twin:
const w = emitFragment(m, { entryPoints: true })
```

프리앰블은 문자열에 섞이지 않고 데이터로 돌아오므로, 조각 여러 개를 조합하는 쪽에서 그
줄들을 합치고 중복을 걸러 낼 수 있습니다. 빠지는 줄이 없으니 정규식으로 헤더를 걷어 낼
일도 없습니다. `declares`는 `source`가 무엇을 정의하는지 적은 목록이라 조합하는 쪽이 이어
붙이기 전에 이름 충돌을 확인할 수 있고, `requires`는 호스트 쪽 프리앰블이 채워 줘야 하는
이름을 나열합니다. 진입점은 따로 요청하지 않으면 조각에 들어가지 않지만,
`declares.entryPoints`에는 어느 경우든 이름이 올라갑니다. 조각에 들어가지 않아도 진입점이
스테이지 범위를 정하기 때문입니다. 조각이 어떤 헬퍼, 구조체, 바인딩을 담는지는 그
스테이지에 무엇이 필요한지로 정해집니다. 모듈 조각도 모듈 전체를 생성할 때와 같은 생성 전
검사를 거칩니다.

### reflect가 돌려주는 것

`reflect(m)`은 모듈을 타깃과 독립적인 데이터로 기술합니다. `reflect`는 백엔드 인자 없이 모듈만 받으므로, 리플렉션 하나로 WGSL과 GLSL 생성 결과를 모두 설명합니다.

```ts
import { reflect } from 'typeshade'

const r = reflect(m)

r.bindGroups // [{ group: 0, entries: [{ group: 0, binding: 0, name: 'u', space: 'uniform',
//                 resourceKind: 'uniform-buffer', owner: 'module',
//                 structName: 'Uniforms', stages: ['fragment'] }] }]
r.uniforms // [{ name: 'Uniforms', size: 32, align: 16, fields: [
//              { name: 'time', type: 'f32', offset: 0, align: 4, size: 4 }, … ] }]
r.storage // std430 layouts for a storage binding declared directly as a struct
r.vertex // { attributes: [{ name: 'xy', location: 0, type: 'vec2<f32>', offset: 0 }], arrayStride: 8 }
r.entries // [{ name: 'vs', stage: 'vertex', inputs: ['vec2<f32>'], output: 'struct:VsOut', io }, …]
r.overrides // the pipeline constants a host supplies per variant
r.requiredFeatures // the capabilities a host must have active before it creates a pipeline
r.requiredLanguageFeatures // the WGSL language features the browser must implement
r.requires // host-provided globals the module references and does not declare
```

`uniforms`는 유니폼 블록의 std140 레이아웃이고, `storage`는 스토리지 버퍼의 std430 레이아웃입니다. 두 레이아웃은 필드별 오프셋, 정렬, 크기를 제공합니다. 구조체 크기는 정렬 단위로 올림되어 있어 배열 스트라이드로 사용할 수 있습니다. `storage<array<T>>`는 요소 타입의 배열 바인딩이므로 `bindGroups`에 포함되지만 `storage`에는 항목이 없습니다. 요소의 std430 스트라이드나 다른 구조체의 레이아웃이 필요하면 선언에 `wgslLayout`을 호출합니다. [레이아웃과 리소스](/guide/authoring/layouts-and-resources/)의 구조체는 `wgslLayout(m.structs.find((s) => s.name === 'ShapeSegment')!, 'std430')`로 조회합니다. 버텍스 진입점에 `location` 매개변수가 없으면 `vertex`는 `undefined`이입니다.

`packModule(m)`은 같은 정보를 평범한 JSON 매니페스트 하나로 모읍니다. 프로그램의 WGSL, 바이트
레이아웃이 붙은 바인딩, 진입점, WebGL2 프로그램이 여기에 들어갑니다. 빌드가 이 매니페스트를
디스크에 쓰고, `typeshade/runtime`이 불러온다(`docs/use-typeshade-surface.md` §69).

### 리플렉션에서 바인딩하기

호스트는 `bindGroups`의 각 항목에 대응하는 리소스를 생성합니다. 생성할 리소스는 다음 세 필드로 결정합니다.

```ts
import { reachFrom, reflect, stageOf } from 'typeshade'

for (const group of reflect(m).bindGroups) {
  for (const e of group.entries) {
    if (e.owner === 'host') continue // the surrounding renderer allocates this one
    e.resourceKind // 'uniform-buffer' | 'storage-buffer' | 'texture' | 'sampler'
    e.stages // ['fragment'], ordered vertex, fragment, compute
  }
}

// The same reachability question for an entry set you choose yourself:
const reach = reachFrom(
  m,
  m.funcs.filter((f) => stageOf(f) === 'fragment'),
)
reach.bindings // Set { 'u' }, the binding names that stage reads
reach.fns // the call-graph closure from those entries, the entries included
```

`owner`는 리소스 할당 주체를 나타냅니다. 모듈이 바인딩을 선언하고 호스트가 리플렉션에 따라 할당하는 경우는 `'module'`이입니다. `"use typeshade"` 파일의 바인딩은 모두 이에 해당합니다. `resourceKind`는 생성할 리소스 종류입니다. 텍스처 항목의 `textureDim`과 `textureElem`은 뷰 생성에 사용하며, 선언 방법은 [레이아웃과 리소스](/guide/authoring/layouts-and-resources/)에서 설명합니다. 바인드 그룹 레이아웃의 `sampleType`은 깊이 텍스처가 `'depth'`, 정수 텍스처가 `'uint'` 또는 `'sint'`이입니다. `f32` 텍스처를 샘플러와 함께 읽으면 `'float'`이고, 텍셀·크기·개수만 조회하면 `'unfilterable-float'`이입니다. `r32float` 같은 32비트 실수 텍스처에는 후자가 필요합니다. `stages`는 바인딩을 사용하는 스테이지 목록입니다. WebGPU에서는 바인드 그룹 레이아웃의 가시성 마스크로, WebGL2에서는 스테이지별 유니폼 블록 바인딩 포인트와 텍스처 유닛 할당에 사용합니다.

바인드 그룹에는 직접 선언한 바인딩과 하향 변환에서 추가한 바인딩이 모두 포함됩니다. [fp64](/guide/authoring/fp64/) 하향 변환은 에뮬레이션 헬퍼가 가드 텍스처를 읽는 모듈에 `_fp64` 텍스처 바인딩을 추가합니다. 이는 해당 페이지에서 설명하는 가드 텍스처입니다. 리플렉션을 사용하는 호스트는 생성 경위를 구별하지 않고 다른 바인딩과 같은 방식으로 연결합니다. 리플렉션이 실제 실행 프로그램과 일치하려면 생성 옵션의 `fp64Flavor`를 `reflect`에도 동일하게 전달해야 합니다.
