---
entry: function/pow
---

## Definition {#definition}

<!-- reads: entry.line -->

`pow(x, y)` is $x^y$, `x` raised to the power `y`. [WGSL](specWgslPow) and {{fact glslTarget}} ([its specification](specGlslEs)) both define it for floating-point values, one component at a time.

Three rules hold for every call:

- Give both arguments one type. A `vec3` base takes a `vec3` exponent, `pow(v, vec3(2.0))`. A scalar exponent on a vector base is a call neither language defines.
- In {{fact glslTarget}}, write a float exponent. `pow(x, 2)` is no valid call there, since `2` is an `int` (Integer exponents, below).
- Keep the base at $0$ or above. Both specifications leave every $x < 0$ undefined, whole-number exponents included. {{fact glslTarget}} also leaves $x = 0$ undefined when $y \le 0$.

|               | WGSL                                                                                  | {{fact glslTarget}}                             |
| ------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Declaration   | `fn pow(e1: T, e2: T) -> T`                                                           | `genType pow(genType x, genType y)`             |
| Types         | `T` is `f32`, `f16` or a vector of them, and `AbstractFloat` in a constant expression | `genType` is `float`, `vec2`, `vec3` or `vec4`  |
| `f16`         | needs the [enable extension](specWgslExtensions) `f16`                                | no `f16`                                        |
| Integer types | no `i32` or `u32` overload                                                            | no `int` overload, and no conversion from `int` |
| Undefined for | $x < 0$, and two inputs with an infinity (Infinite inputs, below)                     | $x < 0$, and $x = 0$ with $y \le 0$             |

## Exponent curve {#exponent-curve}

<!-- reads: entry.spelling.wgsl, entry.spelling.glsl -->

Between $0$ and $1$, `pow` bends a straight ramp into a curve. An exponent above $1$ pulls the middle of the range down, and an exponent below $1$ lifts it. The two ends stay where they are, since $0^k = 0$ and $1^k = 1$ for every $k > 0$. Shaders use that bend to shape a value between $0$ and $1$.

Move the slider under the canvas to change the exponent and watch the curve. The optional source uses TypeShade: `uv` runs from $0$ to $1$ across the canvas, and `u.k` reads the uniform that the slider sets. The call is `pow` in WGSL ({{entry spelling.wgsl}}) and GLSL ({{entry spelling.glsl}}). [Coming from GLSL](languageFromGlsl) maps the source language.

<!-- live: reference-pow-curve
title: The curve pow(x, k) between zero and one
caption: The area under y = pow(x, k), with a grid line every quarter and the line y = x.
anchor: The blue area is everything under `y = pow(uv.x, u.k)`. The dark diagonal is `y = x`, the curve at $k = 1$. Every curve meets the diagonal at both ends. At $k = 2$ the curve passes through $(0.5, 0.25)$, since `pow(0.5, 2.)` is $0.25$.
exercise: Drag `k` below $1$. The curve rises above the diagonal: an exponent below $1$ makes every value between $0$ and $1$ larger.
exercise: With `k` above $1$, write `1. - pow(1. - uv.x, u.k)` on the `y` line. The curve becomes an ease-out: it climbs steeply at first, then flattens.
exercise: Write `pow(uv.x, 1. / u.k)` on the `y` line. The curve mirrors the one before it across the diagonal, since the exponent $1/k$ undoes the exponent $k$.
control k: exponent
-->

## Undefined inputs {#undefined-inputs}

### Negative base

{{fact glslTarget}} leaves the result undefined for $x < 0$. WGSL leaves every $x < 0$ outside the domain of `pow` ([pow](specWgslPow)). Its reason: an implementation may compute the result as `exp2(y * log2(x))`, and $\log_2 x$ has no real value for a negative $x$. Both rules name every $x < 0$. So `pow(-2.0, 2.0)` is undefined, the same as `pow(-2.0, 0.5)`, though $(-2)^2 = 4$.

The specifications do not promise NaN. A WGSL call outside its domain may give an [indeterminate value](specWgslIndeterminate), which can be any value of the type, NaN among them ([floating point in WGSL](specWgslIeeeOverview)). {{fact glslTarget}} does not require an implementation to generate NaN either.

