---
id: glsl-float-precision
source: e0899cfb27fcec4faaf7635aefafd20d0b3189bc262b8b9eb0926d0a755e6f4a
sourceLine: 2678
---

float 정밀도 옵션은 생성된 GLSL 스테이지의 기본 한정자를 설정합니다. 수치 결과와 성능에 미치는 영향은 구현과 셰이더에 따라 다릅니다.

GLSL ES 3.00 버텍스 셰이더는 float의 기본 정밀도가 highp이며, 프래그먼트 셰이더에는 float의 기본 정밀도가 없습니다. TypeShade는 옵션으로 mediump를 선택하지 않으면 두 스테이지에 `precision highp float;`를 생성합니다. 이 기본값은 정밀도 한정자를 명시하지 않은 부동소수점 선언에 적용되며, 명시한 한정자를 바꾸지는 않습니다.

### floatPrecision 옵션

`emitGlslModule`과 `emitGlslStages`는 옵션 객체에서 `floatPrecision` 값으로 `'highp'`나
`'mediump'`를 받습니다.

```ts
import { emitGlslModule } from 'typeshade'

const fs = emitGlslModule(m, 'fragment', { floatPrecision: 'mediump' })
```

기본값은 `'highp'`이며, 옵션을 생략한 결과와 명시한 결과는 바이트 단위로 같습니다. `'mediump'`를 전달하면 생성 결과에서 float 선언 줄의 한정자 토큰만 바뀝니다.

정밀도는 빌드 시점의 생성 옵션입니다. 실제 실행 기기를 런타임에 확인해 자동으로 선택하지 않습니다. 생성 소스를 캐시할 때는 정밀도를 캐시 키에 반드시 포함해야 합니다. 누락하면 highp를 요청한 호출에 mediump 프로그램을 반환할 수 있습니다.

### 스테이지 전체 기본값이 다루는 범위

Mediump는 범위와 정밀도의 최솟값을 규정하며, 저장 형식이나 연산에 IEEE 754 binary16을 사용하도록 요구하지 않습니다. 구현에 따라 f32 등 더 높은 정밀도를 제공할 수 있습니다. 따라서 binary16의 최대 유한값을 모든 mediump 구현의 범위 한계로 볼 수는 없습니다. [GLSL ES 3.00의 4.5.1~4.5.4절](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)은 정밀도 요구사항, 표현식 정밀도 규칙, 스테이지별 기본값을 정의합니다.

기본값은 정밀도 한정자가 없는 위치, 좌표, varying, 지역 변수에 영향을 줍니다. 표현식의 정밀도는 피연산자와 주변 문맥에도 영향을 받습니다. 최종 색상의 범위가 제한되어 있어도 중간 계산이 mediump의 범위와 정밀도를 만족한다는 보장은 없습니다.

[fp64](/guide/authoring/fp64/) 에뮬레이션을 구성하는 f32 값처럼 highp의 범위나 정밀도가 필요한 계산은 highp로 유지합니다. mediump의 적합성은 셰이더 전체의 값 범위와 허용 오차를 기준으로 판단합니다. 옵션은 생성 호출마다 적용되므로 같은 프로그램의 버텍스와 프래그먼트 스테이지에 서로 다른 기본값을 사용할 수 있습니다.

```ts
import { emitGlslModule } from 'typeshade'

const vertex = emitGlslModule(m, 'vertex') // positions stay highp
const fragment = emitGlslModule(m, 'fragment', { floatPrecision: 'mediump' })
```

`emitGlslStages(m, opts)`는 같은 옵션을 두 스테이지에 적용합니다. 두 스테이지에 같은 한정자를 사용하면서 공통 하향 변환(lowering)을 한 번만 수행할 때 사용합니다.

### highp로 남는 부분

옵션은 float 정밀도 선언 줄만 변경합니다. 헤더의 다른 두 정밀도 선언은 컴파일 결과에 필요하므로 설정과 무관하게 highp로 유지합니다.

그중 하나는 `precision highp int;`이입니다. GLSL ES 3.00은 int의 기본 정밀도를 버텍스 셰이더에서는 highp로, 프래그먼트 셰이더에서는 mediump로 정의합니다. TypeShade는 두 스테이지 모두 highp를 명시합니다. 데이터 텍스처를 통해 스토리지를 읽는 인덱스 계산과 비트캐스트의 정수 부분은 정수의 전체 범위가 필요합니다.

다른 하나는 샘플러 선언입니다. GLSL ES 3.00은 `sampler2D`와 `samplerCube`에만 기본 정밀도를 정의합니다. 따라서 `sampler2DArray`, `usampler2D`, `isampler2DArray`를 선언하는 모듈은 사용하는 타입마다 `precision highp <type>;` 선언이 필요합니다. `precision highp float;`로는 이를 대신할 수 없습니다. 이 선언이 없으면 컴파일할 수 없으므로 한정자를 유지합니다. `sampler2DArray`를 샘플링하는 프래그먼트 스테이지를 mediump로 생성한 헤더는 다음과 같습니다.

```glsl
#version 300 es
precision mediump float;
precision highp int;
precision highp sampler2DArray;
```

### CI 실행으로는 알 수 없는 것

백엔드의 단위 테스트는 헤더의 모양을 확인합니다. 실제 드라이버에서는 특정 셰이더가 두 설정 모두에서 컴파일되고 링크되는지 확인할 수 있습니다. CI의 수치 비교는 실행 환경에서 발생하는 차이를 검출할 수 있지만, 결과가 같다고 다른 기기에서도 같은 동작을 보장하지는 않습니다.

구현은 mediump 연산을 더 높은 정밀도로 계산할 수 있습니다. `getShaderPrecisionFormat`의 값은 구현이 보고하는 범위와 정밀도입니다. 실행 시간을 측정하거나 모든 연산에 특정 하드웨어 형식을 강제하는 값은 아닙니다.

오차, 범위 초과, 렌더링 이상, 성능은 대상 기기에서 측정해야 합니다. 이런 영향은 모바일 하드웨어에만 한정되지 않습니다. 일부 구현에서는 낮은 정밀도로 성능이나 전력 효율이 개선될 수 있지만, 한정자만으로 어느 쪽도 보장하지는 않습니다.

빌드가 확인할 수 있는 것은 이 옵션이 한 줄만 바꾸고 나머지 생성 결과는 그대로 두었다는
사실뿐입니다.

```ts
import { emitGlslModule } from 'typeshade'

const highp = emitGlslModule(m, 'fragment')
const mediump = emitGlslModule(m, 'fragment', { floatPrecision: 'mediump' })

mediump.replace('precision mediump float;', 'precision highp float;') === highp // true
```

mediump는 대상 구현에서 셰이더의 허용 오차를 충족하는 경우에 사용합니다. 필요한 범위나 정밀도가 mediump의 이식 가능한 보장 범위를 넘으면 highp를 유지합니다.
