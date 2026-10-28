---
id: production-emit
source: 43a73d0c628a8eac2b1128078cd4c7fa822d90fd7087b4426e75318a34952966
sourceLine: 2662
---

이 페이지는 배포용 변환을 코드 생성 호출에 조합하고, 변경된 식별자가 포함된 드라이버 로그를 원래 이름으로 해석하는 방법을 설명합니다.

번들러는 JavaScript를 압축하지만 `createShaderModule`이나 `gl.shaderSource`에 전달하는 셰이더 문자열은 변경하지 않습니다. 배포용 변환은 이 문자열을 처리합니다. 변환 기능은 별도 서브패스인 `typeshade/emit-prod`에 있으므로 가져오지 않은 빌드에는 포함되지 않습니다. 일반 생성 호출의 출력 바이트도 바뀌지 않습니다.

이 페이지의 예제가 읽는 모듈 `m`은 다음 소스에서 `compile()`이 돌려준 것입니다.

```ts
"use typeshade";

interface Params {
  tint: vec4;
}

declare const u: uniform<Params>;

function noise(p: vec2): f32 {
  const coordinate = floor(p * 4.);
  return fract(sin(dot(coordinate, vec2(12.9898, 78.233))) * 43758.5453);
}

function terrainShade(uv: vec2): vec4 {
  const h = noise(uv);
  return vec4(h, h * 0.5, 0.25, 1.) * u.tint;
}

@vertex
export function vs(@builtin("vertex_index") vi: u32): vec4 {
  return vec4(f32(vi & 1) * 4. - 1., f32(vi >> 1) * 4. - 1., 0., 1.);
}

@fragment
export function fs(@builtin("position") p: vec4): vec4 {
  return terrainShade(p.xy * 0.01);
}
```

### 플러그인 묶음

생성 플러그인 `EmitPlugin`은 이름이 붙은 변환을 코드 생성 호출에 전달하는 방식입니다. `emitModule`과 `emitGlslModule`은 옵션의 `plugins` 배열로 플러그인을 받습니다. `transformIR`은 텍스트 생성 전에 모듈을 변경하고, `transformText`는 생성된 문자열을 변경합니다. IR 단계는 항상 텍스트 단계보다 먼저 실행되며, 같은 단계에서는 배열 순서를 따릅니다.

```ts
import { emitModule, emitGlslModule } from 'typeshade'
import { mangle, minify, obfuscate } from 'typeshade/emit-prod'

const renames = new Map<string, string>()
const wgsl = emitModule(m, { plugins: [mangle({ renames }), minify()] })

// obfuscate() is the standard preset: [mangle, prune, aliasTypes, minify]
const vs = emitGlslModule(m, 'vertex', { plugins: obfuscate() })
const fs = emitGlslModule(m, 'fragment', { parens: 'minimal', plugins: obfuscate() })
```

`parens: 'minimal'`은 `plugins`와 나란히 생성 옵션에 적습니다. 괄호를 넣을지 말지는
생성기가 텍스트를 쓰면서 정하는 일이기 때문입니다. 이 옵션은 WGSL과 GLSL ES 3.00이
우선순위를 똑같이 정의하는 자리에서만 괄호를 생략합니다. 단항 마이너스는 `*`, `/`,
`%`보다 우선순위가 높고, 이들은 다시 `+`, `-`보다 우선순위가 높습니다. 관계·논리·비트·
시프트 연산자의 괄호는 그대로 둡니다. WGSL은 이 연산자들을 괄호 없이 이어 쓸 때의
우선순위를 정해 두지 않았기 때문입니다. 연산 순서를 다시 묶는 일은 없으므로
`a + (b + c)`의 괄호는 그대로 남습니다. 기본값 `'full'`은 생성되는 모든 바이트를 그대로
둡니다. `packModule(m, { emit })`도 같은 옵션을 받으므로, 런타임이 불러오는 매니페스트에는
배포용 텍스트가 담깁니다.

### 짧아진 이름

