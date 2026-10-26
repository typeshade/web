---
id: capabilities-extensions
source: 97b3944d6bccd62314722649758440a27f5f27a2639d318e05bc64461c568f3d
sourceLine: 2110
---

이 페이지는 모듈에 필요한 GPU 기능의 선언, 타깃별 요구 사항, 생성된 디바이스의 지원 여부 확인을 설명합니다. 백엔드가 코드를 생성하지 않고 fail closed 방식으로 실패하는 조건도 다룹니다.

기능(capability)은 모듈이 생성하는 코드에 필요한 GPU 기능을 나타내는 타깃 중립 id입니다. float 텍스처 렌더링이나 float 텍스처 블렌딩이 이에 해당합니다.

### 기능 선언

대부분의 기능은 스스로 선언됩니다. `@builtin("clip_distances")`, `@builtin("primitive_index")`,
서브그룹 내장 값, `@blend_src(n)`을 쓰면 그 쓰임에 필요한 기능이 파생됩니다. 스토리지 바인딩,
컴퓨트 진입점, 한 타깃에 없는 종류의 텍스처도 마찬가지입니다. 어떤 쓰임으로도 파생되지 않는 확장은
`"use typeshade"` 옆에 문자열 지시문으로 활성화합니다. 지시문은 한 줄에 하나씩, WGSL의 이름 그대로
적습니다.

```ts
"use typeshade";
"enable subgroups";

@compute([64])
export function k(@builtin("global_invocation_id") gid: vec3u) {
}
```

기능 이름은 고정되어 있고 타깃과 독립적이므로, 소스에 `EXT_*`나 `OVR_*` 같은 확장 문자열을 직접 적지 않습니다. 기능 게이트(capability gate)는 생성기가 모듈을 처리하기 전에 각 id를 검사합니다. 기능을 표현할 수 없는 백엔드는 해당 기능 이름을 포함한 `UnsupportedFeatureError`(`SD0030`)를 던집니다. 이 실패 방식은 드라이버가 거부할 소스를 생성하는 대신 컴파일 단계에서 실패하는 fail closed 방식입니다.

소스에서 쓸 표기가 없는 기능이 넷 있습니다. `floatRenderTarget`, `float32Blend`,
`float32Filterable`, `multiview`이다. 앞의 셋은 호스트가 켜며 셰이더에는 토큰 하나도 더하지
않고, 넷째는 GLSL `#extension`입니다. 이런 기능이 필요한 호스트는 컴파일된 모듈의 `enables`에
적습니다.

```ts
import { compile, type ModuleDecl } from 'typeshade'

const m: ModuleDecl = { ...compile(source).module, enables: ['floatRenderTarget'] }
```

### id별 타깃 요구 사항

id별 요구 사항은 _호스트 기능_(host feature)과 _소스 지시문_(source directive)으로 나뉩니다. 호스트 기능은 파이프라인 생성 전에 활성화해야 합니다. WebGL2의 `gl.getExtension('EXT_color_buffer_float')`와 WebGPU의 `requiredFeatures` 항목이 이에 해당합니다. 소스 지시문은 셰이더 코드에 필요한 토큰입니다. GLSL ES 3.00에서는 `#extension … : require`, WGSL에서는 `enable …;`를 사용합니다. 백엔드는 중복을 제거하고 정렬해 GLSL의 `#version` 줄 바로 뒤나 WGSL의 선언부 앞에 삽입합니다.

기능에 따라 이 둘 중 하나만 필요할 수도, 둘 다 필요할 수도, 둘 다 필요 없을 수도
있습니다.

