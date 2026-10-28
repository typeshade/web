---
entry: function/pow
sources: definition 2a9fd974f58f, exponent-curve 834fc48b6109, undefined-inputs 32e82b36e5c3, integer-exponents ebbbf953f4f6, accuracy 2225d454fb02, common-uses 5ef6084cb5bf, in-typeshade 7d3ceb5ae028, specifications f2a07aa3ee6f
rules: 1.3 fcW4P8W5BFQ0loGi6vlLvaa1Is6dCmpQ_g9tbwMsfHM=, 7.2 onO98E-yRQ3RftA44lVmgPmSW7ZkCd7rYrJGgFS8EI4=
---

## 정의 {#definition}

`pow(x, y)`는 $x^y$, 즉 `x`의 `y`제곱을 구합니다. [WGSL](specWgslPow)과 {{fact glslTarget}}([명세](specGlslEs)) 모두 부동소수점 값에 이 함수를 정의하며, 벡터는 성분별로 계산합니다.

호출에는 다음 세 가지 규칙이 적용됩니다.

- 두 인자의 타입은 같아야 합니다. 밑이 `vec3`이면 지수도 `vec3`이다(`pow(v, vec3(2.0))`). 벡터 밑과 스칼라 지수를 받는 호출은 두 언어 모두 정의하지 않습니다.
- {{fact glslTarget}}에서 지수는 float 값이어야 합니다. `2`는 `int`이므로 `pow(x, 2)`는 유효한 호출이 아니다(아래 정수 지수).
- 밑은 $0$ 이상이어야 합니다. 두 명세 모두 $x < 0$일 때 결과를 정의하지 않으며, 지수가 정수여도 같습니다. {{fact glslTarget}} 명세는 $y \le 0$일 때 $x = 0$도 정의하지 않습니다.

|                    | WGSL                                                                   | {{fact glslTarget}}                                             |
| ------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| 선언               | `fn pow(e1: T, e2: T) -> T`                                            | `genType pow(genType x, genType y)`                             |
| 타입               | `T`는 `f32`, `f16` 또는 그 벡터이며, 상수 식에서는 `AbstractFloat`이다 | `genType`은 `float`, `vec2`, `vec3`, `vec4` 중 하나이다         |
| `f16`              | [enable 확장](specWgslExtensions) `f16`이 필요하다                     | `f16`을 지원하지 않는다                                         |
| 정수 타입          | `i32`나 `u32` 오버로드가 없다                                          | `int` 오버로드가 없으며, `int`에서 암시적으로 변환하지도 않는다 |
| 정의되지 않는 입력 | $x < 0$, 그리고 무한대가 포함된 두 입력 조건(아래 무한대 입력)         | $x < 0$, 그리고 $y \le 0$인 $x = 0$                             |

## 지수 곡선 {#exponent-curve}

$0$과 $1$ 사이에서 `pow`는 입력에 비례하는 직선을 곡선으로 바꿉니다. 지수가 $1$보다 크면 곡선의 중간 부분이 직선 아래에 놓이고, $1$보다 작으면 위에 놓입니다. 모든 $k > 0$에서 $0^k = 0$, $1^k = 1$이므로 양 끝점은 변하지 않습니다. 셰이더에서는 이 성질로 $0$과 $1$ 사이의 값을 조절합니다.

캔버스 아래 슬라이더는 지수를 조절합니다. 펼쳐서 확인할 수 있는 예제 코드는 TypeShade로 작성되어 있습니다. `uv`는 캔버스에서 $0$부터 $1$까지 변하는 좌표이고, `u.k`는 슬라이더가 설정하는 유니폼 값입니다. WGSL({{entry spelling.wgsl}})과 GLSL({{entry spelling.glsl}})에서 함수 이름은 모두 `pow`이입니다. 소스 언어의 대응 관계는 [GLSL에서 옮겨 오기](languageFromGlsl)에 정리되어 있습니다.

