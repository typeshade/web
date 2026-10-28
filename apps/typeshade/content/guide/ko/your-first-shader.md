---
id: your-first-shader
source: fd98901e623d7833819a2e1865b96ddb57873072e04b23b38294dd4c525fb83c
sourceLine: 148
---

이 예제는 TypeScript로 작성한 진입점 두 개로 화면을 색상 그라데이션으로 채웁니다. 같은 모듈을 WebGPU용 WGSL과 WebGL2용 GLSL ES 3.00으로 생성하고, 각 호출이 반환하는 문자열을 설명합니다.

파일은 지시문으로 시작하고, 그 뒤의 모든 내용이 셰이더입니다.

```ts
"use typeshade";
```

셰이더의 이름은 패키지에서 가져오지 않고 언어에서 제공합니다. `f32`, `u32`, `vec2`, `vec4`는 선언에서 타입으로 사용합니다. 표현식의 `vec2(…)`와 `vec4(…)`는 값을 생성합니다. 산술에는 TypeScript 연산자를 사용하며, `x * 4. - 1.`은 곱셈과 뺄셈으로 계산됩니다.

### 버텍스 진입점

진입점(entry point)은 GPU가 직접 호출하는 함수입니다. 버텍스, 프래그먼트, 컴퓨트 인보케이션마다 실행되며, 이 예제는 앞의 두 종류를 사용합니다. 최상위 `export function`에 스테이지 데코레이터 `@vertex`, `@fragment`, `@compute` 중 하나를 붙이면 진입점이 됩니다. 나머지 함수는 일반 헬퍼입니다.

버텍스 스테이지는 버텍스마다 한 번 실행됩니다. 클립 공간 위치와 프래그먼트 스테이지에 필요한 값을 IO 구조체에 담아 전달합니다. IO 구조체는 필드마다 속성이 붙은 클래스입니다. `@builtin("position")`은 하드웨어가 직접 사용하는 값을 표시합니다. `@location(0)`은 삼각형 위에서 보간된 뒤 프래그먼트 스테이지가 읽는 값을 표시합니다.

```ts
class VsOut {
  @builtin("position") pos: vec4;
  @location(0) uv: vec2;
}
```

WGSL은 `clip_distances`를 뺀 모든 내장 값의 타입을 정해 둡니다. 그래서 컴파일러는 작성한 타입을
id와 대조합니다. `@builtin("position")`을 `vec4`가 아닌 필드에 붙이면 오류가 납니다.

이 셰이더에는 버텍스 버퍼가 없습니다. 화면을 덮는 버텍스 세 개를 그리고, 그 위치는 버텍스
인덱스만으로 계산합니다. 스테이지 입력은 같은 속성을 붙인 평범한 매개변수입니다.

```ts
@vertex
export function vs(@builtin("vertex_index") vi: u32): VsOut {
  const x = f32(vi & 1) * 4. - 1.;
  const y = f32(vi >> 1) * 4. - 1.;
  return { pos: vec4(x, y, 0., 1.), uv: vec2(x * 0.5 + 0.5, y * 0.5 + 0.5) };
}
```

`vi`는 `u32`이고, `f32(vi & 1)`이 이 값을 변환합니다. 소수점 없이 쓴 숫자는 옆 피연산자의 정수
타입을 따르므로 `vi & 1`에는 `u32(1)`이 필요 없습니다. `4.`처럼 소수점을 붙여 쓴 숫자는
`f32`이입니다. 객체 리터럴은 반환 타입이 선언한 구조체가 됩니다. 그래서 필드가 빠지거나 이름이
틀리면 오류가 납니다.

### 프래그먼트 진입점

프래그먼트 스테이지는 픽셀 후보마다 한 번 실행되어 색 하나를 반환합니다. 버텍스 출력을
매개변수로 받으므로, 읽을 수 있는 것은 `VsOut`에 선언한 필드입니다. `vo.uv`는 `.x`와 `.y`를 가진
`vec2`이입니다.

```ts
@fragment
export function fs(vo: VsOut): vec4 {
  const shade = 1. - vo.uv.y;
  return vec4(vo.uv.x, shade, 0.5, 1.);
}
```

프래그먼트가 구조체 없이 값만 돌려주면 그 값은 첫 번째 색상 어태치먼트인 `@location(0)`으로
갑니다. 따라서 따로 적을 것이 없습니다. 구조체를 돌려줄 때는 색상 어태치먼트마다
`@location(n)` 필드를 하나씩 둡니다.

### 모듈 조립하기