맹글링(mangling)은 생성 결과에 유지할 필요가 없는 식별자를 짧게 바꾸는 작업입니다. `mangle()`은 헬퍼 함수, 일반 구조체, 모듈 상수, 헬퍼 매개변수, 모든 지역 변수를 `a`, `b` 같은 base-52 이름으로 바꿉니다. 한 글자 이름을 모두 사용하면 `aa` 같은 두 글자 이름을 사용합니다. 지역 이름은 함수마다 같은 이름 풀을 다시 사용하므로 짧은 이름을 재사용합니다. 이 재사용이 바이트 절감의 대부분을 차지합니다. 같은 모듈의 이름 변환은 항상 같으므로 GLSL 스테이지를 따로 생성해도 공유 이름이 일치하고 링크할 수 있습니다.

`renames`에 `Map`을 전달하면 소스 이름과 생성된 이름의 대응 관계를 저장합니다. 이 맵은 셰이더 소스 맵이며 배포 번들에 포함하지 않아야 합니다.

```ts
const renames = new Map<string, string>()
const wgsl = emitModule(m, { plugins: [mangle({ renames })] })

renames.get('terrainShade') // 'b'
renames.get('noise.coordinate') // 'd'; a function-scoped key is `authoredFn.authoredName`
```

### 더 작아진 텍스트

텍스트 자체를 줄이는 플러그인은 셋입니다.

`minify()`는 생성된 소스를 토큰으로 쪼갠 뒤 그 토큰들을 다시 이어 쓰는데, 붙여 쓰면
이웃한 두 토큰이 하나로 합쳐질 자리에만 구분자를 넣습니다. 주석은 지우고, `#` 지시문은
한 줄을 그대로 차지하며, 숫자 리터럴은 값을 바꾸지 않는 범위에서 표기를 정리합니다.
그래서 `0.500`은 `.5`가 됩니다. `{ numbers: 'f32' }`를 주면 실수마다 f32로 반올림했을 때
같은 값이 되는 가장 짧은 십진수로 다시 씁니다. 손으로 검토해 둔 기준 출력과 비교할
때는 `{ numbers: false }`를 넘깁니다.

`aliasTypes()`는 자주 쓰이는 타입마다 짧은 이름을 붙이고 한 번만 선언합니다. WGSL에서는
`alias A=vec2<f32>;`로, GLSL에서는 `#define A vec2`로 선언합니다. 두 타깃 모두 그
타입을 적던 모든 자리에서 짧은 이름을 받아들이며, 생성자 호출 자리도 마찬가지입니다.
두 언어 모두 타입 이름은 예약어라 `mangle()`이 건드릴 수 없고, 그래서 맹글링을 거치고
나면 가장 많이 남는 것이 타입 이름입니다. 별칭을 선언하는 비용보다 절약이 적은 타입
표기는 건너뜁니다. 어떤 타입이 어떤 별칭이 되었는지는 같은 `renames` 맵에 함께
기록합니다.

`prune()`은 GLSL 전방 선언 가운데 함수 정의가 이미 모든 호출 지점보다 앞에 와서 필요
없어진 것만 지우고, 나머지는 모두 남겨 둡니다. WGSL에서는 아무 일도 하지 않습니다. GLSL
백엔드는 호출 그래프상 꼭 필요한 자리에만 전방 선언을 생성하므로, 이 플러그인은
백엔드가 쓰지 않은 GLSL을 다룰 때 씁니다. 호스트가 끼워 넣는 모듈 조각(module
fragment)이 그런 예입니다.

```ts
import { aliasTypes, minify, minifyShaderText, prune } from 'typeshade/emit-prod'

const glsl = emitGlslModule(m, 'fragment', {
  parens: 'minimal',
  plugins: [prune(), aliasTypes({ renames }), minify({ numbers: 'f32' })],
})

minifyShaderText(wgsl, { numbers: 'f32' }) // the same pass over a string you hold
```

### 인라인화