<!-- live: reference-pow-curve
title: 영과 일 사이의 pow(x, k) 곡선
caption: y = pow(x, k) 아래 영역, 사분의 일 간격의 격자선, 직선 y = x.
anchor: 파란 영역은 `y = pow(uv.x, u.k)` 아래를 나타냅니다. 어두운 대각선은 `y = x`이며 $k = 1$일 때의 곡선입니다. 모든 곡선은 양 끝점에서 대각선과 만납니다. `pow(0.5, 2.)`는 $0.25$이므로 $k = 2$일 때 곡선은 $(0.5, 0.25)$를 지납니다.
exercise: `k`가 $1$보다 작으면 곡선이 대각선 위에 놓입니다. 지수가 $1$보다 작을 때 $0$과 $1$ 사이의 값이 커집니다.
exercise: `k`가 $1$보다 클 때 `y` 줄을 `1. - pow(1. - uv.x, u.k)`로 바꾸면 ease-out 곡선이 됩니다. 처음에는 가파르게 증가하다가 점차 평평해집니다.
exercise: `y` 줄을 `pow(uv.x, 1. / u.k)`로 바꾸면 지수 $1/k$가 지수 $k$의 역변환이 됩니다. 원래 거듭제곱 곡선과 이 곡선은 대각선을 기준으로 대칭입니다.
control k: 지수
-->

## 정의되지 않는 입력 {#undefined-inputs}

### 음수 밑

{{fact glslTarget}} 명세는 $x < 0$일 때 결과를 정의하지 않습니다. WGSL도 모든 $x < 0$을 `pow`의 정의역에서 제외한다([pow](specWgslPow)). 구현은 결과를 `exp2(y * log2(x))`로 계산할 수 있는데, 음수 $x$에서는 $\log_2 x$의 실수 값이 없기 때문입니다. 두 규칙 모두 모든 $x < 0$에 적용됩니다. 따라서 수학적으로 $(-2)^2 = 4$이지만 `pow(-2.0, 2.0)`도 `pow(-2.0, 0.5)`와 마찬가지로 결과가 정의되지 않습니다.

두 명세 모두 NaN을 반환한다고 보장하지 않습니다. 정의역 밖의 WGSL 호출은 [불확정 값](specWgslIndeterminate)(indeterminate value)을 반환할 수 있습니다. 이는 NaN을 포함해 그 타입이 표현하는 어떤 값이든 될 수 있다([WGSL의 부동소수점](specWgslIeeeOverview)). {{fact glslTarget}}도 구현에 NaN 생성을 요구하지 않습니다.

따라서 음수 밑의 결과는 GPU 구현에 따라 달라질 수 있습니다. 아래 그래프는 이 페이지를 실행하는 기기의 GPU에서 입력 검사나 변환이 없는 호출과 가드를 적용한 호출을 나란히 그립니다.

<!-- live: reference-pow-negative
title: 음수 밑에서 가드 적용 여부에 따른 결과
caption: 마이너스 일부터 일까지의 두 곡선. 가드 없는 pow(x, k)는 주황색이고, 가드를 적용한 sign(x) * pow(abs(x), k)는 파란색입니다.
anchor: 중앙 오른쪽에서는 `x`가 양수이므로 두 곡선이 겹칩니다. 중앙 왼쪽에서는 `x`가 음수이며, 주황 곡선은 이 GPU가 음수 밑에 반환하는 값을 나타냅니다. 주황 곡선이 끊긴 구간은 이 GPU가 NaN이나 그래프 범위 밖의 값을 반환한 곳입니다.
exercise: `k`가 $2$이면 왼쪽의 파란 곡선은 가로축 아래에 놓이지만, 같은 구간에서 $x^2$는 양수입니다. 음수 `x`에서 가드의 결과가 $x^k$와 같은 경우는 $k$가 홀수일 때뿐입니다.
exercise: `k`가 $2$일 때 `signed` 줄을 `pow(abs(p.x), u.k)`로 바꾸면 파란 곡선의 왼쪽과 오른쪽이 대칭이 됩니다. 양쪽 모두 $x^2$와 같습니다.
exercise: `k`가 $3$일 때 `signed` 줄을 `p.x * p.x * p.x`로 바꿔도 파란 곡선은 변하지 않습니다. 곱셈만 사용하므로 모든 `x`에서 정의됩니다.
control k: 지수
-->

