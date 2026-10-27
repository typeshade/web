export type GuideLocale = "en" | "ko";

export const guideCopy = {
  en: {
    title: "Get started with TypeNN",
    description:
      "Create a device, build a Tensor graph, run an operation, and read the result.",
    home: "Get started",
    eyebrow: "Start here",
    heading: "Get started",
    intro:
      "Create a device, describe work with Tensor operations, then materialize the value you need.",
    statusTitle: "Project status",
    status:
      "TypeNN is pre-release. The npm package metadata still describes a placeholder package. Check the repository source and examples for current usage until the package is ready for release.",
    repository: "Open the TypeNN repository ↗",
    firstTitle: "Run your first operation",
    firstText:
      " selects WebGPU when available and falls back to the TypeShade CPU tier. You can request ",
    firstTextEnd:
      " explicitly. With WebGL2, TypeNN uses the CPU tier for calls it cannot run.",
    firstCodeTitle: "MatMul followed by ReLU",
    understandTitle: "Understand when work runs",
    understandBefore:
      "Tensor methods construct a deferred graph. They do not immediately read values back to JavaScript. Calling ",
    understandAfter: " executes the reachable graph and returns a ",
    keepTitle: "Keep the graph alive until execution finishes.",
    keepTextBefore: "After you consume the result, call ",
    keepTextAfter:
      " to release intermediate tensors. Dispose the Device when its work is finished.",
    nextTitle: "Continue with a guide",
    execution: "Execution model",
    executionLink: "See which kernels run for a Tensor when you call ",
    training: "Train a model",
    trainingLink:
      "Define a Module and update its parameters with an optimizer.",
    playground: "Try the Playground",
    playgroundLink: "Run operations without setting up a project.",
  },
  ko: {
    title: "TypeNN 시작하기",
    description: "Device를 만들고 Tensor 그래프를 실행한 뒤 결과를 확인합니다.",
    home: "시작하기",
    eyebrow: "먼저 시작하기",
    heading: "TypeNN 시작하기",
    intro:
      "Device를 열고 Tensor 연산으로 계산을 정의한 뒤 필요한 결과를 구체화합니다.",
    statusTitle: "프로젝트 상태",
    status:
      "TypeNN은 프리릴리스 단계입니다. npm 패키지 메타데이터는 아직 placeholder로 표시되어 있습니다. 패키지가 배포될 때까지 현재 사용법은 저장소 소스와 예제에서 확인하세요.",
    repository: "TypeNN 저장소 열기 ↗",
    firstTitle: "첫 연산 실행하기",
    firstText:
      "는 사용 가능한 경우 WebGPU를 선택하고, 아니면 TypeShade CPU 계층으로 폴백합니다. ",
    firstTextEnd:
      "를 명시할 수도 있습니다. WebGL2로 실행할 수 없는 호출은 CPU 계층이 처리합니다.",
    firstCodeTitle: "MatMul 다음에 ReLU 적용",
    understandTitle: "실행 시점 이해하기",
    understandBefore:
      "Tensor 메서드는 지연 그래프를 구성합니다. JavaScript로 값을 즉시 읽어오지 않습니다. ",
    understandAfter: "를 호출하면 해당 결과에 필요한 그래프를 실행하고 ",
    keepTitle: "실행이 끝나기 전에 그래프를 해제하지 마세요.",
    keepTextBefore: "결과 사용 후 ",
    keepTextAfter:
      "로 중간 Tensor를 정리할 수 있습니다. Device는 작업을 마친 뒤 해제하세요.",
    nextTitle: "다음 가이드",
    execution: "실행 모델",
    executionLink: "를 호출할 때 Tensor에 필요한 커널이 무엇인지 확인하세요.",
    training: "모델 학습",
    trainingLink: "Module을 정의하고 옵티마이저로 파라미터를 갱신합니다.",
    playground: "Playground 실행",
    playgroundLink: "프로젝트 설정 없이 연산을 실행합니다.",
  },
} as const;