`inline()`은 호출 그래프를 평평하게 펼칩니다. 안전하게 인라인할 수 있는 헬퍼는 모든
호출 지점에 인라인되므로, 그 함수들은 출력에서 사라집니다. 반환문 하나뿐인 헬퍼는 호출
자리를 그 표현식으로 바꿔 넣는 방식으로 인라인하고, 문장이 여럿이지만 빠져나가는 곳이
하나뿐인 헬퍼는 그 문장들을 호출한 함수 안으로 옮겨 인라인합니다. 진입점과 재귀 함수는
언제나 그대로 둡니다.

인라인화가 코드 크기를 줄인다고 보장하지는 않습니다. 여러 곳에서 호출하는 헬퍼는 호출 위치마다 복제됩니다. 코드의 구조를 추적하기 어렵게 만들기 위해 `mangle()`, `minify()`와 조합하며, 프리셋에는 포함되지 않습니다. 인라인화와 이름 변경은 모두 IR 단계이므로 `mangle()`보다 먼저 배치해야 합니다.

옵션은 `opaque` 하나뿐입니다. f64 하향 변환(lowering)은 자신이 끼워 넣는 에뮬레이션
라이브러리의 헬퍼에 최적화 금지 플래그를 찍어 두는데, 이 옵션은 그런 헬퍼를 어떻게
다룰지 정합니다. 기본값인 `'keep'`은 그런 헬퍼를 그대로 둡니다. `'single-call'`은 호출
지점이 하나뿐인 헬퍼까지 인라인 대상에 넣습니다. 선언 하나와 호출 하나를 없애는
것이라 복사되는 코드가 없기 때문입니다. `'all'`은 모든 헬퍼를 대상에 넣으며, 그 대가로
생성되는 바이트가 5.1x에서 27.2x까지 늘어납니다. `maxGrowth`는 인라인하는 동안 모듈의
연산 개수가 몇 배까지 늘어나도 되는지 상한을 정하고, `report`에는 플래그가 붙은 헬퍼를 검토할 때마다
어떤 결정을 내렸는지 하나씩 쌓입니다.

```ts
import { inline, obfuscate, type InlineDecision } from 'typeshade/emit-prod'

const decisions: InlineDecision[] = []
const shipped = emitModule(m, {
  parens: 'minimal',
  plugins: [inline({ opaque: 'all', maxGrowth: 4, report: decisions }), ...obfuscate()],
})

decisions // [{ fn, callSites, ops, growth, inlined, reason: 'inlined' | 'over-budget' | 'not-inlinable' }, …]
```

### 드라이버 로그 디코딩

배포용 텍스트는 읽기 어렵게 변환되므로 드라이버 오류에도 `no matching overload in 'b' for arg of type 'f'` 같은 이름이 표시됩니다. `decodeShaderLog(log, renames)`는 로그의 이름을 소스 이름으로 복원합니다. 토큰 단위로 치환하므로 드라이버 설명, 줄 번호, 소스 발췌는 유지하고, 긴 단어에 포함된 짧은 이름을 잘못 바꾸지 않습니다. 디코딩은 빌드 시점에 수행하며 디코더와 맵은 모두 `emit-prod` 서브패스에 있습니다. 배포 번들에는 포함되지 않습니다.

모듈 범위 이름과 타입 별칭은 원래 이름이 하나로 정해지므로 바로 복원합니다. 드라이버가 오류에 기록하는 이름도 이 두 종류입니다. 지역 이름은 여러 함수에서 재사용하므로 후보가 여러 개이면 모두 표시합니다. `invertRenames(renames)`는 이 역방향 대응표를 데이터로 반환합니다.

```ts
import { decodeShaderLog, invertRenames, obfuscate } from 'typeshade/emit-prod'

const renames = new Map<string, string>()
emitModule(m, { parens: 'minimal', plugins: obfuscate({ renames }) })

decodeShaderLog("no matching overload in 'b' for arg of type 'f'", renames)
// "no matching overload in 'terrainShade' for arg of type 'vec2<f32>'"

decodeShaderLog('undeclared identifier d', renames)
// 'undeclared identifier d⟨coordinate (in noise) | h (in terrainShade)⟩'

invertRenames(renames).get('b') // { emitted: 'b', authored: ['terrainShade'] }
```

