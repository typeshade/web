---
id: overview
source: f3a25997a2db7a982efddbd70681f2aef5457b12dad818be0f009ca587c0c253
sourceLine: 1
---

# `typeshade`로 셰이더 작성하기

이 가이드는 TypeScript 셰이더 소스의 컴파일 결과, 컴파일러 가져오기, 주제별 문서의 구성을 설명합니다. 예제는 이 저장소의 소스를 기준으로 작성했으며, `examples/`에는 같은 방식으로 작성한 전체 셰이더가 있습니다.

### 작성하는 코드와 그 결과

셰이더는 일반 TypeScript 파일로 작성하며, 첫 문장은 지시문 `"use typeshade"`입니다. 문법은 TypeScript와 같으며 `function`, `const`와 `let`, `if`, `for`, `class`, 연산자와 리터럴을 사용합니다. 타입은 GPU 타입인 `f32`, `u32`, `vec3`, `mat4`, `array<f32, 16>`을 사용합니다. `@fragment` 같은 데코레이터는 GPU가 호출하는 함수를 표시합니다. 타입이나 필드 이름이 틀리면 편집기가 해당 줄에 오류를 표시합니다.

프로그램의 구조는 진입점, 리소스, 구조체 선언으로 정해집니다. 스테이지 데코레이터(`@vertex`, `@fragment`, `@compute`)가 붙은 최상위 `export function`은 진입점입니다. GPU는 버텍스, 프래그먼트, 컴퓨트 인보케이션마다 진입점을 실행하며, 나머지 함수는 진입점이 호출하는 헬퍼입니다. `uniform<T>`나 `storage<T>` 타입의 `declare const`는 호스트가 바인딩하는 리소스입니다. `class`, `interface`, `type` 별칭은 구조체가 됩니다.

```ts
"use typeshade";

// One helper. The return type is the one the body returns.
export function ringMask(uv: vec2, radius: f32): f32 {
  return abs(length(uv) - radius);
}
```

`compile()`은 이 소스를 읽어 모듈과 출력을 반환합니다.

- `wgsl`은 WebGPU가 받는 셰이딩 언어인 WGSL입니다.
- `glsl`은 `{ vertex, fragment }`이입니다. 버텍스 진입점과 프래그먼트 진입점이 있는 모듈에서
  WebGL2용 GLSL ES 3.00 소스를 담습니다.
- `module`은 컴파일된 모듈입니다. 패키지의 다른 호출은 이 모듈을 읽습니다.
- `diagnostics`는 모든 오류와 경고를 코드, 줄, 열과 함께 나열합니다.

이 모듈은 패키지의 나머지 기능이 받는 입력입니다.

- `emitModule(m)`과 `emitGlslStages(m)`은 원하는 옵션으로 모듈을 다시 생성합니다.
- `compileModule(m)`은 CPU 오라클을 반환합니다. 같은 프로그램을 JavaScript에서 모든 값을
  배정밀도로 계산하므로, GPU 실행 결과와 비교할 수학적으로 의도한 답을 얻습니다.
- `reflect(m)`은 호스트가 파이프라인을 만들 때 필요한 메타데이터를 반환합니다. 바인드 그룹,
  유니폼 버퍼나 스토리지 버퍼가 맞춰야 하는 std140과 std430 바이트 레이아웃, 버텍스 속성,
  진입점 시그니처가 여기에 들어 있습니다.

```ts
import { compile, compileModule, reflect } from 'typeshade'

const { wgsl, diagnostics, module: m } = compile(source) // source: the file above, as text
const cpu = compileModule(m) // cpu.fns.ringMask([0.3, 0.4], 0.5) === 0
const meta = reflect(m) // bind groups, layouts, entry signatures
```

`wgsl`에는 다음 코드가 들어 있습니다.

```wgsl
fn ringMask(uv: vec2<f32>, radius: f32) -> f32 {
  return abs((length(uv) - radius));
}
```