### 가드

가드는 셰이더에서 음수가 의미하는 바에 따라 선택합니다.

| 가드                       | 결과                                                                           | 활용                                                      |
| -------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `pow(max(x, 0.0), y)`      | $y > 0$일 때 음수 `x`의 결과는 $0$                                             | $0$ 미만을 없다고 처리하는 값. 예: 빛을 등진 면에 닿는 빛 |
| `sign(x) * pow(abs(x), y)` | 원점에 대해 대칭인 곡선. $y$가 홀수이면 $x^y$와 같다                           | 부호가 있는 곡선. 예: $-1$부터 $1$까지 변하는 ease 곡선   |
| `pow(abs(x), y)`           | 양수 쪽 곡선을 세로축에 대해 대칭으로 복제한 모양. $y$가 짝수이면 $x^y$와 같다 | 부호를 제외한 크기                                        |
| `x * x`, `x * x * x`       | 모든 `x`에서 $x^2$와 $x^3$                                                     | 작은 정수 지수                                            |

앞의 세 가드도 밑 $0$은 그대로 전달합니다. $y \le 0$이면 결과가 여전히 정의되지 않는다(아래 밑이 영일 때).

### 밑이 영일 때

{{fact glslTarget}} 명세는 $y \le 0$인 $x = 0$도 정의하지 않습니다. WGSL의 정의역 규칙은 이 경우를 따로 명시하지 않습니다. $x = 0$일 때 $\log_2 x$는 $-\infty$입니다. $y = 0$이면 곱 $y \log_2 x$의 값이 정의되지 않고, $y < 0$이면 공식의 결과가 무한대입니다. WGSL은 구현이 결과를 유한하다고 가정하는 것을 허용합니다. 이 가정에서는 무한대 결과가 불확정 값이 된다([IEEE 부동소수점과 다른 점](specWgslIeee)). 따라서 밑이 영이고 $y \le 0$인 호출은 두 타깃 모두에서 결과가 정의되지 않는 것으로 취급해야 합니다.

### 무한대 입력

공식 `exp2(y * log2(x))`는 WGSL 정의역에서 제외되는 나머지 두 입력 조건도 설명합니다. $\log_2 1 = 0$이며, 영과 무한대 $y$의 곱은 정의되지 않습니다. 따라서 무한대 $y$와 $x = 1$의 조합은 정의역 밖입니다. $y = 0$인 무한대 $x$도 영과 무한대의 곱이 발생합니다.

### 상수 인자

WGSL에서 `pow`는 `@const` 함수이다([pow](specWgslPow)). 인자가 리터럴이나 `const` 선언인 호출은 [상수 식](specWgslConstExpr)입니다. 구현은 셰이더 생성 시점에 이 식을 계산합니다. 오버플로가 발생하거나 NaN 또는 무한대가 나오는 상수 식은 셰이더 생성 오류이다([IEEE 부동소수점과 다른 점](specWgslIeee)). 따라서 상수 `pow(-2.0, 0.5)`는 셰이더 생성을 중단시킬 수 있습니다. 같은 호출에 실행 시점에 읽은 값을 넣으면 불확정 값이 나옵니다.

## 정수 지수 {#integer-exponents}

{{fact glslTarget}}에서 `pow(x, 2)`는 유효한 호출이 아닙니다. 이 언어에는 타입 사이의 암시적 변환이 없고 `2`는 `int`이므로, 일치하는 `pow` 오버로드가 없습니다. 부동소수점 지수는 `pow(x, 2.0)`으로 표현합니다.

