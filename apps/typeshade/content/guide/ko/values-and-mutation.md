---
id: values-and-mutation
source: db841d4f72e018d8d385438fef640b9c6650a1fa072afaea50e103dbc183f38e
sourceLine: 344
rules: 11.12 30yuoBdpwkfDlJLbGKIzbnlOXHnKqWPpqDe7V6UDujU=, 6.2 X1TddP_Ob7b4QaR9Qbuoo1UgPCngNA5JdtbbWwd_lOc=, 6.10 suiaQZS1y-SaWxDmJXHL21Qzp_yYkddUlpCNV8AsLVc=, 8.13 aNXyjNJvi1bR7zPmCgF2WJ0PmaP_Qk6WWqXOOuEbzCg=, 8.14 SP-Fa9DtpBru_e2Zuh3x8ZUFrqweaTrNrJs-c8RHbE0=, 8.17 iy_UhoCMHYdgpfUXu8eRAllyZo67mQ2c6BRfQtMcIYY=, 7.6 kyzs2Ws4Mk2xUgP_v9ZM_z6jm_3zIWP2-BekxmeHpC8=, 8.25 XZRD1So9e-OFRi9VePXRjyCfT2_T_xaPFWQw_Uy0ZrM=, 12.7 TawOmv8klHJxgWPx5cItYK8gProqi2towGMRoE6fL2M=, 2.3 r7XKZw0j-Hb5AH5VaQM8ueWwC512ZArtkVGU0ccfsOE=, 4.8 ZaXqxS6SImuhTEXg74x7e6A4X5QWcoGarvtV45ZRA4I=, 5.3 AlhLu-cJSNgGl-ltXEFlhL7eWs5_USuUdEImJEf0Eb4=, 5.4 RphTFmChXNrzoLVIpKED02ndV41w4BSuuRjq3nTUtVM=, 6.3 pemg9yKGahUemSQAl6etOjgglWVpRbuBu_W4Sz92xGY=, 7.1 AFJzu81K-Vqw_MC2Gc-m4fnJAG7BARdj8l_YuG5C368=, 7.4 Emky1db0T6Mhf0H1_VyxRD8Ub8JLKEB_0DqK59uhD-M=, 7.5 4308LIgSysAnlue51NfkW0VyNcY9-VTAPwyWJ1UyQN4=, 7.10 PYk25-5OvWimXdyvUO_bSDwAj1Fe4ZpajpsEKH01s-o=, 8.18 WSJEXSLWucW9-ovejXz9e-mLa7u8vqZrdwezeNyrr7M=, 8.19 2D92Uur_1PtJq4PAX_vx-kOcr0i4SbSGiaNJkCSbJ_g=, 12.6 kuInDVEKCI_Qu_9zVLzT--W8UeBj0WgdX22sRWA_VNY=, 2.1 l05tfvIh6yqrDrP5O_FPgntb8Kkz9wOg4ebQjpW_4ro=, 4.1 AmgGh0CW9YDxPJY5zgEMW7x81knuXtQ9RsVpX787fSU=, 4.6 RwdafG75jJiCMgm6Du1X3zVcPigfJdPEwfy6iWlDksU=, 7.8 fyWaTaGHHUsBo-fTN-eap0uAUPB1U1v3TNqAC_1wgPU=, 12.4 BHZ-Neq9i9zSLzX_EHLkq_rZA6ansI2EDMVOVFuqdZk=
---

이 페이지는 중간값의 선언, 타입 표기, 값의 변경, 상수와 변수의 차이를 설명합니다.

### 타입

타입 표기는 매개변수, 반환값, 구조체 필드, 리소스, 타입을 명시한 지역 변수 선언에 사용합니다. 타입 이름은 WGSL을 따르며, 표기 문법은 TypeScript와 같습니다.

```ts
"use typeshade";

export function scale(v: vec2, k: f32): vec2 {
  return v * k;
}
```

`f32`는 부동소수점 스칼라이고, 소수점을 붙여 쓴 숫자의 타입입니다. `u32`와 `i32`는 정수
스칼라이고, `bool`은 모든 비교가 내는 타입입니다. `vec2`, `vec3`, `vec4`는 부동소수점
벡터입니다. 부호 없는 벡터는 `vec2u`, `vec3u`, `vec4u`이고, 부호 있는 벡터는 `vec2i`, `vec3i`,
`vec4i`입니다. 행렬은 `mat4`나 임의의 `matCxR`로 씁니다. `array<T, N>`은 다른 타입의 고정 길이
배열입니다.