export const executionCopy = {
  en: {
    title: "TypeNN execution model",
    description:
      "How a Tensor graph runs its TypeShade kernel functions when you call data().",
    home: "Get started",
    breadcrumb: "Guides",
    current: "Execution model",
    eyebrow: "Guides",
    heading: "Execution model",
    intro:
      "TypeNN builds and schedules Tensor graphs. TypeShade compiles their kernel functions and runs them on the selected backend.",
    callsTitle: "Tensor calls build a deferred graph",
    callsBefore: "Operations such as ",
    callsBetween: ", ",
    callsAfter:
      " do not compute values immediately. Each one records a node that holds a TypeShade kernel function, the input Tensors, the scalars the kernel takes by value, and the gradient rule.",
    graphTitle: "A small Tensor graph",
    dataTitle: "How data() computes a Tensor result",
    dataBefore: "When you call ",
    dataMiddle:
      " for a Tensor without a computed array, TypeNN collects the graph nodes needed to produce it. It creates an output array for each node and uploads the leaf arrays. TypeNN then calls TypeShade ",
    dataAfter:
      " once, running each node's kernel in graph order. The compiler groups compatible calls into dispatches, and TypeNN reads the requested Tensor once.",
    laneOneLabel: "TypeNN",
    laneOne: "Shape checks · graph nodes · autograd · kernel functions",
    laneTwoLabel: "TypeShade",
    laneTwo: "compiler dispatch plan · backend tiers · runtime resources",
    backendsTitle: "Backends and limits",
    tableAria: "Backend support",
    tier: "Tier",
    selection: "Selection",
    currentNote: "Current note",
    cpu: "CPU",
    cpuSelect: "Auto fallback or explicit",
    cpuNote:
      "Runs the same kernel functions, one call after the other. Suited to correctness and fallback.",
    gpu: "WebGPU",
    gpuSelect: "Auto or explicit",
    gpuNote:
      "Native GPU compute when the browser exposes an adapter. Elementwise chains fuse into one dispatch.",
    gl: "WebGL2",
    glSelect: "Explicit",
    glNote:
      "Runs the same kernel functions apart, one call after the other. A call it cannot run goes to the CPU tier.",
    fine: "TypeShade uses one call-layer configuration for the whole process, so each JavaScript context supports one active TypeNN Device.",
    planTitle: "Read the plan in device.lastReport",
    planBefore:
      "The compiler puts consecutive kernel calls in one dispatch when TypeShade's fusion rules hold. On WebGPU, ",
    planMiddle:
      " runs as one dispatch. A reduction with a different output count, a read at another index, or too many storage buffers starts a new dispatch. After a read, ",
    planAfter:
      " shows the tier, the dispatches, the submissions, and the groups of calls. On the CPU tier the report has no dispatches and one group for each call.",
    sourceLink: "Read how a read runs ↗",
    previous: "Previous",
    next: "Next",
    training: "Training",
  },
  ko: {
    title: "TypeNN 실행 모델",
    description:
      "지연 Tensor 그래프를 TypeShade 프로그램으로 변환하고 지원 백엔드에서 실행하는 방식입니다.",
    home: "시작하기",
    breadcrumb: "가이드",
    current: "실행 모델",
    eyebrow: "가이드",
    heading: "실행 모델",
    intro:
      "TypeNN은 Tensor 그래프를 만들고 실행 순서를 정합니다. TypeShade는 그래프의 커널 함수를 컴파일해 선택한 백엔드에서 실행합니다.",
    callsTitle: "Tensor 호출은 지연 그래프를 만듭니다",
    callsBefore: "",
    callsBetween: ", ",
    callsAfter:
      " 같은 연산은 값을 즉시 계산하지 않습니다. 각 연산은 TypeShade 커널 함수, 입력 Tensor, 값으로 넘기는 스칼라, 기울기 규칙을 담은 노드를 기록합니다.",
    graphTitle: "간단한 Tensor 그래프",
    dataTitle: "data()가 Tensor 결과를 계산하는 방식",
    dataBefore: "계산된 배열이 없는 Tensor에 ",
    dataMiddle:
      "를 호출하면 TypeNN은 결과에 필요한 그래프 노드를 모읍니다. 각 노드의 출력 배열을 만들고 잎 배열을 업로드합니다. 그런 다음 TypeShade ",
    dataAfter:
      "를 한 번 호출해 그 안에서 노드 커널을 그래프 순서대로 실행합니다. 컴파일러는 함께 묶을 수 있는 호출을 디스패치로 묶고, TypeNN은 요청한 Tensor를 한 번 읽어옵니다.",
    laneOneLabel: "TypeNN",
    laneOne: "Shape 검사 · 그래프 노드 · 자동 미분 · 커널 함수",
    laneTwoLabel: "TypeShade",
    laneTwo: "컴파일러 디스패치 계획 · 디스패치 · Backend 계층 · Runtime 자원",
    backendsTitle: "백엔드와 제약",
    tableAria: "Backend 지원",
    tier: "계층",
    selection: "선택",
    currentNote: "현재 참고사항",
    cpu: "CPU",
    cpuSelect: "자동 폴백 또는 명시",
    cpuNote:
      "같은 커널 함수를 호출 단위로 차례로 실행합니다. 정확도 확인과 폴백에 적합합니다.",
    gpu: "WebGPU",
    gpuSelect: "자동 또는 명시",
    gpuNote:
      "브라우저가 어댑터를 제공하면 GPU compute를 사용합니다. elementwise 연쇄는 디스패치 하나로 퓨전됩니다.",
    gl: "WebGL2",
    glSelect: "명시",
    glNote:
      "같은 커널 함수를 호출 단위로 따로 실행합니다. 실행할 수 없는 호출은 CPU 계층이 맡습니다.",
    fine: "TypeShade는 프로세스 전체에 call-layer 설정 하나를 사용하므로 JavaScript 컨텍스트마다 활성 TypeNN Device 하나만 사용할 수 있습니다.",
    planTitle: "계획은 device.lastReport에서 확인합니다",
    planBefore:
      "TypeShade의 퓨전 규칙이 성립하면 컴파일러가 연속한 커널 호출을 디스패치 하나에 담습니다. WebGPU에서 ",
    planMiddle:
      "는 디스패치 하나로 실행됩니다. 출력 개수가 다른 리덕션, 다른 인덱스 읽기, 저장소 버퍼 한도 초과가 있으면 새 디스패치가 시작됩니다. 읽은 뒤 ",
    planAfter:
      "에서 계층, 디스패치, 제출, 호출 그룹을 볼 수 있습니다. CPU 계층의 보고서에는 디스패치가 없고 호출마다 그룹이 하나씩 있습니다.",
    sourceLink: "읽기 실행 방식 보기 ↗",
    previous: "이전",
    next: "다음",
    training: "모델 학습",
  },
} as const;

