import type { Locale } from "./locale";

type Part = { kind: "code" | "inline" | "text" | "break"; value?: string };
type ApiItem = { code: string; description: string };

interface ApiPageCopy {
  title: string;
  description: string;
  crumb: string;
  eyebrow: string;
  heading: string;
  intro: string;
  lifecycle: {
    heading: string;
    codeTitle: string;
    items: ApiItem[];
  };
  operations: {
    heading: string;
    cards: {
      heading: string;
      parts: Part[];
    }[];
  };
  modules: {
    heading: string;
    items: { parts: Part[]; description: string | Part[] }[];
    note: Part[];
    sourceLink: string;
  };
}

export const apiPageCopy = {
  en: {
    title: "TypeNN API reference",
    description:
      "A practical index of TypeNN Device, Tensor, Module, optimizer, and autograd APIs.",
    crumb: "API reference",
    eyebrow: "Reference",
    heading: "API reference",
    intro:
      "An index of the public API used in current examples. See the source declarations for exact overloads and options.",
    lifecycle: {
      heading: "Device and Tensor lifecycle",
      codeTitle: "Create, execute, dispose",
      items: [
        {
          code: "device(options?)",
          description:
            "Open a Device using auto, cpu, webgpu, or webgl2 selection.",
        },
        {
          code: "Device.tensor(values, { shape })",
          description: "Create an input tensor with a checked shape.",
        },
        {
          code: "Tensor.data()",
          description:
            "Materialize the requested graph result and return host values.",
        },
        {
          code: "Tensor.disposeGraph(preserve?)",
          description: "Release graph tensors while retaining selected values.",
        },
        {
          code: "Device.dispose()",
          description: "Wait for pending work and release runtime resources.",
        },
      ],
    },
    operations: {
      heading: "Tensor operations",
      cards: [
        {
          heading: "Linear algebra",
          parts: [
            { kind: "inline", value: "matmul(other, options?)" },
            { kind: "break" },
            {
              kind: "text",
              value: "Rank-2 matrix multiply with transpose options.",
            },
          ],
        },
        {
          heading: "Elementwise",
          parts: [
            { kind: "code", value: "add" },
            { kind: "text", value: ", " },
            { kind: "code", value: "sub" },
            { kind: "text", value: ", " },
            { kind: "code", value: "mul" },
            { kind: "text", value: ", " },
            { kind: "code", value: "div" },
            { kind: "text", value: ", " },
            { kind: "code", value: "maximum" },
            { kind: "text", value: ", " },
            { kind: "code", value: "minimum" },
            { kind: "text", value: ", " },
            { kind: "code", value: "pow" },
            { kind: "text", value: ", and supported activations." },
          ],
        },
        {
          heading: "Reduction and normalization",
          parts: [
            { kind: "code", value: "sum" },
            { kind: "text", value: ", " },
            { kind: "code", value: "mean" },
            { kind: "text", value: ", " },
            { kind: "code", value: "max" },
            { kind: "text", value: ", " },
            { kind: "code", value: "min" },
            { kind: "text", value: ", " },
            { kind: "code", value: "argMax" },
            { kind: "text", value: ", " },
            { kind: "code", value: "softmax" },
            { kind: "text", value: ", and " },
            { kind: "code", value: "logSoftmax" },
            { kind: "text", value: "." },
          ],
        },
        {
          heading: "Loss and gradients",
          parts: [
            { kind: "code", value: "softmaxCrossEntropyWithLogits" },
            { kind: "text", value: ", " },
            { kind: "inline", value: "backward()" },
            {
              kind: "text",
              value: ", and selected Tensor graph gradient rules.",
            },
          ],
        },
      ],
    },
    modules: {
      heading: "Modules and optimizers",
      items: [
        {
          parts: [{ kind: "code", value: "Module" }],
          description:
            "Register child layers, expose parameters, switch train/eval mode.",
        },
        {
          parts: [
            { kind: "code", value: "Sequential" },
            { kind: "text", value: ", " },
            { kind: "code", value: "Linear" },
            { kind: "text", value: ", " },
            { kind: "code", value: "Flatten" },
            { kind: "text", value: ", " },
            { kind: "code", value: "ReLU" },
            { kind: "text", value: ", " },
            { kind: "code", value: "Dropout" },
          ],
          description: "Core building blocks shown by current examples.",
        },
        {
          parts: [
            { kind: "code", value: "optim.SGD" },
            { kind: "text", value: ", " },
            { kind: "code", value: "optim.Adam" },
          ],
          description: [
            {
              kind: "text",
              value:
                "Compute gradients and update parameters in one device plan. Use ",
            },
            { kind: "code", value: "alsoRead" },
            {
              kind: "text",
              value: " to read additional Tensors in the same plan.",
            },
          ],
        },
        {
          parts: [{ kind: "code", value: "CrossEntropyLoss" }],
          description:
            "Loss module for logits and integer class labels in the MNIST example.",
        },
      ],
      note: [
        { kind: "text", value: "TypeShade's pure-function " },
        { kind: "code", value: "shadeGrad" },
        {
          kind: "text",
          value: " is separate from TypeNN Tensor graph autograd.",
        },
      ],
      sourceLink: "Browse source declarations ↗",
    },
  },
  ko: {
    title: "TypeNN API 참조",
    description:
      "TypeNN Device, Tensor, Module, Optimizer 및 자동 미분 API를 확인합니다.",
    crumb: "API 참조",
    eyebrow: "참조",
    heading: "API 참조",
    intro:
      "현재 예제에서 사용하는 공개 API를 정리했습니다. 정확한 overload와 옵션은 소스 선언을 확인하세요.",
    lifecycle: {
      heading: "Device와 Tensor 수명주기",
      codeTitle: "생성, 실행, 해제",
      items: [
        {
          code: "device(options?)",
          description: "auto, cpu, webgpu, webgl2 중 선택하여 Device를 엽니다.",
        },
        {
          code: "Device.tensor(values, { shape })",
          description: "Shape를 검사한 입력 Tensor를 생성합니다.",
        },
        {
          code: "Tensor.data()",
          description: "요청 그래프를 실행하고 호스트 값으로 반환합니다.",
        },
        {
          code: "Tensor.disposeGraph(preserve?)",
          description: "지정한 Tensor를 보존하면서 그래프 값을 해제합니다.",
        },
        {
          code: "Device.dispose()",
          description: "대기 중 작업을 기다린 뒤 런타임 자원을 정리합니다.",
        },
      ],
    },
    operations: {
      heading: "Tensor 연산",
      cards: [
        {
          heading: "선형 대수",
          parts: [
            { kind: "inline", value: "matmul(other, options?)" },
            { kind: "break" },
            { kind: "text", value: "전치 옵션이 있는 rank-2 행렬 곱입니다." },
          ],
        },
        {
          heading: "Elementwise",
          parts: [
            { kind: "code", value: "add" },
            { kind: "text", value: ", " },
            { kind: "code", value: "sub" },
            { kind: "text", value: ", " },
            { kind: "code", value: "mul" },
            { kind: "text", value: ", " },
            { kind: "code", value: "div" },
            { kind: "text", value: ", " },
            { kind: "code", value: "maximum" },
            { kind: "text", value: ", " },
            { kind: "code", value: "minimum" },
            { kind: "text", value: ", " },
            { kind: "code", value: "pow" },
            { kind: "text", value: "와 지원 activation입니다." },
          ],
        },
        {
          heading: "Reduction과 정규화",
          parts: [
            { kind: "code", value: "sum" },
            { kind: "text", value: ", " },
            { kind: "code", value: "mean" },
            { kind: "text", value: ", " },
            { kind: "code", value: "max" },
            { kind: "text", value: ", " },
            { kind: "code", value: "min" },
            { kind: "text", value: ", " },
            { kind: "code", value: "argMax" },
            { kind: "text", value: ", " },
            { kind: "code", value: "softmax" },
            { kind: "text", value: ", " },
            { kind: "code", value: "logSoftmax" },
            { kind: "text", value: "." },
          ],
        },
        {
          heading: "Loss와 기울기",
          parts: [
            { kind: "code", value: "softmaxCrossEntropyWithLogits" },
            { kind: "text", value: ", " },
            { kind: "inline", value: "backward()" },
            { kind: "text", value: "와 일부 Tensor 그래프 미분 규칙입니다." },
          ],
        },
      ],
    },
    modules: {
      heading: "Module과 Optimizer",
      items: [
        {
          parts: [{ kind: "code", value: "Module" }],
          description:
            "하위 계층을 등록하고 파라미터를 조회하며 train/eval 모드를 설정합니다.",
        },
        {
          parts: [
            { kind: "code", value: "Sequential" },
            { kind: "text", value: ", " },
            { kind: "code", value: "Linear" },
            { kind: "text", value: ", " },
            { kind: "code", value: "Flatten" },
            { kind: "text", value: ", " },
            { kind: "code", value: "ReLU" },
            { kind: "text", value: ", " },
            { kind: "code", value: "Dropout" },
          ],
          description: "현재 예제에서 사용하는 기본 계층입니다.",
        },
        {
          parts: [
            { kind: "code", value: "optim.SGD" },
            { kind: "text", value: ", " },
            { kind: "code", value: "optim.Adam" },
          ],
          description: [
            {
              kind: "text",
              value:
                "장치에서 기울기를 계산하고 파라미터를 계획 하나로 갱신합니다. ",
            },
            { kind: "code", value: "alsoRead" },
            {
              kind: "text",
              value:
                "를 사용하면 같은 계획에서 추가 Tensor 값을 읽을 수 있습니다.",
            },
          ],
        },
        {
          parts: [{ kind: "code", value: "CrossEntropyLoss" }],
          description: "MNIST 예제에서 logits와 정수 클래스 레이블을 받습니다.",
        },
      ],
      note: [
        { kind: "text", value: "TypeShade의 순수 함수 " },
        { kind: "code", value: "shadeGrad" },
        {
          kind: "text",
          value: "와 TypeNN Tensor 그래프 자동 미분은 서로 다른 기능입니다.",
        },
      ],
      sourceLink: "소스 선언 살펴보기 ↗",
    },
  },
} satisfies Record<Locale, ApiPageCopy>;
