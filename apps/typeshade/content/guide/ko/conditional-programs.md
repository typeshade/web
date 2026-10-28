---
id: conditional-programs
source: d19efbaf735c59350ca903ccffb0775c6015e3b78a9cad962de988ea42e3432d
sourceLine: 2056
---

조건부 프로그램은 한 코드베이스에서 필요한 변형을 선택해 생성하는 방식입니다. 이 페이지는 프로그램 구조가 다른 변형, 상수만 다른 변형, 호스트가 선택하는 변형을 구분하고, 변형별 캐시 키를 구성하는 방법을 설명합니다.

고도 데이터 유무나 3D·평면 구분에 따라 셰이더가 달라지는 경우, GLSL 코드베이스는 `#define`과 `#ifdef` 분기를 사용합니다. 이 패키지에는 전처리기가 없습니다. 프로그램은 진입 파일과 가져오는 파일로 구성되므로, 변형은 컴파일할 파일을 선택해 결정합니다. 공통 코드는 각 변형이 가져오는 파일에 둡니다. 생성된 프로그램에는 선택한 변형의 코드만 포함되며, 이를 선택하는 디스패치 체인은 추가되지 않습니다.

프로그램 변형은 구조가 다른 경우, 값 하나만 다른 경우, 호스트가 선택하는 경우로 구분합니다. 기기별 기능 지원 여부는 별도 문제이며 [기능과 확장](/guide/authoring/capabilities-extensions/)에서 설명합니다.

### 변형마다 파일 하나

특수화는 선택의 조합 하나에 프로그램 하나를 만드는 일입니다. 변형마다 진입 파일을 하나씩 쓰고,
공유하는 부분은 각 파일이 가져오는 파일에 둡니다.

```ts
// terrain.shade.ts
"use typeshade";

export function shadeHeight(h: f32): vec4 {
  return vec4(h, h * 0.5, 0., 1.);
}

// terrain-flat.shade.ts
"use typeshade";

import { shadeHeight } from "./terrain.shade.ts";

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return shadeHeight(0.);
}

// terrain-dem.shade.ts
"use typeshade";

import { shadeHeight } from "./terrain.shade.ts";

declare const dem: texture_2d<f32>;
declare const demSampler: sampler;

@fragment
export function fs(@location(0) uv: vec2): vec4 {
  return shadeHeight(textureSample(dem, demSampler, uv).x);
}
```

파일은 호스트가 고릅니다.

```ts
import { compile } from 'typeshade'

// read: the readDocument of "A shader module that imports another"
const buildTerrain = (hasElevation: boolean) => {
  const fileName = hasElevation ? 'terrain-dem.shade.ts' : 'terrain-flat.shade.ts'
  return compile(read(fileName)!, { fileName, readDocument: read })
}
```

이 방식에서는 프로그램 구조에 따라 바인딩도 달라집니다. 평면 변형은 고도 텍스처를 선언하지 않으므로 `reflect()`나 바인드 그룹 레이아웃에 해당 텍스처가 없고, 호스트도 리소스를 만들지 않습니다. `const` 플래그와 일반 `if`를 사용하면 이 결과를 얻을 수 없습니다. 분기는 작성한 형태로 생성되고 텍스처 선언은 모듈에 남으므로, 비활성화한 기능도 바인딩 슬롯을 차지합니다.

드로 시점이 되어야 정할 수 있는 선택도 있습니다. 이런 선택은 유니폼에 따른 런타임 분기로 남기고,
GPU가 계산합니다. 특수화는 빌드할 때 이미 아는 선택에 씁니다.

### override로 다른 값 하나

모든 변형이 상수 하나만 다른 같은 프로그램을 생성한다면, 파일별 특수화는 파이프라인 수만 늘립니다. 이런 경우 `override<T>`로 모듈 범위의 특수화 상수를 선언합니다. 이 값을 읽는 곳은 모든 패스에서 기호로 유지되며, 호스트가 파이프라인 생성 시 값을 고정합니다.

```ts
"use typeshade";

const quality: override<f32> = 1.;

export function shade(base: f32): f32 {
  let acc = base;
  if (quality > 1.) {
    acc = acc * 2. + 0.5;
  }
  return acc;
}

@fragment
export function fs(@location(0) v: f32): vec4 {
  return vec4(shade(v), 0., 0., 1.);
}
```