export const trainingCopy = {
  en: {
    title: "Train a TypeNN model",
    description:
      "Use Module, Linear, CrossEntropyLoss, Tensor autograd, and Adam in an explicit training loop.",
    home: "Get started",
    breadcrumb: "Guides",
    current: "Training",
    eyebrow: "Guides",
    heading: "Train a model",
    intro:
      "The Module API keeps the training loop explicit: clear gradients, run forward, backpropagate, update parameters, and release the batch graph.",
    modelTitle: "Model definition",
    modelText:
      "The MNIST example uses a 784 → 128 → 10 MLP with ReLU and Dropout. This snippet follows the source model; it omits only the seeded weight options.",
    modelCodeTitle: "MNIST model",
    loopTitle: "Training loop",
    loopText:
      "The loop below follows the example's batch lifecycle. It explicitly reads the batch loss for logging, then runs backward and Adam before releasing temporary tensors.",
    loopCodeTitle: "Forward, backward, update",
    stepTitle: "What happens in a training step",
    stepBefore:
      "On every tier, the forward and backward operations run as TypeShade kernel functions. When a requested Tensor has no computed array, ",
    stepMiddle: " runs the kernels needed to produce it. ",
    stepAfter:
      " computes the gradients and updates parameters and Adam moments in one device plan. It reads no gradient back and uploads no parameter. A layer's ",
    stepTail: " arrays are host copies: ",
    stepEnd: " refreshes them, and ",
    stepFinal:
      " reads one parameter. On SwiftShader the device update is not faster than the host loop it replaced.",
    noteTitle: "Explicit reads remain reads.",
    noteBefore: "Calling ",
    noteMiddle: " or ",
    noteAfter:
      " requests a host result. The sample loop above reads back only the loss each step.",
    disposeTitle: "Dispose each batch graph",
    disposeBefore:
      " releases temporary tensors while retaining model parameters. Keep the Device alive for the training session and dispose it after the final batch and any pending work finish.",
    sourceLink: "Open the full MNIST example ↗",
    coverageTitle: "Operations covered by this example",
    coverage:
      "Tensor graph autograd computes gradients for selected operations. This guide follows the MNIST Module example; it does not claim support for arbitrary user-defined kernels or gradients for every Tensor operation.",
    previous: "Previous",
    next: "Next",
    execution: "Execution model",
    api: "API reference",
  },
  ko: {
    title: "TypeNN 모델 학습",
    description:
      "Module, Linear, CrossEntropyLoss, Tensor 자동 미분과 Adam으로 학습 루프를 구성합니다.",
    home: "시작하기",
    breadcrumb: "가이드",
    current: "모델 학습",
    eyebrow: "가이드",
    heading: "모델 학습",
    intro:
      "Module API에서 학습 루프는 명시적입니다. 기울기를 초기화하고 forward, 역전파, 파라미터 갱신을 실행한 뒤 배치 그래프를 해제합니다.",
    modelTitle: "모델 정의",
    modelText:
      "MNIST 예제는 ReLU와 Dropout을 포함한 784 → 128 → 10 MLP를 사용합니다. 아래 코드는 seed 가중치 옵션을 줄인 실제 모델 소스 구조입니다.",
    modelCodeTitle: "MNIST 모델",
    loopTitle: "학습 루프",
    loopText:
      "아래 코드는 예제의 배치 수명주기를 따릅니다. 로깅할 loss 값을 명시적으로 읽은 다음 backward, Adam 갱신을 실행하고 임시 Tensor를 해제합니다.",
    loopCodeTitle: "Forward, backward, 갱신",
    stepTitle: "학습 단계에서 실행되는 일",
    stepBefore:
      "모든 계층에서 순전파와 역전파 연산은 TypeShade 커널 함수로 실행되고, 요청한 Tensor에 계산된 배열이 없으면 ",
    stepMiddle: "가 필요한 커널을 실행합니다. ",
    stepAfter:
      "은 기울기 계산과 파라미터·Adam 모멘트 갱신을 장치에서 계획 하나로 실행합니다. 기울기를 읽어오지 않고 파라미터를 올리지도 않습니다. 계층의 ",
    stepTail: " 배열은 호스트 사본입니다. ",
    stepEnd: "가 사본을 갱신하고, ",
    stepFinal:
      "는 파라미터 하나를 읽어옵니다. SwiftShader에서는 장치 갱신이 대체한 호스트 반복문보다 빠르지 않습니다.",
    noteTitle: "명시적으로 읽은 값은 호스트로 전달됩니다.",
    noteBefore: "와 ",
    noteMiddle:
      "는 호스트 결과를 요청합니다. 위 루프는 매 단계 손실만 읽어옵니다.",
    noteAfter: "",
    disposeTitle: "각 배치 그래프 해제",
    disposeBefore:
      "는 모델 파라미터를 보존하고 임시 Tensor를 해제합니다. 학습 세션이 끝나고 대기 중 작업을 마친 다음 Device를 해제하세요.",
    sourceLink: "MNIST 전체 예제 보기 ↗",
    coverageTitle: "현재 지원 범위",
    coverage:
      "Tensor 그래프 자동 미분은 선택된 연산의 기울기를 계산합니다. 이 가이드는 MNIST Module 예제를 설명하며, 임의의 사용자 정의 커널이나 모든 Tensor 연산의 기울기를 지원한다고 말하지 않습니다.",
    previous: "이전",
    next: "다음",
    execution: "실행 모델",
    api: "API 참조",
  },
} as const;