모듈은 코드 생성의 단위이며 파일 하나가 모듈 하나가 됩니다. 파일에 선언된 구조체, 진입점 두 개, 진입점이 호출하는 헬퍼가 모듈에 포함됩니다. 전체 소스는 다음과 같습니다.

```ts
"use typeshade";

class VsOut {
  @builtin("position") pos: vec4;
  @location(0) uv: vec2;
}

@vertex
export function vs(@builtin("vertex_index") vi: u32): VsOut {
  const x = f32(vi & 1) * 4. - 1.;
  const y = f32(vi >> 1) * 4. - 1.;
  return { pos: vec4(x, y, 0., 1.), uv: vec2(x * 0.5 + 0.5, y * 0.5 + 0.5) };
}

@fragment
export function fs(vo: VsOut): vec4 {
  const shade = 1. - vo.uv.y;
  return vec4(vo.uv.x, shade, 0.5, 1.);
}
```

다른 셰이더 파일을 가져오는 파일은 그 파일과 함께 모듈 하나가 됩니다. 쓰는 법은
[함수와 진입점](/guide/authoring/functions-and-entry-points/)에 있습니다.

### 두 타깃으로 생성하기

`compile(source)`는 모듈 전체를 WGSL 문자열 하나로 반환합니다. 진입점 두 개가 모두 들어
있습니다.

```ts
import { compile } from 'typeshade'

const { wgsl, glsl, diagnostics } = compile(source) // source: the file above, as text
```

```wgsl
struct VsOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> VsOut {
  let x = ((f32((vi & 1u)) * 4.0) - 1.0);
  let y = ((f32((vi >> 1u)) * 4.0) - 1.0);
  return VsOut(vec4<f32>(x, y, 0.0, 1.0), vec2<f32>(((x * 0.5) + 0.5), ((y * 0.5) + 0.5)));
}

@fragment
fn fs(vo: VsOut) -> @location(0) vec4<f32> {
  let shade = (1.0 - vo.uv.y);
  return vec4<f32>(vo.uv.x, shade, 0.5, 1.0);
}
```

GLSL ES 3.00은 스테이지별로 컴파일하며, 각 소스에 별도의 `main`이 있습니다. 따라서 GLSL은 스테이지마다 문자열 하나로 생성됩니다. `glsl`은 `{ vertex, fragment }`이며 모듈을 한 번 하향 변환(lowering)한 결과입니다. 하향 변환은 IR을 타깃이 표현할 수 있는 형태로 다시 작성하는 패스입니다.

```glsl
#version 300 es
precision highp float;
precision highp int;

out vec2 uv;

void main() {
  uint vi = uint(gl_VertexID);
  float x = ((float((vi & 1u)) * 4.0) - 1.0);
  float y = ((float((vi >> 1u)) * 4.0) - 1.0);
  gl_Position = vec4(x, y, 0.0, 1.0);
  uv = vec2(((x * 0.5) + 0.5), ((y * 0.5) + 0.5));
}
```

```glsl
#version 300 es
precision highp float;
precision highp int;

in vec2 uv;
layout(location = 0) out vec4 _ret;

void main() {
  float shade = (1.0 - uv.y);
  _ret = vec4(uv.x, shade, 0.5, 1.0);
}
```

두 문자열은 같은 소스에서 나왔습니다. 두 출력의 차이는 각 언어가 강제하는 부분뿐입니다. IO
구조체는 짝이 맞는 `out`과 `in` varying 한 쌍이 됩니다. 프래그먼트의 반환값은 선언된 출력 변수가
됩니다. 내장 위치는 `gl_Position`이 되고, `gl_VertexID`는 부호 있는 int이므로 `u32` 매개변수에는
캐스트가 붙습니다. 이 파일의 `diagnostics`는 비어 있습니다. 오류가 있는 파일에는 `wgsl`도
`glsl`도 없고, 그 이유는 진단이 알려 줍니다.

### 다음 단계

[값과 변경](/guide/authoring/values-and-mutation/)은 `const`와 `let`, 그리고 변수를 바꾸는 법을
다룹니다. [함수와 진입점](/guide/authoring/functions-and-entry-points/)은 함수와 진입점이 받는
나머지 내용을 컴퓨트 스테이지까지 포함해 설명합니다.
[레이아웃과 리소스](/guide/authoring/layouts-and-resources/)는 유니폼 블록, 스토리지 버퍼,
텍스처를 한 번 선언해 어디서든 읽는 법을 보여 줍니다.
[생성과 리플렉션](/guide/authoring/emitting-and-reflection/)은 그 밖의 생성 호출과, 호스트가
바인딩할 때 읽는 파이프라인 메타데이터를 다룹니다.