작성한 이름은 출력에 유지됩니다. 매개변수 타입은 WGSL 타입으로 변환되고, 반환 타입은 본문에서 추론됩니다. 하위 표현식이 반복되면 최적화 단계에서 바인딩을 추가하므로, 생성된 본문에는 소스에 없던 이름이 나타날 수 있습니다.

고정 길이 배열은 지역 바인딩 패턴 `const [first, , last] = xs`로 읽을 수 있습니다. 배열보다 짧은 패턴도 허용되며, 생략한 위치도 원본 배열의 길이를 계산할 때 포함합니다.
`const [a, b]: [u32, u32] = [1, 2]`는 요소 타입이 같은 튜플 타입을 명시합니다. 타입을 지정하지 않은 `const [a, b] = [1., 2.]`는 `array(1., 2.)`와 같은 방식으로 타입을 추론합니다.
중첩된 객체·배열 패턴과 getter도 지원하며, 각 수신 객체는 한 번만 평가합니다. 바인딩한 값은 지역 복사본이며, 숫자 타입을 변환하려면 명시적 생성자가 필요합니다.
나머지 요소, 기본값, 벡터 반복, 런타임 크기 배열의 패턴은 지원하지 않습니다. 자세한 내용은 `docs/use-typeshade-surface.md` §14와 §18에 있습니다.

### 가져오기

셰이더 파일은 패키지에서 타입이나 함수를 가져오지 않습니다. 타입, 내장 함수, 데코레이터는 언어에 포함되어 있습니다. 호스트 코드는 컴파일러와 컴파일 결과를 읽는 함수를 패키지 루트에서 가져옵니다.

```ts
import { compile, emitModule, emitGlslStages, reflect, compileModule } from 'typeshade'
```

다른 하위 경로는 컴파일과 코드 생성 외의 기능을 제공합니다. 가져오지 않은 경로는 번들 크기를 늘리지 않습니다.

- `typeshade/runtime`은 컴파일된 프로그램을 불러와 WebGPU나 WebGL2에서 실행합니다. 번들에
  컴파일러는 들어가지 않습니다. 자세한 내용은 `docs/use-typeshade-surface.md` §69에 있습니다.