벡터 타입마다 같은 이름의 생성자가 있어 값을 만듭니다. `vec3(1., 2., 3.)`, `vec3u(1, 2, 3)`처럼
씁니다. 소수점 없이 쓴 숫자는 요소의 종류를 따르므로, `vec3u(1, 2, 3)`은 `vec3<u32>(1u, 2u, 3u)`를
생성합니다.

**같은 크기의 벡터 하나**를 통째로 넘기면 생성자는 구성 요소를 모으지 않고 변환합니다.
`vec3u` 값에 쓴 `vec3(v)`는 WGSL의 `vec3<f32>(v)`이며, 성분마다 스칼라 변환을 거칩니다. CPU
오라클도 같은 값을 계산합니다. 부동소수점 원본은 정수 타입으로 갈 때 포화되고, `i32`/`u32`는
비트열을 바꾸지 않고 부호만 다르게 해석합니다. 모든 타깃에서 그렇습니다. GLSL ES 3.00은 범위를
벗어난 원본의 결과를 정의하지 않습니다. 그래서 GLSL 생성기는 이 변환을 WGSL처럼 포화시키는
`_f2i`와 `_f2u`로 적는다(규칙 11.12).

### 평범한 const 바인딩

중간값은 별도의 래퍼 없이 일반 `const`로 선언합니다.

```ts
const ab = b - a;
const len2 = dot(ab, ab);
```

`const`는 블록이 끝날 때까지 같은 값을 유지하며, 대입은 오류입니다. 생성 패스는 각 값을 인라인 표현식, 공유하는 `let`(공통부분식 캐시), 고유한 이름의 `let` 중 어떤 형태로 출력할지 결정합니다. 소스에서 이를 따로 지정하지 않습니다.

GLSL 타깃은 값을 앞으로 끌어내는 처리(hoist)를 하나 더 합니다. 구조체 생성자의 인자가
`discard`를 실행할 수 있는 함수에서 나온 값이면, 생성자를 호출하기 직전에 그 값을 지역 변수에
담습니다. GLSL을 생성할 때마다 이 처리가 일어나므로 소스에 표시할 것은 없습니다. WGSL 출력은
달라지지 않습니다.

### let과 const

`let`은 변경할 수 있는 변수를 선언하고, `const`는 변경하지 않는 값을 선언합니다. 타입은 초깃값에서 추론하거나 타입 표기로 지정합니다. 타입을 명시한 경우에는 초깃값을 생략할 수 있습니다.

```ts
const d = length(p) - 1.; // let d = …;   read only
let t = 0.; // var t: f32 = 0.0;
let hits: u32 = 0; // var hits: u32 = 0u;
```