So a negative base gives whatever the GPU gives. The plot below draws the bare call beside a guarded one, on the GPU in front of you.

<!-- live: reference-pow-negative
title: The bare call and a guard, for a negative base
caption: The bare call pow(x, k) in orange, and the guard sign(x) * pow(abs(x), k) in blue, from minus one to one.
anchor: Right of the centre, `x` is positive, and the two curves draw one line. Left of the centre, `x` is negative: there the orange curve shows what this GPU returns for a negative base. Where the orange curve is missing, this GPU returned NaN or a value outside the plot.
exercise: Set `k` to $2$. On the left, the blue curve lies below the horizontal axis, and $x^2$ is positive there: for a negative `x`, the guard equals $x^k$ only when $k$ is an odd whole number.
exercise: With `k` at $2$, write `pow(abs(p.x), u.k)` on the `signed` line. The left half of the blue curve mirrors its right half, and the curve equals $x^2$ on both sides.
exercise: With `k` at $3$, write `p.x * p.x * p.x` on the `signed` line. The blue curve stays where it was. That line uses multiplication alone, so it is defined for every `x`.
control k: exponent
-->

### Guards

Pick the guard by what a negative value means in your shader:

| Guard                      | What it gives                                                                          | Use it for                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pow(max(x, 0.0), y)`      | $0$ for every negative `x`, when $y > 0$                                               | a value where below $0$ means none, such as light on a surface that faces away |
| `sign(x) * pow(abs(x), y)` | a curve symmetric through the origin, equal to $x^y$ when $y$ is an odd whole number   | a signed curve, such as an ease that runs from $-1$ to $1$                     |
| `pow(abs(x), y)`           | the mirror image of the positive side, equal to $x^y$ when $y$ is an even whole number | a magnitude                                                                    |
| `x * x`, `x * x * x`       | $x^2$ and $x^3$ for every `x`                                                          | a small whole-number exponent                                                  |

The first three guards still pass a base of $0$. With $y \le 0$, that call stays undefined (Zero base, below).

### Zero base

{{fact glslTarget}} also leaves $x = 0$ with $y \le 0$ undefined. The WGSL domain does not name that case. With $x = 0$, $\log_2 x$ is $-\infty$: for $y = 0$ the product $y \log_2 x$ has no defined value, and for $y < 0$ the formula gives an infinite result. WGSL lets an implementation assume that a result is finite, and an infinite result then becomes an indeterminate value ([differences from IEEE floating point](specWgslIeee)). Treat a zero base with $y \le 0$ as undefined on both targets.

### Infinite inputs

The formula `exp2(y * log2(x))` also explains the two other inputs outside the WGSL domain. $\log_2 1 = 0$, and zero times an infinite $y$ has no defined value, so $x = 1$ with an infinite $y$ is outside the domain. An infinite $x$ with $y = 0$ gives the same product of zero and infinity.

### Constant arguments

`pow` is a `@const` function in WGSL ([pow](specWgslPow)). A call whose arguments are literals or `const` declarations is a [constant expression](specWgslConstExpr), which an implementation evaluates when it creates the shader. A constant expression that overflows, or gives NaN or an infinity, is a shader-creation error ([differences from IEEE floating point](specWgslIeee)). So a constant `pow(-2.0, 0.5)` can stop a shader from being created, where the same call on values read at run time gives an indeterminate value.

## Integer exponents {#integer-exponents}

In {{fact glslTarget}}, `pow(x, 2)` is no valid call. The language has no implicit conversion between types, and `2` is an `int`, so no overload of `pow` matches. Write `pow(x, 2.0)`.

WGSL accepts `pow(x, 2)` for an `f32` `x`: the literal `2` is an abstract integer, which converts to `f32`. The [introduction](specWgslIntro) of the specification writes `pow(dist, 2)` itself.

In TypeShade, `pow(x, 2)` emits {{compile int-literal}} in WGSL and {{compile int-literal-glsl}} in GLSL, and `x ** 2` emits {{compile starstar-int-literal}}. The compiler writes a whole-number literal exponent as a float, so the GLSL it emits never makes a call with an `int` exponent.

### Multiplication

The specifications give `x * x` and `pow(x, 2.0)` two accuracy rules. A multiplication is {{accuracy *}} ([accuracy](specWgslAccuracy)). `pow` inherits the accuracy of `exp2(y * log2(x))` (Accuracy, below). Neither specification says that the two give the same value, or that a compiler replaces one with the other. TypeShade keeps the call: `pow(x, 2.0)` emits {{compile square-stays}}. Write `x * x` where you want a multiplication.

`x * x` is defined for every `x`, a negative `x` included. WGSL defines multiplication for every input except zero times an infinity ([domains](specWgslDomains)), and the two factors of `x * x` are one value.

## Accuracy {#accuracy}

Both specifications give `pow` no error bound of its own. It inherits the accuracy of `exp2(y * log2(x))`, and the compiler states it as {{accuracy pow}} ([accuracy](specWgslAccuracy)). Its error may be as large as the error of that expression.

For `f32`, WGSL bounds `exp2` by {{accuracy exp2}} and `log2` by {{accuracy log2}}, and {{fact glslTarget}} gives the same numbers for single precision. The bound on `exp2` grows with the size of its argument, so a larger $|y \log_2 x|$ allows a larger error. {{fact glslTarget}} prints the rule with `x` and `y` swapped, as `exp2 (x * log2 (y))`; this page uses the form WGSL prints.

An implementation may compute `pow` another way, with better accuracy or with more room for extreme inputs ([floating point accuracy](specWgslFloatAccuracy)). The accuracy WGSL defines for `pow` stays the inherited one.

In {{fact glslTarget}}, the precision qualifier sets a second limit. `mediump` has to hold only the range from $-2^{14}$ to $2^{14}$, with a relative precision of $2^{-10}$. $10^5$ is outside that range, so `pow(10.0, 5.0)` can overflow at `mediump`. The GLSL TypeShade emits declares {{compile glsl-precision}} unless the [precision option](guideGlslFloatPrecision) asks for `mediump`.

`sqrt(x)` is $x^{1/2}$ for $x \ge 0$, and `exp2(y)` is $2^y$. Each has an accuracy of its own: {{accuracy sqrt}} for `sqrt`, and the bound above for `exp2`.

## Common uses {#common-uses}

<!-- reads: compile:vector-scalar -->

Four calls from the examples on this site, each with its base at $0$ or above:

- A specular highlight: `pow(max(dot(reflect(fromLight, nf), toEye), 0.), 16.)` in [bit-bump](examplePowBitBump).
- Gamma: `pow(max(c, vec3(0.)), vec3(1. / gamma))`, with `gamma` at $2.2$ when the call leaves it out, in [default-args](examplePowDefaultArgs).
- An exponential zoom: `pow(10.0, -u.zoom_exp)` is the width of the view in [fp64-julia-twin](examplePowJulia).
- A vignette: `pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.12)`, where `q` runs from $0$ to $1$ across the screen, in [capsule-corp-namek-class](examplePowCapsule).

A highlight shows the exponent at work. The sample below draws a Blinn-Phong highlight: it takes the cosine between the surface normal and the halfway vector, the direction midway between the light and the eye. The cosine is $1$ at the centre of the highlight and smaller around it. A cosine of $1$ stays $1$ for any exponent, and a smaller cosine falls toward $0$ more steeply as the exponent grows.

<!-- live: reference-pow-specular
title: A specular highlight on a sphere
caption: A sphere lit by one light. The Blinn-Phong highlight is a cosine raised to the power shininess.
anchor: The white spot is `highlight`: the cosine of the angle between the normal `n` and `halfway`, raised to the power `shininess`. A cosine near $1$ stays near $1$, and every smaller cosine falls toward $0$.
exercise: Drag `shininess` from the bottom of its range to the top. The highlight shrinks from a wide glow to a small point.
exercise: Write `pow(diffuse, 0.5)` in place of `diffuse` on the `ball` line. The edge of the shading moves toward the dark side: an exponent below $1$ makes values between $0$ and $1$ larger.
exercise: Wrap the right side of the `ball` line in `pow(…, vec3(1. / 2.2))`. The sphere turns lighter: this is gamma encoding. A scalar exponent `1. / 2.2` is refused there, because the base is a `vec3` (In TypeShade, below).
control light: light position
control shininess: exponent
-->

## In TypeShade {#in-typeshade}

<!-- reads: entry.rest -->

TypeShade has three spellings for the call: `pow(a, b)`, `Math.pow(a, b)` ({{ref math/pow}}) and the exponent operator `a ** b`. The compiler emits one call for all three, the same in WGSL and in GLSL {{assert sameEmit}}. {{rule 7.2}} lists `a ** b` among the TypeScript forms the compiler lowers to a WGSL form, so `uv.x ** u.k` on the `y` line of the first sample draws the same curve.

The compiler refuses the calls in this table, and the editor reports the same code and text for each one:

| You write                    | What the compiler reports          |
| ---------------------------- | ---------------------------------- |
| `pow(v, 2.2)` with `v: vec3` | {{compile vector-scalar}}          |
| `v ** 2.2` with `v: vec3`    | {{compile starstar-vector-scalar}} |
| `pow(a, b)` with `a, b: i32` | {{compile int-operands}}           |
| `a ** b` with `a, b: i32`    | {{compile starstar-int}}           |
| `a **= b`                    | {{compile starstar-assign}}        |

The last row is a limit of the TypeShade front end; both targets accept the assignment it stands for. Write `a = a ** b`, which emits {{compile starstar-rewrite}}.

The compiler checks the domain of a call whose arguments are all constant, since WGSL evaluates that call when it creates the shader (Constant arguments, above). Inside a function, `pow(-2.0, 0.5)` is refused with {{compile negative-literal}}. Where the call has a value, the message gives it: `pow(-2.0, 2.0)` is refused with {{compile negative-whole}}. A call with an argument read at run time is no constant expression, and the compiler leaves its domain to the GPU: `pow(x, 0.5)` emits {{compile runtime-base}}.

The CPU oracle runs a TypeShade shader on the CPU and evaluates `pow` with JavaScript's `Math.pow` {{assert oracleIsMathPow}}. With `x` at $-2$, it answers {{oracle pow(-2.0, 3.0)}} for `pow(x, 3.0)` and {{oracle pow(-2.0, 0.5)}} for `pow(x, 0.5)`. With `x` at $0$, it answers {{oracle pow(0.0, 0.0)}} for `pow(x, 0.0)` and {{oracle pow(0.0, -1.0)}} for `pow(x, -1.0)`. {{rule 1.3}} lets the oracle give any value WGSL permits, and for a negative base WGSL permits any value, so the oracle and a GPU can disagree there. A test that compares a GPU with the oracle holds only where $x > 0$, or $x = 0$ with $y > 0$, and the result is finite.

A `const` at module scope takes the same check. `const K: f32 = pow(-2., 0.5)` is refused with {{compile module-const-no-value}}, and `const K: f32 = pow(-2., 2.)` with {{compile module-const-value}}.

The determinism report that `compile()` returns lists `pow` with the accuracy {{accuracy pow}}.

## Specifications {#specifications}

- [WGSL](specWgsl): [pow](specWgslPow), [floating point in WGSL](specWgslIeeeOverview), [differences from IEEE floating point](specWgslIeee), [floating point accuracy](specWgslFloatAccuracy), [accuracy of concrete expressions](specWgslAccuracy), [domains of expressions and builtins](specWgslDomains), [constant expressions](specWgslConstExpr), [indeterminate values](specWgslIndeterminate), [enable extensions](specWgslExtensions), [introduction](specWgslIntro).
- {{fact glslTarget}}: [the specification](specGlslEs), its exponential functions and its range and precision.

The sections from Definition to In TypeShade rest on these specifications, and every value this page draws is computed at {{pin}}.