WGSL은 `f32`인 `x`에 대해 `pow(x, 2)`를 허용합니다. 리터럴 `2`는 추상 정수이며 `f32`로 변환됩니다. 명세의 [소개](specWgslIntro)에서도 `pow(dist, 2)`를 사용합니다.

TypeShade에서 `pow(x, 2)`를 컴파일한 WGSL은 {{compile int-literal}}, GLSL은 {{compile int-literal-glsl}}입니다. `x ** 2`를 컴파일한 코드는 {{compile starstar-int-literal}}입니다. 컴파일러는 정수 리터럴 지수를 float로 출력하므로, 생성된 GLSL에는 `int` 지수를 사용하는 호출이 없습니다.

### 곱셈

두 명세는 `x * x`와 `pow(x, 2.0)`에 서로 다른 정확도 규칙을 적용합니다. 곱셈의 정확도는 {{accuracy *}}이다([정확도](specWgslAccuracy)). `pow`에는 `exp2(y * log2(x))`의 정확도 규칙이 적용된다(아래 정확도). 어느 명세도 두 연산의 결과가 같다거나 컴파일러가 하나를 다른 하나로 대체한다고 보장하지 않습니다. TypeShade는 호출을 유지합니다. `pow(x, 2.0)`를 컴파일한 코드는 {{compile square-stays}}입니다. 곱셈을 사용하려면 `x * x`로 표현해야 합니다.

`x * x`는 음수 `x`를 포함한 모든 `x`에서 정의됩니다. WGSL은 영과 무한대의 곱을 제외한 모든 입력에서 곱셈을 정의한다([정의역](specWgslDomains)). `x * x`의 두 인수는 같은 값이므로 이 제외 조건에 해당하지 않습니다.

## 정확도 {#accuracy}

두 명세 모두 `pow`에 별도의 오차 한계를 정하지 않습니다. `pow`에는 `exp2(y * log2(x))`의 정확도 규칙이 적용되며, 컴파일러가 명시하는 정확도는 {{accuracy pow}}이다([정확도](specWgslAccuracy)). 오차는 이 식의 오차만큼 클 수 있습니다.

`f32`에서 WGSL의 오차 한계는 `exp2`가 {{accuracy exp2}}, `log2`가 {{accuracy log2}}입니다. {{fact glslTarget}} 명세도 단정밀도에 같은 수치를 적용합니다. `exp2`의 오차 한계는 인자의 크기에 따라 커지므로 $|y \log_2 x|$가 클수록 허용되는 오차도 커질 수 있습니다. {{fact glslTarget}} 명세는 이 규칙을 `x`와 `y`를 바꾼 `exp2 (x * log2 (y))`로 표기합니다. 이 페이지는 WGSL의 표기를 따릅니다.

구현은 다른 계산 방법으로 `pow`의 정확도를 높이거나 극단적인 입력을 더 넓게 처리할 수 있다([부동소수점 정확도](specWgslFloatAccuracy)). 이 경우에도 WGSL이 정한 `pow`의 정확도 기준은 위 식에서 정한 기준입니다.

{{fact glslTarget}}에서는 정밀도 한정자도 표현 범위와 정밀도를 제한합니다. `mediump`가 보장해야 하는 범위는 $-2^{14}$부터 $2^{14}$까지이며, 상대 정밀도는 $2^{-10}$이입니다. $10^5$는 이 범위 밖이므로 `mediump`에서 `pow(10.0, 5.0)`는 오버플로가 발생할 수 있습니다. TypeShade가 생성하는 GLSL의 선언은 [정밀도 옵션](guideGlslFloatPrecision)이 `mediump`로 설정되지 않은 경우 {{compile glsl-precision}}입니다.

