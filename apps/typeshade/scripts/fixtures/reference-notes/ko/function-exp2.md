---
entry: function/exp2
sources: what-it-computes 6f7e752f40d0, in-typeshade 3072fdbba22f
rules: 12.7 TawOmv8klHJxgWPx5cItYK8gProqi2towGMRoE6fL2M=
---

## exp2가 계산하는 값 {#what-it-computes}

`exp2(x)`는 $2^x$입니다. 지수의 합은 거듭제곱의 곱이 됩니다.

$$
2^{a+b} = 2^a \cdot 2^b
$$

## TypeShade에서 {#in-typeshade}

이름 아래 컴파일러 문장대로 벡터는 성분마다 따로 계산합니다. CPU 오라클이 돌려주는 값은 `exp2(3.0)`이 {{oracle exp2(3.0)}}, `exp2(-1.0)`이 {{oracle exp2(-1.0)}}입니다 {{assert oracleIsPowerOfTwo}}. 컴파일러가 밝히는 정확도는 {{accuracy exp2}}이며, {{fact glslTarget}}의 철자는 {{entry spelling.glsl}}입니다.

정수 인자는 거부되며, 그 진단은 {{compile int-argument}}입니다. 실수 인자를 넘기면 WGSL에 호출이 그대로 남고, 그 줄은 {{compile stays}}입니다. 밑이 `2.0`인 `Math.pow`도 같은 곡선을 그립니다. {{ref function/pow}} 항목을 보십시오. 편집기가 컴파일러와 같은 낱말을 쓰게 하는 규칙은 {{rule 12.7}}입니다. 이 페이지는 커밋 {{pin}}에서 확인했습니다.

{{code doubled}}

<!-- live: reference-fixture-exp2
title: 프레임 위에 exp2가 그리는 곡선
caption: 곡선 아래 넓이를 오른쪽 끝이 맨 위에 닿도록 줄여 그립니다.
anchor: 파란 영역은 `exp2(u.k * uv.x)`를 오른쪽 끝의 값으로 나눈 곡선 아래 전부입니다.
exercise: `k`를 범위의 맨 위까지 끌어 보십시오. 곡선이 오래 낮게 머물다가 더 가파르게 올라갑니다.
control k: 증가율
-->