| `enables` id         | WebGL2 및 GLSL ES 3.00                                    | WebGPU 및 WGSL                                                     |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------ |
| `floatRenderTarget`  | 호스트 기능 `EXT_color_buffer_float`                      | 코어 사양, 따로 요청할 것 없음                                     |
| `float32Blend`       | 호스트 기능 `EXT_float_blend`                             | 호스트 기능 `float32-blendable`                                    |
| `float32Filterable`  | 호스트 기능 `OES_texture_float_linear`                    | 호스트 기능 `float32-filterable`                                   |
| `multiview`          | 지시문 `GL_OVR_multiview2`와 호스트 기능 `OVR_multiview2` | 미지원, fail closed로 실패                                         |
| `f16`                | 미지원, fail closed로 실패                                | 지시문 `f16`과 호스트 기능 `shader-f16`                            |
| `subgroups`          | 미지원, fail closed로 실패                                | 지시문 `subgroups`와 호스트 기능 `subgroups`                       |
| `clipDistances`      | 미지원, fail closed로 실패                                | 지시문 `clip_distances`와 호스트 기능 `clip-distances`             |
| `primitiveIndex`     | 미지원, fail closed로 실패                                | 지시문 `primitive_index`와 호스트 기능 `primitive-index`           |
| `dualSourceBlending` | 미지원, fail closed로 실패                                | 지시문 `dual_source_blending`과 호스트 기능 `dual-source-blending` |
| `bgra8unormStorage`  | 미지원, fail closed로 실패                                | 호스트 기능 `bgra8unorm-storage`, 파생                             |
| `packed4x8Dot`       | 미지원, fail closed로 실패                                | 코어 사양, 파생. 언어 기능 하나를 확인해야 함                      |

아래쪽 다섯 행은 아무도 직접 선언하지 않는 기능입니다. `@builtin("clip_distances")`,
`@builtin("primitive_index")`, `@blend_src(n)`을 적으면 해당 기능이 파생됩니다. WGSL은
이 셋을 저마다 짝이 맞는 `enable` 없이는 거부하기 때문입니다. `"bgra8unorm"` 스토리지
텍스처와 packed 4x8 계열 함수 호출도 각각 바인딩과 호출에서 기능을 끌어냅니다. 어떤
사용으로도 파생되지 않는 `f16`과, 서브그룹 내장 값을 하나도 읽지 않는 파일의 `subgroups`는
앞에서 본 문자열 지시문으로 적습니다.

호스트 기능만 있고 소스 지시문이 없는 기능은 선언해도 생성되는 셰이더가 한 바이트도
달라지지 않습니다. `float32Blend`와 `float32Filterable` 이름에 붙은 `32`에는 이유가
있습니다. 두 기능이 기대는 확장이 모두 32비트 float 전용이기 때문입니다. 반면
`EXT_color_buffer_float`는 16비트와 32비트 타깃을 모두 지원하므로 `floatRenderTarget`에는
비트 폭을 적지 않습니다.

`capabilityMatrix`는 같은 정보를 데이터로 반환합니다. 백엔드에서 직접 뽑아낸 값이므로
도구나 문서 페이지가 손으로 옮겨 적지 않고 그대로 출력할 수 있습니다.

```ts
import { capabilityMatrix, glslEs300Backend, wgslBackend } from 'typeshade'

capabilityMatrix([wgslBackend, glslEs300Backend])
// → [{ capability: 'storageBuffer', support: { wgsl: 'native', 'glsl-es300': 'unsupported' },
//      declarable: false },
//     …,
//     { capability: 'f16', support: { wgsl: 'directive', 'glsl-es300': 'unsupported' },
//      declarable: true }]
```

결과는 기능마다 한 행씩, 열여덟 행이 고정된 순서로 나오며, 모듈의 모양에서 파생되어 직접 선언할 일이 없는
아홉 기능(`storageBuffer`부터 `textureGather`까지, 그리고 `bgra8unormStorage`와 `packed4x8Dot`)도
`declarable: false`로 함께 들어 있습니다.

표를 해석할 때는 다음 두 제한을 고려해야 합니다.

- 지원한다는 것과 실제로 쓸 수 있다는 것은 다릅니다. `f16`과 `multiview`는 표에 적힌
  타깃에서 지원되지만, 지금은 둘 다 셰이더에서 쓸 방법이 없습니다. `f16` 스칼라 타입이
  없고, `layout(num_views = N) in;`을 적거나 `gl_ViewID_OVR`을 읽을 길도 없기 때문입니다.
  `multiview`를 선언한 모듈은 지시문만 생성하고 여전히 단일 뷰로 렌더링합니다. 나머지 네 기능은
  쓸 수 있습니다. `clipDistances`, `primitiveIndex`, `dualSourceBlending`은 각 속성에
  필요한 기능입니다. `subgroups`는 컴퓨트나 프래그먼트 진입점에
  `@builtin("subgroup_invocation_id")`이나 `@builtin("subgroup_size")`를 적으면 쓰게
  됩니다. 다만 서브그룹 내장 함수(`subgroupAdd` 등)는 아직 없는데, 이는 기능과는 별개인
  빈자리입니다. 어떤 어댑터가 이 네 기능 가운데 하나를 실제로 갖추었는지 알려면
  `reflect().requiredFeatures`를 씁니다. 디바이스는 `requestDevice`에서 요청받은 선택
  기능만 갖습니다. 컴파일 게이트가 바로 그렇게 코퍼스에서 목록을 뽑아 요청하며,
  `examples/clip-planes.shade.ts`가 게이트의 Tint에서 컴파일되는 것도 그 덕분입니다. 이
  소프트웨어 어댑터는 `clip-distances`와 `subgroups`는 제공하지만 `primitive-index`는
  제공하지 않으므로, 그 한 행의 호스트 문자열은 여기서 확인하지 못했습니다.
