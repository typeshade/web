---
id: the-cpu-oracle
source: 0372e09c40db5f814d6f24b2dabed45d06952db7468ea2419fd552a7fe2aeeda
sourceLine: 1396
rules: 8.22 Ca5h_etdlFvIPBA1NRya7g-bBPugGzboprLldGAJYDc=, 7.2 onO98E-yRQ3RftA44lVmgPmSW7ZkCd7rYrJGgFS8EI4=, 3.9 3B2rlXJXA0GupXGpH-mhQpicZan-WehN8Xf4nhFST6Q=, 12.4 BHZ-Neq9i9zSLzX_EHLkq_rZA6ansI2EDMVOVFuqdZk=, 8.25 XZRD1So9e-OFRi9VePXRjyCfT2_T_xaPFWQw_Uy0ZrM=, 7.6 kyzs2Ws4Mk2xUgP_v9ZM_z6jm_3zIWP2-BekxmeHpC8=, 12.7 J74H031gQ4FNHTZrIegdYr02_KKNMFFkgQLHhsuICeM=
---

이 페이지는 같은 모듈을 CPU에서 배정밀도로 실행하고 GPU 결과와 비교하는 방법을 설명합니다.

CPU 오라클은 WGSL·GLSL 생성기와 같은 IR을 읽는 세 번째 백엔드이며 셰이더의 계산 기준값을 제공합니다. 디바이스나 브라우저 없이 JavaScript에서 실행합니다. 모듈의 각 함수는 수치 인자를 받아 결과를 반환하는 JavaScript 함수가 됩니다. 픽셀 결과에 문제가 있을 때 이 기준값과 GPU 결과를 비교합니다. 검증도 두 GPU 생성기와 같으므로 오라클이 거부하는 모듈은 두 생성기도 거부합니다.

### CPU용으로 모듈 컴파일하기

`compileModule(m)`은 `CpuModule`을 반환합니다. 함수 이름을 키로 삼는 `fns` 레코드와,
모듈이 읽는 리소스에 값을 넣는 `setBinding` 메서드로 이루어져 있습니다. 진입점과 헬퍼
함수는 모두 `fns` 안에, 선언할 때 쓴 이름 그대로 들어 있습니다. 함수에 넘기고 돌려받는
값은 그냥 JavaScript 값입니다. 스칼라는 `number`나 `boolean`이고, 벡터나 행렬은 중첩 없이
펼친 `number[]`이며, 구조체는 필드 이름을 키로 삼는 객체입니다.

```ts
"use typeshade";

export function len(p: vec2): f32 {
  return sqrt(dot(p, p));
}
```

```ts
import { compile, compileModule } from 'typeshade'

const cpu = compileModule(compile(source).module) // source: the file above, as text
cpu.fns.len([3, 4]) // → 5
```

`compileModule`은 호출마다 IR 노드를 해석합니다. `compileModuleJs(m)`은 같은 인자와 결과 구조를 사용하지만, 함수 본문을 한 번 순회해 JavaScript 소스를 만들고 `new Function`으로 컴파일합니다. 프레임마다 실행하거나 버퍼의 모든 행에서 수천 번 실행할 때 사용합니다. 소스로 변환할 수 없는 함수만 인터프리터로 실행하므로, 호출 코드는 변경하지 않고 한 모듈에서 컴파일과 해석을 함께 사용할 수 있습니다. 단, `eval`을 금지한 호스트에서는 `new Function`이 오류를 던지므로 `compileModule`을 사용해야 합니다.