### 절대 이름을 바꾸지 않는 대상

어떤 이름은 호스트가 실행 시점에 이름으로 찾는 인터페이스라서, 바꾸면 바인딩이
끊어집니다. 그런 이름 다섯 종류는 건드리지 않습니다. 진입점 이름은 WebGPU
파이프라인이 `entryPoint`에 그대로 적는 이름입니다. 진입점 매개변수 이름은 구조체가
아닌 매개변수라면 그 이름이 곧 GLSL varying 이름이고, 버텍스 쪽에서는 별도의 생성
호출이 반환 구조체의 필드 이름으로 같은 varying을 적습니다. 바인딩 이름은 `_fp64`
가드까지 포함해 호스트가 이름으로 찾습니다. 바인딩 구조체 이름은 그대로 GLSL 유니폼
블록의 태그가 됩니다. 구조체 필드 이름은 std140 레이아웃 정보를 담고 있고, GLSL에서는
varying이 이 이름으로 두 스테이지를 연결합니다. IR 빌더가 조립한 모듈에 raw 문(statement)이
들어 있으면 모듈 전체의 이름을 바꾸지 않는다([`docs/ir-builder.md`](docs/ir-builder.md)).

```ts
const renames = new Map<string, string>()
emitModule(m, { parens: 'minimal', plugins: obfuscate({ renames }) })

renames.get('terrainShade') // 'b', a helper function
renames.get('vec2<f32>') // 'f', a type alias
renames.has('u') // false; a binding name a host resolves
renames.has('fs') // false; an entry-point name a pipeline names
```

### 배포되는 모듈이 검증한 모듈과 같음을 증명하기

`semanticDiff(dev, prod)`는 두 모듈의 차이를 네 분류로 보고합니다. 배포용 파이프라인의 의도한 변경도 이 분류에 포함됩니다. 생성에 사용한 플러그인 배열을 `transforms`로 전달하면, 해당 파이프라인에서 발생한 것으로 증명된 차이를 `explained`로 옮깁니다. 각 항목은 어떤 플러그인이 어느 분류의 차이를 설명하는지 기록합니다.

```ts
import { isSemanticallyEqual, semanticDiff } from 'typeshade'
import { inline, obfuscate } from 'typeshade/emit-prod'

// devModule: the module you tested; prodModule: the one the production pipeline ships.
const d = semanticDiff(devModule, prodModule, { transforms: [inline(), ...obfuscate()] })

isSemanticallyEqual(d) // true when prod differs from dev only as the declared pipeline dictates
d.explained // [{ transform: 'inline', bucket: 'controlFlow', line: '…' }, …]
```

분류는 플러그인의 실제 적용 결과로 결정합니다. 선언된 플러그인의 `transformIR`을 dev 모듈에 적용해 차이가 사라질 때만 `explained`로 옮깁니다. 따라서 최적화 재작성과 비슷한 회귀도 원래 분류에 남습니다. 패리티 게이트는 설명되지 않은 차이에 예산을 설정할 수 있습니다. 비교기는 생성 텍스트를 읽지 않으므로 텍스트 단계 플러그인은 차이를 설명하지 않습니다. 배포용 플러그인 배열 전체를 전달해도 이 기준은 유지됩니다.

이 저장소의 예제 코퍼스에서 `obfuscate()`에 `parens: 'minimal'`을 더하면 일반 생성
결과 182,437자가 93,753자로 줄어들며, 이 성질은 두 개의 게이트가 검증합니다.
`examples/minify-safety.test.ts`는 압축 전후로 토큰 스트림과 모든 리터럴의 f32 값이
같고, 이 패스를 두 번 적용해도 결과가 같다는(멱등) 점을 검증합니다.
`examples/reserved-word-safety.test.ts`는 코퍼스를 `obfuscate()`와
`[inline(), ...obfuscate()]` 양쪽으로 돌려서, 어느 플러그인도 두 언어 중 한쪽에서라도
예약어인 이름을 만들어 내지 않는다는 것을 검증합니다.
