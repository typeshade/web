# TypeShade API translation review: canonical entries 360–518

## Scope reviewed

Read every English text field and its Korean counterpart in the canonical ordered worklist
`/tmp/api-ko-worklist.json`, entries 360–518 inclusive (159 entries), including summaries,
descriptions, parameters, members, return values, exceptions and target-specific behavior.
The range starts at `u32` and ends at `hostexport`. No other API range or English source file
was edited.

Canonical coverage by entry number and slug:

360 `u32`, 361 `f64`, 362 `constref`, 363 `overrideref`, 364 `externref`, 365 `param`, 366 `bindingref`, 367 `add`, 368 `sub`, 369 `mul`
370 `div`, 371 `atan2`, 372 `pow`, 373 `mix`, 374 `smoothstep`, 375 `length`, 376 `dot`, 377 `distance`, 378 `texturesample`, 379 `texturesamplelevel`
380 `textureload`, 381 `select`, 382 `matchexpr`, 383 `enumu32`, 384 `matchenum`, 385 `nodebrand`, 386 `isnodevalue`, 387 `installstmtsink`, 388 `readonlynode`, 389 `node`
390 `bool`, 391 `sin`, 392 `cos`, 393 `tan`, 394 `asin`, 395 `acos`, 396 `atan`, 397 `exp`, 398 `log`, 399 `log2`
400 `floor`, 401 `ceil`, 402 `abs`, 403 `sqrt`, 404 `fract`, 405 `radians`, 406 `degrees`, 407 `sign`, 408 `exp2`, 409 `trunc`
410 `round`, 411 `inversesqrt`, 412 `sinh`, 413 `cosh`, 414 `tanh`, 415 `asinh`, 416 `acosh`, 417 `atanh`, 418 `saturate`, 419 `min`
420 `max`, 421 `mod`, 422 `clamp`, 423 `fma`, 424 `step`, 425 `normalize`, 426 `cross`, 427 `pack4x8unorm`, 428 `unpack4x8unorm`, 429 `pack2x16float`
430 `unpack2x16float`, 431 `pack2x16unorm`, 432 `unpack2x16unorm`, 433 `pack2x16snorm`, 434 `unpack2x16snorm`, 435 `bitcastu32`, 436 `bitcastf32`, 437 `optbarrier`, 438 `f64guardone`, 439 `texturedimensions`
440 `texturenumlayers`, 441 `fwidth`, 442 `dpdx`, 443 `dpdy`, 444 `tof32`, 445 `tof64`, 446 `f64fromparts`, 447 `f64parts`, 448 `toi32`, 449 `tou32`
450 `construct`, 451 `member`, 452 `vec2`, 453 `vec3`, 454 `vec4`, 455 `vec2u`, 456 `vec2i`, 457 `vec3u`, 458 `vec4u`, 459 `vec3i`
460 `vec4i`, 461 `vec2f64`, 462 `vec3f64`, 463 `vec4f64`, 464 `mat2f64`, 465 `mat3f64`, 466 `mat4f64`, 467 `transformmat64`, 468 `mulmat64`, 469 `transpose64`
470 `transformmat4`, 471 `arraylit`, 472 `madd`, 473 `outsiderange`, 474 `insiderange`, 475 `fn`, 476 `externfn`, 477 `module`, 478 `constexpr`, 479 `rawstmt`
480 `overrideconst`, 481 `externvar`, 482 `let`, 483 `var`, 484 `loop`, 485 `reduce`, 486 `when`, 487 `ifexpr`, 488 `condexpr`, 489 `switch`
490 `builder`, 491 `ifchain`, 492 `return`, 493 `returnif`, 494 `continue`, 495 `break`, 496 `discard`, 497 `call`, 498 `if`, 499 `switchchain`
500 `constdecl`, 501 `builtin`, 502 `iostruct`, 503 `structdecl`, 504 `arrayof`, 505 `uniformstruct`, 506 `resource`, 507 `hostuniform`, 508 `hostblock`, 509 `storagebuffer`
510 `wgslbuiltinnames`, 511 `wgslbuiltintypes`, 512 `location`, 513 `fuse`, 514 `fusescope`, 515 `hostface`, 516 `hostface-interface`, 517 `hostfaceoptions`, 518 `hostexport`

## Edits

Made 11 Korean text-field corrections across 11 owned JSON files:

- Fixed the typo `상수 폴딩나` in `externref.description`.
- Corrected the count particle and sentence ending in `f64fromparts.description` (`두 개로`, `씁니다`).
- Simplified the repeated `targets.cpu` translation from “the oracle that supplies reference values”
to “the oracle evaluates in f64” for `trunc`, `unpack4x8unorm`, `unpack2x16float`,
`unpack2x16unorm`, `unpack2x16snorm`, `tof64`, `toi32`, `tou32`, and `transpose64`.

Retained accurate translations across the range, including IEEE half conversion limits, rounding
rules, WebGPU/WebGL differences, emulated `f64` constraints, buffer binding behavior and fused
kernel restrictions. Preserved all source hashes, keys, code, numbers and link targets in the files
I edited.

## Source-level issue for integration

In canonical entry 398, `log.description` says “floor the argument with `max` when it can reach
zero.” `floor` is also the name of a different shader function, so this English instruction is
ambiguous. Suggested English: “set a lower bound for the argument with `max` when it can reach
zero.” The Korean translation already describes setting a lower bound. The main reviewer owns
English source overrides.

## Validation

`PATH=/tmp/site-tools/node_modules/.bin:$PATH bun run check:api-ko` was run from
`apps/typeshade` and reported one mismatch outside this assigned range:
`content/api/ko/handlearray.json` summary has code spans `array<Element, N>` and `arrayOf` absent
from English. The checker otherwise reported no issues in entries 360–518. This failure is owned
by the reviewer responsible for that file.

## Integrated verification

The API integration pass resolved the earlier out-of-range `handlearray` code-span failure.
Final `check:api-ko` passes all 518 entries. The ambiguous English `log` wording was corrected
with a guarded site-owned adapter, and its Korean source hash was reviewed and refreshed.
See [the integrated API report](typeshade-api.md).