$x \ge 0$에서 `sqrt(x)`는 $x^{1/2}$이고, `exp2(y)`는 $2^y$입니다. 두 함수에는 각각 별도의 정확도 규칙이 있습니다. `sqrt`는 {{accuracy sqrt}}이고 `exp2`는 위에서 설명한 오차 한계를 따릅니다.

## 활용 {#common-uses}

이 사이트의 예제에는 다음 네 가지 호출이 사용됩니다. 모두 밑이 $0$ 이상입니다.

- 스페큘러 하이라이트: [bit-bump](examplePowBitBump)의 `pow(max(dot(reflect(fromLight, nf), toEye), 0.), 16.)`
- 감마: [default-args](examplePowDefaultArgs)의 `pow(max(c, vec3(0.)), vec3(1. / gamma))`. 호출에서 `gamma`를 생략하면 $2.2$를 사용합니다.
- 지수 줌: [fp64-julia-twin](examplePowJulia)에서 `pow(10.0, -u.zoom_exp)`는 화면에 표시되는 영역의 폭입니다.
- 비네팅: [capsule-corp-namek-class](examplePowCapsule)의 `pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.12)`. `q`는 화면에서 $0$부터 $1$까지 변하는 좌표입니다.

아래 예제는 Blinn-Phong 하이라이트에서 지수의 효과를 보여 줍니다. 표면 법선과 하프 벡터 사이 각도의 코사인을 사용합니다. 하프 벡터는 광원 방향과 시선 방향의 중간 방향입니다. 코사인은 하이라이트 중앙에서 $1$이고 주변으로 갈수록 작아집니다. 코사인 $1$은 어떤 지수에서도 $1$을 유지합니다. 이보다 작은 코사인은 지수가 커질수록 더 가파르게 $0$에 가까워집니다.

<!-- live: reference-pow-specular
title: 구 위의 스페큘러 하이라이트
caption: 광원 하나가 비추는 구. Blinn-Phong 하이라이트는 코사인을 shininess만큼 거듭제곱한 값입니다.
anchor: 흰 점은 `highlight`이입니다. 법선 `n`과 `halfway` 사이 각도의 코사인을 `shininess`만큼 거듭제곱한 값입니다. $1$에 가까운 코사인은 $1$ 근처에 머물고, 이보다 작은 코사인은 $0$에 가까워집니다.
exercise: `shininess`가 조절 범위의 최솟값에서 최댓값으로 증가하면 하이라이트가 넓게 퍼진 빛에서 작은 점으로 줄어듭니다.
exercise: `ball` 줄의 `diffuse`를 `pow(diffuse, 0.5)`로 바꾸면 음영의 경계가 어두운 쪽으로 이동합니다. 지수가 $1$보다 작으면 $0$과 $1$ 사이의 값이 커지기 때문입니다.
exercise: `ball` 줄의 오른쪽을 `pow(…, vec3(1. / 2.2))`로 감싸면 구가 더 밝아집니다. 이 연산이 감마 인코딩입니다. 밑이 `vec3`이므로 스칼라 지수 `1. / 2.2`를 사용하면 컴파일러가 거부한다(아래 TypeShade에서).
control light: 광원 위치
control shininess: 지수
-->

## TypeShade에서 {#in-typeshade}

TypeShade에서는 `pow(a, b)`, `Math.pow(a, b)`({{ref math/pow}}), 거듭제곱 연산자 `a ** b`로 이 연산을 표현합니다. 세 표현을 컴파일하면 WGSL과 GLSL에서 각각 동일한 호출이 생성된다 {{assert sameEmit}}. TypeScript 표현을 WGSL 형태로 변환하는 규칙인 {{rule 7.2}}에는 `a ** b`가 포함되어 있습니다. 첫 예제의 `y` 줄을 `uv.x ** u.k`로 바꿔도 같은 곡선이 그려집니다.

컴파일러는 아래 표의 호출을 거부합니다. 편집기도 각 호출에 대해 같은 진단 코드와 문구를 표시합니다.