`compile()`도 모듈 옆에 자체 `eval(name, args)`를 돌려주므로, 간단히 호출해 볼 때 씁니다. Vite
플러그인을 쓰면 호스트 코드가 내보낸 헬퍼를 직접 부릅니다. 그 방법은
[모듈의 헬퍼를 호스트 코드에서 부르기](#calling-a-modules-helpers-from-host-code)에 있습니다.

### 바인딩과 호출

바인딩은 유니폼 블록, 스토리지 버퍼, 텍스처, 샘플러처럼 파이프라인이 제공하는 리소스입니다. 오라클에는 GPU 메모리가 없으므로 최초 호출 전에 `setBinding(name, value)`로 값을 설정해야 합니다. 이름은 `declare const`의 선언과 같아야 합니다. `reflect(m).bindGroups`는 하향 변환(lowering)에서 추가한 항목까지 포함해 호스트가 채울 바인딩을 나열합니다. 오라클은 실행 함수가 실제로 읽는 바인딩만 요구합니다. 따라서 f64 연산이 있어도 하향 변환에서 추가하는 `_fp64` 가드 텍스처([fp64](/guide/authoring/fp64/) 참고)는 설정하지 않아도 됩니다. 함수가 읽는 바인딩을 설정하지 않으면 `typeshade/cpu: unbound <name>` 오류가 발생합니다.

```ts
"use typeshade";

interface Params {
  scale: f32;
}

declare const u: uniform<Params>;
declare const data: storage<array<f32>>;

export function scaleAt(i: u32): f32 {
  return data[i] * u.scale;
}
```

```ts
const m = compile(source).module // source: the file above, as text
const cpu = compileModule(m)
cpu.setBinding('u', { scale: 2 }) // a uniform block: an object keyed by field name
cpu.setBinding('data', [1, 2, 3]) // a buffer: one flat array
cpu.fns.scaleAt(2) // → 6
```

배열과 구조체는 참조로 유지하므로 `read_write` 스토리지 버퍼에 쓰면 전달한 배열이 직접 변경됩니다. 호출 후 같은 배열에서 결과를 읽을 수 있습니다. `f64` 값은 CPU에서 JavaScript 숫자 하나로 표현합니다. GPU에서는 같은 값을 상위·하위의 f32 두 개로 전달하며, `splitF64(x)`는 호스트가 버퍼에 넣을 쌍을 만듭니다. 양쪽은 같은 수를 각 실행 환경에 맞는 형태로 표현합니다.

### f64와 f32 정밀도 모드

두 컴파일 함수 모두 `precision` 옵션을 받으며, 이 옵션이 f32 연산을 어떻게 계산할지
정합니다. 기본값인 `'f64'`에서는 모든 연산을 중간 반올림 없이 JavaScript의 배정밀도로
계산하므로, 결과는 유효 비트 53개 안에서 수식대로 계산한 값 그대로입니다. 모듈이 맞는
연산을 맞는 순서로 골랐는지 확인할 때 이 모드를 씁니다. 값을 32비트로 줄일 때에만
드러나는 오차는 이 모드로는 원래 잡히지 않습니다.

`'f32'`에서는 GPU 백엔드에 넘기는 것과 같은 모듈을 그대로 두고, f32 타입 연산마다
결과를 f32로 반올림하며 오버플로가 나면 무한대로 만듭니다. 타깃이 정말 이 값을
계산하는지 확인할 때 이 모드를 씁니다. 그러면 GPU에서 읽어 온 값과 비교할 때 진짜
불일치를 가릴 만큼 넓은 허용 오차 대신 ulp 단위로 좁혀서 볼 수 있습니다.

```ts
"use typeshade";

export function acc(a: f32, b: f32): f32 {
  return a + b;
}
```

```ts
const m = compile(source).module // source: the file above, as text

compileModule(m).fns.acc(1, 2 ** -30) // → 1.0000000009313226
compileModule(m, { precision: 'f32' }).fns.acc(1, 2 ** -30) // → 1
```

이 모드는 [fp64](/guide/authoring/fp64/)에서 다루는 에뮬레이션 `f64` 타입과는
별개입니다. `f64` 값은 CPU에서는 온전한 배정밀도 그대로이고, GPU에서는 유효 비트 약
48개를 담는 f32 값 쌍으로 계산됩니다. 이런 모듈은 WGSL, GLSL, CPU의 결과가 그 폭 안에서
서로 일치합니다.

비교할 때는 GPU가 쓴 버퍼를 읽어 와서, 같은 모듈을 CPU에서 한 행씩 실행한 결과와 맞춰
봅니다.

```ts
import { compileModuleJs } from 'typeshade'

// m: the module of the bindings sample above.
const cpu = compileModuleJs(m, { precision: 'f32' })
cpu.setBinding('u', { scale: 2 })
cpu.setBinding('data', Array.from(rows)) // rows: the input the GPU run was given

// gpuOut: the Float32Array read back from that GPU run.
for (let i = 0; i < gpuOut.length; i++) {
  const expected = cpu.fns.scaleAt(i) as number
  if (Math.abs(gpuOut[i] - expected) > 1e-6) {
    throw new Error(`row ${i}: GPU ${gpuOut[i]}, CPU ${expected}`)
  }
}
```

### CPU에서 의미가 없는 호출

일부 GPU 전용 내장 함수는 CPU에서 계산할 정보가 없으므로 실행 경로가 도달하면 오류를 던집니다. 텍스처 읽기인 `textureSample`, `textureSampleLevel`, `textureLoad`와 배열·bias·grad·gather·깊이 비교 변형, `textureStore`, 크기 조회인 `textureDimensions`와 `textureNumLayers`, 미분인 `dpdx`, `dpdy`, `fwidth`와 coarse·fine 변형이 이에 해당합니다. 전체 목록은 `ORACLE_GPU_STUB_NAMES`로 내보냅니다. IR 빌더로 조립한 모듈의 raw 문(statement)도 오라클이 해석하지 않는 타깃 언어 텍스트이다([`docs/ir-builder.md`](docs/ir-builder.md)).

`{ gpuStubs: true }`로 컴파일하면 이런 내장 함수는 대체 값을 반환합니다. 텍스처 읽기는 불투명한 검정, 미분은 영, `textureDimensions`는 1×1, `textureNumLayers`는 레이어 하나입니다. 옵션을 사용하지 않을 때의 오류에는 내장 함수와 옵션 이름이 표시됩니다. 대체 값으로도 검증할 수 있는 계산에만 사용합니다. 샘플 값과 무관한 프래그먼트 주변의 기하 계산이 그 예입니다. 단, 바인딩은 여전히 설정해야 합니다. 호출을 스텁으로 대체하기 전에 텍스처와 샘플러 변수를 읽기 때문입니다.

```ts
"use typeshade";

declare const tex: texture_2d<f32>;
declare const smp: sampler;

@fragment
export function shade(@location(0) uv: vec2): vec4 {
  return textureSample(tex, smp, uv);
}
```

```ts
const cpu = compileModule(compile(source).module, { gpuStubs: true })

cpu.setBinding('tex', 0) // the value is never read under a stub
cpu.setBinding('smp', 0)
cpu.fns.shade([0.5, 0.5]) // → [0, 0, 0, 1]
```

### grad로 구하는 미분

`grad(m, fn, param)`은 모듈의 함수 하나를 매개변수 하나에 대해 미분하고 `{ module, name }`을
반환합니다. `module`은 새 함수가 하나 더해진 모듈입니다. 이 함수는 `fn`과 같은 인수를 받아
그 지점의 `d fn / d param`을 돌려주며, 결과 타입은 `fn`의 결과 타입과 같습니다. 새 함수도
평범한 IR이므로 오라클이 그대로 실행하고, 진입점이 이 함수를 호출하면 WGSL과 GLSL 코드
생성기가 함께 출력합니다.

```ts
"use typeshade";

export function wave(x: f32, k: f32): f32 {
  return sin(k * x) * k;
}
```

```ts
import { compile, compileModule, grad } from 'typeshade'

const m = compile(source).module // source: the file above, as text
const d = grad(m, 'wave', 'k')

compileModule(d.module).fns[d.name](0.5, 2) // → cos(1) * 0.5 * 2 + sin(1) = 1.3817…
```

미분은 순방향 모드로 계산합니다. 모든 `f32`와 부동소수점 벡터, 부동소수점 행렬은 값 옆에
미분값을 함께 들고 다니며, `if`, `switch`, `for`는 본문을 지나는 동안 둘 다 전달합니다.
모듈의 다른 함수를 호출하면 호출되는 함수마다 한 번 생성되는 헬퍼 `g_jvp`를 거칩니다.
성분별 내장 함수에는 교과서에 나오는 미분 규칙이 있습니다. `floor`, `ceil`, `round`,
`trunc`, `sign`, `step`의 미분은 영입니다. 불연속 지점을 빼면 어디서나 맞는 값입니다. 벡터
매개변수라면 `{ direction: [...] }`을 넘기고, 결과는 그 방향을 따라 구한 방향 미분이 됩니다.

미분 규칙이 없는 구성 요소에 매개변수가 도달하면 `SD0118`로 거부하고 진단에 요소 이름을 표시합니다. 텍스처 샘플, 미분 내장 함수, 매개변수가 전달되는 구조체가 그 예입니다. 매개변수가 도달하지 않는 요소는 이 거부 조건에 해당하지 않습니다. 유도할 수 없는 미분을 영으로 대체하지 않습니다. 생성된 함수는 오라클에서 중앙 유한 차분과 비교해 검사합니다. 직접 작성한 함수도 같은 방법으로 검사할 수 있습니다.

`grad(m, fn, wrt, { mode: 'reverse' })`는 `wrt`에 적은 모든 이름에 대해 한 번에 미분한다(변경
제안 0056). 새 함수의 기본 이름은 `<fn>_vjp`이다. 이 함수는 같은 인수 뒤에 결과 타입의 시드
`dy`를 하나 더 받고, 이름마다 필드가 하나씩 있는 구조체를 반환합니다. 각 필드는 벡터-야코비안 곱
`dy · d fn / d name`입니다. 호출 한 번으로 기울기 전체를 얻으므로, 손실 함수처럼 매개변수는 많고
결과는 작을 때 이 모드를 씁니다. CPU에서 이 구조체는 객체이며, `d.adjoints`가 매개변수마다 그
필드의 이름을 알려 줍니다.

```ts
const r = grad(m, 'wave', ['x', 'k'], { mode: 'reverse' })
compileModule(r.module).fns[r.name](0.5, 2, 1) // → { x: …, k: … }
```

역방향 모드는 함수 본문을 순방향으로 한 번 실행한 뒤 역순으로 순회합니다. 역방향 계산에 필요한 값은 함수의 지역 변수에 저장하므로 버퍼를 할당하지 않습니다. 순방향 모드와 같은 산술, 내장 함수, 분기, 호출을 미분하며 불연속 지점의 미분은 영입니다.

반복은 함수 메모리 안의 체크포인트 일정에 따라 뒤로 훑습니다. 반복 횟수는 횟수가 정해진 `for`의
머리에서 얻습니다. `while`이나 `break`가 있는 반복이라면 반복을 한 번 더 실행해 횟수를 세어
얻습니다. 반복의 상태는 `ceil(N / C)`회마다 `C`개의 슬롯(`opts.checkpoints`, 기본값 32)에
저장되고, 각 구간은 자기 슬롯에서 다시 실행됩니다. 반복이 `C²`회 이하이면 본문은 앞으로 세 번쯤,
뒤로 한 번 실행됩니다. `C²`회를 넘으면 시간이 `N² / C`에 비례해 늘어납니다. `d.tapeBytes`는 이
일정이 호출마다 차지하는 함수 메모리를 알려 줍니다. 반복을 다시 실행할 때 효과가 되풀이될 호출이나
`discard`는 `SD0118`로 거부되고, 모듈 변수나 바인딩에 쓰는 것도 마찬가지로 거부됩니다.

`opts.custom`은 함수에 작성자가 직접 쓴 수반(adjoint)을 줍니다. `{ custom: { g: 'g_adjoint' } }`를
넘기면 `g`를 부를 때마다 `g_adjoint(g's arguments, dy)`에서 수반을 받습니다. 이 함수는 `g`의
부동소수점 매개변수마다 필드가 하나씩 있는 구조체를 반환합니다. 앞에서 뒤로 합성할 때의 투과율처럼
역으로 풀 수 있는 점화식에 이 옵션을 씁니다.

`gradCheck(m, fn, { wrt, at, mode })`는 어느 모드의 미분이든 인수 목록 `at`에서 `f64` 오라클의 중앙
차분과 비교하고 `{ ok, checked, worst }`를 반환합니다. `worst`는 두 값이 갈라지는 매개변수, 지점,
성분을 알려 줍니다.

### 모듈의 헬퍼를 호스트 코드에서 부르기

`"use typeshade"` 모듈은 애플리케이션이 가져올 수 있는 모듈이기도 합니다. Vite 플러그인을
설정하면 평범한 `.ts` 파일이 `.shade.ts`를 가져와 그 파일이 내보내는 헬퍼 함수를 부릅니다.
호출마다 그 함수의 코드가 GPU가 아니라 **CPU에서** 실행되며, GPU가 반올림하는 방식대로
`f32` 정밀도로 계산합니다. 높이 조회나 피킹 검사, 단위 테스트처럼 호스트 코드가 셰이더의 계산을
함께 쓸 때 이 방법을 씁니다. 같은 방식으로 가져온 `@compute` 진입점은 반대로 GPU에서 실행됩니다.
`await entry(bindings, workgroups)`는 진입점을 WebGPU에서 디스패치하고 진입점이 쓴 값을 배열로
다시 읽어 옵니다. `entry(bindings, workgroups, { constants: { WIDTH: 32 } })`는
`program.compute`와 같은 검증으로 선언된 오버라이드를 선택합니다. 실행 계획은 기존 제출을
유지하며 선택한 워크그룹 모양을 보고서에 표시합니다. CPU 호출은 같은 상수를 받는 생성된
클로저를 사용합니다. WebGL2는 선언된 기본 워크그룹 모양과 배열 길이를 지원합니다.
가져온 프래그먼트 진입점을 `entry(canvas, bindings)`로 호출하면 전체 화면 프래그먼트
진입점을 캔버스에 그린다(`docs/use-typeshade-surface.md` §67).

```ts
// app.ts, ordinary TypeScript: terrain.shade.ts exports `height(p: vec2, k: vec4): f32`
import { height } from './terrain.shade.ts'

const h = height([0.5, 0.5], [1, 0.5, 2, 0.25]) // a number
```

전체 컴퓨트 예제는
[`host-compute.shade.ts`](examples/hosts/host-compute/host-compute.shade.ts)와
[`host.ts`](examples/hosts/host-compute/host.ts)에 있습니다. `run()`은 선언된 기본값을 사용합니다.
`runSpecialized()`는 직접 호출에서 `GAIN`을, `device.fuse()`에서 `WIDTH`를 선택합니다.
`Math.ceil(n / width)`로 디스패치 크기를 계산하고 셰이더에서 경계를 검사합니다. 따라서 원소
259개를 실행하면 마지막 워크그룹은 일부만 채워집니다. WebGPU의 진입점 그룹 보고서에는
`workgroupShapes: [[32, 1, 1]]`, 디스패치 하나, 제출 하나가 표시됩니다.
뒤따르는 `output.read()`는 별도의 읽기입니다. WebGL2는 일반 상수를 선택하면서 기본 폭
64를 유지합니다. CPU tier는 선택한 모양과 상수를 사용하지만 배리어를 실행할 수는 없습니다.

같은 디바이스, 진입점, fp64 방식에서 정규화한 상수가 같으면 파이프라인을 재사용합니다.
입력 길이마다 새 파이프라인을 만드는 대신 측정한 크기 몇 가지 중에서 선택합니다. 런타임은
이름, 스칼라 범위, 워크그룹 차원, 공유 메모리 한도를 검사합니다. 크기를 선택해도 최적의
크기가 자동으로 정해지거나 호출자가 전달한 워크그룹 개수가 바뀌지는 않습니다. 실행 계획을
기록하는 경우에도 진입점 호출 시점의 값을 보관합니다.

값은 일반 JavaScript 값입니다. 스칼라는 `number`나 `boolean`, 벡터는 튜플(`[x, y]`), 행렬은
열 우선으로 펼친 배열, `array<T, N>`은 배열, 구조체는 객체가 됩니다. 호출은 각 인자를 검사하고,
맞지 않는 인자가 있으면 매개변수 이름을 포함한 `TypeError`를 던집니다. 반환값은 새로 생성한
값이며 호출은 동기적으로 완료됩니다.

호스트가 호출할 수 있는 함수는 내보낸 헬퍼 중 진입점이나 제네릭이 아니고, 함수 인자를 받지 않으며, 바인딩이나 GPU 전용 내장 함수에 도달하지 않는 함수입니다. 나머지 내보내기는 이유와 함께 `never` 타입으로 표시되며 호출 위치에서 타입 오류가 발생합니다. 설정은 네 줄입니다. `vite.config.ts`에 플러그인 한 줄, `tsconfig.json`에 두 줄, `prepare`에 `tshc sync` 한 줄이 필요합니다. 전체 설정과 호스트 값 표는 `docs/use-typeshade-surface.md` §64에 있습니다.

### 배열을 도는 루프

크기가 없는 배열 `array<T>`를 받는 내보낸 함수는 커널 함수입니다. 호스트는 `await`로 실행을 기다리며, 전달한 배열은 직접 변경됩니다. 함수 본문 최상위의 `for`는 각 회차가 다른 회차의 데이터와 충돌하지 않는다고 컴파일러가 증명하면 GPU 인보케이션으로 실행됩니다. 증명하지 못하면 CPU에서 실행하며, 해당 줄과 해결 방법을 포함한 `TS8070` 경고를 보고한다(`docs/use-typeshade-surface.md` §65).

디스패치는 맨 위 루프의 것이므로, 그 안에 중첩된 루프는 호출 하나 안에서 통째로 실행됩니다.
두 겹의 중첩 루프로 쓴 격자는 행 하나가 호출 하나입니다. 칸마다 호출 하나가 되어야 한다면 격자를
평평한 루프 하나 `for (let i: u32 = 0; i < w * h; i++)`로 쓰고, 인덱스에서 `x = i % w`와
`y = i / w`를 구합니다.

커널 함수는 `@workgroup_size([128])`로 루프의 워크그룹 크기를 정할 수 있습니다. 배열에 정수 하나를
쓰며, `@compute([128])`가 진입점의 크기를 정하는 방식과 같다(`docs/use-typeshade-surface.md`
§3, §65). 리덕션을 하는 루프는 언제나 256 크기의 워크그룹으로 돌기 때문에, 이런 함수 안의
리덕션은 `TS8077`로 거부됩니다. 리덕션은 따로 함수를 만들어 옮깁니다.

커널 함수는 텍스처도 받을 수 있다(`docs/use-typeshade-surface.md` §65). `textureLoad`로 읽는
`texture_2d<f32>`가 하나이고, 2D 스토리지 텍스처 `texture_storage_2d<F, A>`가 다른 하나입니다.
스토리지 텍스처를 받으면 그 함수는 커널 함수가 되며, 루프는 `vec2u(i % w, i / w)`에 값을
저장합니다. 스토리지 텍스처는 `device.texture({ size, format, storage: true })`로 만들고, 함수는
디바이스를 별도로 지정하지 않고 일반 함수처럼 호출합니다. 이 호출은 텍스처를 소유한 디바이스를 선택한다(변경 0085). 순서를 보장하는 스코프가 필요하면 `device.fuse()`를 사용합니다. 텍스처 호출은 WebGPU에서 실행되고, WebGPU가 없으면 CPU
tier에서 실행됩니다. CPU tier의 디바이스는 텍스처를 메모리에 두며, `ImageData`는 그곳으로
복사됩니다. WebGL2는 아직 이 호출을 실행하지 않습니다.

### 호출 체인을 디스패치 하나로

같은 데이터에 커널 함수를 여러 번 부르는 호스트는 호출마다 디스패치 하나와 제출 하나를 씁니다.
`typeshade/fuse`의 `fuse`는 본문이 하는 호출을 기록했다가 한꺼번에 실행합니다. 호출들은 제출
하나로 실행되고, 각 호출이 바로 앞 호출이 같은 인덱스에 쓴 값을 읽으면 디스패치 하나로도
실행됩니다. 호스트는 `fuse`를 일부러 가져오고, `vite.config.ts`의 `typeshade({ fuse: true })`는
플러그인이 계획의 재료가 되는 사실을 기록하게 합니다. 다음 세 커널 함수는 디스패치 하나입니다.

```ts
"use typeshade";

export function add(out: array<f32>, a: array<f32>, b: array<f32>): void {
  for (let i: u32 = 0; i < out.length; i++) {
    out[i] = a[i] + b[i];
  }
}

export function mul(out: array<f32>, a: array<f32>, b: array<f32>): void {
  for (let i: u32 = 0; i < out.length; i++) {
    out[i] = a[i] * b[i];
  }
}

export function relu(out: array<f32>, x: array<f32>): void {
  for (let i: u32 = 0; i < out.length; i++) {
    out[i] = max(x[i], 0.);
  }
}
```

```ts
import { resident } from 'typeshade/runtime'
import { fuse } from 'typeshade/fuse'
import { add, mul, relu } from './ops.shade.ts'

const out = resident(n, 'f32') // zeros, with no upload; a, b and c are resident arrays too
const report = await fuse((scope) => {
  const t = scope.scratch(n)
  const u = scope.scratch(n)
  add(t, a, b)
  mul(u, t, c)
  relu(out, u)
})
report.dispatches // 1
const y = await out.read()
```

디바이스 소유자의 `device.fuse()`는 등록용 import 없이 같은 호출 기록기를 사용한다(변경 0085).
본문을 동기적으로 실행하고, 큐의 실행 순서를 예약한 뒤 로컬 실행기를 불러옵니다.
배포할 때는 생성된 모든 청크를 포함해야 합니다. 이름으로 가져오는 `fuse`도 기본 소유자의 배열에 계속 사용할 수 있습니다.

호출 체인의 병합에는 세 가지 작성 방식이 관련됩니다. 첫째, 함수마다 루프 하나를 사용하고 모든 배열은 같은 카운터로 인덱싱한다(`out[i] = a[i] + b[i]`). 바로 앞 호출이 같은 인덱스에 쓴 값을 읽는 호출은 병합됩니다. 둘째, 중간값은 호스트가 읽는 `resident` 대신 `scope.scratch(n)` 스크래치 배열에 둡니다. 병합 그룹은 이를 지역 변수로 유지하므로 위의 `t`와 `u`는 버퍼를 만들지 않고, 해당 `read()`는 오류입니다. 셋째, 합계가 필요하면 리덕션으로 체인을 끝냅니다. 스코프의 마지막 호출 `total(u)`는 앞선 호출을 자신의 루프에 포함하며, 리덕션 뒤의 호출은 그룹에 병합되지 않습니다.

본문 안의 진입점 호출(`@compute`)도 기록됩니다. 이 호출은 본문이 만든 순서대로 혼자 디스패치
하나로 실행됩니다. 어떤 커널 호출도 이 호출에 합쳐지지 않고, 이 호출도 다른 그룹에 합쳐지지
않습니다. 크기가 없는 스토리지 배열에는 `resident(...)` 값을 넘기며, 그 자리에 호스트 배열을 넘기면
`TypeError`이입니다.

호출이 바로 앞 호출과 떨어져 자기 디스패치로 실행되는 경우는 다음과 같습니다. 이웃을 읽는 경우
(`t[i - 1]`, `t[i ^ 1]`), 다른 인덱스에 쓰는 경우(`out[2 * i]`), 앞 호출이 읽는 것을 쓰는 경우,
반복 횟수가 다른 경우, 루프가 둘이거나 `continue`나 스캐터가 있는 경우입니다. 그룹이 장치가
허용하는 것보다 많은 스토리지 버퍼를 바인딩하게 될 때, 모듈을 `fuse: true` 없이 빌드했을 때도
떨어집니다. WebGL2와 CPU tier는 합치지 않습니다. 배열과 결과는 어느 쪽이든 같습니다. 합치기는
디스패치만 바꾸고 다른 것은 바꾸지 않습니다.

보고서는 어떤 호출이 합쳐졌고 나머지는 왜 합쳐지지 않았는지를 코드에 쓴 이름으로 알려 줍니다.
`report.groups`는 그룹을 순서대로 나열합니다. 각 그룹에는 `calls`와 합쳐졌는지(`fused`)가 있고,
바로 앞 그룹과 떨어진 그룹에는 `why`도 있습니다.

```text
mul and blur run as two dispatches because blur reads `t[i - 1]` (line 9)
```

`report.dispatches`와 `report.submissions`는 계획이 장치에 준 것을 집계합니다. 계획이 확인하는
모든 사실, 보고서와 오류의 각 문구, 스크래치 배열과 tier는 언어 인터페이스 참조 문서
`docs/use-typeshade-surface.md` §71에 있습니다.

### 다른 셰이더 모듈을 가져오는 모듈

`"use typeshade"` 파일은 다른 TypeScript 모듈처럼 다른 셰이더 파일이 내보낸 것을 가져옵니다.
`import { fbm } from './noise.shade.ts'`처럼 씁니다. 컴파일하는 파일과, 그 파일이 직접 또는 다른
파일을 거쳐 가져오는 셰이더 파일은 하나의 프로그램이고, 프로그램은 모듈 하나가 됩니다. 가져온
파일에서 컴파일하는 파일이 닿는 헬퍼와 구조체, 상수, 바인딩은 함께 들어오지만, 가져온 파일의
진입점은 들어오지 않습니다. 파일마다 스코프를 따로 가지므로 두 파일이 각자 비공개 `hash`를 둘 수
있고, 모듈은 두 번째 것을 다른 이름으로 생성합니다.

`compile()`은 소스가 가져오는 파일을 직접 넘겨준 `readDocument`로 읽습니다. 이 함수는 경로를 받아
파일의 텍스트를 돌려주고, 그런 파일이 없으면 `undefined`를 반환합니다. Vite 플러그인과
`tshc check`, `tshc sync`, 편집기는 파일을 스스로 읽습니다.

```ts
import { existsSync, readFileSync } from 'node:fs'
import { compile } from 'typeshade'

const read = (path: string) => (existsSync(path) ? readFileSync(path, 'utf8') : undefined)
const { wgsl, diagnostics } = compile(read('src/clouds.shade.ts')!, {
  fileName: 'src/clouds.shade.ts',
  readDocument: read,
})
```

셰이더 라이브러리는 다른 패키지처럼 npm으로 설치하고, 셰이더 파일은 그 패키지를 이름으로 가져옵니다.
`import { fbm } from 'shade-noise'`처럼 씁니다. 패키지는 Node가 찾는 방식 그대로, 가져오는 파일의
디렉터리에서 위로 올라가며 `node_modules`에서 찾습니다. 읽는 파일은 패키지의 `package.json`이
`exports`의 `typeshade` 조건으로 공개한 파일입니다. 호스트 코드용으로 공개하는 JavaScript는 그 옆에
따로 둡니다.

```json
{
  "name": "shade-noise",
  "exports": {
    ".": { "typeshade": "./src/index.shade.ts", "default": "./dist/index.js" },
    "./*": { "typeshade": "./src/*.shade.ts" }
  }
}
```

`'shade-noise'`는 패키지의 `src/index.shade.ts`를 읽고, `'shade-noise/hash'`는 그 옆의
`hash.shade.ts`를 읽습니다. `exports`가 없는 패키지는 파일 경로로 가져오며,
`'shade-noise/noise.shade.ts'`처럼 씁니다. `readDocument`에는 각 `package.json`도 요청하므로 위의 `read`는
고치지 않아도 패키지를 따라갑니다. 여러 의존성이 같은 패키지 버전에 닿더라도 프로그램에는 한 벌만
들어갑니다. 모듈이 이름을 바꾸는 패키지 헬퍼에는 패키지와 파일 이름이 붙어 `shade_noise_noise_hash`처럼
생성됩니다.

가져온 파일에 있는 실수는 그 파일의 줄과 열에서 보고됩니다. 컴파일러가 따라갈 수 없는 가져오기는
그 가져오기 자리에서 `TS8072`가 됩니다. 파일을 가리키지 않는 경로, 지시문으로 시작하지 않는 파일,
어느 `node_modules`에도 없는 패키지, 패키지의 `exports`에 없는 하위 경로, 그 파일이 내보내지 않는
이름, 기본 가져오기가 여기에 해당합니다. 가져오기의 모든 형태와 모듈이 생성하는 이름,
거부하는 경우는 `docs/use-typeshade-surface.md` §68에 모두 있습니다.

### 호출한 쪽의 변수를 바꾸는 함수

일반 매개변수는 전달한 값의 복사본이므로 대입해도 호출한 쪽의 변수는 바뀌지 않습니다. 호출한 쪽의 변수를 변경하려면 GLSL 한정자 `@inout`을 붙인 매개변수에 변수를 직접 전달해야 합니다. 함수 안에서는 원래 변수처럼 읽거나 대입하며, 메서드에서 `this`의 필드에 접근하듯 필드에도 접근합니다. 쓰기 전용 매개변수는 `@out`으로 선언합니다. 이 매개변수는 초깃값이 없으므로 읽기 전에 반드시 대입해야 하며, 모든 실행 경로에서 대입해야 합니다.

```ts
"use typeshade";

class Ray {
  origin: vec3;
  dir: vec3;
}

function swap(@inout a: f32, @inout b: f32): void {
  const t = a;
  a = b;
  b = t;
}

function add(a: f32, b: f32, @out c: f32): void {
  c = a + b;
}

function advance(@inout r: Ray, t: f32): void {
  r.origin = r.origin + r.dir * t;
}

export function demo(): f32 {
  let x: f32 = 1.;
  let y: f32 = 2.;
  swap(x, y); // x is 2. and y is 1.
  let s: f32;
  add(x, y, s); // s is 3.
  let r = new Ray();
  r.dir = vec3(1., 0., 0.);
  advance(r, 3.); // r.origin.x is 3.
  return x + s + r.origin.x;
}
```

WGSL은 포인터를 받아 `swap(&x, &y)`로 부르고 본문에서 `*a = *b`처럼 쓰며, GLSL ES 3.00은 `inout`
매개변수를 받습니다. CPU 오라클은 값을 복사해 들여왔다가 함수가 끝나면 원래 자리에 다시 저장합니다.
인자로는 `let`, 모듈 변수, `read_write` 스토리지 바인딩의 요소, 그리고 이들의 필드나 요소를 넘길 수
있습니다. 값, 리터럴, 벡터의 성분을 넘기면 `TS8073`으로 거부됩니다. 함수가 값을 쓰는 변수 하나를
호출 하나가 두 번 참조로 넘기는 `swap(x, x)`는 `TS8074`가 됩니다. 대입하기 전에 변수를 읽거나
`@out` 매개변수를 쓰기 전에 읽으면 `TS8075`가 됩니다. 한정자는 파일이나 네임스페이스에 선언한
함수에만 붙일 수 있고, 메서드와 진입점, 지역 함수는 값을 받습니다. 다만 한정자가 붙은 함수 안의
지역 함수는 바깥의 다른 변수처럼 그 매개변수를 읽고 쓸 수 있습니다. `@in`은 없습니다. 한정자를 붙이지 않은
매개변수가 곧 GLSL의 `in`이입니다. 모든 규칙과 거부되는 경우는 `docs/use-typeshade-surface.md`
§70에 있습니다.