- 미지원 칸은 의도적으로 넘어갈 수 없게 막아 둔 것이라, 생성하려 하면 오류를 던집니다.
  생성 전에 미리 확인하고 싶으면 `diagnose(m, { backend })`를 쓰면 됩니다. 같은 누락
  기능을 `SD0030` 진단으로 보고하되 오류는 던지지 않습니다.

### 파생 기능과 암시적 기능

일부 기능은 모듈의 구조에서 자동으로 파생됩니다. 스토리지 바인딩은 `storageBuffer`, 컴퓨트 진입점은 `compute`, 멀티샘플 텍스처 로드는 `msaaTextureLoad`, 스토리지 텍스처 바인딩은 `storageTexture`, 1D 텍스처는 `texture1d`, 큐브 배열 텍스처는 `textureCubeArray`, `textureGather` 호출은 `textureGather`를 암시합니다. packed 4x8 정수 내장 함수 여덟 개 중 하나를 호출하면 `packed4x8Dot`이 파생됩니다. `bgra8unormStorage`는 바인딩 종류가 아니라 포맷에서 파생됩니다. `bgra8unorm`은 코어 사양에 포함되지 않는 유일한 스토리지 포맷이므로, 디바이스에서 `bgra8unorm-storage`를 요청하지 않으면 바인드 그룹 레이아웃이 거부됩니다. 이 요구 사항은 측정 결과이며, Tint는 기능 요청 여부와 무관하게 모듈을 컴파일합니다. 따라서 호스트에는 이 기능으로 요구 사항을 전달합니다. 모듈의 `enables` 타입은 파생 기능 id를 제외하므로 직접 지정하면 타입 오류가 발생합니다.

WGSL _언어_ 기능(language feature)은 디바이스 기능과 구별해야 합니다. 언어 기능은 브라우저의 셰이딩 언어 구현이 지원하는 기능이며 `requestDevice`의 요청 대상이 아닙니다. `reflect().requiredLanguageFeatures`는 소스가 사용하는 언어 기능을 나열하고, `navigator.gpu.wgslLanguageFeatures`는 지원 여부를 제공합니다. WGSL 생성기는 `read`나 `read_write` 스토리지 텍스처 바인딩에 `requires readonly_and_readwrite_storage_textures;`를 생성합니다. packed 4x8 계열은 지시문 없이 컴파일할 수 있으므로 지시문을 생성하지 않습니다.

한 기능이 다른 기능을 암시할 수도 있습니다. `float32Blend`는 `floatRenderTarget`을 함께
끌어옵니다. float 타깃에 블렌딩하려면 먼저 그 타깃이 색상 어태치먼트로 렌더링 가능한
상태여야 하는데, `EXT_float_blend`만 켜져 있으면 프레임버퍼가 INCOMPLETE 상태로 돌아오기
때문입니다. `reflect().requiredFeatures`는 이렇게 딸려 오는 기능까지 모두 모은 목록을
돌려주므로, 모듈이 하나만 선언해도 둘 다 들어 있습니다.

```ts
const m: ModuleDecl = { ...compile(source).module, enables: ['float32Blend'] }
reflect(m).requiredFeatures // ['float32Blend', 'floatRenderTarget']
```

이 목록은 항상 있고, 필요한 기능이 없는 모듈에서는 빈 배열입니다.

### 부팅 시점 확인

모듈의 기능 선언은 디바이스 기능을 활성화하지 않습니다. 디바이스가 지원하는 기능은 모듈 생성보다 앞선 디바이스 생성 시점에 정해집니다. WebGPU의 `requiredFeatures`는 `requestDevice` 호출 시 확정되며, 요청하지 않은 기능은 나중에 추가할 수 없습니다. WebGL2 컨텍스트도 가져온 확장만 사용할 수 있으므로 파이프라인 생성 시점보다 먼저 확인해야 합니다.