- `typeshade/vite`에는 Vite 플러그인이 있습니다. 이 플러그인으로 평범한 호스트 파일이
  `.shade.ts`를 가져와 그 헬퍼 함수를 부르며, 이 함수는 CPU에서 실행됩니다.
  [모듈의 헬퍼를 호스트 코드에서 부르기](#calling-a-modules-helpers-from-host-code)를
  참고합니다.
- `typeshade/dev`에는 개발 도구가 있습니다. 린트 보고서, 최적화 측정, 오류의 소스 위치를
  제공합니다.
- `typeshade/emit-prod`에는 배포 시점에 생성된 소스를 맹글링하고 압축하고 난독화하는 텍스트
  플러그인이 있습니다.
- `typeshade/compute`에는 이식 가능한 컴퓨트 커널을 호스트가 가진 백엔드에서 디스패치하는
  실행기가 있습니다.
- `typeshade/debug`는 `"use typeshade"` 셰이더의 인보케이션 하나를 CPU 오라클 위에서 한
  단계씩 실행합니다. 작성자가 쓴 문장마다 멈춰 소스 구간과 프레임의 지역 변수를 보고하고,
  중단점을 줄 번호로 찾습니다. 실행 하나를 데이터로 적은 실행 구성도 함께 들어 있습니다. 이
  구성은 인수 위치가 아니라 진입점이 선언한 이름을 키로 씁니다. `launch.json`용으로 미리 만든
  JSON Schema와, 값을 작성자가 쓴 셰이더 타입으로 보여 주는 포매터도 있습니다. 편집기의 디버그
  어댑터와 Playground의 단계 실행 패널이 모두 이 경로를 바탕으로 만들어졌습니다.
  `docs/debugging.md`를 참고합니다.
- `typeshade/core/ir`은 IR 빌더이다. 소스를 컴파일하지 않고 코드로 모듈을 조립하는 엔진이나
  도구가 씁니다. 1.0 전까지는 안정성을 약속하지 않으며, 이 가이드는 IR 빌더를 쓰지 않습니다.
  사용법은 [`docs/ir-builder.md`](docs/ir-builder.md)에 있습니다.

패키지에는 컴파일러와 컴파일된 모듈을 실행하는 작은 런타임이 포함되어 있습니다. 셰이더 소스는 사용하는 프로젝트의 저장소에 두고, 패키지는 다른 의존성과 같은 방식으로 가져옵니다.

### 이 가이드의 순서

가이드의 각 페이지는 한 주제를 다루며 학습 순서대로 배치되어 있습니다. 개별 주제는 따로 읽을 수 있습니다. 함수별 세부 사항은 참조 페이지에 있으며, 언어의 전체 규칙과 거부 조건은 `docs/use-typeshade-surface.md`에 있습니다.

주제별 페이지는 다음과 같습니다.

- [첫 셰이더](/guide/authoring/your-first-shader/): 버텍스 진입점과 프래그먼트 진입점이 있는
  파일을 쓰고, 두 타깃으로 컴파일합니다.
- [값과 변경](/guide/authoring/values-and-mutation/): 값을 만들고, 타입을 붙이고, 그 값을
  바꿉니다.
- [함수와 진입점](/guide/authoring/functions-and-entry-points/): 헬퍼와 진입점, 그리고 이들을
  담는 모듈을 선언합니다.
- [제어 흐름](/guide/authoring/control-flow/): 분기하고, 반복하고, 정수로 디스패치하고, 조기
  반환합니다.
- [레이아웃과 리소스](/guide/authoring/layouts-and-resources/): IO 구조체, 유니폼 블록,
  스토리지 버퍼, 텍스처를 한 번만 선언하고, 필드를 타입과 함께 읽습니다.
- [생성과 리플렉션](/guide/authoring/emitting-and-reflection/): WGSL과 GLSL을 생성하고,
  호스트가 바인딩할 때 기준으로 삼는 파이프라인 메타데이터를 읽습니다.
- [CPU 오라클](/guide/authoring/the-cpu-oracle/): 같은 모듈을 배정밀도로 실행하고, 그 숫자를
  GPU 실행 결과와 비교합니다.
- [진단](/guide/authoring/diagnostics/): 코드가 붙은 오류를 읽고, 모듈의 모든 실패를 보고서
  하나로 모읍니다.
- [조건부 프로그램](/guide/authoring/conditional-programs/): 기능 조합마다 특수화된 프로그램을
  하나씩 만듭니다.
- [기능과 확장](/guide/authoring/capabilities-extensions/): 모듈 생성이 의존하는 GPU 기능을
  선언하고, 부팅된 디바이스를 그 선언과 대조합니다.
- [fp64](/guide/authoring/fp64/): float만 있는 하드웨어에서 배정밀도를 얻습니다.
- [GLSL 부동소수점 정밀도](/guide/authoring/glsl-float-precision/): GLSL 스테이지를 mediump로
  생성하고, 그것이 소스에서 무엇을 바꾸는지 봅니다.
- [배포용 생성](/guide/authoring/production-emit/): 배포하는 소스를 맹글링하고 압축하고
  난독화하며, 이름이 바뀐 드라이버 로그를 원래 이름으로 읽어 냅니다.
- [GLSL 셰이더 옮기기](/guide/authoring/migrating-a-glsl-shader/): 눈앞의 GLSL 구문을 찾아
  여기서는 어떻게 쓰는지 확인합니다.

처음 사용하는 경우 다음 페이지부터 순서대로 읽습니다. 기존 GLSL 셰이더를 옮기는 경우에는 GLSL 셰이더 옮기기에서 시작해 관련 문서 링크를 따릅니다.