WGSL은 `override quality: f32 = 1.0;`을 생성하고, 호스트는 파이프라인의 `constants`로 값을
고정합니다. GLSL ES 3.00에는 드라이버에서 이에 대응하는 기능이 없으므로 백엔드는
기본값을 사용하는 `#define`을 생성합니다. 프로그램 런타임은 `render({ constants })`나
`compute(entry, { constants })`로 값을 고정합니다. 가져온 컴퓨트 진입점은 세 번째 인자로
같은 레코드를 받습니다. GLSL을 직접 생성하는 호스트는
`emitGlslModule(m, 'fragment', { overrideValues: { quality: 2 } })`로 값을 지정합니다.
이 경로들은 선언된 상수 목록을 `reflect().overrides`에서 읽습니다. WebGL2 컴퓨트는 일반
오버라이드 값이 바뀌어도 기본 워크그룹 모양과 배열 길이를 유지합니다.

최적화 단계는 이 값을 알 수 없으므로 위의 분기를 제거하지 않습니다. 이후 드라이버가 파이프라인 변형별로 분기를 제거하는 전형적인 우버셰이더 방식입니다. 두 변형의 명령어 열이 같고 리터럴만 다르면 override를 사용합니다. 생성되는 코드가 다르면 파일을 나눕니다.

### 호스트가 정하는 축

축은 프로그램 변형의 기준과 가능한 값의 목록입니다. 축으로 이루어진 공간의 점 하나가 변형 하나에 해당합니다. 외부 상태에 따라 호스트가 실행 시점에 변형을 선택한다면, 가능한 조합의 행렬을 작성합니다. `variantFamily`는 축, 각 점의 모듈을 만드는 함수, 키 생성 방법을 받아 모든 조합을 빌드합니다.

```ts
import { compile, variantFamily } from 'typeshade'

const family = variantFamily({
  axes: { elevation: ['flat', 'dem'] },
  build: ({ elevation }) => {
    const fileName = `terrain-${elevation}.shade.ts`
    return compile(read(fileName)!, { fileName, readDocument: read }).module
  },
  key: ({ elevation }) => `terrain:${elevation}`,
})

family.keys // ['terrain:flat', 'terrain:dem']
family.emit('wgsl') // Map { 'terrain:flat' => '…', 'terrain:dem' => '…' }
family.get('terrain:dem')?.reflection // that variant's own reflection
```

변형마다 모듈, 자기 리플렉션, 키가 들어 있습니다. `emit`은 어느 타깃이든 키마다 전처리기 없는
소스를 하나씩 반환합니다. define을 이미 소유한 GLSL 호스트에는 `emitGuarded`가 있습니다. 이 함수는
같은 행렬을 소스 하나로 하향 변환하며, 그 안에 `#if` ladder(조건이 줄줄이 이어진 분기)를
생성합니다. 키마다 분기가 하나씩 있고, 각 분기는 `emit`이 만드는 코드와 같으며, 모든 분기가
공유하는 프리앰블은 ladder 위로 끌어올립니다. 이 형태와 변형에 요구하는 조건은 `variantFamily`의
참조 페이지에 있습니다.

### 특수화된 프로그램의 정체성

특수화된 프로그램은 별도의 프로그램이므로, 특수화에 사용한 모든 축을 프로그램 식별 키에 포함해야 합니다. 파이프라인 캐시 id와 재컴파일 없이 결과를 제공하는 사전 생성 아티팩트 id가 이에 해당합니다. 키에는 파일 선택에 사용한 것과 같은 정보를 담아야 합니다.

```ts
const keyFor = (hasElevation: boolean, method: number) =>
  `${hasElevation ? 'dem' : 'flat'}:${method}`
```

캐시 키에 빌드 입력이 누락되면 다른 변형의 컴파일 결과를 사용할 수 있습니다. 컴파일·링크·렌더링은 성공해도 픽셀 결과는 달라집니다. 빌드에 축을 추가할 때는 같은 커밋에서 키에도 추가해야 합니다. `variantFamily`는 축에 대한 함수로 키를 받으며, 두 점의 키가 같으면 오류를 던져 빌드 시점에 충돌을 보고합니다.