호스트는 생성된 디바이스가 모듈에 필요한 기능을 지원하는지 확인하고, 지원하지 않으면 명시적으로 실패해야 합니다. `reflect().requiredFeatures`는 모듈만 읽고 타깃은 받지 않으므로 중립 id를 반환합니다. `hostFeaturesFor`는 이를 특정 백엔드의 호스트 기능 문자열로 변환합니다. 호스트 기능이 필요 없는 항목은 건너뛰므로 드라이버에 전달할 목록에 빈 항목이 생기지 않습니다.

```ts
import { hostFeaturesFor, reflect, glslEs300Backend, wgslBackend } from 'typeshade'

// WebGL2: verify the already-booted context has each extension.
for (const ext of hostFeaturesFor(glslEs300Backend, reflect(m).requiredFeatures)) {
  if (!gl.getExtension(ext)) throw new Error(`WebGL2 lacks ${ext}`)
}

// WebGPU: feed the same lookup into requestDevice, at boot.
const device = await adapter.requestDevice({
  requiredFeatures: hostFeaturesFor(wgslBackend, reflect(m).requiredFeatures) as GPUFeatureName[],
})
```

`typeshade/runtime`은 WebGPU 쪽 확인을 대신 해 줍니다. 디바이스를 직접 요청하는 런타임은 자기
프로그램에 필요한 기능을 함께 요청합니다.

### 두 모듈 중 고르기

기능 선언은 필수 요구 사항이므로 선택적 기능의 폴백을 표현하지 않습니다. 폴백에는 모듈 두 개를 준비하고, 디바이스가 정해진 초기화 시점에 한 번 선택합니다.

```ts
const caps = reflect(fancy).requiredFeatures
const ok = hostFeaturesFor(glslEs300Backend, caps).every((e) => gl.getExtension(e))
const m = ok ? fancy : plain // two modules, one decision, made once
```

두 모듈 모두 필요한 기능을 각자 선언하고 있으므로, 고르지 않은 쪽을 그 기능이 없는
디바이스에서 골랐더라도 fail closed로 실패했을 것입니다.

### 이식 가능한 컴퓨트 커널

`"use typeshade"` 컴퓨트 진입점은 두 백엔드 모두에서 실행됩니다. WebGPU에서는 `@compute`
진입점입니다. 컴퓨트 스테이지가 없는 WebGL2에서는 패스 프로그램으로 실행됩니다. 패스 프로그램은
패스마다 텍스처에 전체 화면을 그리는 드로이며, 컴파일러가 이를 작성하고 매니페스트가 담아
전달한다(변경 제안 0054). 어느 단계로 실행할지는 프로그램 런타임이 고르므로, 호스트 코드는 두
백엔드에서 같습니다.

```ts
"use typeshade";

declare const field: storage<array<f32>>;
declare const outColor: storage<array<u32>, "read_write">;

@compute([64])
export function evalField(@builtin("global_invocation_id") gid: vec3u): void {
  const i = gid.x;
  if (i >= arrayLength(field)) {
    return;
  }
  outColor[i] = pack4x8unorm(vec4(field[i], 0., 0., 1.));
}
```

```ts
import { compile, packModule } from 'typeshade'

const program = packModule(compile(source).module)
program.gl?.computes // { evalField: … }, the pass program WebGL2 runs
```

`program.gl.computes`에는 컴퓨트 진입점마다 패스 프로그램이 들어 있고, 패스 프로그램이 없으면 그
이유가 들어 있습니다. `typeshade/runtime`은 디바이스가 어느 단계이든
`rt.load(program).compute('evalField')`로 이를 실행한다(`docs/use-typeshade-surface.md` §69).
배리어, 워크그룹 메모리, 원자 연산도 WebGL2 단계의 패스에서 WGSL이 허용하는 순서대로 실행된다
(`changes/0054-webgl2-compute.md`). 1D, 큐브 배열, 멀티샘플 텍스처를 읽는 진입점처럼 패스
프로그램이 없는 진입점은 런타임이 그 이유와 함께 거부합니다. IR 빌더에는 이보다 좁은 `portable`
tier(커널이 속하는 지원 단계)도 있습니다. GLSL 생성기가 프래그먼트 셰이더 하나로 하향 변환하는
gather(읽기만 하는 접근) 전용 커널이며, [`docs/ir-builder.md`](docs/ir-builder.md)가 설명합니다.
