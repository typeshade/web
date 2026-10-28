import type { Locale } from "./locale";

interface ExamplesPageCopy {
  title: string;
  description: string;
  crumb: string;
  eyebrow: string;
  heading: string;
  intro: string;
  mnist: {
    heading: string;
    description: string;
    codeTitle: string;
    file: string;
    sourceLabel: string;
  };
  operations: {
    heading: string;
    description: string;
    button: string;
  };
  more: {
    heading: string;
    links: { href: string; title: string; description: string }[];
  };
}

export const examplesPageCopy = {
  en: {
    title: "TypeNN examples",
    description:
      "Explore the MNIST MLP and small Tensor operations from the TypeNN source repository.",
    crumb: "Examples",
    eyebrow: "Examples",
    heading: "Learn from running code",
    intro:
      "These examples are linked to the project source. The site does not invent benchmark output or mock a training result.",
    mnist: {
      heading: "MNIST MLP",
      description:
        "Flatten 28×28 images, apply a 784 → 128 dense layer with ReLU, then produce 10 class logits. The repository example adds batches, Adam, sparse-label cross entropy, and evaluation.",
      codeTitle: "Model definition",
      file: "examples/mnist/model.ts",
      sourceLabel: "Browse MNIST source ↗",
    },
    operations: {
      heading: "Tensor operations",
      description:
        "The getting-started and Playground examples use rank-2 MatMul, elementwise operations, activation, and explicit result reads. Use them to check CPU and available browser backends with the same input values.",
      button: "Open the Playground",
    },
    more: {
      heading: "More source examples",
      links: [
        {
          href: "https://github.com/typeshade/typenn/tree/main/tests",
          title: "Correctness tests",
          description:
            "Operation and gradient checks in the source repository.",
        },
        {
          href: "https://github.com/typeshade/typenn/blob/main/TODO.md",
          title: "Implementation status",
          description: "Planned work and known limitations.",
        },
        {
          href: "https://github.com/typeshade/typeshade",
          title: "TypeShade compiler",
          description: "The compiler and runtime that execute TypeNN kernels.",
        },
      ],
    },
  },
  ko: {
    title: "TypeNN 예제",
    description: "TypeNN 저장소의 MNIST MLP와 Tensor 연산 예제를 살펴봅니다.",
    crumb: "예제",
    eyebrow: "예제",
    heading: "실행 가능한 코드에서 배우기",
    intro:
      "예제는 프로젝트 소스 저장소로 연결됩니다. 측정하지 않은 성능이나 학습 결과를 사이트에서 꾸며내지 않습니다.",
    mnist: {
      heading: "MNIST MLP",
      description:
        "28×28 이미지를 펼쳐 784 → 128 Dense 계층과 ReLU를 적용한 뒤 10개 클래스의 logits를 계산합니다. 저장소 예제에는 배치 처리, Adam, 정수 레이블 cross entropy와 평가 코드도 포함되어 있습니다.",
      codeTitle: "모델 정의",
      file: "examples/mnist/model.ts",
      sourceLabel: "MNIST 소스 탐색 ↗",
    },
    operations: {
      heading: "Tensor 연산",
      description:
        "시작하기와 Playground에서 rank-2 MatMul, elementwise 연산, activation, 명시적 결과 읽기를 다룹니다. 동일한 입력으로 CPU와 브라우저에서 사용할 수 있는 백엔드를 확인할 수 있습니다.",
      button: "Playground 열기",
    },
    more: {
      heading: "추가 소스 예제",
      links: [
        {
          href: "https://github.com/typeshade/typenn/tree/main/tests",
          title: "정확도 테스트",
          description: "저장소의 연산 및 기울기 검증입니다.",
        },
        {
          href: "https://github.com/typeshade/typenn/blob/main/TODO.md",
          title: "구현 상태",
          description: "계획된 작업과 알려진 제약입니다.",
        },
        {
          href: "https://github.com/typeshade/typeshade",
          title: "TypeShade 컴파일러",
          description: "TypeNN 커널을 실행하는 컴파일러와 런타임입니다.",
        },
      ],
    },
  },
} satisfies Record<Locale, ExamplesPageCopy>;
