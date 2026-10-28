---
entry: function/exp2
---

## What exp2 computes {#what-it-computes}

<!-- reads: none -->

`exp2(x)` is $2^x$. A sum in the exponent is a product of powers:

$$
2^{a+b} = 2^a \cdot 2^b
$$

## In TypeShade {#in-typeshade}

<!-- reads: entry.summary -->

As the compiler's sentence under the name says, a vector is computed one component at a time. The CPU oracle answers {{oracle exp2(3.0)}} for `exp2(3.0)` and {{oracle exp2(-1.0)}} for `exp2(-1.0)` {{assert oracleIsPowerOfTwo}}. The accuracy the compiler states is {{accuracy exp2}}, and {{fact glslTarget}} spells the call {{entry spelling.glsl}}.

An integer argument is refused: {{compile int-argument}}. A float argument keeps the call in the WGSL: {{compile stays}}. `Math.pow` with a base of `2.0` draws the same curve, see {{ref function/pow}}. {{rule 12.7}} holds the editor to the compiler's words. This page was checked at {{pin}}.

{{code doubled}}

<!-- live: reference-fixture-exp2
title: The curve exp2 draws over the frame
caption: The area under the curve, scaled so its right end meets the top.
anchor: The blue area is everything under `exp2(u.k * uv.x)`, divided by its value at the right edge.
exercise: Drag `k` to the top of its range. The curve stays low for longer and then climbs more steeply.
control k: rate
-->