| 작성한 코드                  | 컴파일러 진단                      |
| ---------------------------- | ---------------------------------- |
| `v: vec3`일 때 `pow(v, 2.2)` | {{compile vector-scalar}}          |
| `v: vec3`일 때 `v ** 2.2`    | {{compile starstar-vector-scalar}} |
| `a, b: i32`일 때 `pow(a, b)` | {{compile int-operands}}           |
| `a, b: i32`일 때 `a ** b`    | {{compile starstar-int}}           |
| `a **= b`                    | {{compile starstar-assign}}        |

마지막 행은 TypeShade 프런트엔드의 제한입니다. 두 타깃 언어 모두 거듭제곱 계산 결과를 변수에 다시 대입하는 동작은 허용합니다. `a = a ** b`로 작성하면 생성되는 코드는 {{compile starstar-rewrite}}입니다.

컴파일러는 인자가 모두 상수인 호출의 정의역을 검사합니다. WGSL은 이런 호출을 셰이더 생성 시점에 계산하기 때문이다(위 상수 인자). 함수 안의 `pow(-2.0, 0.5)`는 거부되며 진단은 {{compile negative-literal}}입니다. 호출 결과에 값이 있으면 진단 메시지에 그 값을 표시합니다. `pow(-2.0, 2.0)`의 진단은 {{compile negative-whole}}입니다. 실행 시점에 읽는 인자가 있는 호출은 상수 식이 아니므로, 컴파일러가 정의역을 검사하지 않고 GPU에서 실행합니다. `pow(x, 0.5)`를 컴파일한 코드는 {{compile runtime-base}}입니다.

CPU 오라클은 TypeShade 셰이더를 CPU에서 실행하며, `pow`를 JavaScript의 `Math.pow`로 계산한다 {{assert oracleIsMathPow}}. `x`가 $-2$일 때 오라클의 값은 `pow(x, 3.0)`에서 {{oracle pow(-2.0, 3.0)}}, `pow(x, 0.5)`에서 {{oracle pow(-2.0, 0.5)}}입니다. `x`가 $0$일 때는 `pow(x, 0.0)`에서 {{oracle pow(0.0, 0.0)}}, `pow(x, -1.0)`에서 {{oracle pow(0.0, -1.0)}}입니다. {{rule 1.3}}에 따라 오라클은 WGSL이 허용하는 어떤 값이든 반환할 수 있습니다. 음수 밑에서는 WGSL이 모든 값을 허용하므로 오라클과 GPU의 결과가 다를 수 있습니다. GPU와 오라클을 비교하는 테스트는 $x > 0$이거나 $y > 0$인 $x = 0$이고, 결과가 유한한 구간에서만 성립합니다.

모듈 수준의 `const`에도 같은 검사를 적용합니다. `const K: f32 = pow(-2., 0.5)`의 진단은 {{compile module-const-no-value}}이고, `const K: f32 = pow(-2., 2.)`의 진단은 {{compile module-const-value}}입니다.

`compile()`이 반환하는 결정성 보고서에서 `pow`의 정확도는 {{accuracy pow}}입니다.

## 명세 {#specifications}

- [WGSL](specWgsl): [pow](specWgslPow), [WGSL의 부동소수점](specWgslIeeeOverview), [IEEE 부동소수점과 다른 점](specWgslIeee), [부동소수점 정확도](specWgslFloatAccuracy), [구체 식의 정확도](specWgslAccuracy), [식과 내장 함수의 정의역](specWgslDomains), [상수 식](specWgslConstExpr), [불확정 값](specWgslIndeterminate), [enable 확장](specWgslExtensions), [소개](specWgslIntro).
- {{fact glslTarget}}: [명세](specGlslEs)의 지수 함수, 범위, 정밀도 규칙.

정의 절부터 TypeShade 설명 절까지의 내용은 이 명세에 근거합니다. 페이지에 표시되는 값은 모두 {{pin}}에서 계산합니다.
