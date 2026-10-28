export const precisionGuide = {
  reportScroll: 'Swipe or scroll the report horizontally to read all fields on a narrow screen.',
  searchTitle: 'precision highp float; GLSL float precision',
  modelSymbols:
    '`base` is the base value, `increment` the small addition, and `sum` the rounded sum. More fraction bits distinguish smaller differences at the same magnitude.',
  title: 'precision highp float; explained for WebGL | TypeShade',
  description:
    'Learn what precision highp float means in GLSL, compare shader defaults, explore rounding, and inspect the precision your WebGL browser reports.',
  h1: 'precision highp float;',
  lead: '`precision highp float;` sets the default precision to `highp` for later floating-point declarations that omit their own qualifier in the current scope. It applies to float scalars, vectors, and matrices.',
  meaningH: 'The declaration',
  tokens: [
    ['`precision`', 'Introduces a default precision statement.'],
    ['`highp`', 'Selects the high precision tier.'],
    ['`float`', 'Applies the default to floating-point types.'],
  ],
  tokenColumns: ['Token', 'Meaning'],
  scope:
    'An explicit qualifier such as `mediump` takes precedence. A new default does not change an earlier declaration. A default inside a block ends with that scope.',
  declarationsLabel: 'Default and explicit precision',
  defaultsH: 'Shader defaults',
  defaultsP:
    'GLSL ES 1.00 and GLSL ES 3.00 use the following stage defaults. A fragment shader needs a float default before an unqualified float-based declaration, or an explicit qualifier on that declaration.',
  defaultColumns: ['Stage', 'Float default', 'Int default'],
  defaultRows: [
    ['Vertex', '`highp`', '`highp`'],
    ['Fragment', 'No default', '`mediump`'],
  ],
  supportP:
    'WebGL 1 with GLSL ES 1.00 may lack fragment `highp` float support. GLSL ES 3.00 in WebGL 2 requires it. WebGL 2 also accepts GLSL ES 1.00 shaders, so check the language version as well as the context.',
  fallbackLabel: 'WebGL 1 and GLSL ES 1.00 fallback',
  fallbackP:
    'This conditional is for the legacy shader language. In a GLSL ES 3.00 shader, declare highp directly. Algorithms that require high precision must handle unsupported devices explicitly.',
  tiersH: 'Choosing a precision tier',
  tierColumns: ['Qualifier', 'Practical starting point', 'Limit'],
  tierRows: [
    [
      '`lowp`',
      'Small bounded values when its error budget is acceptable.',
      'Check the required range and precision.',
    ],
    [
      '`mediump`',
      'Bounded colour calculations that tolerate rounding.',
      'Coordinates and intermediate values may need more precision.',
    ],
    [
      '`highp`',
      'Positions, large coordinates, depth-sensitive work, and small differences.',
      'It cannot restore information lost in an earlier calculation.',
    ],
  ],
  tiersP:
    'The specification sets precision requirements; a device may use more precision for a lower tier. Treat mediump as a tier with minimum requirements. Its storage and arithmetic are not universally identical to binary16.',
  performanceP:
    'Choose precision for each calculation, then measure on the devices you ship to. A lower qualifier does not guarantee faster execution or lower power use.',
  modelH: 'Small differences',
  modelP:
    'Add a small increment to a large base, then subtract the base. Rounding can erase the increment during the addition. Move the controls to compare the recovered difference.',
  modelNote:
    'This is a mathematical illustration with normal binary numbers and round-to-nearest, ties-to-even. It omits overflow and subnormals. The two models do not predict actual mediump and highp GPU results.',
  baseLabel: 'Base value',
  incrementLabel: 'Increment',
  modelColumns: ['Expression', 'Coarser model', 'Finer model'],
  modelResult: 'Recovered increment',
  noScript:
    'The initial calculation is shown below. Enable JavaScript to change its inputs or inspect this browser.',
  deviceH: 'Browser capabilities',
  deviceP:
    'Ask WebGL what it reports for each stage and float precision tier. This is a capability query. It does not measure an expression, frame rate, or power use.',
  contextLabel: 'WebGL context',
  inspect: 'Inspect this browser',
  deviceIdle: 'No WebGL context has been created for this report.',
  deviceReady: 'Reported capabilities for the selected WebGL context.',
  deviceUnavailable:
    'This browser could not create the selected WebGL context. The explanation and numerical model remain available.',
  deviceError: 'The precision query could not be completed. Try another context or browser.',
  unsupported: 'Unavailable',
  vertex: 'Vertex',
  fragment: 'Fragment',
  deviceColumns: ['Stage', 'Qualifier', 'rangeMin', 'rangeMax', 'precision'],
  fieldsP:
    '`rangeMin` and `rangeMax` describe range exponents, not literal endpoints. `precision` describes precision bits. These fields are not interchangeable with a specification table of relative error.',
  queryP:
    'A null result indicates a query failure. An unsupported fragment HIGH_FLOAT query in WebGL 1 returns zeros. A positive precision field is a support check for float queries; integer queries can legitimately report zero precision.',
  queryLabel: 'Querying fragment float precision',
  practicalH: 'Practical checks',
  checks: [
    'Keep positions and large coordinates at highp when small differences matter. Work in a local coordinate frame where possible.',
    'Check intermediate calculations as well as the final colour. Converting a rounded value to highp preserves that rounded value.',
    'Give a uniform shared by both shader stages matching precision declarations. An explicit qualifier avoids accidental differences in stage defaults.',
    'Compare image quality and performance on target hardware. Matching desktop results do not establish the error on every mobile GPU.',
  ],
  troubleH: 'Common problems',
  troubleColumns: ['Symptom', 'What to check'],
  troubleRows: [
    [
      'A fragment shader reports a missing precision declaration.',
      'Place a float default before unqualified declarations, or give those declarations explicit qualifiers.',
    ],
    [
      'Motion or texture coordinates jump at large positions.',
      'Inspect intermediate precision and coordinate scale; reduce the magnitude of local coordinates.',
    ],
    [
      'A gradient has visible bands.',
      'Check arithmetic precision and render-target quantization. A highp declaration does not increase attachment precision.',
    ],
    [
      'A legacy fragment shader rejects highp.',
      'Query float support and choose an explicit compatibility path for the algorithm.',
    ],
  ],
  faqH: 'Questions',
  faq: [
    [
      'Does highp mean double precision?',
      'Highp does not request 64-bit doubles. GLSL ES 3.00 highp float uses IEEE single-precision storage; built-in functions still follow their specified accuracy rules.',
    ],
    [
      'Does this change every variable?',
      'The float default applies to unqualified floating-point declarations in scope. Explicit qualifiers, integer defaults, sampler precision, and texture storage formats have their own rules.',
    ],
    [
      'Why do mediump and highp look the same?',
      'An implementation may execute both at higher precision, and compiler optimizations can hide a difference. A matching image is one observation on that device.',
    ],
    [
      'Does a highp sampler create a higher precision texture?',
      'A sampler qualifier and the stored texture format are separate choices. Changing a float default cannot restore detail absent from the texture.',
    ],
  ],
  typeshadeH: 'TypeShade settings',
  typeshadeP:
    'TypeShade emits a highp float default for its GLSL stages. The `floatPrecision` emit option can select mediump for a stage. Keep sensitive coordinate calculations in mind when changing that stage-wide default.',
  typeshadeMore:
    'The [compiler precision guide](guideGlslFloatPrecision) describes the option. [WGSL and GLSL](conceptsWgsl) explains the target languages.',
  sourcesH: 'Sources',
  sources: [
    '[GLSL ES 1.00 specification](specGlslEs100), precision qualifiers and default precision.',
    '[GLSL ES 3.00 specification](specGlslEs), precision and stage defaults.',
    '[WebGL 2 specification](specWebgl2), supported shader language versions.',
    '[MDN precision guidance](mdnGlslPrecision), device-dependent arithmetic and performance.',
    '[MDN getShaderPrecisionFormat](mdnShaderPrecision), query fields and return values.',
  ],
  entryLink:
    'Learn what `precision highp float;` means, compare stage defaults, and inspect browser capabilities in the [GLSL precision guide](conceptsGlslPrecision).',
  correctionH: 'Language rule clarification',
  correction:
    'Precision defaults depend on the shader stage. Vertex shaders default float and int to highp; fragment shaders have no float default and default int to mediump. Explicit qualifiers take precedence. The compiler still writes its own highp defaults. Treat mediump as a specification tier whose implementation can use greater precision. See the [GLSL precision guide](conceptsGlslPrecision) for these language rules.',
};

export const fractionLabel = (bits: number): string => `${bits} fraction bits`;