`const`와 모듈 상수는 읽기 전용이며, 대입 시 해당 줄에서 `TS8005`가 발생합니다. 변경할 값은 `let`으로 선언합니다. 매개변수는 전달한 값의 복사본이므로 매개변수에 대입해도 호출한 쪽의 변수는 바뀌지 않습니다. 호출한 쪽의 변수를 변경하는 방법은 [호출한 쪽의 변수를 바꾸는 함수](#a-function-that-changes-its-callers-variable)에 설명되어 있습니다.

모든 경로에서 값이 대입되기 전에 변수를 읽으면 TypeScript 규칙에 따라 `TS8075`가 발생합니다. `fwidth` 같은 미분 함수는 다른 이유로 별도 이름에 바인딩해야 합니다. WGSL은 이 호출이 균일한 제어 흐름 안에 있기를 요구하므로, 값을 사용하는 분기 바깥에서 `const`로 선언합니다.

### 변경과 복합 대입

값을 쓸 때는 TypeScript의 대입을 그대로 씁니다. `x = v`는 값을 쓰고, `+=`, `-=`, `*=`, `/=`는
복합 대입입니다. `++`와 `--`는 숫자 스칼라를 하나씩 늘리거나 줄입니다.

```ts
let minDist = 1e10;
minDist = min(minDist, d);
winding += 1; // emits `winding += 1`
o.pos = vec4(pos, 0., 1.); // a struct field is a target too
o.pos.x = 2.; // and a component of one
```

두 표기는 생성되는 텍스트만 다르고 의미는 같습니다. `acc += x`는 `acc += x`를 생성하고,
`acc = acc + x`는 `acc = (acc + x)`를 생성합니다.

스위즐 대입 대상은 WGSL과 같이 성분 하나만 가리킬 수 있습니다. `v.xy = …`는 거부되므로, 성분별로 대입하거나 벡터 전체를 만들어 대입해야 합니다. 값을 다른 이름에 바인딩하면 두 GPU 타깃 모두 복사합니다. `let w = v; w.x = 100.;`를 실행해도 `v`는 바뀌지 않습니다. 대입할 수 있는 대상과 거부 조건의 전체 목록은 `docs/use-typeshade-surface.md` §9에 있습니다.

### 연산자

산술, 비교, 비트 연산, 성분 접근, 인덱싱은 TypeScript의 연산자로 쓰며, 뜻은 WGSL에서와
같습니다.

| 분류      | 표기                                              |
| --------- | ------------------------------------------------- |
| 산술      | `+ - * / % `와 단항 `-`                           |
| 복합 대입 | `+= -= *= /= %=` · `++ --`                        |
| 비교      | `< > <= >= == !=`(`===`, `!==`도 포함)            |
| 논리      | `&& \|\| !`                                       |
| 비트      | `& \| ^ << >> ~`                                  |
| 캐스트    | `f32(x) i32(x) u32(x) bool(x) f64(x)`             |
| 성분      | `.x .y .z .w` · `.r .g .b .a` · `.xy .rgb .zxy …` |
| 인덱스    | `xs[i]`                                           |
| 삼항      | `c ? a : b`                                       |
| 거듭제곱  | `a ** b`, 곧 `pow(a, b)`                          |

일부 연산은 내장 함수로 표현합니다. `select(f, t, c)`는 WGSL의 인자 순서를 사용합니다. 조건은 마지막이며, `select(f, t, c)`는 `c ? t : f`와 같습니다. `mod(x, y)`는 나눗셈 결과를 내림해 구하는 나머지입니다. 좌표 반복이나 각도 순환처럼 피연산자가 음수일 수 있는 계산에 사용합니다. `%`는 WGSL의 절삭 기반 나머지이므로 음수 피연산자에서 결과가 다릅니다. `radians`와 `degrees`는 각도 단위를 변환하므로 변환 상수를 직접 적거나 반올림할 필요가 없습니다.

```ts
const inside = d < 0. && u >= 0.;
const shade = inside ? 1. : 0.;
const cell = mod(p.x, 2.) - 1.;
const lonRad = radians(lon);
const latDeg = degrees(latRad);
```

### 없을 수도 있는 값

없을 수도 있는 값은 TypeScript와 같이 `T | undefined`로 적습니다. 지역 변수, 헬퍼 함수의 매개변수, 함수의 결과가 이 타입을 가질 수 있습니다. 컴파일러는 값과 함께 값이 있는지를 나타내는 `bool` 하나를 가지고 다니며, 이 방식은 모든 타깃에서 같습니다. `return undefined;`는 없는 값을 돌려줍니다. 값 없이 적은 `return;`이나 본문의 끝까지 도달하는 경로도 선택적 반환 타입에서는 부재 값을 돌려줍니다. `T | null`에서는 `null`을, `undefined`를 허용하는 타입에서는 `undefined`를 사용합니다. 반환 타입을 추론할 때 이런 경로가 있으면 `undefined`를 포함하며, 일반 값 반환 타입에는 모든 경로의 `return`이 필요합니다. `v === undefined`는 값이 없는지 검사하며, `v ?? d`는 `v`가 없을 때 `d`를 줍니다.
느슨한 비교인 `v == null`과 `v != null`도 두 피연산자의 순서와 관계없이 부재와 존재를 검사하며 같은 타입 좁히기를 적용합니다(변경 0098, D4). Null을 저장하려면 `T | null`을, 두 부재 상태를 구분하려면 `T | null | undefined`를 사용합니다. 엄격한 비교(`=== null`, `=== undefined`)는 두 상태를 구분하며, 느슨한 비교는 둘 다 제외합니다.

```ts
"use typeshade";

function root(x: f32): f32 | undefined {
  if (x < 0.) {
    return undefined;
  }
  return sqrt(x);
}

export function rootOr(x: f32, fallback: f32): f32 {
  const v = root(x);
  if (v === undefined) {
    return fallback;
  }
  return v * 2.; // v is an f32 here, as TypeScript reads it
}

export function rootOrOne(x: f32): f32 {
  return root(x) ?? 1.;
}
```

컴파일러는 TypeScript의 타입 좁히기(narrowing)를 따릅니다. `if`, `?:`, `&&`, `||`, `while`, `for` 안의 `v !== undefined` 검사, 조기 `return`, 대입이 타입을 좁힙니다. 아무것도 좁히지 않은 값을 읽으면 `TS8003`이 발생하며, 진단은 써야 할 검사와 폴백을 알려 줍니다. `o?.f`는 선택적 구조체의 필드를 읽고, 그 결과도 선택적 값입니다. 함수 범위에서는 구조체 필드와 배열 요소가 선택적 값을 담을 수 있고, 선택적 매개변수 `x?: T`는 본문에서 `T | undefined`이며 호출에서 생략할 수 있습니다. 바인딩, 모듈 변수, 모듈 상수, 진입점의 매개변수와 결과는 선택적 값을 담을 수 없습니다. 이때 `TS8002`가 위치와 필드를 알려 줍니다. 선택적 값은 아직 호스트 값이 없으므로, 선택적 값을 받거나 돌려주는 내보낸 헬퍼는 호스트 코드에서 부를 수 없습니다. 하향 변환, 좁히기 형태, 모든 거부 조건은 `docs/use-typeshade-surface.md` §76에 있습니다.

`T | null`은 일반 함수와 지역 변수뿐 아니라 클래스, 필드, 생성자, 메서드, 접근자, 콜백, 제네릭 인수에도 적용됩니다. 두 상태의 null 타입과 undefined 타입은 저장 형식이 같지만 서로 다른 타입이며, 각각 세 상태의 타입으로 확장할 수 있습니다. `box?.value`는 객체가 없으면 undefined를 반환하고, 객체가 있으면 멤버의 null을 유지합니다.
초기화하지 않은 nullable 클래스 필드는 null로 시작하고, undefined를 허용하는 필드는 undefined로 시작합니다. 지역 변수 `let x: T | null`은 읽기 전에 대입해야 합니다. 객체 리터럴에서는 `?` 필드만 생략할 수 있습니다. 세 상태의 예제는 `examples/null-values.shade.ts`에 있습니다.

### 숫자 리터럴

소수점을 붙여 쓴 숫자는 `f32`입니다. 소수점 없이 쓴 숫자는 그 자리가 선언한 타입을 따릅니다.
WGSL의 추상 정수 규칙과 같습니다.

```ts
x + 1.; // f32 x → x + 1.0
flags & 1; // u32 flags → flags & 1u
mode == 2; // u32 mode → mode == 2u
vec4(pos, 0., 1.); // float components
vec2u(0, 1); // → u32 components
```

그 자리는 선언된 타입(`let n: u32 = 16`)일 수도 있고, 옆의 피연산자, 리터럴을 넘겨받는 호출의
매개변수, 구조체 필드, 벡터 생성자의 요소일 수도 있습니다. 부동소수점 자리에서는 리터럴이 늘
`f32`로 남습니다. 그래서 `mix(a, b, 1)`은 `mix(a, b, 1.0)`이 됩니다. 타입 사이의 암묵적 변환은
없습니다. `u32`로 선언된 자리에 `i32` 값을 쓰면 오류이므로 캐스트를 직접 씁니다. 모든 자리의
목록은 `docs/use-typeshade-surface.md` §13에 있습니다.

음수 리터럴도 같은 방식으로 타입이 정해집니다. `x * -6.`, `x + -0.25`, `vec3(-1., 0., 1.)`은 두
타깃 모두에서 부호 있는 리터럴로 생성되므로, 부호는 숫자에 붙여 씁니다.

### 모듈 상수

최상위 `const`는 모듈 상수입니다. 한 번 선언하면 두 타깃 모두에 `const`로 생성되고, CPU
오라클도 이 값을 계산합니다. 벡터 상수와 배열 상수는 모든 백엔드가 생성하는 표현식으로 값을
담습니다.

```ts
"use typeshade";

const PI: f32 = 3.14159265;
const SKY = vec4(0.4, 0.6, 0.9, 1.);
const PALETTE = array<vec4, 3>(vec4(1., 0., 0., 1.), vec4(0., 1., 0., 1.), vec4(0., 0., 1., 1.));

export function area(r: f32): f32 {
  return r * r * PI;
}

export function tint(i: i32): vec4 {
  return PALETTE[i] * SKY;
}
```

값은 상수여야 합니다. 리터럴, 파일 앞쪽에서 선언한 상수, 이들로 만든 생성자, 이들에 대한 산술,
이들에 대한 수학 내장 함수(`const K: f32 = sin(1.)`)가 상수입니다. 함수 안에서 읽는 상수는
편집기가 찾아 주는 이름입니다. 그래서 이름을 바꾸거나 잘못 쓴 상수는 쓰인 자리마다 오류로
나타납니다.
