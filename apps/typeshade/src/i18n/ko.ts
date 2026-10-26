import { conceptLessons, conceptLessonLabels } from './concept-lessons-ko.ts';
import { precisionGuide, fractionLabel } from './precision-guide-ko.ts';
// Korean copy. Typed against the English source, so a string that exists in one and not
// the other is a build error. Numbers come from the build, as in en.ts. scripts/check-copy.ts
// compares every string with its English one: the same numerals, links and code, no
// translation tells, and no label wider than the English label it replaces.
import type { Copy } from './index.ts';
import { facts, hero, quickStartFile } from '../lib/examples.ts';
import { ISSUE_IMAGE_BYTES, ISSUE_IMAGES_MAX } from '../lib/issue-data.ts';
import { typedError } from '../lib/typed-error.ts';
import { mnistEpochs, mnistTestSamples } from '../lib/mnist-settings.ts';
import { operationLessons, constructorLesson } from './operation-lessons-ko.ts';
import { functionLessons } from './function-lessons-ko.ts';

const glsl = facts.glslTarget;
const err = typedError();
const std = facts.layoutStandards[0];
const split = facts.splitLabels ?? ['f32', 'f64'];

// 작성 가이드의 절마다 한국어 제목과 설명. 키는 로더가 제목에서 만든 id입니다. 본문의
// 번역은 content/guide/ko/에 있고, 사이드바와 페이지 제목과 설명은 여기에 둡니다.
const sections: Record<string, { title: string; description: string }> = {
  'your-first-shader': {
    title: '첫 셰이더',
    description: `TypeScript로 진입점 두 개짜리 셰이더 모듈을 쓰고 WGSL과 ${glsl}로 생성합니다. 각 호출에 대응하는 출력 문자열을 설명합니다.`,
  },
  'values-and-mutation': {
    title: '값과 변경',
    description:
      '셰이더 코드 안에서 중간값을 쓰고, 코드에 필요한 자리에 타입을 붙이고, 그 값을 바꾸고, 상수와 변수를 구분하는 방법을 설명합니다.',
  },
  'functions-and-entry-points': {
    title: '함수와 진입점',
    description:
      '헬퍼 함수를 선언해 다른 함수에서 부르고, 버텍스·프래그먼트·컴퓨트 스테이지의 진입점을 쓰고, 그 함수들을 담는 모듈을 조립하는 방법을 설명합니다.',
  },
  'control-flow': {
    title: '제어 흐름',
    description:
      '셰이더 본문 안에서 분기하고 반복하고 디스패치하는 법을 익히고, 무엇을 할지 고르는 문장과 어떤 값을 쓸지 고르는 표현식을 구분합니다.',
  },
  'layouts-and-resources': {
    title: '레이아웃과 리소스',
    description:
      '버텍스, 유니폼, 스토리지, 텍스처 레이아웃을 각각 한 번만 선언하고, 그 하나의 선언에서 모든 필드를 바로 읽어 오는 방법을 설명합니다.',
  },
  'emitting-and-reflection': {
    title: '생성과 리플렉션',
    description:
      '모듈을 WGSL로, GLSL 두 스테이지로, 또는 호스트가 조합하는 모듈 조각으로 바꾸고, 호스트가 바인딩할 때 읽는 파이프라인 메타데이터를 읽습니다.',
  },
  'the-cpu-oracle': {
    title: 'CPU 오라클 안내서',
    description:
      '모듈을 CPU에서 배정밀도로 실행하고, 거기서 나온 숫자를 GPU가 낸 값과 비교해 컴파일러의 출력을 검증하는 방법을 설명합니다.',
  },
  diagnostics: {
    title: '진단',
    description:
      '코드가 붙은 오류를 읽고 그 코드로 분기하며, 모듈의 모든 실패를 보고서 하나로 받고, 오류가 난 TypeScript 줄을 출력합니다.',
  },
  'conditional-programs': {
    title: '조건부 프로그램',
    description:
      '하나의 셰이더 소스에서 여러 프로그램 중 무엇을 만들지 정하고, 변형이 상수 하나로 끝나는 경우를 가려내며, 선택을 호스트 코드에 넘깁니다.',
  },
  'capabilities-extensions': {
    title: '기능과 확장',
    description:
      '모듈에 필요한 GPU 기능을 선언하고, 타깃마다 그 기능이 무엇을 요구하는지 읽고, 생성 전에 부팅된 디바이스를 그 선언과 대조합니다.',
  },
  fp64: {
    title: 'fp64',
    description:
      '셰이더 안에 배정밀도 값을 선언하고, f64가 지원하는 연산이 무엇인지 알고, 에뮬레이션에 필요한 가드 텍스처를 바인딩하는 방법을 설명합니다.',
  },
  'glsl-float-precision': {
    title: 'GLSL 부동소수점 정밀도',
    description:
      'GLSL 스테이지를 언제 mediump로 출력할지, 그 옵션 하나가 출력된 소스에서 무엇을 바꾸고 무엇을 그대로 두는지 압니다.',
  },
  'production-emit': {
    title: '배포용 생성',
    description:
      '배포 시점 변환을 생성 호출 하나로 조합하고, 이름이 바뀐 셰이더 텍스트로 돌아온 드라이버 로그를 원래 이름으로 되돌려 읽습니다.',
  },
  'migrating-a-glsl-shader': {
    title: 'GLSL 셰이더 옮기기',
    description:
      'GLSL 셰이더의 구문에 대응하는 "use typeshade" 표기와 각 표기에서 생성되는 WGSL, GLSL 코드를 비교합니다.',
  },
};

// 참조의 분류 이름과 한 줄 설명입니다. 키는 추출기가 정한 슬러그이고, 하나라도 빠지면
// assertApiCategories()가 그 슬러그를 알려 주며 빌드를 세웁니다.
const apiCategories: Record<string, { name: string; summary: string }> = {
  authoring: {
    name: '작성',
    summary: '셰이더의 모듈, 함수, 변수, 제어 흐름을 선언하고 조립하는 IR 빌더 함수입니다.',
  },
  builtins: {
    name: '내장 함수',
    summary:
      '수학, 벡터, 텍스처 연산을 만드는 IR 빌더 함수입니다. 각 함수는 IR 노드를 반환합니다. 셰이더 파일은 언어 참조에 실린 내장 함수를 부릅니다.',
  },
  values: {
    name: '값',
    summary: '리터럴과 타입이 붙은 참조, 그리고 자바스크립트 값을 노드로 바꾸는 생성자입니다.',
  },
  types: {
    name: '타입',
    summary:
      '작성 API에 타입을 붙이는 타입 키와 타입 기술자입니다. 셰이더 값의 형태가 여기서 정해집니다.',
  },
  ir: {
    name: 'IR',
    summary:
      '모든 백엔드가 읽는 중간 표현입니다. 노드와 문장과 선언이 들어 있고, 출력은 모두 여기서 나옵니다.',
  },
  layout: {
    name: '레이아웃',
    summary:
      '구조체와 바인딩 리소스를 한 번만 선언하는 선언자입니다. 호스트와 두 대상이 같은 선언을 씁니다.',
  },
  emit: {
    name: '출력',
    summary: `WGSL과 ${glsl}을 쓰는 출력기와 모듈 조각, 그리고 그 앞에서 실행되는 패스입니다.`,
  },
  'reflection-api': {
    name: '리플렉션',
    summary:
      'reflect()가 모듈에서 복원해 내는 것들입니다. 바인드 그룹과 바이트 레이아웃, 진입점이 여기 있습니다.',
  },
  'cpu-oracle': {
    name: 'CPU 오라클',
    summary:
      '모듈을 f64로 실행하는 CPU 백엔드입니다. 여기서 나온 값이 GPU 출력을 맞춰 보는 기준이 됩니다.',
  },
  console: {
    name: '콘솔',
    summary:
      '셰이더가 console.log로 남기는 내용입니다. CPU가 전달하는 이벤트와, GPU가 기록한 이벤트를 읽는 디코더가 여기 있습니다.',
  },
  'runtime-api': {
    name: '런타임',
    summary:
      '프로그램 런타임은 컴파일된 프로그램을 WebGPU에서 실행합니다. 커널 호출이 디바이스에 남겨 두는 배열도 여기 있습니다.',
  },
  diagnostics: {
    name: '진단',
    summary:
      '코드가 붙은 오류 클래스와, 출력이 나가기 전에 거치는 검증 단계입니다. 실수는 여기서 걸립니다.',
  },
  'emulated-f64': {
    name: 'f64 에뮬레이션',
    summary: 'f64가 없는 대상에서 쓰는 배정밀도입니다. f32 레인 두 개에 나눠 담아 계산합니다.',
  },
  variants: {
    name: '배리언트',
    summary: '기능 축을 모듈 한 계열로 다룹니다. 조합마다 컴파일하고 링크해서 프로그램을 냅니다.',
  },
  backends: {
    name: '백엔드',
    summary:
      '백엔드가 지켜야 하는 계약과 기능 모델, 그리고 대상마다 내장 함수를 어떤 이름으로 낼지 정하는 레지스트리이입니다.',
  },
  tooling: {
    name: '도구',
    summary: '레지스트리 생성과 의미 비교, 출력 동일성 확인, 크기 측정에 쓰는 도구를 모았습니다.',
  },
  editor: {
    name: '편집기',
    summary:
      '편집기에 진단, 자동 완성, 호버 설명을 제공하는 API입니다. 소스 위치에 해당하는 정보를 반환합니다.',
  },
};

export const ko: Copy = {
  lang: 'ko',
  name: '한국어',
  skip: '본문으로 건너뛰기',
  notice: {
    label: '공지',
    dismiss: '공지 닫기',
  },

  meta: {
    title: 'TypeShade: WebGPU와 WebGL2를 위한 TypeScript 셰이더 언어',
    description: `파일 맨 위에 "use typeshade"를 쓰면 WebGPU용 WGSL과 WebGL2용 ${glsl}이 생성됩니다. 같은 소스를 CPU에서 f64로 실행해 출력을 대조할 수 있습니다.`,
    ogAlt: 'TypeShade: WebGPU와 WebGL2를 위한 하나의 셰이더 소스. 렌더링된 metaballs 셰이더.',
  },

  nav: {
    primary: '주요 메뉴',
    guide: '가이드',
    api: 'API',
    examples: '예제',
    github: 'GitHub',
    llms: 'llms.txt',
    languages: '언어',
    theme: '다크 모드 전환',
    menu: '메뉴',
    search: '검색',
    close: '닫기',
    searchUnavailable: '검색은 빌드된 사이트에서 쓸 수 있습니다',
    searchUi: {
      placeholder: '검색',
      clear_search: '지우기',
      load_more: '결과 더 보기',
      search_label: '이 사이트에서 검색',
      filters_label: '필터',
      zero_results: '[SEARCH_TERM] 검색 결과가 없습니다',
      many_results: '[SEARCH_TERM] 검색 결과 [COUNT]개',
      one_result: '[SEARCH_TERM] 검색 결과 [COUNT]개',
      alt_search: '[SEARCH_TERM] 검색 결과가 없어 [DIFFERENT_TERM] 결과를 보여 줍니다',
      search_suggestion: '[SEARCH_TERM] 검색 결과가 없습니다. 다음 검색어를 눌러 보십시오',
      searching: '[SEARCH_TERM] 검색 중',
    },
    version: '버전',
    prerelease: `출시 전, 다음은 ${facts.nextVersion}`,
    releases: '릴리스',
    commit: '고정 커밋',
    changelog: '변경 이력',
  },
  docs: {
    navigation: {
      location: '현재 위치',
      related: '관련 함수',
      browse: '전체 문서',
      overview: '개요',
    },
    labels: {
      nav: {
        docs: 'Docs',
        playground: 'Playground',
        language: '언어',
        reference: '참조',
        examples: '예제',
      },
      languageGuide: '언어 가이드',
      languageReference: '언어 참조',
      internals: '컴파일러 내부 구조',
      concepts: 'TypeScript와 WebGPU',
      languageService: '언어 서비스',
      playground: 'Playground',
      editor: '에디터 지원',
      sidebarGroups: {
        getStarted: 'Getting Started',
        language: '언어',
        concepts: '개념',
        examples: '예제',
        reference: '참조',
        project: '프로젝트',
      },
      conceptPages: {
        glslPrecision: 'GLSL 정밀도',
        cpuAndGpu: 'CPU와 GPU',
        pipeline: '셰이더 파이프라인',
        webgpuAndWebgl2: 'WebGPU와 WebGL2',
        wgslAndGlsl: 'WGSL과 GLSL',
      },
      topics: {
        stringKeys: '문자열 키와 Record',
        types: '타입',
        functions: '함수',
        controlFlow: '제어 흐름',
        gpuTypes: 'GPU 타입',
        resources: '리소스',
        stages: '셰이더 스테이지',
        algorithms: '알고리즘',
        random: '난수',
      },
      mapping: {
        fromTypescript: 'TypeScript에서',
        fromWgsl: 'WGSL에서',
        fromGlsl: 'GLSL에서',
        builtins: '내장 함수',
      },
      mappingSections: {
        fromTypescript: {
          declarations: '선언',
          functions: '함수',
          classes: '클래스',
          controlFlow: '제어 흐름',
          expressions: '식과 타입',
          double: '배정밀도 에뮬레이션',
        },
        fromWgsl: {
          types: '타입',
          resources: '리소스',
          entries: '진입점',
          statements: '문과 식',
        },
        fromGlsl: {
          types: '타입',
          uniforms: '유니폼',
          variables: 'builtin 변수',
          functions: '함수',
        },
      },
    },
    introduction: '소개',
    authoring: '셰이더 작성',
    project: '프로젝트',
    why: '왜 TypeShade인가',
    quickStart: 'Quick Start',
    authoringGuide: '작성 가이드',
    checks: '검증 방식',
    examples: '예제',
    onThisPage: '이 페이지에서',
    previous: '이전',
    next: '다음',
    editPage: '이 페이지 편집',
    reportIssue: '문제 보고',
    permalink: '제목 고정 링크',
    api: {
      // 영어 제목의 45자 하한과 짝을 맞추려 늘렸습니다(SEO 리뷰, onpage, 제목 길이).
      title: 'TypeShade 컴파일러 API 참조: 호스트와 빌더가 부르는 export 목록',
      description:
        'TypeShade 컴파일러의 공개 export마다 별도의 참조 페이지를 제공합니다. 구문, 매개변수, 반환값, 예제, 그리고 어느 대상에서 지원되는지를 담습니다.',
      h1: '컴파일러 API 참조',
      intro: `typeshade 패키지가 내보내는 export를 모두 모았습니다. 커밋 ${facts.pinnedCommit}의 컴파일러에서 추출했습니다. 함수, 타입, 인터페이스, 클래스마다 페이지가 하나씩 있습니다.`,
      audience:
        '호스트 애플리케이션과 [`fn()`](apiFn) 빌더에서 호출하는 API입니다. 셰이더에서 사용하는 이름은 [언어 참조](reference)에 있습니다.',
      reference: '참조',
      breadcrumbs: '현재 위치',
      // 영어와 같은 이유로 제목에 분류와 종류를 넣고, 60자 안에서 들어가는 만큼만 꾸밈말을 붙입니다.
      // 한글 음절은 로마자보다 스니펫에서 더 넓게 렌더링되므로(check-copy.ts의 1.35배 폭 예산과
      // ApiReferencePage.astro의 META_MAX가 로케일별로 다른 이유와 같음), 이 함수가 실제로 내는
      // 39-44자 제목은 리뷰가 영어 기준으로 잰 45자 하한보다 화면에서 좁지 않습니다. export 제목은
      // 그대로 두고, 훨씬 짧은 참조 인덱스와 분류 제목만 아래에서 늘렸습니다.
      pageTitle: (heading: string, kind: string, category: string) => {
        const variants = [
          `: TypeShade 셰이더 API의 ${category} 분류 ${kind} 참조 문서`,
          `: TypeShade API의 ${category} 분류 ${kind} 참조 문서`,
          `: TypeShade API의 ${category} 분류 ${kind} 참조`,
          `: TypeShade API ${category} 분류 ${kind}`,
          `: TypeShade API ${kind}`,
        ];
        const fitting = variants.find((suffix) => (heading + suffix).length <= 60);
        return fitting ? heading + fitting : heading;
      },
      builderTitle: (heading: string) => {
        const suffixes = [
          ': typeshade/core/ir의 IR 빌더 함수, TypeShade 컴파일러 API',
          ': typeshade/core/ir의 IR 빌더 함수, TypeShade API',
          ': typeshade/core/ir의 IR 빌더 함수',
        ];
        return (
          heading +
          (suffixes.find((suffix) => (heading + suffix).length <= 60) ??
            suffixes[suffixes.length - 1]!)
        );
      },
      builderDescription: (name: string, summary: string) =>
        `${name}, typeshade/core/ir의 IR 빌더 함수입니다. ${summary}`,
      categoryTitle: (name: string) => `${name} 분류, TypeShade 셰이더 API 참조 문서`,
      categoryDescription: (name: string, summary: string) =>
        `TypeShade API 참조의 ${name} 분류입니다. ${summary}`,
      // "~에 대한 TypeShade API 참조입니다"였던 접두어를 줄였습니다: 요약(summary)이 번역되지 않은
      // export에서는 컴파일러의 JSDoc 원문이라 영어이고, 접두어가 길수록 문장 경계를 찾을 70-140자
      // 구간이 좁아져 단어 중간에서 잘리는 사례가 늘었습니다(SEO 리뷰, onpage, 설명 절단). 번역이
      // 있는 export는 content/api/ko/의 한국어 요약이 뒤에 붙습니다.
      pageDescription: (name: string, kind: string, category: string, summary: string) =>
        `${name}, ${category} 분류 ${kind}이입니다. ${summary}`,
      kindLine: (kind: string, category: string) => `${kind}, ${category} 분류`,
      note: `시그니처, 설명, 예제는 커밋 ${facts.pinnedCommit}의 컴파일러 소스에서 그대로 가져온 영어 원문입니다.`,
      translatedNote: `설명은 커밋 ${facts.pinnedCommit}의 컴파일러 소스에 있는 JSDoc을 한국어로 옮긴 것입니다. 시그니처와 예제 코드는 소스에 적힌 그대로입니다.`,
      syntax: '구문',
      parameters: '매개변수',
      returnValue: '반환값',
      exceptions: '예외',
      descriptionHeading: '설명',
      examples: '예제',
      example: '예제',
      targets: '대상별 지원',
      target: '대상',
      supportHeading: '지원',
      notes: '비고',
      constructor: '생성자',
      instanceProperties: '인스턴스 속성',
      instanceMethods: '인스턴스 메서드',
      inGuide: '관련 가이드',
      seeAlso: '함께 보기',
      languageNote:
        '이 export는 IR 노드를 반환합니다. `"use typeshade"` 파일은 내장 함수 자체를 부른다:',
      source: '소스',
      optional: '선택 사항',
      readonly: '읽기 전용',
      deprecated: '지원 중단',
      previewNote:
        '템플릿 미리보기입니다. 이 페이지의 내용은 예시 데이터이고 컴파일러에서 가져온 것이 아닙니다.',
      line: (n: number) => `${n}행`,
      atCommit: (sha: string) => `커밋 ${sha} 기준`,
      members: (n: number) => `export ${n}개`,
      kindMeta: '종류',
      kinds: {
        function: '함수',
        constant: '상수',
        interface: '인터페이스',
        type: '타입',
        class: '클래스',
      },
      targetNames: { wgsl: 'WGSL (WebGPU)', glsl: `${glsl} (WebGL2)`, cpu: 'CPU 오라클' },
      support: {
        native: '지원',
        emulated: '에뮬레이션',
        stub: '스텁',
        none: '지원 안 함',
        'n/a': '해당 없음',
      },
      categories: apiCategories,
    },
    reference: {
      discovery: {
        title: (name: string, related: string[], dualTarget: boolean) => {
          const shown = related.length ? `${name} / ${related[0]}` : name;
          const suffixes = dualTarget
            ? [
                ': WGSL·GLSL 함수 뜻과 사용법, 계산 예제와 입력 범위 및 주의점',
                ': WGSL·GLSL 함수 사용법과 계산 예제, 입력 범위와 주의점',
                ': 셰이더 함수 사용법, 계산 예제와 입력 범위·주의점',
              ]
            : [
                ': 셰이더 함수 뜻과 사용법, 계산 예제와 입력 범위 및 주의점',
                ': 셰이더 함수 사용법, 계산 예제와 입력 범위·주의점',
              ];
          suffixes.push(
            ': 셰이더 함수 뜻과 사용법, 계산 예제와 입력 범위 및 주의점 | TypeShade',
            ': 셰이더 함수 설명과 예제, 입력 범위 및 주의점',
            ': 셰이더 함수 설명과 예제',
          );
          return [shown, name]
            .flatMap((label) => suffixes.map((suffix) => label + suffix))
            .find((title) => title.length >= 45 && title.length <= 60);
        },
        label: '다른 언어의 관련 이름',
        canonical: '뜻과 예제',
        note: '관련 연산은 인수, 지원 범위와 의미가 다를 수 있습니다. 다른 언어의 이름을 TypeShade 별칭으로 사용할 수는 없습니다. 지원하는 형태와 제한은 대상 언어에 따라 다릅니다.',
      },
      worked: {
        lessons: operationLessons,
        constructor: constructorLesson,
        heading: '예제 비교',
        modelNote:
          '예제는 설명용 계산 모델이며 GPU를 실행하지 않습니다. 정확한 호출 형식은 아래 컴파일러 참고 자료에서 설명합니다.',
        example: (index: number) => `예제 ${index}`,
        setup: '모델의 전제',
        input: '모델 입력',
        output: '결과',
        returned: '반환값',
        before: '연산 전 저장값',
        after: '연산 후 저장값',
        binary: '정수의 이진 표현',
        diagram: '이 예제의 성분',
        textureDiagram:
          '텍셀 격자입니다. 위쪽 행의 세로 텍스처 좌표가 더 큽니다. 값은 한 채널을 나타내며 비교 격자는 통과 여부를 보여줍니다.',
        matrixDiagram: '행을 따라 표시한 행렬입니다. 생성자 인수는 각 열을 아래로 읽는 순서입니다.',
        derivativeDiagram:
          '이웃 픽셀의 필드 값입니다. 아래쪽 행은 세로 방향으로 한 픽셀 이동한 결과입니다.',
        calculationNote:
          '소수 결과는 표시할 때 반올림했습니다. 각 예제는 명시한 전제를 따릅니다. 실제 셰이더의 결과는 대상 언어의 정밀도와 실행 규칙에 따릅니다.',
      },
      demo: {
        heading: '함수 그래프',
        exercises: '입력 변화 관찰',
        useHeading: '활용',
        cautionHeading: '입력 범위와 주의사항',
        interaction2d:
          '휠로 확대·축소하고 드래그로 이동한다. 키보드: 방향키, +/-, Home으로 초기화.',
        view3d: '3D 보기',
        interaction:
          '휠로 확대·축소하고 드래그로 이동한다. 3D에서는 드래그로 회전한다. 키보드: 방향키, +/-, Home으로 초기화.',
        probe: '입력 x',
        parameter: '매개변수 k',
        angleInput: '각도 x (라디안)',
        degreeInput: '각도 x (도)',
        related: '관련 함수',
        calculation: '계산 예제',
        calculationNote:
          '참고 계산의 결과는 읽기 쉽게 반올림했습니다. 실제 셰이더 출력은 대상 언어의 정밀도 규칙을 따릅니다.',
        parameters: {
          mod: '제수 k',
          min: '다른 입력 k',
          max: '다른 입력 k',
          step: '경계 k',
          clamp: '경계 크기 k',
          mix: '끝값 k',
          smoothstep: '위쪽 경계 k',
          fma: '배율 k',
          ldexp: '이진 지수 k',
          hypot: '세로 성분 k',
          length: '세로 성분 k',
          distance: '다른 점 높이 k',
          dot: '가로 가중치 k',
        },
        condition: '이 예제의 입력 조건',
        aria: (name: string) =>
          `${name} 그래프입니다. 곡선이 출력을 나타내며, 강조된 점은 선택한 입력을 따라 움직입니다.`,
        caption: '파란 곡선은 출력이고, 주황색 점은 선택한 입력의 위치입니다.',
        window: '축 옆에 표시한 범위만 그립니다. 이 범위 밖의 값은 화면에 나타나지 않습니다.',
        sources:
          '셰이더의 입력 규칙과 정밀도는 [WGSL](specWgsl)과 [GLSL ES 3.00](specGlslEs)에서 규정합니다.',
        lessons: functionLessons,
      },
      title: 'TypeShade 언어 참조: "use typeshade" 파일이 쓰는 이름 전체 목록',
      description: `\`"use typeshade"\` 파일에서 쓸 수 있는 이름 ${facts.languageEntries}개를 모았다. 타입과 어트리뷰트, 내장 값, 함수, 상수, \`Math\` 멤버가 여기 들어 있다.`,
      h1: '언어 참조',
      intro: `\`"use typeshade"\`로 시작하는 파일이 쓰는 언어이다. 이름 ${facts.languageEntries}개를 커밋 ${facts.pinnedCommit}의 컴파일러 언어 서비스에서 그대로 읽어 왔습니다. 편집기가 호버 설명을 낼 때 보는 표와 같은 표입니다.`,
      audience:
        '셰이더를 쓰는 사람을 위한 참조입니다. 호스트 애플리케이션과 [`fn()`](apiFn) 빌더가 부르는 쪽은 [컴파일러 API 참조](api)에 있습니다.',
      reference: '참조',
      breadcrumbs: '현재 위치',
      note: `시그니처와 이름 아래 문장, 컴파일러 메시지는 커밋 ${facts.pinnedCommit}의 컴파일러가 쓴 영어 원문입니다.`,
      readingH: '항목 읽는 법',
      numberP:
        '매개변수나 반환 위치에 쓰인 `number`는 스칼라가 들어갈 자리입니다. 앰비언트 파일은 GPU 스칼라를 브랜드가 붙은 number로 선언하고 그 브랜드는 선택이라서, 리터럴도 브랜드가 붙은 스칼라도 이 자리에 들어갑니다.',
      widthP:
        '직접 쓰는 선언에는 여전히 너비가 필요합니다. 필드나 매개변수에 `number`만 적으면 거부되며, 그 행과 컴파일러가 낸 메시지는 [TypeScript에서](languageFromTypescript) 페이지에 있습니다.',
      positionsP:
        '`a0`, `a1`처럼 자리로만 붙은 매개변수 이름은 앰비언트 파일이 만들어 낸 것입니다. 호출은 인자를 순서대로 넘기고 이름은 쓰지 않습니다.',
      helpersP:
        '시그니처에는 앰비언트 파일이 스스로 쓰려고 선언한 타입이 나올 수 있습니다. 아래가 그 선언입니다.',
      swizzlesP: (n: number) =>
        `\`…\` 줄은 나머지 멤버 ${n}개를 줄인 자리이며, 이 멤버는 모두 스위즐이다. 스위즐은 성분을 두 개에서 네 개까지 골라 새 벡터로 읽고, 원소 타입은 원래 벡터와 같다. 순서는 자유롭고 같은 성분을 거듭 골라도 되지만, 글자는 \`xyzw\`와 \`rgba\` 가운데 한쪽에서만 가져온다.`,
      readingP: `항목 하나에는 편집기가 그 이름으로 읽어 들이는 선언과, 컴파일러가 쓴 설명 한 문장이 들어갑니다. 내장 함수라면 두 백엔드가 각각 내보내는 WGSL과 ${glsl} 코드도 함께 보여 줍니다. 같은 호출의 네 칸 비교표는 [내장 함수 표](languageBuiltins)에 있습니다.`,
      sourceP:
        '이 페이지의 항목은 모두 고정된 커밋의 컴파일러에서 읽어 왔고, 사이트에서 별도로 작성한 항목은 없습니다.',
      entries: (n: number) => `이름 ${n}개`,
      signature: '시그니처',
      emits: '출력',
      wgsl: 'WGSL',
      glsl,
      noForm: '이 대상에는 형태가 없습니다.',
      preEmit: '두 백엔드가 돌기 전에 `f32` 레인 두 개로 바뀝니다.',
      formsP: `작성자는 어느 텍스처에든 같은 호출을 쓰고, 컴파일러가 타깃마다 필요한 형태를 씁니다. ${glsl}의 \`texelFetch\`는 부호 있는 좌표만 받고, 배열 레이어를 좌표 안에 넣으며, 1d 텍스처와 멀티샘플 텍스처가 없다.`,
      formsColumns: ['텍스처', '작성하는 코드', 'WGSL', glsl],
      inTable: '내장 함수 표',
      irBuilderLink: (name: string) => `\`typeshade/core/ir\`의 \`${name}()\``,
      validIn: '쓰이는 곳',
      anyStage: '컴파일러가 이 아이디를 파이프라인의 어느 스테이지에도 묶어 두지 않습니다.',
      stageRule: (stage: string, direction: string) => `${stage} ${direction}`,
      stages: { vertex: '버텍스', fragment: '프래그먼트', compute: '컴퓨트' },
      directions: { input: '입력', output: '출력' },
      // 영어와 같은 이유로 60자 안에서 들어가는 만큼만 꾸밈말을 붙입니다.
      kindTitle: (name: string) => {
        const suffixes = [
          ', "use typeshade" 파일에서 쓰는 이름을 모은 TypeShade 언어 참조',
          ', TypeShade 언어 참조에서 쓰는 이름 목록',
          ', TypeShade 언어 참조',
        ];
        return name + (suffixes.find((suffix) => (name + suffix).length <= 60) ?? '');
      },
      entry: {
        // 영어와 같은 이유로 60자 안에서 들어가는 만큼만 꾸밈말을 붙입니다. 이름이 가장 짧은 `E`부터
        // 가장 긴 `textureSampleCompareLevel`까지 재어 보면 45자에서 60자 사이에 들어갑니다.
        // 영어와 같은 이유로, 두 대상에 형태가 있는 내장 함수는 제목에 WGSL, GLSL과 TypeShade를 넣습니다.
        title: (name: string, kind: string, targets = false) => {
          const suffixes = [
            ...(targets
              ? [
                  `: WGSL, GLSL과 TypeShade에서 쓰는 형태와 그 뜻, 셰이더 ${kind} 참조`,
                  `: WGSL, GLSL과 TypeShade에서 쓰는 셰이더 ${kind}`,
                  `: WGSL, GLSL과 TypeShade의 셰이더 ${kind}`,
                  `: WGSL, GLSL과 TypeShade의 ${kind}`,
                ]
              : []),
            `: "use typeshade" 파일에서 쓰는 ${kind} 이름 하나, TypeShade 언어 참조`,
            `: TypeShade 언어 참조에 실린 ${kind} 이름과 그 시그니처`,
            `: TypeShade 언어 참조에 실린 ${kind} 이름`,
            `: TypeShade 언어 참조의 ${kind}`,
          ];
          return (
            name +
            (suffixes.find((suffix) => (name + suffix).length <= 60) ??
              suffixes[suffixes.length - 1]!)
          );
        },
        description: (name: string, kind: string, summary: string) =>
          `${name}, TypeShade 언어 참조의 ${kind}이입니다. ${summary}`,
        targetsLead: (name: string, targets: { readonly wgsl: string; readonly glsl: string }) =>
          targets.wgsl === targets.glsl
            ? `TypeShade에서 ${name} 호출은 WGSL과 ${glsl} 모두에서 ${targets.wgsl} 형태로 컴파일됩니다.`
            : `TypeShade에서 ${name} 호출은 WGSL에서 ${targets.wgsl}, ${glsl}에서 ${targets.glsl} 형태로 컴파일됩니다.`,
        typeLead: (name: string, targets: { readonly wgsl: string; readonly glsl: string }) =>
          targets.wgsl === targets.glsl
            ? `TypeShade의 ${name} 타입은 WGSL과 ${glsl} 모두에서 ${targets.wgsl} 형태로 씁니다.`
            : `TypeShade의 ${name} 타입은 WGSL에서 ${targets.wgsl}, ${glsl}에서 ${targets.glsl} 형태로 씁니다.`,
        kindNames: {
          type: '타입',
          attribute: '어트리뷰트',
          builtin: '내장 값',
          function: '함수',
          constant: '상수',
          math: 'Math 멤버',
        },
        kindWords: {
          type: '타입',
          attribute: '어트리뷰트',
          builtin: '내장 값',
          function: '함수',
          constant: '상수',
          math: 'Math 멤버',
        },
        kindMeta: '종류',
        syntax: '구문',
        parameters: '매개변수',
        returnValue: '반환값',
        descriptionHeading: '설명',
        targets: '대상별 출력',
        examples: '예제',
        seeAlso: '함께 보기',
        optional: '선택 사항',
        decoratorNone: '이 데코레이터는 인자 없이 그대로 붙입니다.',
        decoratorBareToo: '인자 없이 그대로 붙이는 형태도 있습니다.',
        decoratorProtocol:
          '선언에는 TypeScript 데코레이터 런타임이 넘겨주는 `target`과 `context`도 적혀 있습니다. 호출에서는 둘 다 쓰지 않습니다.',
        oracleEvaluates: 'CPU 오라클이 f64로 직접 계산합니다.',
        oracleStub:
          'CPU 오라클에는 텍스처 메모리도 이웃 프래그먼트도 없습니다. `{ gpuStubs: true }`로 컴파일한 모듈이 아니면 호출이 예외를 던집니다. 그 옵션을 주면 자리를 채우는 값이 돌아옵니다.',
        noteUntranslated: '이 절은 번역이 없거나 원문이 갱신되어 영어로 표시합니다.',
      },
      kinds: {
        type: {
          name: '타입',
          summary: '값을 선언할 때 쓰는 스칼라와 벡터, 행렬, 그리고 메모리 타입입니다.',
          description: `\`"use typeshade"\` 파일에서 값을 선언할 때 쓰는 타입 ${facts.languageTypes}개입니다. 스칼라와 벡터, 모든 모양의 행렬, 텍스처와 샘플러, 그리고 GPU가 들고 있는 메모리가 여기 있습니다.`,
        },
        attribute: {
          name: '어트리뷰트',
          summary: '진입점을 표시하고 필드를 파이프라인에 연결하는 데코레이터입니다.',
          description: `컴파일러가 실제로 읽고 처리하는 데코레이터 ${facts.languageAttributes}개입니다. 진입점을 표시하거나, 워크그룹 크기를 정하거나, 필드를 파이프라인에 연결하거나, 스테이지 사이의 값과 출력의 성질을 정하거나, 진입점이 검사 결과를 보고하는 방식을 정합니다.`,
        },
        builtin: {
          name: '내장 값',
          summary: '파이프라인이 넘겨주는 `@builtin(...)` 아이디와 각각이 속한 스테이지입니다.',
          description: `파이프라인이 셰이더에 넘겨주거나 셰이더에서 돌려받는 \`@builtin(...)\` 아이디 ${facts.languageBuiltinValues}개입니다. WGSL이 정해 둔 타입과 쓰이는 스테이지를 함께 적었습니다.`,
        },
        function: {
          name: '함수',
          summary: '셰이더에서 부르는 함수를 계열별로 묶고, 백엔드가 내는 코드를 함께 실었습니다.',
          description: `셰이더에서 부르는 함수 ${facts.languageFunctions}개를 계열별로 묶었습니다. 시그니처와 함께, 컴파일러가 그 호출에 쓰는 WGSL과 ${glsl} 코드를 나란히 둡니다.`,
        },
        constant: {
          name: '상수',
          summary: '컴파일할 때 값으로 박히는 리터럴과 `discard`입니다.',
          description: `선언 없이 바로 읽는 이름 ${facts.languageConstants}개이다. 컴파일 시점에 값으로 박히는 수학 리터럴과, 프래그먼트를 버리는 \`discard\`가 여기 든다.`,
        },
        math: {
          name: 'Math 멤버',
          summary: '셰이더에서 손댈 수 있는 `Math` 멤버이며, 내장 함수나 리터럴로 이어집니다.',
          description: `셰이더에서 손댈 수 있는 \`Math\` 멤버 ${facts.languageMathMembers}개입니다. 각각 내장 함수 호출이나 박아 넣은 리터럴로 이어져, 익숙한 이름이 대상의 코드가 됩니다.`,
        },
      },
      families: {
        maths: '수학',
        geometry: '기하 연산',
        derivatives: '화면 공간 미분',
        bits: '비트 연산',
        packing: '패킹',
        casts: '캐스트',
        textures: '텍스처와 스토리지',
        atomics: '원자적 연산',
        barriers: '배리어',
        f64: '에뮬레이션 배정밀도',
        constructors: '생성자',
        resources: '배열과 바인딩',
      },
    },
    errors: {
      title: 'TypeShade 오류 코드: 컴파일러가 진단에 붙이는 코드를 모두 모아 코드별로 정리한 목록',
      description: `TypeShade 컴파일러가 내는 프런트엔드 코드 ${facts.errorCodesTs}개와 코어 코드 ${facts.errorCodesSd}개입니다. 코드마다 뜻을 싣고, 프로그램으로 낼 수 있는 코드는 그 프로그램과 고친 모습도 보여 줍니다.`,
      summary: '진단에 붙는 코드와 그 뜻, 고치는 법입니다.',
      h1: '오류 코드',
      intro: `컴파일러가 진단에 붙이는 코드를 모두 모았습니다. 커밋 ${facts.pinnedCommit}의 레지스트리 두 곳에서 읽어 왔다. \`"use typeshade"\` 프런트엔드의 코드가 ${facts.errorCodesTs}개, 그 아래 코어 IR 계층의 코드가 ${facts.errorCodesSd}개입니다.`,
      verified: (n: number) =>
        `${n}개 페이지에는 코드를 내는 프로그램과 그 프로그램을 고친 모습이 함께 실려 있습니다. 둘 다 빌드할 때 고정된 컴파일러로 컴파일하므로, 프로그램이 더는 그 코드를 내지 않거나 고친 프로그램에 진단이 남으면 빌드가 멈춥니다. 예제 태그가 붙은 행이 그런 페이지입니다.`,
      note: '레지스트리 설명과 컴파일러 메시지는 컴파일러 원문이라 한국어 페이지에서도 영어로 둡니다.',
      codes: (n: number) => `코드 ${n}개`,
      frontEndH: '프런트엔드 코드',
      frontEndP:
        '`TS80xx` 코드는 프런트엔드의 `TS_CODES`에 들어 있습니다. `"use typeshade"` 파일은 IR을 만들기 전에 이 코드들로 먼저 검사받습니다.',
      coreH: '코어 코드',
      coreP:
        '`SDxxxx` 코드는 `typeshade/dev`가 내보내는 `CODES` 카탈로그에 들어 있습니다. 코어 IR 계층은 [`fn()`](apiFn) 빌더에서도 `"use typeshade"` 파일에서도 이 코드를 냅니다. 다만 같은 실수 가운데 상당수는 프런트엔드가 자기 코드로 먼저 거부합니다.',
      numberingH: '번호 매기기',
      numberingP:
        '프런트엔드 레지스트리는 번호를 매기는 방식을 파일 머리 주석에 직접 적어 두었습니다.',
      exampleTag: '예제',
      groups: {
        file: '파일',
        types: '타입과 이름',
        functions: '함수와 클래스',
        controlFlow: '제어 흐름',
        entries: '진입점과 입출력',
        resources: '리소스와 메모리',
        f64: '에뮬레이션 배정밀도',
        targets: '대상',
        builder: '빌더 호출',
        lint: '린트 규칙',
        portable: '이식형 커널',
        retired: '폐기된 번호',
        other: '그 밖의 코드',
      },
      entry: {
        // 영어와 같은 이유로 45자에서 60자 사이에 드는 첫 후보를 씁니다.
        title: (head: string, summary: string) => {
          const candidates = [
            ...(summary ? [`${head}: ${summary}, TypeShade 오류 코드`, `${head}: ${summary}`] : []),
            `${head}: TypeShade 컴파일러가 진단에 붙이는 오류 코드와 그 뜻, 고치는 법`,
            `${head}: TypeShade 컴파일러가 진단에 붙이는 오류 코드 한 가지`,
            `${head}: TypeShade 컴파일러가 진단에 붙이는 오류 코드`,
            `${head}: TypeShade 컴파일러의 오류 코드`,
            `${head}: TypeShade 오류 코드`,
          ];
          return (
            candidates.find((t) => t.length >= 45 && t.length <= 60) ??
            candidates[candidates.length - 1]!
          );
        },
        description: (head: string, line: string) =>
          `${head}, TypeShade 컴파일러의 오류 코드입니다. ${line}`,
        fill: '이 페이지에는 레지스트리 원문과 컴파일러가 이 코드를 내는 곳, 고치는 법이 있습니다.',
        kindTs: '프런트엔드 코드',
        kindSd: '코어 코드',
        kindRetired: '폐기된 번호',
        kindMeta: '종류',
        undocumented:
          '레지스트리에는 이 상수에 대한 문서 주석이 없습니다. 그래서 위 설명은 컴파일러가 이 코드와 함께 내는 메시지를 보고 이 사이트가 쓴 것입니다.',
        whenH: '발생 조건',
        exampleH: '예제',
        fixH: '고치는 법',
        frontEndH: '프런트엔드에서',
        seeAlsoH: '함께 보기',
        sourceH: '소스',
        ruleH: () => '이 코드가 적용하는 규칙',
        compiled: '빌드할 때 고정된 컴파일러로 이 프로그램을 컴파일하면 다음 진단이 나옵니다.',
        backend:
          '빌드할 때 고정된 컴파일러로 이 프로그램을 컴파일하면 `TS8015` 진단이 나옵니다. 백엔드가 모듈을 거부했다고 프런트엔드가 알리는 진단입니다. 백엔드가 던진 오류에 이 코드가 들어 있습니다.',
        diagnose:
          '`compile()`은 린트 규칙을 돌리지 않습니다. `typeshade/dev`의 `diagnose()`가 `compile()`이 돌려준 모듈에 린트 규칙을 돌려 다음을 알립니다.',
        deprecations: '이 경고를 켜는 옵션인 `{ deprecations: true }`를 주고 컴파일했습니다.',
        consoleGpu:
          "WGSL이 console 호출을 기록하게 하는 옵션인 `{ console: 'gpu' }`를 주고 컴파일했습니다.",
        hint: '레지스트리의 힌트:',
        fixed: '같은 프로그램을 고친 모습입니다. 진단 없이 컴파일됩니다.',
        fixedDiagnose:
          '같은 프로그램을 고친 모습입니다. 진단 없이 컴파일되고, `diagnose()`도 더는 이 코드를 알리지 않습니다.',
        otherFiles:
          '같은 프로그램의 다른 파일에서 가져오며, `compile()`은 그 파일을 `readDocument` 옵션으로 읽습니다.',
        lineAt: (line: number) => `${line}행`,
        retired:
          '폐기된 번호입니다. 이 코드를 단 진단은 없고, 레지스트리는 이 번호를 다른 규칙에 다시 주지 않습니다.',
        frontEnd:
          '같은 실수를 한 `"use typeshade"` 파일은 이 검사까지 오지 않습니다. 프런트엔드가 자기 코드로 먼저 거부하기 때문입니다. 빌드할 때 컴파일한 아래 프로그램에는 다음 진단이 나옵니다.',
        builder:
          '이 사이트의 `"use typeshade"` 프로그램 가운데 이 코드를 내는 것이 없어서 이 페이지에는 예제가 없습니다. [`fn()`](apiFn) 빌더는 IR을 직접 만들기 때문에 소스 절에 적힌 줄의 검사에 닿습니다.',
        internal:
          '레지스트리는 이 코드를 내부 불변식이라고 부릅니다. 이 코드는 컴파일러 자체의 오류를 나타내며, 어떤 프로그램도 이 코드를 내도록 되어 있지 않습니다.',
        unwritten: '이 커밋에는 아직 이 코드의 예제가 없습니다.',
        sourceP: (commit: string) =>
          `커밋 ${commit}에서 컴파일러가 이 코드를 내는 곳입니다. 파일마다 한 줄씩 적었습니다.`,
        sites: (n: number) => `${n}곳`,
        noSites: '컴파일러 소스는 레지스트리 밖 어디에서도 이 코드를 쓰지 않습니다.',
        index: '오류 코드',
        builderPage: '`fn()` 빌더',
      },
      lines: {
        MISSING_DIRECTIVE:
          'TypeShade로 컴파일하는 파일에 `"use typeshade"` 지시문이 아예 없습니다.',
        TYPE_MISMATCH:
          '연산자나 조건, 선언, 반환, 인자처럼 두 값이 만나는 자리에서 타입이 서로 맞지 않거나, 컴파일러가 접는 상수를 WGSL이 거부합니다. 31을 넘는 시프트 양, 0인 제수, 서로 엇갈린 clamp 경계, 범위를 넘는 f32 값, `pow(-2., 2.)`처럼 정의역 밖에서 부르는 내장 함수가 그렇습니다.',
        UNKNOWN_FN: '파일이 선언하지도 가져오지도 않은 함수를 부릅니다.',
        CONST_ASSIGN: '`const`나 읽기 전용 리소스처럼 바뀔 수 없는 이름에 값을 대입합니다.',
        LOOP_BOUND:
          '컴파일러가 종료를 증명할 수 없는 `for` 루프입니다. 카운터를 경계와 비교하지 않거나, 본문이 경계를 씁니다.',
        LOOP_INFINITE:
          '끝나지 않는 것이 확실한 루프입니다. `break`나 `return`이 없는데 조건이 `true`인 `while`, 또는 카운터를 경계에서 멀어지게 하는 증가입니다. 조건은 그대로 썼든 상수만으로 계산했든 같습니다.',
        LOOP_INDUCTION:
          '`for` 루프의 카운터가 `i32`나 `u32` 타입의 `let` 하나가 아니거나, 갱신이 상수만큼 움직이지 않습니다.',
        BREAK_OUTSIDE: '감싸는 루프나 `switch`가 없는 곳에 `break`를 썼습니다.',
        TOP_LEVEL:
          '파일 최상위에 컴파일러가 선언으로 받을 수 없는 것이 있습니다. 선언이 아닌 문이거나, 거부하는 형태의 모듈 수준 선언입니다.',
        BACKEND:
          '프런트엔드가 받아들인 모듈을 백엔드가 출력하지 못하고 거부했습니다. 메시지는 백엔드가 쓴 그대로입니다.',
        INDEX_OOB: '상수 인덱스가 대상의 길이를 벗어납니다.',
      },
    },
    rules: {
      title:
        'TypeShade 설계 규칙: 셰이더 언어가 따르는 규칙과 그 근거, 검증 방식을 장별로 모은 목록',
      description: `TypeShade 언어를 설계한 규칙 ${facts.rules}개입니다. 규칙마다 근거와 출처, 검증 방식, 그 규칙을 적용하는 오류 코드를 함께 싣습니다.`,
      summary:
        '언어가 담을 수 있는 것과 언어가 바뀌는 방식을 정한 규칙을 한 페이지에 하나씩 싣습니다.',
      h1: '설계 규칙',
      intro: `컴파일러 설계 문서 \`docs/language-design.md\`의 규칙을 모두 모았다. 커밋 ${facts.pinnedCommit}의 추적 트리에서 읽어 왔다. 규칙은 \`"use typeshade"\` 파일을 쓰는 사람이나 컴파일러 자신을 제약한다. 규칙 하나에는 요구 사항 하나와 그 이유, 출처, 컴파일러가 규칙을 적용하는 곳이 들어 있다.`,
      verifiedP: '추적 트리에 기록된 규칙별 검증 방식입니다.',
      note: '규칙 본문과 그 아래 항목은 설계 문서에 적힌 컴파일러 원문이라 한국어 페이지에서도 영어로 둡니다.',
      rulesCount: (n: number) => `규칙 ${n}개`,
      kinds: {
        test: '테스트',
        code: '구현만',
        pending: '적용 전',
        review: '리뷰',
      },
      kindCounts: {
        test: `규칙 ${facts.rulesTest}개: 테스트나 게이트 스크립트, CI 워크플로가 규칙을 가리킵니다.`,
        code: `규칙 ${facts.rulesCode}개: 구현만 규칙을 따르고, 아직 확인하는 테스트는 없습니다.`,
        pending: `규칙 ${facts.rulesPending}개: 설계 문서 부록 B에 아직 적용하지 않은 규칙으로 올라 있습니다.`,
        review: `규칙 ${facts.rulesReview}개: 리뷰로 지키며, 확인하는 파일은 없습니다.`,
      },
      chapters: {
        1: '소개',
        2: '표면 이름의 출처',
        3: '텍스트 구조와 이름',
        4: '타입',
        5: '리터럴과 타입 결정',
        6: '선언과 리소스',
        7: '표현식과 문',
        8: '함수와 진입점',
        9: '내장 함수와 TypeShade 확장',
        10: '확장과 기능',
        11: '대상과 오라클',
        12: '진단',
        13: '변경 관리',
      } as Record<number, string>,
      chapterH: (n: number, title: string) => `${n}. ${title}`,
      guaranteesP:
        '[보장하는 것](rulesGuarantees) 페이지는 검증 방식마다 규칙을 모으고, 규칙마다 그 규칙을 확인하는 파일을 함께 싣습니다.',
      flags: {
        pending: '컴파일러가 아직 적용하지 않음',
        code: '아직 확인하는 테스트 없음',
      },
      changes: {
        h: '이전 고정 커밋 이후 바뀐 규칙',
        first: (current: string) =>
          `이 사이트에는 ${current} 앞에 고정한 커밋의 기록이 없어서 규칙을 비교할 대상이 없습니다.`,
        predates: (previous: string, date: string, current: string) =>
          `이전 고정 커밋 ${previous}(${date})에는 컴파일러의 추적 트리가 없습니다. 추적 트리는 이번 고정 커밋 ${current}에 처음 들어왔습니다. 그래서 아직은 규칙을 비교할 대상이 없고, 다음 고정 커밋부터 이 절에 그사이 추가되거나 없어지거나 바뀐 규칙이 올라옵니다.`,
        none: (previous: string, current: string) =>
          `이전 고정 커밋 ${previous}와 이번 고정 커밋 ${current} 사이에 추가되거나 없어지거나 바뀐 규칙은 없습니다.`,
        lead: (previous: string, date: string, current: string) =>
          `컴파일러의 추적 트리가 기록한 이전 고정 커밋 ${previous}(${date})와 이번 고정 커밋 ${current} 사이의 변화입니다. 규칙의 지문(fingerprint)이 달라지면 바뀐 규칙으로 봅니다. 규칙 본문이나 규칙을 확인하는 파일이 바뀌면 지문이 달라집니다.`,
        counts: `추가 ${facts.rulesAdded}개, 삭제 ${facts.rulesRemoved}개, 변경 ${facts.rulesChanged}개입니다.`,
        addedH: '추가',
        removedH: '삭제',
        changedH: '변경',
        was: (kind: string) => `이전 검증 방식은 ${kind}`,
        commits: '컴파일러 커밋',
        removedItem: '이전 고정 커밋의 항목',
      },
      guarantees: {
        title: 'TypeShade가 보장하는 것: 설계 규칙을 검증 방식과 확인 파일별로 모은 목록',
        description: `TypeShade 설계 규칙 ${facts.rules}개를 무엇이 지키는지 모았습니다. 테스트로 확인하는 규칙 ${facts.rulesTest}개, 구현만 따르는 규칙 ${facts.rulesCode}개, 아직 적용하지 않은 규칙 ${facts.rulesPending}개, 리뷰로 지키는 규칙 ${facts.rulesReview}개와 그 확인 파일입니다.`,
        h1: '보장하는 것',
        lead: `컴파일러의 추적 트리는 커밋 ${facts.pinnedCommit}에서 설계 규칙마다 무엇이 그 규칙을 지키는지 기록합니다. 테스트가 확인하는 규칙이 있고, 규칙을 실행하는 코드만 규칙을 가리키는 경우가 있습니다. 아직 아무것도 확인하지 않는 규칙도 있고, 리뷰로 지키는 규칙도 있습니다. 아래에서는 규칙 ${facts.rules}개를 이 네 갈래로 나누고, 규칙마다 첫 문장과 고정된 커밋에서 규칙을 확인하는 파일을 보여 줍니다.`,
        heads: {
          test: '테스트로 확인하는 규칙',
          code: '구현만 따르고 테스트는 없는 규칙',
          pending: '아직 적용하지 않은 규칙',
          review: '리뷰로 지키는 규칙',
        },
        groups: {
          test: `규칙 ${facts.rulesTest}개입니다. 테스트나 게이트 스크립트, CI 워크플로가 규칙을 하나씩 가리킵니다. 목록에 오른 파일이 규칙을 더는 가리키지 않으면 컴파일러의 추적 검사가 실패합니다.`,
          code: `규칙 ${facts.rulesCode}개이다. 구현이 \`Implements:\` 태그로 규칙을 가리키지만, 아직 확인하는 테스트는 없다. 테스트로 메워야 할 빈틈이다. 가이드 페이지가 이 규칙을 언급하면 그 옆에 이 사실을 표시한다.`,
          pending: `규칙 ${facts.rulesPending}개입니다. 설계 문서 부록 B에 아직 적용하지 않은 규칙으로 올라 있고, 확인하는 파일은 없습니다. 가이드 페이지가 이 규칙을 언급하면 그 옆에 이 사실을 표시합니다.`,
          review: `규칙 ${facts.rulesReview}개입니다. 규칙마다 리뷰가 지킨다고 적혀 있고, 확인하는 파일은 없습니다.`,
        },
        none: '고정된 커밋에서 이렇게 지키는 규칙은 없습니다.',
        filesLabel: {
          test: '확인하는 파일',
          code: '구현한 파일',
        },
      },
      entry: {
        // 영어와 같은 이유로 45자에서 60자 사이에 드는 첫 후보를 씁니다.
        title: (rule: string, chapter: string) => {
          const candidates = [
            `규칙 ${rule}: ${chapter}, TypeShade 셰이더 언어 설계 규칙과 그 근거, 출처, 검증 방식`,
            `규칙 ${rule}: ${chapter}, TypeShade 셰이더 언어 설계 규칙과 그 근거, 검증 방식`,
            `규칙 ${rule}: ${chapter}, TypeShade 셰이더 언어 설계 규칙과 그 근거`,
            `규칙 ${rule}: TypeShade 셰이더 언어 설계 규칙과 그 근거, 출처, 검증 방식`,
          ];
          return (
            candidates.find((t) => t.length >= 45 && t.length <= 60) ??
            candidates[candidates.length - 1]!
          );
        },
        heading: (rule: string) => `규칙 ${rule}`,
        description: (rule: string, chapter: string, line: string) =>
          `TypeShade 언어 설계 규칙 ${rule}(${chapter})입니다. ${line}`,
        fill: '이 페이지에는 근거와 출처, 규칙을 지키는 파일과 오류 코드가 있습니다.',
        kindLine: (n: number, title: string) => `${n}장, ${title}`,
        kindMeta: '검증 방식',
        rationaleH: '근거',
        derivesH: '출처',
        verifiedH: '검증 방식',
        explainedH: '설명하는 절',
        codesH: '적용하는 오류 코드',
        seeAlsoH: '함께 보기',
        sourceH: '소스',
        how: {
          test: '테스트로 확인합니다. 테스트나 게이트 스크립트, CI 워크플로가 이 규칙을 가리키고, 아래 파일 가운데 하나라도 규칙을 더는 가리키지 않으면 추적 검사가 실패합니다.',
          code: '구현만 이 규칙을 따르고, 아직 확인하는 테스트는 없습니다. 아래 파일이 `Implements:` 태그로 규칙을 가리킵니다.',
          pending:
            '아직 적용하지 않은 규칙입니다. 설계 문서 부록 B에 올라 있고, 확인하는 파일은 없습니다.',
          review:
            '리뷰로 지킵니다. 확인하는 파일은 없고, 규칙 스스로 리뷰가 지킨다고 적어 두었습니다.',
        },
        enforcedP: '컴파일러가 이 규칙을 적용하는 곳을 규칙이 직접 적은 내용입니다.',
        filesP: (commit: string) =>
          `커밋 ${commit}에서 이 규칙을 확인하는 파일입니다. 파일마다 규칙을 처음 가리키는 줄로 연결했습니다.`,
        evidence: '컴파일러의 자체 테스트가 확인',
        explainedP: (commit: string) =>
          `커밋 ${commit}의 언어 문서에서 이 규칙을 설명하는 절입니다.`,
        section: (n: number, title: string) => `§${n} ${title}`,
        codesP:
          '규칙이 Enforced by 항목에서 가리키는 진단 코드와, 레지스트리 설명에서 이 규칙을 가리키는 진단 코드입니다.',
        sourceP: (commit: string) => `커밋 ${commit}의 규칙 원문:`,
        designDoc: '설계 문서',
        item: '추적 항목',
      },
    },
  },
  playground: {
    title: 'TypeShade Playground, 브라우저에서 셰이더 컴파일',
    description: `브라우저에서 "use typeshade" 파일을 작성해 WGSL과 ${glsl}으로 컴파일합니다. WebGPU나 WebGL2에서 실행하고 진단과 리플렉션도 확인할 수 있습니다.`,
    h1: 'Playground',
    intro:
      'TypeShade TypeScript 파일을 작성하고 브라우저에서 컴파일한 뒤, 나온 WGSL과 진단을 확인하십시오.',
    help: 'Monaco 편집기에서 TypeShade를 작성하고 여기서 컴파일합니다.',
    run: '컴파일',
    reset: '예제 복원',
    editor: 'TypeShade 소스',
    output: '컴파일러 출력',
    wgslTab: 'WGSL',
    resultTab: '결과',
    glslVertexTab: 'GLSL 버텍스',
    glslFragmentTab: 'GLSL 프래그먼트',
    noGlsl: '이 모듈은 GLSL을 내지 않습니다.',
    diagnostics: '진단',
    idle: '컴파일 대기 중',
    ready: '컴파일 성공',
    errors: '컴파일 오류',
    loading: '편집기를 불러옵니다',
    clean: '진단 없음.',
    noOutput: 'WGSL 출력이 없습니다.',
    directive: '파일 맨 위에 "use typeshade" 지시어를 쓰면 컴파일합니다.',
    unavailable: '편집기를 불러오지 못했습니다. 연결을 확인하고 페이지를 새로 고치십시오.',
    starting: '언어 서비스를 시작합니다',
    serviceFailed: '언어 서비스가 멈췄습니다. 페이지를 새로 고치십시오.',
    sourceTypescript: 'TypeScript',
    sourceTypeshade: 'TypeShade',
    reflection: '리플렉션',
    entryPoints: '진입점',
    resources: '리소스',
    inputs: '입력',
    outputs: '출력',
    returns: '반환값',
    runCpu: 'CPU에서 실행',
    running: '실행 중',
    cpuIdle: '진입점을 실행하면 반환하는 값이 나옵니다.',
    noResources: '이 모듈은 바인딩하는 리소스가 없습니다.',
    noEntryPoints: '이 모듈에는 진입점이 없습니다.',
    requiredFeatures: '필요한 기능',
    args: '인자',
    argsInvalid: '그 인자는 숫자나 숫자 목록이 아닙니다.',
    cpuNoResources:
      'CPU 오라클은 진입점 인자만 받습니다. 유니폼이나 스토리지 바인딩을 읽는 진입점은 아직 여기서 실행할 수 없습니다.',
    canvas: 'CPU 캔버스',
    engine: '그리는 방식',
    engineGpu: 'GPU',
    engineCpu: 'CPU 오라클',
    gpuIdle: '버텍스 진입점과 프래그먼트 진입점이 있는 모듈을 컴파일하면 그려집니다.',
    wait: {
      loading: '프로그램을 불러오는 중…',
      compiling: '컴파일하는 중…',
      drawing: '첫 프레임을 그리는 중…',
    },
    gpuWebgpu: 'WebGPU에서 실행 중입니다.',
    gpuWebgl2: 'WebGL2에서 실행 중입니다.',
    gpuNone:
      '이 브라우저에는 WebGPU도 WebGL2도 없어서 아무것도 그리지 못했습니다. CPU 오라클은 그대로 돕니다.',
    gpuNoWebgpu:
      'WebGPU를 골랐지만 이 브라우저에는 WebGPU 장치가 없어서 아무것도 그리지 못했습니다. GPU를 고르면 WebGL2로 넘어갑니다.',
    gpuNoWebgl2:
      'WebGL2를 골랐지만 이 브라우저에는 WebGL2 컨텍스트가 없어서 아무것도 그리지 못했습니다.',
    gpuNoGlsl:
      '이 모듈은 GLSL ES 3.00 형태가 없어서 WebGL2로 실행할 것이 없습니다. WebGPU는 이 모듈의 WGSL을 실행합니다.',
    gpuNoGlslFeatures:
      'GLSL ES 3.00에는 이 모듈에 필요한 {features}이(가) 없어서 WebGL2로 실행할 것이 없습니다. WebGPU는 이 모듈의 WGSL을 실행합니다.',
    gpuNoFeature:
      '이 GPU는 이 모듈에 필요한 WebGPU 기능 {features}을(를) 제공하지 않아 아무것도 그리지 못했습니다.',
    gpuFailed: '{backend}에서 이 프로그램을 실행하지 못했습니다: {reason}',
    gpuNeedsStages:
      '그리려면 버텍스 진입점과 프래그먼트 진입점이 함께 있어야 합니다. 이 모듈에는 그 짝이 없습니다.',
    gpuNeedsAttributes:
      '캔버스는 꼭짓점 세 개를 그리고 버텍스 버퍼는 바인딩하지 않습니다. 이 모듈은 {fields}을(를) 버퍼에서 읽으므로 여기서는 GPU로 실행할 수 없습니다.',
    gpuNeedsBindings:
      '바인딩 패널에 {names}에 넣을 값이 없어서 이 모듈은 여기서 실행할 수 없습니다.',
    computeNeedsWebgpu:
      '이 Playground는 컴퓨트를 WebGPU나 CPU 오라클에서 실행합니다. TypeShade 프로그램 런타임은 WebGL2 컴퓨트 변환도 지원합니다.',
    computeRan:
      '{entry}을(를) {backend}에서 호출 {invocations}회로 실행했고 {ms} ms 걸렸습니다. 캔버스는 이 진입점이 쓴 값을 그래프로 보여 줍니다.',
    consoleTab: '콘솔',
    consoleIdle:
      '셰이더에서 `console.log`를 부르면 그 줄이 여기에 나옵니다. 컴퓨트 모듈은 모든 인보케이션의 줄을 보여 줍니다. 그리는 모듈은 캔버스의 픽셀을 클릭하거나, WebGPU에서 프레임 전체를 기록하면 됩니다.',
    consoleLines:
      '{backend}에서 받은 줄 {lines}개입니다. CPU가 인보케이션을 실행하는 순서로 보여 줍니다.',
    consoleNone: '{backend}에서 실행한 결과 기록된 줄이 없습니다.',
    consoleDropped: '버퍼에 들어가지 못한 줄이 {dropped}개 더 있습니다.',
    consoleMore: '보여 주지 않은 줄이 {more}개 더 있습니다.',
    consoleIndex: '(인덱스)',
    consoleValue: '값',
    consolePixelHint:
      '이 모듈은 화면을 그리며, 프래그먼트 진입점이 픽셀마다 한 번씩 실행됩니다. 캔버스의 픽셀을 클릭하면 그 픽셀이 기록한 줄을 볼 수 있습니다. WebGPU에서는 프레임 기록 버튼으로, CPU 오라클에서는 그리기가 끝난 뒤 모든 픽셀의 줄을 볼 수 있습니다.',
    consolePixel:
      '픽셀 ({x}, {y})이(가) 기록한 줄입니다. 캔버스가 주는 입력으로 CPU 오라클에서 실행한 결과입니다.',
    consolePixelGl:
      '픽셀 ({x}, {y})이(가) 기록한 줄입니다. WebGL2는 콘솔 호출을 기록하지 않으므로, 캔버스가 주는 입력으로 CPU 오라클에서 실행했습니다.',
    consolePixelGpu:
      '픽셀 ({x}, {y})이(가) WebGPU에서 기록한 줄입니다. 캔버스의 프레임을 이 픽셀 하나에 대해서만 다시 그리면서 콘솔 호출을 기록했습니다.',
    consolePixelGpuNone: '픽셀 ({x}, {y})은(는) WebGPU가 기록하는 콘솔 호출에 도달하지 않았습니다.',
    consolePixelGpuFailed:
      'WebGPU가 픽셀 ({x}, {y})을(를) 기록하지 못해 CPU 오라클에서 실행했습니다. WebGPU가 알려 준 이유: {reason}',
    consolePixelNone: '픽셀 ({x}, {y})은(는) 콘솔 호출에 도달하지 않았습니다.',
    consolePixelOutside:
      '픽셀 ({x}, {y})은(는) 버텍스 진입점이 그리는 삼각형 밖이라 프래그먼트가 실행되지 않습니다.',
    consolePixelFailed: '픽셀 ({x}, {y})을(를) CPU 오라클에서 실행하지 못했습니다: {reason}',
    consolePixelNoRaster:
      'CPU 오라클이 이 모듈의 삼각형을 배치하지 못합니다. 버텍스 진입점에 `vertex_index`나 생성된 정점 입력, 그리고 `position` 출력이 있어야 합니다.',
    consoleNotRecorded:
      '{line}번째 줄의 호출은 WebGPU에 기록되지 않습니다: {reason}. 이 픽셀에 대해 CPU 오라클에서 실행한 결과입니다.',
    consoleNotRecordedFrame:
      '{line}번째 줄의 호출은 WebGPU에 기록되지 않습니다: {reason}. 픽셀을 클릭하면 CPU 오라클에서 실행합니다.',
    consoleVertex: '버텍스 진입점이 배치하는 꼭짓점 세 개에 대해 CPU 오라클에서 실행한 결과입니다.',
    consoleVertexGpu:
      '버텍스 단계는 스토리지 버퍼에 쓸 수 없으므로, 버텍스 진입점에서 실행되는 콘솔 호출은 WebGPU에 기록되지 않습니다. 버텍스 진입점이 배치하는 꼭짓점 세 개에 대해 CPU 오라클에서 실행한 결과입니다.',
    consoleVertexAt: '버텍스 {index}',
    consoleRecordFrame: '프레임 기록',
    consoleRecording: 'WebGPU에서 콘솔 호출을 기록하며 프레임을 다시 그리는 중입니다.',
    consoleFrameGpu:
      'WebGPU에서 {width} × {height}로 그린 프레임 전체의 콘솔 줄: {lines}개. 행 순서로 보여 줍니다.',
    consoleFrameDropped:
      '프레임이 버퍼에 담을 수 있는 것보다 {dropped}번 더 호출했고, 그 호출은 버려졌습니다. GPU는 먼저 실행한 호출을 남기며, 그것이 위쪽 행이라는 보장은 없습니다.',
    consoleFrameFailed: 'WebGPU가 프레임을 기록하지 못했습니다: {reason}',
    consoleFrameCpu:
      'CPU 오라클에서 {width} × {height}로 그린 프레임 전체의 콘솔 줄: {lines}개. 행 순서로 보여 줍니다.',
    consoleFrameKept:
      '프레임이 {more}번 더 호출했지만, 페이지가 담아 두는 한도를 넘어 남기지 않았습니다.',
    pixelNote: '픽셀 ({x}, {y})의 콘솔 줄: {lines}개',
    pixelNoteRecording: 'WebGPU에서 픽셀 ({x}, {y})을(를) 기록하는 중입니다.',
    bindings: {
      title: '바인딩',
      empty: '이 모듈은 바인딩하는 것이 없습니다.',
      runtime: '페이지가 프레임마다 채움',
      overrides: '오버라이드',
      source: '소스',
      sources: {
        checker: 'UV 체커',
        gradient: '그러데이션',
        noise: '노이즈',
        solid: '단색',
        faces: '큐브 면',
        image: '내 이미지',
      },
      dropImage: '이미지 파일',
      passOutput: '{name} 패스의 출력',
      depthRamp: '왼쪽 위의 0에서 오른쪽 아래의 1로 이어지는 깊이 램프입니다.',
      filter: '필터',
      address: '주소 모드',
      compare: '비교',
      preset: '프리셋',
      presets: { identity: '단위 행렬', camera: '원점을 보는 카메라', turn: 'Y축 회전' },
      fill: '채우기',
      elements: '요소 수',
      written: '디스패치 후',
      size: '크기',
      noControl: '컨트롤이 없는 바인딩:',
      hostOwned:
        '호스트가 소유한 바인딩입니다. 여기서는 페이지가 대신 값을 넣으며, 이 값은 바꿀 수 있습니다.',
      vertices:
        '버텍스 진입점은 이 입력을 버퍼에서 읽습니다. 페이지는 삼각형의 세 꼭짓점을 넘기고, 입력마다 이름에 맞는 값을 채웁니다.',
    },
    draw: 'CPU로 그리기',
    stop: '중지',
    canvasIdle: '프래그먼트 진입점을 픽셀마다 한 번씩, GPU 없이 실행합니다.',
    resolution: '해상도',
    canvasTooBig:
      '이 브라우저는 이만큼 큰 캔버스를 할당하지 못해 이 해상도로는 그릴 수 없습니다. 더 작은 값을 고르세요.',
    canvasProgress: '타일 {done}/{total}, 실행 {running}, 대기 {waiting}',
    canvasDrawn: '{px}픽셀, {ms} ms, 워커 {workers}개',
    canvasNeedsVertex:
      '그리려면 vertex_index로 도는 버텍스 진입점과 프래그먼트 진입점이 함께 있어야 합니다. 이 모듈에는 그 짝이 없어 덮을 삼각형이 없습니다.',
    canvasFlat: '버텍스 진입점이 돌려준 세 꼭짓점 사이에 넓이가 없어서 덮을 삼각형이 없습니다.',
    canvasFlatInputs:
      '캔버스는 버텍스 진입점을 인덱스 0, 1, 2로 실행하며 {fields}에 넣을 값이 없어 0으로 두었습니다. 그렇게 받은 세 꼭짓점 사이에는 넓이가 없습니다.',
    cpuFailed: 'CPU 오라클이 이 진입점을 실행하지 못했습니다.',
    entryCount: (n: number) => `진입점 ${n}개`,
    exampleLabel: '예제',
    importsNote:
      '이 예제는 {files}를 가져옵니다. 컴파일러는 이 파일과 이 파일이 가져오는 파일을 한 프로그램으로 읽으며, 파일마다 편집기 위에 탭이 하나씩 있습니다.',
    copy: '복사',
    copied: '복사됨',
    share: '링크 복사',
    shared: '링크 복사됨',
    submit: {
      button: '제출',
      title: '갤러리에 제출',
      intro: '입력한 제목으로 파일을 갤러리에 보냅니다. 관리자가 검토한 뒤에 공개됩니다.',
      titleLabel: '제목',
      authorLabel: '이름 (선택)',
      send: '제출',
      cancel: '취소',
      close: '닫기',
      sending: '보내는 중…',
      sent: '보냈습니다. 승인되면 갤러리에 나타납니다.',
      already: '이미 제출한 파일입니다.',
      limit: '이 주소에서 오늘 보낼 수 있는 만큼 보냈습니다. 내일 다시 시도해 주십시오.',
      failed: '보내지 못했습니다. 잠시 뒤에 다시 시도해 주십시오.',
    },
    galleryLink: '갤러리',
    preludeNote:
      '이 파일에는 `@vertex` 진입점이 없어서, 화면 전체를 덮는 삼각형 뒤에 놓고 컴파일합니다. 그 삼각형이 프래그먼트 단계에 0에서 1까지 도는 `uv`를 넘깁니다. 탭과 캔버스에는 그렇게 만든 프로그램이 나옵니다.',
    emit: {
      title: '생성 옵션',
      optimization: 'WGSL 최적화',
      levels: { O0: 'O0 (패스 없음)', O1: 'O1 (값 보존)', O2: 'O2 (기본)' },
      parens: '괄호',
      minify: '최소화',
      numbers: '숫자 리터럴',
      obfuscate: '난독화',
      fp64: 'f64 에뮬레이션',
      precision: `${glsl} float 정밀도`,
      levelNote:
        'O0과 O1에서는 컴파일러가 레벨만 받아 WGSL을 생성하므로, 괄호와 최소화, 숫자 리터럴, 난독화, f64 에뮬레이션은 GLSL 탭에만 적용됩니다. f64 에뮬레이션은 `reflect()`가 따로 받으므로 모든 레벨에서 리플렉션에 반영됩니다.',
    },
    workspace: {
      galleryTitle: '예제에서 시작하기',
      galleryIntro:
        '타일 하나가 컴파일러 저장소의 .shade.ts 파일 하나입니다. 예제를 열어 고치고 옆에 파일을 더할 수 있으며, 텍스처에는 직접 고른 이미지를 연결할 수 있습니다.',
      openGallery: '모든 예제',
      blankTitle: '빈 파일',
      blankNote: '`time`, `resolution`, `mouse`를 읽는 프래그먼트 셰이더입니다.',
      noStill: '미리보기 없음',
      stillKinds: {
        'no-glsl': 'WGSL 전용',
        control: '호스트 컨트롤',
        texture: '텍스처 필요',
        uniform: '호스트 데이터',
        'vertex-buffer': '버텍스 버퍼',
      },
      files: '파일',
      newFile: '새 파일',
      download: '폴더로 내려받기',
      openInVsCode: 'VS Code에서 열기',
      openInVsCodeTitle: 'VS Code에서 열기 (TypeShade 확장이 필요합니다)',
      openInVsCodeHint:
        'VS Code가 열리지 않았다면 TypeShade 확장이 없는 것일 수 있습니다. [설치 방법](editor)을 확인하십시오.',
      newFileName: '파일 이름',
      badName:
        '파일 이름은 .shade.ts로 끝나야 하고 영문자, 숫자, 점, 하이픈, 밑줄, 슬래시만 쓸 수 있습니다.',
      takenName: '같은 이름의 파일이 이미 있습니다.',
      renameHint: '두 번 클릭하거나 F2를 눌러 이름 바꾸기',
      renameLabel: '{file}의 새 이름',
      emptyName: '파일 이름을 입력하십시오.',
      mainNameSlash: '메인 파일은 작업 영역 맨 위에 있으므로 이름에 슬래시를 쓸 수 없습니다.',
      importsRenamed:
        '{old}의 이름을 {new}(으)로 바꿨습니다. {files}에서 이 파일을 가져오는 import도 새 이름으로 고쳤습니다.',
      deleteFile: '{file} 삭제',
      confirmDelete: '{file} 파일을 삭제할까요? 이 파일을 가져오는 파일은 컴파일되지 않습니다.',
      play: '재생',
      pause: '일시정지',
      restart: '처음부터',
      fullscreen: '전체 화면',
      exitFullscreen: '전체 화면 끝내기',
      clock: '셰이더 시계',
      dropHint: '캔버스에 이미지를 끌어다 놓으면 `{texture}`에 연결됩니다.',
      pass: '패스',
      passTitle:
        '{file} 파일을 메인 파일보다 먼저 그리는 패스로 쓰고, 그 이름의 텍스처에 결과를 담습니다',
      passFailed:
        '{name} 패스가 컴파일되지 않아 프레임을 그리지 않았습니다. 이유는 그 탭에 나옵니다.',
      passTexture:
        '{name} 패스가 패스의 출력이 아닌 텍스처 {texture}를 읽습니다. 패스는 다른 패스의 출력을 그 이름으로 읽습니다.',
      passesRgba8:
        '이 브라우저는 WebGL2에서 float 텍스처에 그릴 수 없어서, 각 패스가 채널당 8비트만 담고 0에서 1을 벗어나는 값은 잘립니다.',
      runHost: 'host.ts 실행',
      stopHost: 'host.ts 중지',
      runHostTitle: '캔버스 위 샌드박스 프레임에서 host.ts를 실행',
      hostFrame: 'host.ts가 그리는 캔버스',
      hostNote:
        'host.ts가 캔버스 위 샌드박스 프레임에서 실행 중입니다. 콘솔 출력은 콘솔 탭에 있습니다.',
      hostConsole:
        'host.ts가 출력한 줄입니다. 새 줄이 아래에 붙습니다. 멈출 때까지 캔버스 위 샌드박스 프레임에서 실행됩니다.',
      hostNone: 'host.ts가 animate도 run도 내보내지 않아서 최상위 코드만 실행했습니다.',
      hostUnloaded: '프레임이 런타임을 불러오지 못해 host.ts를 실행하지 못했습니다.',
      hostStopped: 'host.ts를 멈추고 프레임을 닫았습니다.',
      hostTile: '모듈과 host.ts',
    },
  },

  footer: {
    docs: 'Docs',
    project: '프로젝트',
    languages: '언어',
    readme: 'README',
    releases: '릴리스',
    npm: 'npm 패키지',
    newIssue: '문제 보고',
    radiance: 'Radiance',
    typenn: 'TypeNN',
    license: `[${{ MIT: 'MIT 라이선스', 'Apache-2.0': 'Apache 라이선스 2.0' }[facts.license] ?? facts.licenseName}](license)에 따라 배포합니다.`,
    copyright: `Copyright © ${facts.year} ${facts.author}`,
    builtFrom: '빌드한 커밋',
  },

  canvas: {
    aria: (title: string) => ({
      webgpu: `TypeScript로 쓰고 TypeShade가 WGSL로 컴파일한 ${title} 셰이더. WebGPU에서 실행 중.`,
      webgl2: `TypeScript로 쓰고 TypeShade가 ${glsl}으로 컴파일한 ${title} 셰이더. WebGL2에서 실행 중.`,
      'still-webgpu': `TypeScript로 쓰고 TypeShade가 WGSL로 컴파일한 ${title} 셰이더. WebGPU에서 한 프레임을 그림.`,
      'still-webgl2': `TypeScript로 쓰고 TypeShade가 ${glsl}으로 컴파일한 ${title} 셰이더. WebGL2에서 한 프레임을 그림.`,
      none: `TypeScript로 쓰고 TypeShade가 컴파일한 ${title} 셰이더. 빌드할 때 렌더링함.`,
    }),
  },

  live: {
    editCode: '코드 수정',
    source: '전체 셰이더 코드',
    file: 'live.shade.ts',
    edit: '수정',
    reset: '초기화',
    playground: 'Playground에서 열기',
    editorAria: '수정할 수 있는 셰이더 소스',
    loading: '컴파일러를 불러오는 중',
    keptFrame: '마지막으로 컴파일된 프레임을 캔버스가 그대로 두고 있습니다.',
    noFrame: '캔버스가 이 프로그램을 실행하지 못해 직전에 실행되던 프레임을 그대로 두고 있습니다.',
    reserved: (fields: string) => `페이지가 매 프레임 채우는 값이라 컨트롤이 없습니다: ${fields}.`,
    mouseUnits: '`mouse`는 캔버스 왼쪽 아래를 원점으로 0에서 1까지 가며, `uv`와 같은 공간입니다.',
    backend: {
      webgpu: 'WebGPU에서 실행 중.',
      webgl2: `출력된 ${glsl}로 WebGL2에서 실행 중.`,
      none: `이 브라우저에는 WebGPU도 WebGL2도 없어서 위 프레임은 빌드할 때 그렸습니다.`,
    },
    exercisesP: '컨트롤과 코드에 따른 변화',
    output: '출력 결과',
    outputNote:
      '컴파일러가 본 모듈 전체입니다. 버텍스 진입점과 그것이 돌려주는 `VsOut` 구조체는 페이지가 붙였고, 나머지는 위 파일입니다.',
    wgsl: 'WGSL',
    glslVertex: `${glsl} 버텍스`,
    glslFragment: `${glsl} 프래그먼트`,
    uniforms: '유니폼 블록',
    field: '필드',
    type: '타입',
    offset: '오프셋',
    lineAt: '{line}행',
    component: ['x', 'y', 'z', 'w'],
  },

  code: { copy: '클립보드로 복사', copied: '복사됨' },
  install: {
    label: 'npm 설치 명령',
    source:
      'Git 의존성은 TypeScript 소스를 포함합니다. Node.js에서 컴파일러와 CLI를 실행할 때는 tsx를 사용합니다.',
  },
  diagnostic: {
    frameLabel: '필드 이름을 잘못 쓴 셰이더, typed-error.shade.ts',
    error: (code: string, line: number, column: number) => `오류 ${code}, ${line}행 ${column}열:`,
    truncated: '(긴 메시지의 첫 줄)',
  },
  layout: {
    region: `reflect()가 복원한 ${std} 레이아웃`,
    caption: (size: number) => `reflect(), ${std}, ${size}바이트`,
    field: '필드',
    type: '타입',
    offset: '오프셋',
    size: '크기',
  },
  codeLabels: {
    authored: `작성한 프래그먼트, ${hero.file}`,
    quickStartShader: `셰이더 파일, ${quickStartFile.shader.name}`,
    quickStartHost: `이 파일을 컴파일하는 호스트 파일, ${quickStartFile.host.name}`,
    wgsl: 'WGSL로 나온 프래그먼트 진입점',
    glsl: `${glsl}으로 나온 프래그먼트 main`,
    useTypeshade: 'hello.shade.ts',
  },

  front: {
    title: 'TypeScript로 쓰는 셰이더 언어, TypeShade',
    searchTitle: 'TypeShade',
    lede: `TypeShade는 TypeScript의 문법과 타입, 편집기를 그대로 쓰는 독립된 언어입니다. \`"use typeshade"\`로 시작하는 파일 하나가 WebGPU용 WGSL과 WebGL2용 ${glsl}을 냅니다. 저장소의 예제 ${facts.shadeExamples}개 가운데 ${facts.shadeRenderable}개가 파일 하나로 둘 다 냅니다.`,
    playground: 'Playground',
    quickStart: 'Quick Start',
    stageAria: '그것을 그리는 파일 옆에서 실행되는 셰이더',
    first: {
      title: '굽은 띠',
      caption:
        '왼쪽 파일을 오른쪽에 그립니다. 한 줄을 고치거나 컨트롤을 움직이면 그림이 따라옵니다.',
      warp: '띠가 휘는 정도',
      ink: '첫 번째 색',
      paper: '두 번째 색',
    },
    targets: {
      h: '파일 하나, 출력 둘',
      p: '컴파일러는 `hello.shade.ts`를 하나의 중간 표현으로 변환한 뒤 두 타깃의 코드를 생성합니다. 이 파일은 다른 파일을 가져오지 않으므로 그 자체가 프로그램 전부이고, 옆 창에는 호스트가 WebGPU나 WebGL2에 넘기는 WGSL과 GLSL ES 3.00 프래그먼트가 탭 하나씩으로 들어 있습니다.',
      source: 'hello.shade.ts',
      wgsl: 'WGSL',
      glsl: `${glsl} 프래그먼트`,
    },
    gallery: {
      h: '더 많은 셰이더',
      p: `컴파일러에는 지도 렌더링 패스부터 컴퓨트 커널까지 예제 ${facts.shadeExamples}개가 들어 있습니다. 각 타일은 빌드할 때 그 셰이더가 그린 화면이고, 누르면 그 예제를 실행하는 페이지로 갑니다.`,
      all: '예제 전체',
      tile: (title: string) => ({
        neutral: `${title}. 빌드할 때 그린 화면입니다.`,
        webgpu: `${title}. WebGPU에서 실행 중입니다.`,
        webgl2: `${title}. WebGL2에서 실행 중입니다.`,
        none: `${title}. 빌드할 때 그린 화면입니다. 이 브라우저에는 WebGPU도 WebGL2도 없습니다.`,
        reduced: `${title}. 시스템이 움직임 줄이기를 켜 두어 한 프레임만 그렸습니다.`,
      }),
    },
    map: {
      h: 'TypeScript에서 그대로 이어지는 것',
      p: 'GPU 코드에는 리소스, 값 레이아웃, 엔트리 포인트 세 가지가 있습니다. TypeShade는 각각에 TypeScript가 이미 가진 자리를 주고, 나머지 언어는 GPU에 맞는 범위에서 그대로 둡니다. 전체 규칙은 [언어 가이드](guide)에 있습니다.',
      rows: [
        [
          '"use typeshade"',
          '이 지시어가 언어의 경계입니다',
          '파일의 첫 문장, JavaScript 지시어가 놓이는 자리에 씁니다. 이 줄이 없는 파일은 셰이더로 컴파일되지 않고, 있는 파일은 그 아래 모든 코드가 TypeShade로 검사되어 컴파일러의 중간 표현으로 내려갑니다.',
        ],
        [
          'f32, vec3, mat4, sin(x)',
          'GPU 타입과 builtin은 전역입니다',
          '`f32`, `vec3`, `mat4`와 `sin`, `vec4(...)` 같은 builtin은 import 없이 씁니다. `Math.sin`과 `Math.PI`는 같은 연산의 별칭입니다. 검사기는 코드를 내기 전에 편집기 안에서 셰이더 규칙을 적용합니다.',
        ],
        [
          'class VsIn { @location(0) uv: vec2 }',
          'type이나 class가 값 레이아웃입니다',
          '메타데이터가 없는 데이터는 `type` 별칭으로 쓰고, 필드마다 `@location`이나 `@builtin`이 필요하면 `class`로 씁니다. 클래스의 필드가 두 타깃이 받는 구조체의 레이아웃이 됩니다.',
        ],
        [
          'new Circle(center, 0.3).coverage(p)',
          '클래스는 TypeScript 클래스 그대로입니다',
          '필드, 생성자와 `new`, 메서드와 static 함수, `super`와 `abstract`가 있는 `extends`, 제네릭 클래스와 함수, 믹스인 패턴까지 컴파일됩니다. 메서드는 구조체를 첫 매개변수로 받는 함수로 내려가고, 제네릭은 타입 인자 조합마다 한 번씩 컴파일됩니다. [예제 페이지](examples)에 각각의 파일이 있습니다.',
        ],
        [
          'declare const u: uniform<Camera>',
          'declare가 호스트가 채우는 리소스를 선언합니다',
          '`uniform<T>`는 유니폼 블록을 읽고, `storage<T, "read_write">`는 셰이더가 쓰는 스토리지 버퍼이입니다. 초기값은 없습니다. 슬롯은 호스트의 것이고 파일의 선언 순서를 따르며, [`reflect()`](apiReflect)가 그 레이아웃을 알려 줍니다.',
        ],
        [
          '@fragment export function fs(v: VsOut): vec4',
          '데코레이터가 붙은 export가 엔트리 포인트입니다',
          '`@vertex`, `@fragment`, `@compute([64, 1, 1])`가 스테이지를 정하고, 없는 함수는 헬퍼입니다. 스테이지 입력은 `@builtin("vertex_index")`나 `@location` 같은 명시적 매개변수로 받습니다. 숨은 전역 변수는 없습니다.',
        ],
        [
          'await scale({ k, xs, ys }, 4)',
          '호스트 파일이 모듈을 가져와 부릅니다',
          '호스트 파일은 `typeshade/vite` 플러그인으로 `.shade.ts`를 가져와 그 파일이 내보내는 것을 부릅니다. 헬퍼는 CPU에서 실행되고, `@compute` 진입점은 지원하는 환경에서 WebGPU 또는 WebGL2로 실행됩니다. 전체 화면 `@fragment` 진입점은 `fs(canvas, bindings)`로 캔버스에 그립니다. 바인딩 객체의 타입은 모듈에서 나오므로, 호출이 빠뜨린 바인딩은 호스트 코드의 그 줄에서 타입 오류가 됩니다.',
        ],
      ],
    },
    oracle: {
      h: 'CPU 결과와 대조합니다',
      p: '같은 모듈을 CPU에서 f64로 실행하고, [테스트](checks)가 컴파일러의 산술을 그 결과와 맞춰 봅니다. 출력은 푸시할 때마다 Tint에서 컴파일하고 WebGL2에서 링크합니다. 아래는 같은 파일에서 나온 그라데이션 패스를 두 백엔드가 각각 그린 화면입니다.',
      webgpu: {
        neutral: '생성된 WGSL로 빌드할 때 그린 그라데이션 패스입니다.',
        webgpu: '생성된 WGSL로 WebGPU가 그리는 그라데이션 패스입니다.',
        webgl2: 'WebGL2가 그리는 그라데이션 패스입니다. 이 브라우저에는 WebGPU가 없습니다.',
        none: '빌드할 때 그린 그라데이션 패스입니다. 이 브라우저에는 WebGPU도 WebGL2도 없습니다.',
      },
      webgl2: {
        neutral: `생성된 ${glsl}으로 빌드할 때 그린 그라데이션 패스입니다.`,
        webgpu: `생성된 ${glsl}으로 WebGL2가 그리는 그라데이션 패스입니다.`,
        webgl2: `생성된 ${glsl}으로 WebGL2가 그리는 그라데이션 패스입니다.`,
        none: '빌드할 때 그린 그라데이션 패스입니다. 이 브라우저에는 WebGL2가 없습니다.',
      },
    },
    install: {
      h: '설치',
      p: `npm에 Git URL을 지정해 저장소를 설치합니다. 설치한 패키지는 \`typeshade\`로 import합니다. 설치와 첫 셰이더 예제는 [Quick Start](quickStart)에 있습니다. ${facts.nextVersion}의 레지스트리 배포는 아직 나오지 않았습니다.`,
    },
  },
  quickStart: {
    host: {
      hostH: '호스트 애플리케이션에 연결하기',
      boundaryH: 'TypeShade와 호스트의 경계',
      nextLearnH: '다음 학습',
      p0: '`"use typeshade"`로 시작하는 파일은 셰이더 파일이며, 그 파일이 가져오는 셰이더 파일과 함께 한 프로그램으로 컴파일됩니다. 아래 예제가 TypeShade의 작성 인터페이스입니다.',
      boundaryP:
        'TypeShade 코드는 TypeScript처럼 작성하지만, `"use typeshade"`가 붙은 파일에서는 셰이더 언어 규칙이 적용됩니다. TypeScript의 타입과 문법으로 소스를 작성하며, GPU 타입, 리소스, 셰이더 스테이지에는 TypeShade의 언어 규칙이 적용됩니다.',
      boundaryBullets: [
        '`"use typeshade"`가 언어 경계를 선언합니다.',
        'entry point의 GPU 입력은 `@builtin(...)` 같은 명시적인 매개변수로 표현합니다.',
        '`uniform<T>`와 `storage<T>` 같은 리소스 타입은 GPU 리소스의 의미를 표현합니다.',
      ],
      hostP0:
        '호스트가 이 파일을 쓰는 방법은 세 가지입니다. 파일을 컴파일해 셰이더 소스를 자신의 WebGPU나 WebGL2 코드에 넘기거나, 파일을 가져와 그 파일이 내보내는 것을 부릅니다. 프레임을 직접 그리는 엔진이라면 세 번째 방법을 씁니다. 컴파일된 프로그램을 프로그램 런타임에 불러오는 방법이며, [WebGPU와 WebGL2](conceptsWebgpu)에서 설명합니다.',
      compileH: '파일 컴파일하기',
      hostWgslLabel: '호스트가 WGSL을 소비하는 위치',
      hostP1:
        '지금 쓸 수 있는 방법입니다. 파일을 컴파일한 뒤, 호스트 애플리케이션이 생성된 WGSL 또는 GLSL ES 3.00 문자열을 WebGPU나 WebGL2에 넘깁니다.',
      hostP2:
        'TypeShade가 담당하는 것은 언어 의미와 셰이더 코드 생성입니다. device, pipeline, bind group, buffer, texture, command encoder 같은 GPU 런타임 객체의 생성과 수명 관리는 호스트가 담당합니다.',
      importH: '파일 가져오기',
      importP: `Vite 플러그인은 Git에서 설치한 소스 패키지를 지원합니다. 호스트 파일이 \`.shade.ts\`를 가져와 그 파일이 내보내는 것을 부르면, 호출에 필요한 디바이스와 파이프라인은 TypeShade의 런타임이 만듭니다. 헬퍼는 CPU에서 실행됩니다. \`@compute\` 진입점은 \`await entry(bindings, workgroups)\`로 부릅니다. 지원하는 환경에서는 WebGPU나 WebGL2로 실행하고, 진입점이 쓴 값을 다시 읽어 옵니다. 전체 화면 \`@fragment\` 진입점은 \`entry(canvas, bindings)\`로 캔버스에 그리는데, WebGPU가 먼저이고 다음이 WebGL2, 마지막이 CPU입니다.`,
      setupP:
        '설치 후에는 아래의 Vite 플러그인과 호스트 `tsconfig.json` 설정을 추가합니다. 스크립트는 Vite와 설치한 CLI를 `tsx`로 실행합니다. `prepare`는 `tsc`가 읽는 호스트 뷰를 만듭니다. `.gitignore`에 `*.shade.typeshade.ts`를 추가합니다.',
      viteLabel: 'Vite 플러그인, vite.config.ts',
      tsconfigLabel: '호스트 tsconfig.json의 두 줄',
      packageLabel: '개발 스크립트, package.json',
      toolingLabel: 'Vite 개발 의존성',
      devLabel: '개발 서버 실행 명령',
      drawP:
        '그러면 호스트 파일이 이 페이지 맨 위의 `hello.shade.ts`를 호출 하나로 그립니다. 버텍스 진입점은 아직 호스트 코드에서 부를 수 없어서 뷰가 `vs`를 `never`로 선언하고, `fs`는 캔버스 전체를 빨간색으로 채웁니다.',
      drawLabel: '호스트 파일에서 hello.shade.ts 그리기, app.ts',
      untilP: `[WebGPU와 WebGL2](conceptsWebgpu)는 컴파일러, 호스트 호출, 프로그램 런타임의 소유권 경계를 설명합니다.`,
      nextLearnP:
        '언어 가이드는 TypeScript의 개념과 TypeShade의 GPU 실행 규칙을 연결해 설명합니다.',
      nextLinks: [
        { linkKey: 'languageTypes', label: 'Types: 타입과 GPU struct' },
        { linkKey: 'languageFunctions', label: 'Functions: helper와 entry point' },
        { linkKey: 'languageControlFlow', label: 'Control flow: GPU 실행 흐름' },
        { linkKey: 'languageGpuTypes', label: 'GPU types: scalar, vector, matrix, array' },
        { linkKey: 'languageResources', label: 'Resources: uniform과 storage' },
        { linkKey: 'languageStages', label: 'Shader stages: compute, vertex, fragment' },
      ],
      nextLearnAllLink: '전체 Language Guide 보기',
      nextEditorP:
        '[VS Code 확장](editor)을 설치하면 입력하는 동안 진단과 파일이 컴파일되는 WGSL을 볼 수 있습니다.',
    },
    title: 'TypeShade Quick Start: 설치와 첫 셰이더',
    description:
      'npm으로 Git 저장소의 TypeShade를 설치하고 tsx로 실행합니다. 첫 셰이더를 컴파일해 WebGPU용 WGSL과 WebGL2용 GLSL을 생성하는 방법을 설명합니다.',
    h1: 'Quick Start',
    runLabel: '컴파일러 실행 명령',
    installH: '설치',
    p0: 'TypeScript 파일의 첫 문장에 `"use typeshade"`를 선언합니다. 이 지시어가 TypeShade 셰이더 언어로 넘어가는 경계를 만들며, 아래 예제는 class와 스테이지 데코레이터가 붙은 함수로 작성한 완전한 첫 셰이더입니다.',
    p1: `호스트는 호출 하나로 파일을 컴파일합니다. 아래 gradient 패스를 \`${quickStartFile.shader.name}\`로 저장합니다. 유니폼 블록 하나와 버텍스 단계, 프래그먼트 단계가 든 ${quickStartFile.shader.lines}줄짜리 파일입니다. 그다음 [\`compile()\`](apiCompile)을 불러 WGSL을 출력하는 ${quickStartFile.host.lines}줄짜리 호스트 파일로 컴파일합니다.`,
    p2: '실행하면 두 단계의 WGSL이 함께 출력됩니다. 프래그먼트 진입점은 여기 있습니다.',
    p3: `같은 함수의 ${glsl} 단계와, [\`reflect()\`](apiReflect)가 복원한 유니폼 레이아웃은 [예제 페이지](examples)에 있다. 나머지 API는 [작성 가이드](guide)를 보면 된다.`,
    live: {
      h: '라이브 예제',
      p: '`sin`이 x 좌표를 파동으로 바꾸고 `time`이 그 파동을 흘려보냅니다. 아래 파일이 그게 전부이고, 여기서 바로 돕니다. 한 줄을 고치면 다음 입력에 캔버스가 따라옵니다.',
      title: '사인 줄무늬',
      caption: '두 색 사이를 오가며 캔버스를 가로지르는 사인파.',
      anchor:
        '`bands`는 파동이 왼쪽 끝에서 오른쪽 끝까지 몇 번 반복하는지를 정하고, `time`은 그 무늬를 옆으로 밀어냅니다. `phase`에 닿는 값이 `uv.x`뿐이라 세로 한 줄은 한 가지 색입니다.',
      exercises: [
        '`bands`를 범위의 맨 아래까지 내려 파동 하나를 만듭니다. 맨 위까지 올리면 마루가 가는 선으로 좁아집니다.',
        '`phase` 줄에서 `uv.x`를 `uv.y`로 바꿉니다. 줄무늬가 가로로 눕습니다. `uv`는 캔버스를 가로지르는 방향뿐 아니라 위쪽으로도 나아가기 때문입니다.',
        '`Uniforms`에 `speed: f32`를 넣고, `phase` 줄에서 `u.time`에 `u.speed`를 곱합니다. 캔버스 아래에 `speed` 슬라이더가 생기고, 출력 결과의 `struct Uniforms`에도 필드가 하나 늘어납니다. 컨트롤도 WGSL도 컴파일러가 방금 만든 모듈에서 읽어 온 것입니다.',
      ],
      bands: '캔버스를 가로지르는 파동 수',
      low: '골 색',
      high: '마루 색',
    },
    status: {
      h: '상태',
      p: `저장소 패키지는 ${facts.mirrorVersion} 버전입니다. ${facts.nextVersion}의 레지스트리 배포는 아직 나오지 않았지만, npm으로 Git 소스를 설치할 수 있습니다. 호스트는 설치한 패키지를 \`${quickStartFile.importPath}\`로 import합니다. lockfile을 커밋하면 설치한 Git 리비전이 기록됩니다. 배포된 버전은 [릴리스](releases)에 있습니다.`,
    },
  },
  motivation: {
    use: {
      title: 'TypeShade란 무엇인가? TypeScript로 쓰는 셰이더 언어',
      description:
        'TypeScript의 개발 경험에서 출발해 셰이더 언어로 확장되는 TypeShade와 use typeshade의 의미를 설명합니다.',
      h1: 'TypeScript에서 시작하는 셰이더 언어',
      sections: [
        [
          'TypeShade는 무엇을 바꾸나요?',
          'TypeShade는 TypeScript 코드를 GPU에서 그대로 실행하는 런타임이 아닙니다. TypeScript의 익숙한 문법과 개발 도구를 출발점으로 삼고, GPU 프로그램에 필요한 타입과 의미론을 가진 별도의 컴파일 언어로 해석합니다.',
        ],
        [
          '`use typeshade`는 언어 경계입니다',
          '`"use typeshade"`는 파일 수준에서 TypeShade 프로그램임을 선언합니다. 이 한 줄을 기준으로 컴파일러는 일반 애플리케이션 코드와 다른 TypeShade 셰이더 의미론을 적용합니다. 셰이더 파일은 이 지시문으로 시작합니다.',
        ],
        [
          'TypeScript에서 무엇이 그대로 익숙한가요?',
          '함수, 타입 주석, 모듈, 표현식과 제어 흐름처럼 이미 알고 있는 언어 개념이 TypeShade의 작성 경험을 구성합니다. 하지만 TypeScript의 모든 기능을 그대로 실행할 수 있다는 뜻은 아닙니다. TypeShade는 GPU 실행 모델에 맞지 않는 기능을 제한하고, 차이가 있는 곳을 정적 진단으로 드러냅니다.',
        ],
        [
          'TypeScript와 TypeShade의 차이는 어디에 있나요?',
          'TypeScript가 일반 프로그램의 타입과 실행을 설명한다면 TypeShade는 GPU 프로그램의 값, 벡터와 행렬, 리소스, 엔트리 포인트, 타깃별 제약까지 설명합니다. 같은 `function`이나 `if`를 보더라도 최종 프로그램은 GPU의 실행 모델을 따라야 합니다.',
        ],
        [
          '컴파일 결과는 무엇인가요?',
          'TypeShade 소스는 하나의 중간 표현으로 내려간 뒤 호스트가 사용할 셰이더 소스로 출력됩니다. 현재 WebGPU에는 WGSL을, WebGL2에는 GLSL ES 3.00을 생성합니다. 호스트는 이 소스를 직접 작성한 WebGPU나 WebGL2 코드에 넘기거나, 컴파일된 프로그램을 프로그램 런타임 `typeshade/runtime`에 불러와 실행합니다.',
        ],
        [
          '어디서부터 배우면 되나요?',
          'Quick start는 `"use typeshade"` 파일을 만드는 방법을 설명합니다. Language guide는 타입, 값과 표현식, 함수, 제어 흐름, GPU 실행 규칙을 다룹니다. 컴파일러의 검증 방식과 API는 Verification과 API reference에서 설명합니다.',
        ],
      ],
      familiarH: 'TypeScript 지식이 출발점이 됩니다',
      familiarP:
        'TypeShade는 익숙한 언어 개념을 버리지 않습니다. 대신 GPU에서 의미가 달라지는 지점을 명확하게 구분합니다.',
      rows: [
        ['함수', '함수 선언과 호출', '셰이더 함수와 엔트리 포인트 규칙이 추가됩니다.'],
        ['타입', '타입 주석과 추론', 'GPU-native 타입과 벡터·행렬 타입이 추가됩니다.'],
        [
          '모듈',
          'import / export',
          '셰이더 파일은 자신이 가져오는 셰이더 파일과 함께 한 프로그램으로 컴파일됩니다.',
        ],
        ['제어 흐름', 'if / for 등의 문법', 'GPU 실행 모델과 타깃 제약을 만족해야 합니다.'],
        ['실행', 'JavaScript 런타임', '컴파일 결과를 WebGPU/WebGL2 호스트가 실행합니다.'],
      ],
      furtherH: 'TypeScript와 JavaScript를 함께 참고하세요',
      furtherP:
        'TypeShade 문서는 언어의 차이를 설명하는 데 집중합니다. 익숙하지 않은 TypeScript 또는 JavaScript 개념은 원문 문서를 함께 보면 더 빠르게 배울 수 있습니다.',
      further: [
        [
          'TypeScript Handbook — Everyday Types',
          'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html',
          '타입 주석, union, literal 등 TypeScript 타입의 기본 개념',
        ],
        [
          'TypeScript Handbook — Functions',
          'https://www.typescriptlang.org/docs/handbook/2/functions.html',
          '함수 선언, 매개변수, 반환 타입과 호출 규칙',
        ],
        [
          'MDN — JavaScript Guide',
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
          'JavaScript의 표현식, 제어 흐름, 함수와 모듈에 대한 언어 배경',
        ],
      ],
      columns: ['개념', 'TypeScript에서 익숙한 부분', 'TypeShade에서 추가되는 의미'],
    },
    title: 'TypeShade를 사용하는 이유와 도입 시 고려사항',
    description:
      'TypeShade는 TypeScript 문법과 편집 도구로 GPU 프로그램을 작성하는 언어입니다. 셰이더 소스 공유, 여러 타깃으로 컴파일, CPU 기준값을 이용한 검증과 도입 시 고려할 제약을 설명합니다.',
    h1: '왜 TypeShade인가',
    intro:
      'TypeShade는 타입이 있는 소스 파일로 셰이더 로직을 작성하고, 지원하는 GPU 타깃으로 컴파일하는 언어입니다. TypeScript 개발 도구, 셰이더 소스 공유, 출력 검증을 같은 개발 과정에 연결합니다.',
    sections: [
      {
        id: 'typescript-tooling',
        h: 'TypeScript 개발 도구',
        p: '함수, 클래스, 타입 주석, import를 이용해 익숙한 방식으로 셰이더 코드를 구성합니다. 파일 첫머리의 `"use typeshade"`는 셰이더 타입과 실행 규칙을 적용하는 경계입니다. [편집기 확장](editor)은 자동 완성, 셰이더 진단, 코드 탐색을 제공합니다. [TypeScript 대응표](languageFromTypescript)는 지원하는 각 구문이 어떻게 컴파일되는지 설명합니다.',
      },
      {
        id: 'shared-source',
        h: '셰이더 소스 공유',
        p: `WebGPU는 WGSL을, WebGL2는 ${glsl}을 사용합니다. 구현을 따로 관리하면 변경할 때마다 각 언어에 반영해야 합니다. TypeShade는 셰이더 프로그램을 공통 중간 표현으로 변환하고, 여기서 지원하는 타깃 코드를 생성합니다. 헬퍼 함수를 수정하면 같은 컴파일 과정에서 각 타깃의 출력에 반영됩니다. [타깃 가이드](conceptsWgsl)는 타깃별 기능 차이를 설명합니다.`,
      },
      {
        id: 'host-integration',
        h: '호스트 연동',
        p: '컴파일러는 호스트가 확인하고 사용할 수 있도록 셰이더 소스와 리플렉션 메타데이터를 제공합니다. 애플리케이션은 이 출력을 자체 렌더러에 연결할 수 있습니다. Vite 플러그인을 쓰면 셰이더 모듈을 import하고 `typeshade/runtime`으로 진입점을 호출할 수도 있습니다. [WebGPU와 WebGL2 가이드](conceptsWebgpu)는 연동 방식과 호스트가 제공하는 리소스를 설명합니다.',
      },
      {
        id: 'verification',
        h: '검증 기준',
        p: 'CPU 오라클은 같은 중간 표현을 배정밀도로 계산합니다. 이 결과는 GPU 출력을 확인하는 기준값으로 쓰입니다. 컴파일러 검사에는 타깃 코드 컴파일, 출력 스냅샷, 차등 테스트도 포함됩니다. 부동소수점 결과는 실행 타깃에 따라 달라질 수 있습니다. [검증 페이지](checks)는 각 검사의 범위를 설명합니다.',
      },
      {
        id: 'constraints',
        h: 'GPU 제약',
        p: '셰이더는 리소스, 셰이더 단계, 타깃별 규칙을 따라야 합니다. 일부 구문은 WGSL만 생성하며, WebGL2의 컴퓨트 실행은 지원하는 변환 방식과 기능 범위로 제한됩니다. TypeShade를 도입하면 컴파일 단계와 언어 규칙이 추가됩니다. [언어 가이드](guide)와 [타깃 가이드](conceptsWgsl)는 이 제약을 설명합니다. 타깃이 하나이거나 특정 타깃의 기능이 필요한 프로젝트는 기존 WGSL이나 GLSL로 요구사항을 충족할 수도 있습니다.',
      },
      {
        id: 'project-status',
        h: '프로젝트 상태',
        p: 'TypeShade는 정식 출시 전입니다. 도입 전에 고정된 컴파일러 버전에서 애플리케이션에 필요한 기능과 타깃을 확인해야 합니다. [빠른 시작](quickStart)은 현재 설정 방법을, [설계 규칙](rules)은 언어가 따르는 규칙을 설명합니다.',
      },
    ],
    nextH: '시작하기',
    nextP:
      '[Playground](playground)에서 셰이더를 수정하고 출력을 확인할 수 있습니다. 프로젝트에 적용하는 방법은 [빠른 시작](quickStart)에, 완성된 프로그램은 [예제](examples)에 있습니다.',
  },

  benchmarks: {
    metricH: '측정 항목',
    metrics: {
      validation: '입력 검사 측정',
      packing: '버퍼 패킹 측정',
      upload: '업로드 바이트',
      wall: '소요 시간',
      gpu: 'GPU 시간',
      buffers: '최대 버퍼 메모리',
      cold: '첫 호출',
      readback: '상주 데이터 되읽기',
    },
    sections: {
      applications: '실제 작업',
      data: '데이터와 메모리',
      compute: '연산',
      execution: '실행 방식',
    },
    sectionInfo: {
      applications: '이미지, 입자, 리덕션, 컬렉션 호출 전체와 GPU 상주 이미지 처리를 비교합니다.',
      data: '객체 배열과 필드별 배열, 버퍼 전송, 메모리 접근 방식을 비교합니다.',
      compute: '정수 연산, 리덕션, 원자적 덧셈을 비교합니다.',
      execution: '작업 그룹 크기와 큐 제출 방식을 비교합니다.',
    },
    caseNames: {
      'fields-1': '커널 호출, 8개 필드 중 1개 읽기',
      'fields-4': '커널 호출, 8개 필드 중 4개 읽기',
      'fields-8': '커널 호출, 8개 필드 모두 읽기',
      image: '이미지 반전',
      particles: '입자 갱신',
      peak: '최댓값',
      collect: 'Map과 Set 집계',
      'resident-image': 'GPU 상주 이미지 처리',
      'layout-aos-8-read-1': '객체 배열, 8개 필드 중 1개 읽기',
      'layout-soa-8-read-1': '필드별 배열, 8개 필드 중 1개 읽기',
      'layout-aos-1-read-1': '객체 배열, 필드 1개',
      'layout-soa-1-read-1': '필드별 배열, 필드 1개',
      'layout-aos-8-read-8': '객체 배열, 필드 8개 읽기',
      'layout-soa-8-read-8': '필드별 배열, 필드 8개 읽기',
      'transfer-upload': 'GPU로 업로드',
      'transfer-readback': '호스트로 되읽기',
      'memory-step-1': '연속 접근',
      'memory-step-17': '간격 17로 접근',
      'memory-step-4097': '간격 4097로 접근',
      'arithmetic-rounds-4': '정수 연산 4회',
      'arithmetic-rounds-64': '정수 연산 64회',
      'reduction-serial': '타일 내 순차 리덕션',
      'reduction-workgroup': '작업 그룹 리덕션',
      'atomics-bins-1': '원자적 덧셈, 슬롯 1개',
      'atomics-bins-256': '원자적 덧셈, 슬롯 256개',
      'workgroup-64': '작업 그룹 크기 64',
      'workgroup-128': '작업 그룹 크기 128',
      'workgroup-256': '작업 그룹 크기 256',
      'submission-batched': '디스패치 묶음 제출',
      'submission-separate': '디스패치 개별 제출',
    },
    verdict: '정확성 검사 {total}개 중 {passed}개 통과',
    summary:
      '감소 {lower}개. 증가 {higher}개. 범위 겹침 또는 동일 {similar}개. 비교 불가 {missing}개.',
    chartInfo:
      '각 항목의 기준 빌드를 100으로 맞췄습니다. 막대가 짧을수록 시간이나 버퍼 메모리가 적습니다. 섹션마다 축척이 다릅니다. 실제 값은 막대 위에 표시합니다.',
    rangeInfo:
      '가는 선은 반복 측정값의 10~90백분위 범위입니다. 범위가 겹치는 항목은 감소·증가와 따로 셉니다. 첫 호출은 한 번 측정한 값입니다.',
    range: '{baseline}; {candidate}.',
    axis: '기준 100, 축척 0~{max}.',
    lower: '{value}% 감소',
    higher: '{value}% 증가',
    overlap: '측정 범위 겹침 ({value}%)',
    same: '동일',
    pending: '실행을 완료하고 두 어댑터가 같을 때 비교 결과를 표시합니다.',
    methodH: '측정 방법',
    sampleRanges: '측정 범위 상세',
    receipt: '수신 번호 {id}, 수신 시각 {time}.',
    comparisonH: '버전 비교',
    ratios: '대응 결과',
    ratioInfo:
      '기준 빌드의 중앙값을 비교 빌드의 중앙값으로 나눈 비율입니다. 비율이 1보다 크면 비교 빌드의 시간이나 버퍼 메모리가 줄었다는 뜻입니다. 시간의 분포와 되읽기 측정값은 JSON에서 확인할 수 있습니다.',
    wallRatio: '전체 시간 비율',
    gpuRatio: 'GPU 시간 비율',
    memoryRatio: '버퍼 비율',
    comparisonInfo:
      '기준 빌드와 비교 빌드로 같은 프로그램을 실행합니다. 각 빌드의 런타임을 분리하고, 측정할 때는 호출 순서를 번갈아 바꿉니다.',
    comparisonScope:
      '한 번 실행하면 두 빌드로 모든 실험과 정확성 검사를 수행합니다. 실제 작업, 메모리, 연산, 실행 방식을 함께 측정합니다.',
    comparisonTiming:
      '첫 호출 시간에는 작업 준비가 포함됩니다. 컴파일된 프로그램의 반복 시간은 보정한 묶음에서 디스패치당 측정한 값입니다. 애플리케이션 시간은 호출 전체를 포함합니다. 기기 상주 시간은 정해진 연속 호출을 포함하며, 되읽기 시간은 JSON에 따로 기록합니다.',
    comparisonProbes:
      '필드 읽기 커널의 입력 검사와 버퍼 패킹은 실제 호출 전에 각각 측정합니다. 이 측정이 캐시 상태에 영향을 줄 수 있으므로, 두 값의 합을 전체 소요 시간의 일부로 해석할 수는 없습니다. 업로드 바이트는 실제 버퍼 쓰기의 크기입니다. GPU 시간은 측정할 수 있을 때만 표시하며, 두 빌드의 컴퓨트 패스에 같은 쿼리 비용이 들어갑니다. 쿼리 버퍼는 작업의 메모리 집계에서 제외합니다. 공통 런타임 정보는 실제로 열린 디바이스를 나타내며, 아티팩트와 컴파일러 해시는 별도로 기록합니다.',
    comparisonMemory:
      '최대 버퍼 크기는 측정 도구를 거쳐 생성된 WebGPU 버퍼의 동시 사용량입니다. 텍스처, 드라이버 내부 할당과 JavaScript 메모리는 제외합니다. 할당 횟수와 제출 횟수도 기록에 포함됩니다.',
    comparisonTrust:
      '같은 실행과 같은 작업 안에서 버전을 비교합니다. 비율을 해석하기 전에 두 어댑터 정보와 원시 측정값을 확인하십시오. GPU 명령이 제출됐더라도 호출의 모든 부분이 GPU에서 실행됐다는 뜻은 아닙니다.',
    baseline: '기준 빌드',
    candidate: '비교 빌드',
    build: '빌드',
    peakBuffers: '최대 버퍼 (B)',
    cold: '첫 호출 (ms)',
    title: 'TypeShade 성능 벤치마크',
    h1: '벤치마크',
    description:
      '기기에서 TypeShade 성능 실험을 실행하고 결과를 보내 컴파일러 개선에 참여합니다. 배열 배치, 메모리 전송, 연산, 작업 그룹 등 여러 실험을 비교할 수 있습니다.',
    intro:
      '사용 중인 기기에서 작업별 성능을 측정합니다. 수집한 결과는 커널 입력에서 실제로 쓰는 필드만 올리는 최적화 등 컴파일러 개선의 근거로 씁니다.',
    runH: '통합 벤치마크',
    resultsH: '성능 보고서',
    sharingH: '결과 보내기',
    runInfo:
      '다른 GPU 앱을 닫고 이 탭을 열어 두십시오. 탭을 전환하면 실행을 멈추고 완료된 결과를 보관합니다. 기기가 뜨거워질 수 있습니다.',
    profile: '실행 규모',
    profiles: { quick: '빠르게', standard: '기본', extended: '넓게' },
    profileUnits: '원소 수; 실험별 측정 횟수',
    suites: {
      layout: '배열 레이아웃',
      transfer: '버퍼 전송',
      memory: '메모리 접근',
      arithmetic: '정수 연산',
      reduction: '리덕션',
      atomics: '원자 연산 충돌',
      workgroup: '작업 그룹 크기',
      submission: '큐 제출',
    },
    descriptions: {
      layout: '스칼라 필드의 전체 버퍼와 일부 필드만 담은 버퍼를 AoS와 SoA로 비교합니다.',
      transfer: '업로드 완료와 호스트 메모리로 읽어 오는 시간을 잽니다.',
      memory: '연속 접근과 간격에 따라 순서를 바꾼 접근을 비교합니다.',
      arithmetic: '부호 없는 정수 연산의 반복 횟수를 바꿔 비교합니다.',
      reduction: '타일 내 순차 합산과 작업 그룹의 트리 리덕션을 비교합니다.',
      atomics: '원자적 덧셈이 한곳에 몰릴 때와 분산될 때를 비교합니다.',
      workgroup: '같은 복사 작업에서 작업 그룹 크기를 바꿔 비교합니다.',
      submission: '디스패치를 묶어 제출할 때와 각각 제출할 때를 비교합니다.',
    },
    run: '실행',
    stop: '중지',
    download: 'JSON 저장',
    send: '전송 재시도',
    idle: '실행 규모를 고른 뒤 벤치마크를 실행하십시오.',
    running: '실행 중',
    complete: '완료',
    cancelled: '중지됨',
    failed: '실행 실패',
    unsupported: 'WebGPU 사용 불가',
    progress: '완료된 실험',
    empty: '실행을 마치면 결과가 여기에 표시됩니다.',
    experiment: '실험',
    size: '원소 수',
    storage: '저장 바이트',
    wall: '호스트 ms',
    gpu: 'GPU ns',
    check: '판정',
    passed: '통과',
    unavailable: '사용 불가',
    timing:
      '시간은 디스패치 또는 전송별 중앙값입니다. 호스트 시간에는 제출과 완료 대기가 포함됩니다. GPU 타임스탬프에는 전송과 호스트 작업이 빠집니다.',
    timingUnavailable:
      'GPU 시간은 타임스탬프 쿼리로 유효한 구간을 측정했을 때 표시합니다. 측정할 수 없으면 비워 둡니다. 개별 제출은 호스트 시간만 기록합니다.',
    protocol:
      '각 작업의 출력을 별도 CPU 기준값과 대조합니다. 일부러 값을 바꿔 대조 함수도 확인합니다. 비교 대상은 회차마다 순서를 바꿉니다.',
    limits:
      '실행 한도는 선택한 규모에 따릅니다. 준비 시간에는 파이프라인 생성, 버퍼 할당, 초기 업로드가 포함됩니다. 개별 측정값과 준비 시간은 기록에서 볼 수 있습니다.',
    privacy:
      '기록에는 기기와 렌더러 정보, 브라우저 버전, 작업 식별자, 시간, 정확성 검사 결과가 담깁니다. 페이지 주소나 사용자 프로그램은 담지 않습니다.',
    attribution:
      'WebGPU 어댑터 정보와 WebGL 렌더러 정보는 따로 기록합니다. 두 API가 서로 다른 GPU를 선택할 수 있습니다. 브라우저가 정보를 가릴 수도 있습니다.',
    inspect: '기록 확인',
    submissionNotice: '실행하면 결과와 기기 정보가 TypeShade에 자동 전송됩니다.',
    submissionDetails: '전송 항목',
    retention:
      '전송한 기록은 {days}일 뒤 만료되며 매일 정리 작업으로 삭제합니다. 시간별 전송 한도에 쓰는 임시 주소 해시는 해당 시간이 끝나면 만료됩니다.',
    trust:
      '자발적으로 보낸 기기 보고는 검증 전 자료입니다. 관리자는 통제된 환경에서 재현한 뒤 컴파일러 변경을 결정합니다. 원본 기록은 공개하지 않습니다.',
    sent: '결과를 받았습니다.',
    sendFailed: '결과를 전송하지 못했습니다. 기록을 저장하고 나중에 다시 시도하십시오.',
    rateLimited: '전송 한도에 도달했습니다. 나중에 다시 시도하십시오.',
    software:
      '소프트웨어 렌더러로 보고되었습니다. 이 실행은 측정 도구를 확인하며 실제 GPU의 성능 근거로 쓰지 않습니다.',
    deviceH: '보고된 기기',
    webgpu: 'WebGPU 어댑터',
    webgl: 'WebGL 렌더러',
  },
  checks: {
    title: 'TypeShade 검증: CPU 오라클, 컴파일 게이트, 골든 파일',
    description:
      'TypeShade의 CI가 푸시마다 실행하는 것: f64 CPU 오라클, Tint와 실제 WebGL2 컨텍스트에서 실행되는 컴파일 게이트, 출력마다의 골든 파일.',
    h1: '검증 방식',
    ciH: '푸시마다 하는 검사',
    intro: '저장소의 CI는 푸시와 풀 리퀘스트마다 [CI 워크플로](ciGates)에서 다음을 실행합니다.',
    items: [
      `같은 모듈을 f64 산술로 실행되는 CPU 함수로도 컴파일합니다. 이것이 기준값을 내는 오라클입니다. 기본 모드에서는 동등 비교만 먼저 f32로 반올림해 GPU와 맞추고, 연산마다 반올림하는 f32 모드는 따로 켭니다. 테스트는 이 함수를 알려진 답과 맞춰 보고, 생성된 JavaScript라는 두 번째 CPU 백엔드와도 맞춰 봅니다. 둘은 비트 단위로 같아야 합니다. 오라클은 드라이버의 반올림에 대해서는 아무것도 말해 주지 않습니다. 이 저장소에서는 GPU 출력을 오라클과 맞춰 보지 않습니다. WGSL은 결과를 정해 두었는데 ${glsl}은 정하지 않은 곳에서는 오라클이 WGSL을 따른다(규칙 11.5). [src/core/oracle.ts](oracle)`,
      `컴파일 게이트는 등록된 예제를 전부 출력합니다. WGSL은 헤드리스 Chromium 안의 Tint에 넘기고, 렌더링 가능한 예제의 ${glsl} 두 단계는 실제 WebGL2 컨텍스트에서 컴파일하고 링크합니다. 컴파일될 수 없는 셰이더도 각 컴파일러에 하나씩 넘깁니다. 어느 쪽이든 그것을 받아들이면 게이트는 실패하고, 예제에 대한 판정은 무효가 됩니다. [scripts/compile-gate.ts](compileGate)`,
      '골든 파일에는 모든 예제의 출력 바이트가 들어 있어서, 백엔드가 조금이라도 바뀌면 리뷰에서 diff로 드러납니다. [emit-goldens.test.ts](goldens)',
    ],
    pairH: '두 백엔드에서 같은 패스',
    pairIntro:
      '첫 페이지의 gradient 패스를 백엔드마다 한 번씩 그렸습니다. 두 백엔드의 픽셀 비교는 아직 커밋되어 있지 않습니다.',
    gpuFrame: {
      neutral: '컴파일된 WGSL로 빌드할 때 WebGPU에서 그렸습니다.',
      webgpu: '컴파일된 WGSL로 지금 WebGPU에서 그리고 있습니다.',
      webgl2: `여기서는 WebGPU를 쓸 수 없어서, 컴파일된 ${glsl}으로 WebGL2에서 이 프레임을 그렸습니다.`,
      none: '컴파일된 WGSL로 빌드할 때 WebGPU에서 그렸습니다. 이 브라우저에는 WebGPU도 WebGL2도 없습니다.',
    },
    glFrame: {
      neutral: `컴파일된 ${glsl}으로 빌드할 때 WebGL2에서 그렸습니다.`,
      webgpu: '컴파일된 WGSL로 지금 WebGPU에서 그리고 있습니다.',
      webgl2: `컴파일된 ${glsl}으로 지금 WebGL2에서 그리고 있습니다.`,
      none: `컴파일된 ${glsl}으로 빌드할 때 WebGL2에서 그렸습니다. 이 브라우저에는 WebGPU도 WebGL2도 없습니다.`,
    },
    authorTime: {
      h: '코드를 쓰는 동안',
      p: '유니폼 블록은 한 번 선언하고, 필드를 읽는 곳마다 그 선언에 맞춰 타입 검사를 받습니다. 하나만 잘못 써도 문자열이 GPU에 닿기 전에 편집기가 알려 주고, 컴파일러도 같은 코드로 그 파일을 거부합니다.',
      caption: `${err.wrongLine}행에서 잘못 읽은 필드, 그 줄이 내는 진단, 그리고 읽으려던 블록에 대해 [\`reflect()\`](apiReflect)가 복원한 ${std} 레이아웃입니다. 필드 ${err.layout.fields.length}개에 ${err.layout.size}바이트이고, 첫 필드 뒤의 빈 공간은 정렬 때문에 생긴 자리입니다.`,
    },
  },

  concepts: {
    lessons: conceptLessons,
    lessonLabels: conceptLessonLabels,
    glslPrecision: precisionGuide,
    precisionFractionLabel: fractionLabel,
    title: 'TypeScript와 WebGPU: TypeScript로 WebGPU 셰이더를 작성하는 방법',
    description: `TypeScript로 WebGPU 셰이더를 작성합니다. "use typeshade" 파일은 WGSL과 ${glsl}으로 컴파일됩니다. 타입, 함수, 모듈이 GPU에서 무엇이 되는지 설명합니다.`,
    h1: 'TypeScript로 쓰는 WebGPU 셰이더',
    lead: `TypeShade를 쓰면 WebGPU 셰이더를 TypeScript로 작성할 수 있다. \`"use typeshade"\`로 표시한 파일은 WebGPU용 WGSL과 WebGL2용 ${glsl}으로 컴파일됩니다. 편집기는 같은 파일을 TypeScript로 읽습니다. 타입, 함수, 모듈은 셰이더의 값과 진입점, 컴파일 단위를 표현하며, WebGPU API는 호스트 애플리케이션에서 사용합니다.`,
    startH: 'TypeScript 파일에서 시작합니다',
    startP:
      '`"use typeshade"`는 파일을 TypeShade 소스로 표시합니다. 그 파일과 그 파일이 가져오는 TypeShade 파일은 한 프로그램으로 컴파일됩니다. 함수, 매개변수, 반환 타입, 객체, import와 export처럼 익숙한 TypeScript 형태는 그대로 이어집니다. 두 번째 블록은 고정된 컴파일러가 이 파일에서 만든 WGSL이며 페이지를 빌드하는 동안 생성됩니다.',
    startWgslLabel: '컴파일된 WGSL',
    modelH: '머릿속 모델',
    adds: 'TypeShade 추가 사항',
    model: [
      [
        'TypeScript 타입',
        '타입 주석은 값의 형태를 설명하고 잘못된 프로그램을 도구가 발견하도록 합니다.',
        '`f32`, `u32`, `vec2`, `vec3`, `vec4` 같은 GPU 값 타입과 셰이더 연산 규칙입니다.',
      ],
      [
        '함수',
        '함수는 매개변수, 반환 타입, 본문을 가집니다.',
        '`@vertex`, `@fragment` 같은 스테이지 데코레이터로 진입점을 표시합니다.',
      ],
      [
        '모듈',
        '`import`와 `export`로 한 프로그램을 이루는 파일끼리 코드를 나눠 씁니다.',
        '셰이더 파일은 상대 경로로 서로를 가져오고 한 프로그램으로 컴파일됩니다. 컴파일러는 진입점이 닿는 코드만 GPU 코드로 내립니다.',
      ],
      [
        'Web API',
        '디바이스, 파이프라인, 버퍼와 렌더링은 호스트 애플리케이션이 소유합니다.',
        '호스트가 직접 쓰는 WebGPU나 WebGL2 코드에 셰이더 소스와 리플렉션 메타데이터를 제공합니다. 호스트가 Vite 플러그인으로 가져오는 모듈에는 런타임이 함께 들어 있고, 호출에 필요한 디바이스와 파이프라인은 이 런타임이 만듭니다.',
      ],
    ],
    fitH: 'WebGPU는 어디에 있나요?',
    fitP: 'TypeShade는 브라우저 그래픽 API에서 사용할 셰이더를 작성하고 컴파일하는 언어입니다. TypeShade가 셰이더 코드를 만들면, 애플리케이션은 `GPUDevice`를 만들고 파이프라인을 구성하고 리소스를 바인딩하고 작업을 제출합니다. 애플리케이션이 Vite 플러그인으로 가져오는 모듈은 이 단계를 자신이 내보내는 호출 안에서 처리합니다. 진입점이 파이프라인의 어디에서 실행되는지는 [셰이더 파이프라인](conceptsPipeline)에 있습니다. 어느 쪽이 어떤 객체를 소유하는지는 [WebGPU와 WebGL2](conceptsWebgpu)가 설명합니다.',
    fitLinks: [
      ['TypeScript 문서 ↗', 'https://www.typescriptlang.org/docs/'],
      ['MDN WebGPU API ↗', 'https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API'],
      [
        'MDN JavaScript 지시문 ↗',
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode',
      ],
    ],
    playgroundLink: 'Playground에서 직접 작성 →',
    typesH: 'WebGPU 타입',
    typesP:
      'WebGPU를 호출하는 호스트 코드에는 WebGPU 타입 선언이 필요합니다. TypeScript 5에서는 `@webgpu/types`를 설치하고 `tsconfig.json`의 `compilerOptions.types`에 추가합니다. TypeScript 6의 `dom` 라이브러리에는 그 선언의 일부만 들어 있으며 이때 쓸 방법은 [WebGPU 타입 README](webgpuTypes)에 있습니다. WebGL2 선언은 두 버전 모두 `dom` 라이브러리에 있습니다. `typeshade` 패키지의 선언에는 WebGPU 타입이 필요하지 않습니다. 런타임이 디바이스를 `object`로 받기 때문입니다.',
    orderH: '이 순서로 배우세요',
    orderItems: [
      '타입, 함수, 모듈 등 TypeScript의 형태를 익힙니다.',
      '`"use typeshade"`를 추가하고 [GPU 타입](languageGpuTypes)을 익힙니다.',
      '진입점 데코레이터와 리소스 선언을 추가합니다. [셰이더 스테이지](languageStages)와 [리소스](languageResources)가 이 내용을 다룹니다.',
      'Playground에서 편집하면서 진단과 생성된 WGSL을 확인합니다.',
      '컴파일러와 백엔드의 내부 동작을 살펴봅니다.',
    ],

    /** /guide/concepts/ 아래 네 페이지. TypeScript 개발자가 이미 아는 것에서 셰이더에
     *  필요한 것까지 이어지는 학습 경로이며, 각 페이지는 src/components/pages의 컴포넌트와
     *  src/pages/guide/concepts의 한 줄짜리 라우트 파일로 이루어집니다. */
    cpuAndGpu: {
      title: 'CPU와 GPU 실행 모델 비교: 인보케이션, 메모리, 함수 호출과 셰이더 제약 설명',
      description:
        'CPU와 GPU의 실행, 셰이더 인보케이션, 공유 리소스, 호출과 반복문을 비교합니다. 언어의 제약과 하드웨어 스케줄링, 컴파일러의 구현 선택을 구분합니다.',
      h1: 'CPU와 GPU',
      lead: 'CPU 코드는 GPU에 전달할 작업과 리소스를 준비합니다. 셰이더 언어는 인보케이션이 리소스를 쓰는 방법을 정의합니다. 그 제약에는 하드웨어뿐 아니라 언어 규칙, API 계약과 컴파일러의 선택도 반영됩니다.',
      invocationH: '인보케이션',
      invocationP:
        '인보케이션은 버텍스, 프래그먼트 또는 컴퓨트 작업 항목을 처리하는 실행 단위입니다. 언어의 메모리와 동기화 규칙에 따라 공유 리소스로 통신할 수 있습니다. 실행 순서가 보장되는 것은 아닙니다.',
      invocationRule:
        '스테이지 데코레이터는 진입점이 실행될 스테이지를 지정하고, `@builtin(...)` 매개변수는 인보케이션의 위치 등 스테이지가 제공하는 값을 받습니다. 데코레이터는 [셰이더 스테이지](languageStages), 매개변수는 [함수](languageFunctions)에서 설명합니다.',
      memoryH: '메모리',
      memoryP:
        '셰이더는 타입이 정해진 지역 값과 호스트가 바인딩한 리소스를 사용합니다. WGSL과 GLSL ES는 자바스크립트의 일반 객체 힙을 제공하지 않습니다. TypeShade 클래스는 호스트가 바이트를 채우는 GPU 구조체를 설명합니다.',
      memoryRule:
        '`new`는 객체 식별성이 없는 값을 만듭니다. 클래스 필드의 순서는 호스트가 채우는 바이트의 레이아웃을 정하며, 리소스는 `declare` 선언 등으로 명시적으로 바인딩합니다. 구조체 정의는 [타입](languageTypes), 리소스 선언은 [리소스](languageResources)에서 설명합니다.',
      callsH: '호출',
      callsP:
        'WGSL과 GLSL ES는 재귀 호출 그래프를 허용하지 않습니다. 컴파일러는 헬퍼를 인라인하거나 지원되는 호출을 생성할 수 있습니다. 이 언어 제약을 하드웨어 호출 스택의 유무로 설명할 수는 없습니다.',
      callsRule:
        '컴파일러는 재귀를 거부하며, 헬퍼 함수의 호출 관계를 정적으로 분석합니다. 지원하는 호출 형식은 [함수](languageFunctions)에서 설명합니다.',
      loopsH: '루프',
      loopsP:
        '인보케이션마다 실행 경로와 반복 횟수가 다를 수 있습니다. 경로 분기는 처리량에 영향을 줄 수 있습니다. 루프는 스테이지 전체를 동기화하지 않습니다. 통신에는 실행 범위와 메모리 범위에 맞는 동기화 규칙이 필요합니다.',
      loopsRule:
        '`for`는 본문에서 변경하지 않는 상한까지 반복하고, `while`은 조건이나 `break`에 따라 종료합니다. 컴파일할 수 있는 조건과 반복문은 [제어 흐름](languageControlFlow)에서 설명합니다.',
      typesH: '값 타입',
      typesP:
        '셰이더 변수의 값 타입과 표현은 정적으로 정해집니다. 값이 레지스터나 메모리 어디에 놓일지는 컴파일러가 결정합니다. 소스 타입이 하드웨어 레지스터 배정을 지정하지는 않습니다.',
      typesRule:
        '셰이더 값의 GPU 타입은 `f32`, `u32`, `vec4`처럼 정적으로 정해져야 합니다. 타입 정의 방법은 [타입](languageTypes), 값의 종류는 [GPU 타입](languageGpuTypes)에서 설명합니다.',
      tableH: '실행과 언어 규칙',
      tableP: '다음 표는 실행 특성과 언어 제약에 대응하는 TypeShade 규칙을 정리한 것입니다.',
      tableColumns: ['실행 특성이나 언어 제약', 'TypeShade가 요구하는 것', '관련 문서'],
      tableRows: [
        [
          '버텍스, 프래그먼트, 작업 항목마다 진입점을 한 번씩 부릅니다',
          '진입점에 스테이지 데코레이터를 달고, builtin 입력마다 매개변수를 둡니다',
          '[셰이더 스테이지](languageStages)',
        ],
        [
          '타입이 정해진 값과 바인딩한 리소스를 쓰며 일반 자바스크립트 객체 힙은 없습니다',
          '늘어나는 배열이나 문자열은 없습니다. `new`는 값을 만들고 구조체는 배치를 설명하며 리소스는 명시적으로 바인딩합니다',
          '[리소스](languageResources)',
        ],
        [
          'WGSL과 GLSL ES가 재귀 호출 그래프를 허용하지 않습니다',
          '재귀 없는 호출 그래프를 요구합니다',
          '[함수](languageFunctions)',
        ],
        [
          '인보케이션마다 실행 경로와 반복 횟수가 다를 수 있습니다',
          '컴파일러가 읽을 수 있는 루프 상한을 요구합니다',
          '[제어 흐름](languageControlFlow)',
        ],
        [
          '값 타입은 정적으로 정해지며 레지스터 배정과는 별개입니다',
          '변수의 값 타입이 정적으로 알려져야 합니다',
          '[GPU 타입](languageGpuTypes)',
        ],
      ],
      furtherH: '더 읽을 자료',
      furtherItems: [
        '[WGSL 명세](specWgsl)는 실행 모델과 인보케이션의 정의, 허용되는 값의 종류를 규정합니다.',
        '[MDN WebGPU API](mdnWebgpu)는 JavaScript 개발자를 대상으로 브라우저의 GPU 실행 모델을 설명합니다.',
      ],
      nextP: '[셰이더 파이프라인](conceptsPipeline)은 스테이지별 입력과 출력을 다룹니다.',
    },

    pipeline: {
      title: '셰이더 파이프라인: 버텍스, 프래그먼트, 컴퓨트 스테이지와 TypeShade 진입점',
      description:
        'GPU가 그리기 호출 하나를 픽셀로 바꾸는 단계와 그중 셰이더가 실행되는 단계, 그리고 버텍스, 프래그먼트, 컴퓨트 스테이지가 각각 받는 값과 돌려주는 값을 설명합니다.',
      h1: '셰이더 파이프라인',
      lead: '셰이더 파이프라인은 GPU가 그리기 호출 하나를 처리하는 단계의 연쇄입니다. 그중 셰이더는 버텍스 스테이지와 프래그먼트 스테이지입니다. 둘 사이에는 프리미티브 조립, 클리핑, 래스터화 같은 고정 단계가 놓입니다. 컴퓨트 파이프라인에는 컴퓨트 스테이지 하나만 있습니다. 각 스테이지에는 고유한 입력과 출력이 있으며, 선언 문법은 언어 가이드에서 다룹니다.',
      drawH: '그리기 한 번의 단계',
      drawP:
        '[WebGPU 명세](specWebgpu)는 그리기 한 번을 아래 순서의 단계로 정의합니다. 진입점이 적힌 단계에서는 작성한 셰이더 코드가 실행됩니다. 나머지 단계는 고정 기능 하드웨어가 실행합니다.',
      drawColumns: ['단계', '실행하는 쪽', '하는 일'],
      drawRows: [
        [
          '인덱스 해석',
          '고정 기능',
          '인덱스 버퍼나 그리기의 버텍스 수로 처리할 버텍스 목록을 만듭니다.',
        ],
        [
          '버텍스 처리',
          '작성한 `@vertex` 진입점',
          '버텍스마다 한 번 실행되어 클립 공간 위치와 프래그먼트 스테이지가 읽을 값을 돌려줍니다.',
        ],
        [
          '프리미티브 조립',
          '고정 기능',
          '버텍스를 파이프라인의 토폴로지에 따라 점, 선, 삼각형으로 묶습니다.',
        ],
        ['프리미티브 클리핑', '고정 기능', '프리미티브를 클립 볼륨에 맞춰 잘라 냅니다.'],
        [
          '래스터화',
          '고정 기능',
          '프리미티브가 덮는 프래그먼트를 찾고 프래그먼트마다 각 버텍스의 가중치를 구합니다.',
        ],
        [
          '프래그먼트 처리',
          '작성한 `@fragment` 진입점',
          '프래그먼트마다 그 프래그먼트에 맞게 가중한 버텍스 출력으로 한 번 실행되어 색상 어태치먼트마다 값 하나를 돌려줍니다.',
        ],
        [
          '출력 병합',
          '고정 기능',
          '깊이 테스트와 스텐실 테스트 결과로 깊이와 스텐실을 갱신하고 두 테스트를 통과한 프래그먼트의 색상을 블렌딩해 씁니다.',
        ],
      ],
      stagesH: '스테이지',
      stagesP: '각 행은 호스트가 구성한 파이프라인의 스테이지 하나입니다.',
      stagesColumns: ['스테이지', '건네받는 것', '만들어 내는 것'],
      stagesRows: [
        [
          '버텍스',
          '그릴 때의 버텍스 하나입니다. 그 버텍스의 번호와, 호스트가 버텍스 버퍼에 배치해 둔 필드를 받습니다.',
          '클립 공간 위치와, 프래그먼트 스테이지가 읽을 값을 만들어 냅니다.',
        ],
        [
          '프래그먼트',
          '버텍스 스테이지가 만든 값을 이 프래그먼트에 맞게 가중한 결과와, 프래그먼트 자신의 위치를 받습니다.',
          '파이프라인이 선언한 색상 어태치먼트마다 값 하나를 만들어 냅니다.',
        ],
        [
          '컴퓨트',
          '디스패치 격자 안의 자기 좌표와, 호스트가 바인딩해 둔 리소스를 받습니다.',
          '돌려주는 값은 없습니다. 컴퓨트 진입점은 들고 있는 리소스에 씁니다.',
        ],
      ],
      entryH: '진입점',
      entryP:
        '진입점의 시그니처는 스테이지의 입력과 출력을 정의합니다. `@builtin(...)` 매개변수는 스테이지가 인보케이션에게 건네는 값이며, 버텍스 번호나 프래그먼트 위치가 여기에 해당합니다. 구조체 매개변수는 버텍스 스테이지에서는 버텍스마다의 입력이고, 프래그먼트 스테이지에서는 보간된 값입니다. 반환 타입은 스테이지가 파이프라인에 돌려주는 값이라서, 버텍스 진입점은 위치를 돌려주고 프래그먼트 진입점은 색을 돌려줍니다. 데코레이터와 선언 문법은 [셰이더 스테이지](languageStages)에서 설명합니다.',
      entryNote:
        '시그니처는 함수가 속한 스테이지와 파이프라인이 공급하는 입력, 파이프라인으로 반환하는 출력을 명시합니다.',
      interpolationH: '보간',
      interpolationP:
        '버텍스 스테이지와 프래그먼트 스테이지 사이에서 래스터라이저가 프리미티브가 덮는 프래그먼트를 가려냅니다. 그리고 프래그먼트마다, 버텍스들이 만든 값을 각 버텍스에서 얼마나 가까운지에 따라 가중해 프래그먼트 스테이지에 건넵니다. 이 과정을 보간이라고 합니다. 버텍스 진입점은 버텍스마다 값을 쓰고 프래그먼트 진입점은 프래그먼트마다 값을 읽으므로, 이름은 같아도 서로 다른 값입니다.',
      interpolationNote:
        '실수 `@location` 필드는 `@interpolate`로 다른 방식을 지정하지 않는 한 이렇게 가중됩니다. 정수는 가중할 수 없으므로 컴파일러는 따로 적지 않아도 두 타깃 모두 `id`에 `flat` 한정자를 붙이고, 프래그먼트는 프리미티브의 버텍스 하나가 낸 값을 그대로 읽습니다. `tint`에 적은 `@interpolate("flat")`도 같은 처리를 요청합니다. 필드 데코레이터는 [타입](languageTypes)에서 설명합니다.',
      computeH: '컴퓨트',
      computeP:
        '컴퓨트 스테이지 앞에는 래스터라이저가 없고 뒤에는 어태치먼트가 없습니다. 호스트가 작업 항목의 격자를 디스패치하면, 진입점은 그 격자 안의 자기 좌표를 builtin 매개변수로 읽고, 만들어 낸 값은 모두 스토리지 리소스를 거쳐 나갑니다. 쓰기 가능한 리소스의 선언은 [리소스](languageResources)에서 설명합니다.',
      furtherH: '더 읽을 자료',
      furtherItems: [
        '[WebGPU 명세](specWebgpu)가 이 스테이지들이 속한 렌더 파이프라인과 컴퓨트 파이프라인을 정의합니다.',
        '[MDN GPURenderPipeline](mdnRenderPipeline)과 [MDN GPUComputePassEncoder](mdnComputePass)에서 그 파이프라인을 움직이는 호스트 코드를 볼 수 있습니다.',
      ],
      nextP:
        '[WebGPU와 WebGL2](conceptsWebgpu)는 호스트 애플리케이션과 컴파일러의 역할을 다룹니다.',
    },

    webgpuAndWebgl2: {
      title: 'WebGPU와 WebGL2 비교: 셰이더 언어, 바인딩, 컴퓨트, 호스트가 맡는 일',
      description: `WebGPU와 WebGL2를 셰이더 소스 하나로 비교합니다. WGSL과 ${glsl}, 바인드 그룹과 유니폼 블록, 컴퓨트 지원, 호스트와 TypeShade가 맡는 일을 정리합니다.`,
      h1: 'WebGPU와 WebGL2',
      lead: `WebGPU와 WebGL2는 TypeShade가 컴파일 대상으로 삼는 브라우저 GPU API입니다. WebGPU는 WGSL을 받으며 리소스를 바인드 그룹으로 묶고 컴퓨트 스테이지를 갖습니다. WebGL2는 ${glsl}을 받으며 유니폼 블록을 바인딩 지점에 묶고 자체 컴퓨트 스테이지는 없습니다. TypeShade 소스 하나가 두 API 모두로 컴파일되며 아래 표가 둘을 나란히 놓습니다. 그다음 절들은 호스트가 모듈을 쓰는 세 가지 방법마다 디바이스와 파이프라인, 버퍼를 어느 쪽이 소유하는지 설명합니다.`,
      compareH: '비교',
      compareColumns: ['달라지는 것', 'WebGPU', 'WebGL2'],
      compareRows: [
        [
          '셰이더 언어',
          'WGSL입니다. 모듈 하나가 모든 스테이지를 담습니다.',
          `${glsl}이입니다. 버텍스 셰이더와 프래그먼트 셰이더를 프로그램 하나로 링크합니다.`,
        ],
        [
          '리소스 바인딩',
          '바인드 그룹을 씁니다. 그 레이아웃은 `reflect()`가 컴파일된 모듈에서 읽어 옵니다.',
          '바인드 그룹이 없습니다. 유니폼 블록은 바인딩 지점에 묶고 샘플러는 유니폼 위치로 설정합니다.',
        ],
        [
          '컴퓨트',
          '네이티브 `@compute` 스테이지입니다.',
          `네이티브 컴퓨트 스테이지가 없다. TypeShade는 지원하는 \`@compute\` 진입점을 생성된 ${glsl} 패스로 실행하고 변환할 수 없는 진입점은 매니페스트에 남깁니다.`,
        ],
        [
          '정밀도',
          '타입이 자신의 폭을 지닙니다.',
          '프로그램마다 선언들 위에 기본 정밀도를 적습니다.',
        ],
        [
          'GPU 기능',
          '디바이스를 그 기능과 함께 요청하고 기능에 `enable` 줄이 있으면 생성된 모듈이 그 줄을 선언합니다.',
          '호스트가 컨텍스트에 확장을 요청하고 확장에 지시문이 있으면 생성된 소스도 그 지시문을 선언합니다.',
        ],
        ['가져온 모듈의 실행 순서', '먼저 시도합니다.', 'WebGPU 다음, CPU보다 먼저 시도합니다.'],
      ],
      usesP:
        '호스트가 TypeShade 모듈을 쓰는 방법은 세 가지입니다. 모듈을 컴파일해 셰이더 텍스트를 자신의 WebGPU나 WebGL2 코드에 넘기면, 디바이스와 파이프라인, 바인드 그룹, 버퍼, 텍스처는 그 코드가 소유합니다. Vite 플러그인으로 모듈을 가져와 진입점을 부르면, 호출에 필요한 그 객체들은 TypeShade의 런타임이 만듭니다. 컴파일된 프로그램을 프로그램 런타임에 불러와 자신의 프레임에서 그릴 수도 있습니다. 이때 그 객체들은 런타임이 만들고, 렌더 상태와 프레임 루프는 호스트가 맡습니다. 각 방식은 GPU 객체의 생성과 수명 관리를 담당하는 주체가 다릅니다.',
      ownsH: '소유 관계',
      ownsP:
        'WebGPU 애플리케이션이 만드는 객체마다 한 행이며, 호스트가 모듈을 컴파일해 자신의 코드에 연결하는 경우를 보여 줍니다.',
      ownsColumns: ['객체', '애플리케이션이 하는 일', 'TypeShade가 보태는 것'],
      ownsRows: [
        [
          '디바이스',
          '어댑터와 `GPUDevice`를 요청하고 페이지가 살아 있는 동안 들고 있습니다.',
          '없습니다. 컴파일된 모듈은 WebGPU 객체를 건드리지 않습니다.',
        ],
        [
          '파이프라인',
          '렌더 파이프라인이나 컴퓨트 파이프라인을 만들고 스테이지마다 진입점 이름을 지정합니다.',
          '모듈의 셰이더 텍스트와, 그 안의 진입점 이름을 모두 제공합니다.',
        ],
        [
          '바인드 그룹 레이아웃',
          '바인딩마다 그룹, 번호, 종류, 그리고 그 바인딩을 보는 스테이지를 적습니다.',
          '`reflect()`가 컴파일된 모듈에서 같은 내용을 읽어 돌려줍니다.',
        ],
        [
          '버퍼',
          '버퍼를 할당하고 바이트를 씁니다.',
          '유니폼 구조체의 필드마다 오프셋과 크기와 타입을 알려 줍니다.',
        ],
        [
          '텍스처와 샘플러',
          '둘을 만들어 바인드 그룹에 넣습니다.',
          '셰이더가 선언한 바인딩과, 거기에서 기대하는 타입을 알려 줍니다.',
        ],
      ],
      importH: '모듈 가져오기',
      importP:
        '호스트는 `typeshade/vite` 플러그인으로 `.shade.ts`를 자신의 TypeScript에 가져와, 모듈이 내보내는 것을 부를 수도 있습니다. 헬퍼는 CPU에서 실행됩니다. `@compute` 진입점은 `await entry(bindings, workgroups)`로 부릅니다. `workgroups`는 `{ indirect, offset }`일 수도 있습니다. 이때는 앞선 호출이 `Resident<Uint32Array>`의 `offset` 원소에 쓴 개수 세 개를 호출이 실행될 때 읽습니다. 전체 화면 `@fragment` 진입점은 `entry(canvas, bindings)`로 WebGPU, WebGL2, CPU 순서로 그립니다. 이때 위 표에서 애플리케이션이 하던 일은 런타임이 맡습니다. 첫 호출에서 디바이스를 요청해 이후 호출과 함께 쓰고, 진입점마다 파이프라인을 만들며, 호출이 넘긴 객체로 바인딩을 채우고, 컴퓨트 진입점이 쓴 값을 다시 읽어 옵니다.',
      overrideP:
        '컴퓨트 진입점은 `entry(bindings, workgroups, { constants: { WIDTH: width } })`로도 부릅니다. 이름은 모듈에 선언한 override이며, 생략한 값은 기본값을 유지합니다. 선택한 값으로 워크그룹 모양과 공유 배열 길이, CPU 인보케이션 내장 값이 정해집니다. 그룹 개수는 그 모양에 맞춰 계산해야 합니다. 상수를 선택해도 넘긴 개수는 바뀌지 않습니다. 런타임은 업로드 전에 이름과 스칼라 범위, 디바이스 한도를 검사하며, 호출 시점의 상수를 보관합니다.',
      overrideLimitsP:
        '디바이스와 진입점, 정규화한 상수, fp64 방식이 모두 같을 때 기존 파이프라인을 다시 씁니다. 워크그룹 크기는 실제 측정값으로 정합니다. CPU tier에서는 같은 상수를 받는 클로저로 실행하며, 워크그룹 할당 크기도 제한됩니다. 배리어를 사용할 수 있는 실행 tier는 GPU입니다. WebGL2에서는 일반 상수를 고정할 수 있지만, 워크그룹 모양이나 공유 배열 길이를 바꾸는 상수는 거부됩니다. [host-compute 예제](exampleHostCompute)에서 기본 호출과 상수를 지정한 직접 호출, 디바이스 계획을 확인할 수 있습니다. 마지막 워크그룹이 일부만 채워지는 입력도 검사합니다.',
      loadH: '프로그램 불러오기',
      loadP:
        '엔진이나 렌더러처럼 프레임을 직접 그리는 호스트는 컴파일된 프로그램을 프로그램 런타임 `typeshade/runtime`에 불러와 실행합니다. 프로그램은 매니페스트라는 객체 하나로 전달되며, 여기에 셰이더 코드와 바인딩, 진입점이 모두 들어 있습니다. `packModule(compile(source).module)`이 이 객체를 돌려주고, 호스트에서 모듈을 가져오면 기본 내보내기로 받습니다. 평범한 JSON이어서 빌드가 디스크에 그대로 쓸 수도 있습니다.',
      loadOwnsP:
        '이때 위 표에서 애플리케이션이 하던 일은 대부분 런타임이 맡습니다. `createRuntime({ device })`에 애플리케이션의 `GPUDevice`를 넘기면 그 디바이스를 쓰되 파괴하지는 않고, 넘기지 않으면 프로그램에 필요한 기능과 한도, `createRuntime({ limits })`가 정한 한도를 갖춘 디바이스를 직접 요청합니다. 파이프라인과 바인드 그룹은 매니페스트에 적힌 레이아웃대로 만듭니다. 그리기나 디스패치가 이름으로 넘긴 값으로 바인딩을 채우고, 버퍼와 텍스처, 샘플러도 런타임이 만듭니다. 애플리케이션은 컴파일러가 알 수 없는 것을 정합니다. 파이프라인별 타깃과 깊이, 토폴로지, 그리고 프레임을 언제 그릴지가 여기에 속합니다. 애플리케이션이 직접 만든 `GPUBuffer`, `GPUTexture`, `GPUSampler`는 그대로 바인딩되고, 프레임의 `encoder`와 패스의 `raw` 인코더에는 애플리케이션 자신의 명령을 기록할 수 있습니다.',
      loadOptionsP:
        '프로그램의 override 값은 이름으로 지정합니다. 그릴 때는 `RenderState.constants`, 디스패치할 때는 `Program.compute()`의 `constants` 옵션으로 넘깁니다. 컴퓨트 파이프라인은 진입점의 기본값과 선택한 값으로 `workgroupShape`를 결정하므로 디스패치 수를 계산하기 전에 이 값을 읽습니다. 런타임은 선택한 모양이 현재 WebGPU 디바이스의 한도 안에 있는지 확인합니다. `Frame.submit()`은 기록한 진입점마다 콘솔 줄 수와 버퍼 공간이 부족해 기록하지 못한 호출 수를 돌려줍니다. 콘솔 sink를 쓰는 호스트는 이 수치로 누락된 호출을 알릴 수 있습니다.',
      loadEmitP:
        '빌드 뒤에 콘솔 기록을 켜는 호스트는 `typeshade/emit`의 `repack`을 `createRuntime({ emit: repack })`으로 넘길 수 있습니다. 이때 매니페스트는 `packModule(module, { ir: true })`로 만들어 이식 가능한 IR을 담아야 합니다. 로드 시점 이미터는 매니페스트에 저장된 emit 옵션을 쓰며, TypeScript 프런트엔드를 포함하지 않습니다. 퓨즈 스코프인 `typeshade/fuse`의 `fuse`도 이미터와 나란히 있다(규칙 11.11). `device.fuse()`는 등록용 import 없이 호출을 기록하고, 필요할 때 플래너를 불러옵니다. 본문은 호출한 자리에서 동기적으로 한 번 실행하며, 대기 중인 호출과 읽기의 순서는 유지됩니다. 명시적인 import도 계속 지원합니다.',
      loadNote:
        '프로그램 런타임은 WebGPU와 WebGL2를 지원합니다. WebGL2에서는 프래그먼트를 그리며, 지원하는 컴퓨트 진입점은 생성된 GLSL ES 3.00 패스로 실행합니다.',
      reflectionH: '리플렉션',
      reflectionP: `\`reflect()\`는 컴파일된 모듈을 읽어 그 바인딩을 돌려준다. 셰이더가 선언한 그룹과 번호, 주소 공간, 셰이더에 필요한 접근 권한이 들어 있고, 유니폼 구조체라면 ${facts.layoutStandards.join('과 ')} 레이아웃에 따른 필드별 오프셋과 크기도 함께 있습니다. 호스트는 그 목록으로 바인드 그룹 레이아웃 항목을 만들고, 그 오프셋대로 유니폼 버퍼를 채웁니다. 셰이더를 컴파일할 때 쓰인 수치를 호스트가 그대로 쓰므로 양쪽이 어긋나지 않습니다.`,
      reflectionNote:
        '셰이더에서 필드 이름을 바꾸면 다음 빌드에서 리플렉션이 따라 바뀌고, 리플렉션을 읽는 호스트 코드도 함께 따라옵니다.',
      runtimeH: '런타임',
      runtimeP: `호스트가 컴파일하는 모듈은 브라우저에서 TypeShade의 어떤 코드도 필요로 하지 않는다. 컴파일러는 셰이더 텍스트가 만들어지는 곳에서 돌아간다. 빌드, 테스트, 그리고 [언어 서비스](languageService)를 거친 편집기가 그런 곳이다. 브라우저에 도달하는 것은 생성된 셰이더 소스와, 애플리케이션이 원래 쓰던 호스트 코드뿐이다. 호스트가 가져오는 모듈은 \`typeshade/runtime\`을 번들에 싣는다. 호출은 이 코드에서 실행되고, 컴파일러는 번들에 들어가지 않는다. Vite 플러그인이 번들을 만들 때 모듈을 컴파일하기 때문이다. 호출은 브라우저가 가진 첫 tier(호출이 실행되는 백엔드)에서 실행되며, 순서는 WebGPU, WebGL2, CPU이다. \`configure({ prefer })\`는 compute 진입점과 커널 함수가 시도할 tier의 순서를 정하고, \`Resident\`는 호출과 호출 사이에 배열을 GPU에 둔다. 프로그램 런타임에 프로그램을 불러오는 호스트도 같은 \`typeshade/runtime\`과 매니페스트만 싣고, 컴파일러는 싣지 않는다. TypeShade가 설치하는 런타임 의존성은 ${facts.runtimeDeps}개, \`compile()\`과 언어 서비스가 소스를 읽을 때 쓰는 TypeScript뿐이다.`,
      runtimeOwnerP:
        '호스트는 `typeshade/runtime`의 `createDevice()`로 호출의 소유자를 따로 열 수도 있다(규칙 11.8). 소유자는 `prefer`에서 처음 열리는 tier나 호스트가 이미 가진 `GPUDevice`, 또는 프로그램 런타임의 디바이스(`createDevice({ runtime })`) 위에 열립니다. `device.array()`는 그 호출이 받는 `Resident` 배열을 만들고, `device.fuse()`는 호출 체인을 그 디바이스에서 계획 하나로 실행합니다. 일반 호출은 배열과 텍스처의 유일한 소유자를 선택합니다. 소유자가 있는 리소스가 없으면 기본 소유자를 씁니다. 여러 소유자가 섞이면 실행 전에 거부하며, 소유권과 수명 검사는 유지됩니다. 디바이스를 정하는 `prefer`, `device`, `runtime` 옵션은 함께 지정할 수 없습니다. 소유자는 에뮬레이션 배정밀도의 플레이버(`createDevice({ fp64Flavor })`)와, 긴 커널의 청크 하나가 쓸 수 있는 시간(`createDevice({ timeBudgetMs })`)도 정합니다. `fp64Flavor`를 생략하면 실제 디바이스나 컨텍스트에서 자동으로 선택하며, 명시적인 재정의도 지원합니다. `configure()`, `resident()`, `fuse()`는 이전처럼 기본 소유자를 다룹니다.',
      runtimeInfoP:
        '`buildInfo`는 패키지 버전과, 확인할 수 있을 때만 정확한 소스 리비전을 제공합니다. 수정되었거나 빌드 결과가 오래되었거나 리비전이 기록되지 않은 빌드는 `revision: null`이입니다. `device.info`와 `runtime.info`는 실제로 열린 디바이스나 컨텍스트의 고정된 기록입니다. 직렬화할 수 있으며, 디바이스를 잃거나 해제한 뒤에도 읽을 수 있습니다. WebGPU 식별 정보에는 출처가 표시되고, 기능과 한도는 활성화된 디바이스의 값입니다. 알 수 없는 식별 정보는 그대로 남깁니다. WebGL 문자열은 실제 컨텍스트에서 읽습니다. 이 정보는 개별 호출의 실행 tier를 나타내거나 보고서를 전송하지 않습니다. 런타임 빌드, 프로그램을 만든 컴파일러, 벤치마크 워크로드의 출처는 각각 기록합니다.',
      webgl2H: 'WebGL2에서 달라지는 것',
      webgl2P: '같은 소스가 WebGL2용으로도 컴파일되고, 호스트 쪽 모습은 달라집니다.',
      webgl2Items: [
        '바인드 그룹이 없습니다. 유니폼 블록은 링크된 프로그램의 바인딩 지점에 묶이고 샘플러는 유니폼 위치로 설정하므로, 호스트는 같은 리플렉션을 다른 모양으로 씁니다.',
        `WebGL2에는 네이티브 컴퓨트 스테이지가 없다. TypeShade는 지원하는 \`@compute\` 진입점을 ${glsl} 패스로 변환합니다. 변환할 수 없는 진입점은 매니페스트에 이유를 남깁니다.`,
        `정밀도는 소스의 몫입니다. 생성된 ${glsl} 프로그램은 선언들 위에 기본 정밀도를 적어 두며, WGSL에는 그럴 필요가 없습니다.`,
        'GPU 기능은 호스트가 컨텍스트에 확장을 요청해서 켭니다. 지시문이 있는 확장이라면 생성된 소스도 그 확장을 선언합니다. 컴파일러가 이 두 몫을 어떻게 나누는지는 [컴파일러 내부](internals)가 설명합니다.',
      ],
      furtherH: '더 읽을 자료',
      furtherItems: [
        '[MDN WebGPU API](mdnWebgpu)와 [MDN GPUBindGroupLayout](mdnBindGroupLayout)은 호스트 객체와 바인드 그룹 레이아웃을 설명합니다.',
        '[MDN WebGL2RenderingContext](mdnWebgl2)는 그 이전 세대의 컨텍스트이며, WebGL2 경로가 쓰는 유니폼과 샘플러 호출이 여기에 있습니다.',
        '[WebGPU 명세](specWebgpu)와 [WebGL2 명세](specWebgl2)가 두 호스트 API를 정의합니다.',
      ],
      nextP: '[WGSL과 GLSL](conceptsWgsl)은 같은 소스에서 생성한 두 타깃의 코드를 비교합니다.',
    },

    wgslAndGlsl: {
      title: `WGSL과 ${glsl} 비교: 두 언어가 다른 곳과 한 소스에서 나온 코드`,
      description: `WGSL과 ${glsl}을 셰이더 하나로 비교합니다. 타입, builtin 변수, 함수 이름이 어디서 다른지 TypeShade 컴파일러가 쓴 코드로 보여 줍니다.`,
      h1: `WGSL과 ${glsl} 비교`,
      lead: `\`"use typeshade"\` 파일 하나가 WebGPU에는 WGSL로, WebGL2에는 ${glsl}로 도착합니다. 컴파일러가 표기하는 내장 함수는 ${facts.builtins}개이고, 그중 ${facts.portableBuiltins}개는 두 언어에서 똑같이 씁니다. 이 페이지의 코드 블록은 페이지를 빌드하는 동안 바로 위의 파일에서 컴파일한 결과이며, 사용한 컴파일러는 ${facts.pinnedCommit}에 고정된 판입니다.`,
      sourceH: '소스',
      sourceP:
        '삼각형 하나입니다. 버텍스 진입점이 위치를 정하고 프래그먼트 진입점이 색을 칠합니다. 구조체 두 개가 스테이지마다 출력 모양을 지정합니다.',
      sourceLabel: 'hello.shade.ts',
      wgslH: 'WGSL',
      wgslP:
        'WGSL은 WebGPU 디바이스가 받아들이는 언어이고, 모듈 하나가 모든 스테이지를 담습니다. 구조체는 구조체로 남고, 진입점은 각자의 스테이지 속성을 그대로 지니며, builtin 입력은 그 값을 받는 매개변수의 속성으로 남습니다.',
      wgslLabel: '생성된 WGSL 모듈',
      glslH: `${glsl}`,
      glslP:
        'WebGL2 프로그램은 버텍스 셰이더 하나와 프래그먼트 셰이더 하나를 링크해 만들기 때문에, 컴파일러는 스테이지마다 별도의 프로그램을 생성합니다. 각 프로그램은 버전 줄과 기본 정밀도로 시작하고, 버텍스 번호는 언어가 예약해 둔 이름으로 들어오며, 프래그먼트 출력은 선언된 out 변수가 됩니다.',
      glslVertexLabel: `생성된 ${glsl} 버텍스 셰이더`,
      glslFragmentLabel: `생성된 ${glsl} 프래그먼트 셰이더`,
      diffH: '타깃이 갈라지는 지점',
      diffP: `차이마다 그 차이를 다루는 가이드 페이지의 이름을 붙였습니다. 두 언어가 어긋나는 곳에서는 WGSL이 구성 요소의 뜻을 정하고, ${facts.glslTarget}은 컴파일러가 코드를 써 내는 대상일 뿐이다(규칙 1.2).`,
      diffColumns: ['달라지는 것', 'WGSL', `${glsl}`],
      diffRows: [
        [
          '[셰이더 스테이지](languageStages)',
          '`@compute` 진입점은 워크그룹 크기를 담은 컴퓨트 셰이더를 생성합니다.',
          'WebGL2에는 네이티브 컴퓨트 스테이지가 없습니다. 지원하는 진입점은 GLSL ES 3.00 패스로 변환해 실행합니다.',
        ],
        [
          '[정밀도](languageGpuTypes)',
          '타입이 자기 폭을 지니므로 프로그램은 아무것도 선언하지 않습니다.',
          '프로그램이 부동소수점과 정수의 기본 정밀도를 먼저 선언합니다.',
        ],
        [
          '[builtin 입력](languageStages)',
          'builtin은 그 값을 받는 매개변수의 속성으로 남습니다.',
          'builtin은 언어가 예약해 둔 이름이 되고, 매개변수는 사라집니다.',
        ],
        [
          '[스테이지 출력](languageTypes)',
          '스테이지는 필드마다 location을 지닌 구조체를 돌려줍니다.',
          '스테이지는 선언된 out 변수에 쓰고, 위치는 예약된 변수로 갑니다.',
        ],
        [
          '[확장](internals)',
          'GPU 기능은 모듈 맨 위의 선언으로 켭니다.',
          'GPU 기능은 전처리기 줄로 켜고, 호스트도 컨텍스트에 해당 확장을 요청합니다.',
        ],
      ],
      namesH: '이름이 다른 곳',
      namesP: `행 하나가 구성 요소 하나입니다. ${glsl} 칸과 WGSL 칸은 ${facts.pinnedCommit}의 컴파일러가 TypeShade 칸의 소스에서 생성한 코드입니다. 컴파일러가 표기를 바꾸면 고정된 컴파일러 버전을 갱신할 때 이 표도 바뀝니다.`,
      typesH: '타입',
      variablesH: 'builtin 변수',
      functionsH: '함수',
      meaningH: '이름은 같고 뜻이 다른 곳',
      meaningP:
        '몇몇 이름은 두 언어에 다 있지만 뜻이 다릅니다. GLSL의 `mod`는 몫을 내림하고, WGSL의 `%`는 몫의 소수 부분을 버립니다. WGSL의 `round`는 딱 절반인 값을 짝수 쪽으로 보내고 GLSL은 어느 쪽으로든 보낼 수 있어서, 컴파일러는 `roundEven`을 씁니다. TypeShade에는 `mod`와 `%`가 둘 다 있고, 컴파일러는 타깃마다 같은 뜻이 되는 코드를 씁니다.',
      swizzleP:
        'GLSL은 `c.xy = uv`처럼 여러 성분에 한 번에 대입할 수 있습니다. WGSL은 성분을 하나씩 쓰므로 컴파일러는 이 대입을 `TS8018`로 거부합니다. `c.x = uv.x`처럼 성분 하나에 대입하면 컴파일됩니다.',
      colGlsl: `${glsl}`,
      colWgsl: 'WGSL',
      colSource: 'TypeShade',
      convertH: '기존 셰이더 옮기기',
      convertP: `\`compile()\`이 읽는 소스는 TypeScript로 쓴 \`"use typeshade"\` 파일 한 종류뿐이다. 컴파일러에는 GLSL이나 WGSL을 읽는 프런트엔드가 없다. 그래서 두 언어 가운데 하나로 쓴 셰이더는 TypeScript로 한 번 다시 쓴다. 그러면 컴파일러가 그 파일 하나에서 WGSL과 ${glsl}을 만듭니다.`,
      convertItems: [
        `GLSL에서: [GLSL 셰이더 옮기기](internalsGlslShader)는 유니폼 블록, \`#ifdef\`, \`#include\`, \`#extension\`처럼 셰이더 전체에 걸린 것을 다룬다. [${glsl}을 TypeShade로](languageFromGlsl)에는 타입, 유니폼, builtin 변수, 함수가 있습니다.`,
        'WGSL에서: [WGSL을 TypeShade로](languageFromWgsl)에서 WGSL 구성 요소마다 TypeShade 표기를 찾습니다.',
        'WGSL에만 있는 것: 그런 구성 요소를 쓴 파일도 컴파일됩니다. 스칼라 유니폼, 드로우 안의 `"read_write"` 스토리지 바인딩, `@interpolate("linear")`가 그 예입니다. 이때 `compile()`은 WGSL을 남기고 `glsl`을 undefined로 두며, 그 까닭을 `TS8015` 경고로 알립니다.',
      ],
      furtherH: '더 읽을 자료',
      furtherItems: [
        '[WGSL 명세](specWgsl)가 두 타깃 가운데 첫 번째를 정의합니다.',
        `[${glsl} 명세](specGlslEs)와 [WebGL2 명세](specWebgl2)가 두 번째를 정의합니다.`,
        '[MDN WebGPU API](mdnWebgpu)와 [MDN WebGL2RenderingContext](mdnWebgl2)에서 호스트가 각각을 드라이버에 어떻게 넘기는지 볼 수 있습니다.',
        `언어 참조의 [함수](referenceFunctions)에는 내장 함수마다 컴파일러가 쓰는 WGSL과 ${glsl} 코드가 있고, [타입](referenceTypes)에는 타입마다 같은 내용이 있습니다.`,
        `[내장 함수](languageBuiltins) 페이지 하나에 내장 함수 ${facts.builtins}개가 모두 있고, 백엔드마다 쓰는 코드가 함께 있습니다. 그중 ${facts.glslAbsentBuiltins}개는 ${glsl} 형태가 없습니다.`,
      ],
      nextP:
        '다음은 [예제](examples)입니다. 컴파일러 레지스트리의 예제마다 어떤 타깃을 생성하는지 적혀 있습니다.',
    },
  },

  languageService: {
    title: '에디터와 언어 서버가 쓰는 TypeShade 언어 서비스',
    description:
      'Playground 뒤에서 일하는 에디터 중립 계층입니다. TypeScript와 TypeShade 진단, 자동 완성, 호버, 이름 바꾸기, 컴파일 결과를 문서 API 하나로 답합니다.',
    h1: '언어 서비스',
    intro:
      '컴파일러 프런트엔드와 에디터 사이에는 텍스트와 위치를 받아 데이터를 돌려주는 계층이 있습니다. 이것이 언어 서비스입니다. DOM이나 Node API는 건드리지 않습니다. 지금은 Playground가 Monaco 에디터를 통해 진단, 자동 완성, 호버를 여기에서 읽고, [VS Code 확장](editor)은 TypeScript 서버 플러그인을 통해 같은 답을 읽습니다. 그래서 둘이 서로 어긋날 수 없습니다. 다른 에디터를 위한 언어 서버는 아직 공개하지 않았습니다.',
    layersH: '계층',
    layersP:
      '프런트엔드는 `"use typeshade"` 파일을 파싱하고 타입, 구조체, 바인딩을 검사한 뒤 소스 위치가 붙은 진단을 보고합니다. 언어 서비스는 두 층 위에 놓입니다. 하나는 그 프런트엔드이고, 다른 하나는 TypeShade 전역을 선언한 앰비언트 선언 위에서 돌아가는 TypeScript 언어 서비스입니다. 문서를 `uri`로 들고 있다가 그 문서에 관한 요청에 답합니다. 어댑터는 그 위에서 의미와 무관한 일만 맡습니다. Playground의 Monaco 어댑터는 좌표를 바꾸고 에디터의 마커를 관리하며, LSP 서버는 같은 답을 JSON-RPC로 옮길 뿐입니다. TypeShade에 관한 판단은 서비스 안에 두고, 어댑터는 형식만 바꿉니다.',
    requestsH: '요청',
    requestsP: '에디터가 보내는 요청은 문서 API 하나로 답합니다.',
    requests: [
      [
        '진단',
        'TypeScript 진단과 TypeShade 진단을 한 목록으로 돌려줍니다. 항목마다 `typeshade` 또는 `typescript`라는 `source`와 코드가 붙어 있어 어댑터가 둘을 구분할 수 있고, TypeScript 구문 오류는 TypeScript 코드로 한 번만 나타납니다.',
      ],
      [
        '자동 완성',
        '범위 안의 심볼과 키워드, 그리고 문맥에 맞는 TypeShade 항목을 제안합니다. `@` 뒤에는 속성 이름, `@builtin("` 안에는 내장 입력 이름, 타입 자리에는 GPU 타입 이름, 그리고 벡터와 진입 함수의 스니펫입니다.',
      ],
      [
        '호버',
        '심볼의 요약 정보를 보여 줍니다. TypeScript가 `number`라고 할 자리에 TypeShade 타입 이름을 쓰고, GPU 타입, 속성, 내장 입력의 설명을 붙입니다.',
      ],
      ['시그니처 도움말', '커서 아래 함수의 시그니처와 지금 입력하는 매개변수입니다.'],
      ['정의와 참조', '심볼이 선언된 곳과 쓰인 곳을 서비스가 들고 있는 모든 문서에서 찾습니다.'],
      [
        '문서 심볼',
        '문서의 함수, 구조체, 필드, 리소스를 개요로 정리하고, 진입 함수에는 스테이지를 표시합니다.',
      ],
      [
        '이름 바꾸기',
        '심볼을 쓰는 모든 문서에 적용할 편집 목록을 돌려줍니다. 그 위치의 이름을 바꿀 수 있는지 먼저 확인합니다.',
      ],
      [
        '시맨틱 토큰',
        '문서 순서대로 늘어놓은 토큰입니다. GPU 타입, 진입 함수, 리소스, `@builtin(...)` 안의 이름에는 종류를 표시합니다.',
      ],
      [
        '컴파일 결과',
        '문서를 컴파일한 WGSL 또는 GLSL을 출력 창이 요청할 때만 만듭니다. 진단은 셰이더 텍스트를 만들지 않으므로 키 입력마다 백엔드가 돌지 않습니다.',
      ],
    ],
    documentsH: '문서와 위치',
    documentsP1:
      '`typeshade/language-service` 하위 경로에서 `createTypeshadeLanguageService`를 가져오고, 문서를 `uri`와 텍스트, 선택적인 버전으로 엽니다. 내용이 바뀔 때마다 전체 텍스트로 갱신하고, 에디터가 문서를 닫으면 함께 닫습니다. 다른 메서드는 모두 `uri`를 받고, 필요한 경우 위치를 함께 받습니다. 서비스 안에는 비동기 동작이 없으며, 오래된 버전의 결과를 버리는 일은 어댑터가 맡습니다.',
    documentsP2:
      '위치는 줄과 문자의 쌍이며 둘 다 영에서 시작하고, 문자는 UTF-16 코드 단위로 셉니다. 범위는 끝을 포함하지 않는 반개구간입니다. LSP가 쓰는 규약 그대로이므로 언어 서버는 필드를 그대로 넘기면 됩니다. Monaco는 하나부터 세기 때문에 Playground의 어댑터가 자기 쪽에서 하나를 더하고, 돌아올 때 다시 뺍니다. 두 좌표계가 만나는 곳은 그 어댑터 하나뿐입니다.',
    documentsP3:
      '문서는 상대 경로로 다른 셰이더 파일을 가져올 수 있고, 패키지의 파일은 패키지 이름으로 가져옵니다. 패키지는 Node가 찾는 방식대로 `node_modules`에서 찾는다(규칙 3.9). 서비스는 그 가져오기를 `compile()`이 따르는 규칙대로, 또는 넘겨준 `resolveImport`로 문서의 `uri`에 대해 해석합니다. 열지 않은 파일은 `readDocument`로 읽으며, 이 함수는 파일의 텍스트를 돌려주고 그런 파일이 없으면 `undefined`를 돌려줍니다. 각 패키지의 `package.json`도 이 함수에 요청합니다. `compile()`도 같은 두 옵션을 받으므로 편집기와 컴파일러는 한 프로그램을 읽고, 둘 다 따라갈 수 없는 가져오기는 양쪽에서 `TS8072`가 됩니다.',
    packagingH: '패키지 구성',
    packagingP:
      '이 서비스는 `typescript` 위에서 돌아가며, 패키지는 이것을 필수 피어 의존성으로 둡니다. `compile()`이 `"use typeshade"` 파일을 TypeScript 파서로 읽기 때문에 기본 진입점에도 필요합니다. 그래서 컴파일러만 가져오는 프로그램도 TypeScript를 함께 설치하고, `typeshade/language-service`는 같은 패키지를 그대로 씁니다.',
    exampleH: '예제',
    exampleP:
      '호스트가 문서 하나를 열고, 진단과 한 위치의 호버를 요청하고, 출력 창을 위해 컴파일합니다.',
    furtherH: '더 읽을 자료',
    furtherP:
      '[Playground](playground)는 브라우저에서 돌아가는 이 서비스입니다. 컴파일러 저장소의 [설계 문서](languageServiceDesign)는 고정한 커밋 기준으로 규약, 어댑터 계약, 작업 순서를 기록합니다.',
  },

  // /guide/editor/ 페이지입니다. 확장의 README가 말하는 것만 적었고, 웹 시험이 확인한 범위와
  // 확인하지 않은 범위도 README 그대로 옮겼습니다.
  editor: {
    title: '에디터 지원, VS Code에서 TypeShade 쓰기',
    description:
      'VS Code 확장 TypeShade를 설치하는 방법과, "use typeshade" 파일에서 데스크톱 VS Code와 웹용 VS Code가 각각 해 주는 일을 설명합니다.',
    h1: '에디터 지원',
    intro:
      'TypeShade에는 VS Code 확장이 있습니다. `"use typeshade"`로 시작하는 파일에서 컴파일러가 내는 진단과 호버, 자동 완성을 보여 주고, 파일이 컴파일되는 WGSL과 GLSL을 미리 볼 수 있게 합니다.',
    installH: '설치',
    installP:
      '`typeshade.vscode-typeshade`를 [Visual Studio Marketplace](extensionMarketplace)에서 설치합니다. Open VSX에서 확장을 받는 에디터는 [Open VSX](extensionOpenVsx)를 씁니다. 터미널에서는 한 줄로 설치합니다.',
    installLabel: '명령줄에서 설치',
    installP2:
      '데스크톱에서는 VS Code 1.90 이상이 필요합니다. 확장은 작업 영역이 쓰는 TypeScript 버전에 TypeScript 서버 플러그인을 켜 주므로, 자체 `typescript`를 고정해 둔 저장소에서도 플러그인이 동작합니다.',
    desktopH: 'VS Code에서',
    desktopP: '`"use typeshade"`로 시작하는 파일을 열면 확장이 컴파일러와 같은 기준으로 답합니다.',
    desktopItems: [
      '진단, 호버, 자동 완성, 시그니처 도움말, 정의로 이동, 참조, 이름 바꾸기는 TypeScript 서버 플러그인을 거쳐 TypeShade 언어 서비스가 답합니다. 셰이더 파일에 뜨던 TypeScript 자체의 오류는 사라지고, 다른 TypeScript 파일은 그대로 둡니다.',
      '`TypeShade: Show WGSL`, `TypeShade: Show GLSL`, `TypeShade: Show Reflection`은 에디터 옆에 미리 보기를 엽니다. 미리 보기는 활성 파일을 따라가며 입력할 때마다 다시 컴파일합니다.',
      '`TypeShade: Show Canvas`는 미리 보기에서 셰이더를 WebGPU로 그립니다. WebGPU 어댑터가 있는 VS Code 웹뷰가 필요하며, 어댑터가 없으면 그렇다는 안내를 보여 줍니다.',
      '`TypeShade: Run Entry on CPU`는 파일의 함수 하나를 입력한 인자로 CPU에서 실행합니다.',
    ],
    webH: '웹용 VS Code',
    webP: 'vscode.dev를 비롯한 웹용 VS Code 페이지에서는 같은 플러그인이 셰이더 파일에 진단, 호버, 셰이더 파일 사이의 import를 제공합니다. 위 명령은 모두 데스크톱 버전이 필요합니다. 웹에서는 명령마다 그렇다는 메시지만 보여 줍니다.',
    webConditionsP: '조건이 두 가지 있습니다.',
    webConditions: [
      '웹용 VS Code 1.110 이상. 이보다 낮은 버전은 플러그인을 불러오지 않아서 셰이더 파일에 TypeScript 자체의 오류가 그대로 남습니다.',
      '교차 출처 격리(cross-origin isolated)가 된 페이지. 격리되지 않으면 TypeScript 서버가 브라우저에서 의미 검사를 하지 않으므로 TypeShade도 TypeScript도 오류를 보고하지 않습니다. 직접 호스팅하는 웹용 VS Code에는 `Cross-Origin-Opener-Policy`와 `Cross-Origin-Embedder-Policy` 헤더가 필요합니다.',
    ],
    webTestedP:
      '조건이 하나라도 빠지면 확장이 경고를 한 번 보여 줍니다. 웹 빌드는 Chromium에서 웹용 VS Code 1.110과 1.139.1로 시험했고 다른 브라우저는 써 보지 않았습니다. vscode.dev에서는 배포된 확장을 직접 확인했습니다. 페이지와 TypeScript 서버가 교차 출처 격리 상태이고, 진단과 호버가 나타납니다. github.dev는 확인하지 않았고, 자동 완성, 시그니처 도움말, 참조, 이름 바꾸기에는 브라우저 시험이 없습니다.',
    roundH: 'Playground 연동',
    roundP1:
      '[Playground](playground)의 폴더로 내려받기 버튼은 작업 영역을 폴더째 담은 zip 파일로 내려받습니다. 폴더에는 파일, 메인 파일과 패스를 적은 `typeshade.json`, 이 확장을 권장하는 설정이 들어 있습니다. 바로 옆의 VS Code에서 열기 버튼은 작업 영역을 확장에 넘기고, 확장은 폴더를 물은 뒤 파일을 쓰고 그 폴더를 엽니다.',
    roundP2:
      '반대 방향에서는 `TypeShade: Open in Playground`가 활성 파일과 그 파일이 가져오는 파일, 패스를 Playground에서 엽니다. `TypeShade: Open Playground Link`는 Playground 링크가 담은 작업 영역을 폴더에 쓰고 엽니다. 두 명령 모두 데스크톱 버전이 필요합니다.',
    agentsH: '코딩 에이전트',
    agentsP:
      '[`@typeshade/mcp`](mcpPackage)는 npm으로 받는 Model Context Protocol 서버입니다. 코딩 에이전트에 에디터가 보여 주는 진단, 컴파일러가 내는 WGSL과 GLSL, 타입과 탐색 정보, 셰이더 함수의 CPU 실행 결과를 줍니다. Claude Code, Codex, Cursor, VS Code 에이전트 모드, Gemini CLI가 이 서버를 실행할 수 있습니다. Claude Code에서는 플러그인 하나가 서버와, 언어를 가르치는 스킬을 함께 설치합니다.',
    agentsLabel: 'Claude Code 플러그인 설치',
    agentsP2:
      '다른 클라이언트는 `npx -y @typeshade/mcp`를 실행하며, 클라이언트별 설정은 [패키지 README](mcpReadme)에 있습니다.',
    sourceP: '확장과 서버는 [typeshade/vscode-typeshade](extensionSource) 저장소에서 개발합니다.',
  },

  examples: {
    path: {
      h: '예제로 배우는 순서',
      p: '각 단계는 Language Guide의 한 개념을 실제 shader 작성으로 연결합니다.',
      steps: [
        {
          title: '1. 첫 shader',
          text: '"use typeshade" 파일의 기본 형태와 shader entry를 먼저 익힙니다.',
          label: 'Quick start',
          linkKey: 'quickStart',
        },
        {
          title: '2. 값과 타입',
          text: 'TypeScript의 type/class가 GPU value layout으로 어떻게 내려가는지 봅니다.',
          label: 'Types',
          linkKey: 'languageTypes',
        },
        {
          title: '3. 계산을 함수로',
          text: 'helper function과 stage entry를 조합해 실제 shader 계산을 구성합니다.',
          label: 'Functions',
          linkKey: 'languageFunctions',
        },
        {
          title: '4. GPU 데이터',
          text: 'vector, matrix, array와 host-owned resource를 연결합니다.',
          label: 'Resources',
          linkKey: 'languageResources',
        },
        {
          title: '5. 실제 예제',
          text: '저장소의 예제를 읽으며 여러 개념을 하나의 shader로 조합합니다.',
          label: 'Source examples',
          linkKey: 'examplesDir',
        },
      ],
    },
    title: `TypeShade 예제 ${facts.shadeExamples}개, GLSL 출력, 에뮬레이션 f64`,
    description: `TypeShade 예제 ${facts.shadeExamples}개, gradient 패스의 ${glsl} 출력, 에뮬레이션 배정밀도를 보여 주는 딥 줌 데모.`,
    h1: '예제',
    intro: `저장소에는 실행할 수 있는 예제가 ${facts.shadeExamples}개 있습니다. 지도용 패스와 ShaderToy 시절의 화면 공간 효과부터 컴퓨트 커널까지 다루며, 그 가운데 ${facts.fp64Examples}개는 에뮬레이션 배정밀도를 씁니다. [예제 디렉터리](examplesDir)에서 둘러볼 수 있습니다.`,
    wgslOnly: 'WGSL 전용',
    noStill: '그림 없음: 이 예제는 페이지가 그릴 수 있는 것이 아닙니다.',
    runtime: {
      h: '이 빌드 이후에 추가된 예제',
      p: '컴파일러에는 있지만 이 사이트 빌드에는 아직 없는 예제입니다. 각 페이지는 컴파일러의 main 브랜치가 게시한 예제 데이터로 채웁니다.',
    },
    shade: {
      h: 'TypeScript 소스로 쓴 예제',
      p: `예제는 모두 \`"use typeshade"\`로 시작하는 TypeScript 파일이고, \`compile()\`이 파일의 바이트를 그대로 읽어 컴파일한다. 파일마다 언어의 한 부분을 보여 주므로 이 페이지에서도 언어 기능별로 분류한다. 이 가운데 ${facts.shadeRenderable}개는 ${glsl} 형태가 있고, 나머지는 WGSL만 생성합니다. 페이지가 그릴 수 있는 예제에는 그림이 붙습니다.`,
      groups: {
        cartographic: '지도',
        screen: '화면 공간',
        stages: '스테이지와 IO 구조체',
        resources: '리소스',
        values: '값과 제어 흐름',
        classes: '클래스와 제네릭',
        imports: '가져오기',
        passes: '여러 패스',
        compute: '모듈 상태와 컴퓨트',
        kernels: '커널이 되는 루프',
      },
      titles: {
        hello: '헬로 삼각형',
        'hello-vsout': '헬로 varying',
        'hello-vsin': '헬로 버텍스 속성',
        'bare-position': '위치만 돌려주는 버텍스',
        'twin-structs': '같은 IO 구조체 둘',
        'hello-uniform': '헬로 유니폼',
        'hello-uniform-struct': '헬로 유니폼 블록',
        'hello-camera': '헬로 카메라 유니폼',
        'textured-quad': '텍스처, 샘플러, 오버라이드',
        'array-length': '런타임 배열 길이',
        'storage-texture': '스토리지 텍스처',
        'shadow-compare': '비교로 읽는 그림자 맵',
        'cube-env': '큐브와 3D 텍스처, 바이어스와 그레이디언트',
        'cube-array-gather': 'WGSL에만 있는 텍스처',
        'msaa-resolve': '직접 리졸브하는 멀티샘플 텍스처',
        'module-const': '모듈 상수',
        'palette-const': '모듈의 벡터 상수와 배열 상수',
        'array-literal-ramp': '배열 리터럴',
        'convert-grid': '변환하는 생성자',
        'normal-matrix': 'mat4 너머의 행렬',
        'fp64-lane-stripes': '에뮬레이션 배정밀도',
        'bitfield-bands': '비트 필드 띠',
        'block-scope': '블록 스코프',
        'pick-composite': '구조체와 배열을 고르는 조건식',
        cutout: '컷아웃 (소스 언어)',
        'default-args': '매개변수 기본값',
        'reference-parameters': '되돌려 쓰는 매개변수: @inout과 @out',
        'bit-bump': '내장 함수 한 바퀴',
        'bool-select': '불 벡터',
        'ray-class': '클래스 메서드',
        'capsule-corp-namek-class': '나메크의 캡슐 코퍼레이션 우주선',
        'orbit-inout': '자기 객체를 바꾸는 메서드',
        'particle-step': '객체를 바꾸는 메서드들',
        'shape-inheritance': '상속',
        'mixin-surface': '믹스인 패턴',
        'generic-helpers': '단형화로 만드는 제네릭',
        'generic-class': '단형화로 만드는 제네릭 클래스',
        'tuple-and-brand': '튜플과 브랜드 별칭',
        'class-syntax': '게터, 세터, 비공개 이름, 매개변수 프로퍼티',
        'rng-method': '자기 객체를 바꾸고 값을 돌려주는 메서드',
        'class-builder': '빌더 체인, 접근자의 super, 서브클래스가 물려받는 정적 멤버',
        'class-parts':
          '객체 안의 객체, 객체를 담은 const, 함수를 담은 필드, 계약으로서의 인터페이스',
        'rt-renderer-class': '클래스 기반 3D SDF 레이 트레이서',
        'imported-noise': '가져온 노이즈',
        'separable-blur': '두 패스로 나눈 블러',
        'feedback-trail': '피드백 궤적',
        closures: '주변 변수를 읽고 쓰는 로컬 함수',
        'higher-order': '함수를 받는 함수',
        'inferred-returns': '본문이 정하는 반환 타입',
        'array-methods': '배열의 메서드',
        'loops-over-data': '데이터를 도는 루프',
        'path-tracer': '경로 추적기',
        'workgroup-tile-2d': '이차원 워크그룹',
        'workgroup-override': '입력 크기에 맞춘 워크그룹',
        'loop-kernel': '커널로 도는 루프',
        'loop-reduction': '루프 안의 리덕션',
        'loop-struct-array': '구조체 배열을 도는 루프',
        'loop-on-cpu': 'CPU에서 도는 루프',
        'kernel-array-methods': '커널 함수 안의 배열 메서드',
        'kernel-image-invert': '이미지를 쓰는 커널',
        'kernel-push': 'push로 덧붙이는 커널',
        'kernel-set-unique': 'Set에 고유한 라벨을 모으는 커널',
        'private-state': '인보케이션별 상태',
        'workgroup-scratch': '워크그룹 스크래치 메모리',
        'workgroup-reduce': '워크그룹 리덕션',
        'atomic-histogram': '원자적 히스토그램',
        'gpu-console': 'GPU에서 온 콘솔 출력',
        'compute-reduction-twin': '컴퓨트 리덕션',
        'hillshade-twin': '음영 기복도',
        'plasma-twin': '플라스마',
        'julia-twin': '줄리아 집합',
        'mandelbrot-twin': '만델브로 집합',
        'domain-warp-twin': '도메인 워핑',
        'tunnel-twin': '터널',
        'ocean-twin': '바다 수평선',
        'starfield-twin': '별밭',
        'kaleidoscope-twin': '만화경',
        'gradient-twin': '그레이디언트 패스',
        'voronoi-twin': '보로노이',
        'fp64-deep-zoom-twin': 'fp64 딥 줌',
        'fp64-checker-plane-twin': 'fp64 체커 평면',
        'fp64-loran-twin': 'fp64 쌍곡선 항법',
        'fp64-rtc-twin': 'fp64 중심 기준 좌표',
        'fp64-julia-twin': 'fp64 줄리아 집합',
        'fp64-burning-ship-twin': 'fp64 버닝 십',
        'fp64-newton-twin': 'fp64 뉴턴 프랙탈',
        'fp64-mandelbrot-de-twin': 'fp64 거리 추정',
        'fp64-clock-twin': 'fp64 오래 켜 둔 시계',
        'fp64-cancellation-twin': 'fp64 파국적 상쇄',
        'fp64-sine-sweep-twin': 'fp64 사인 스윕',
        'id-pick': '정수 varying과 고를 수 없는 보간',
        'clip-planes': '사용자 클립 평면',
        'uniform-array': '목록을 담은 유니폼',
        'sample-branch': '분기 안의 샘플링과 그것을 허용하는 지시어',
        'integer-math': '정수 abs와 dot',
        'packing-bitcast': '패킹, bitcast, 생성자',
        'packed-bytes': '패킹된 4x8 정수 내장 함수',
        'compute-sync': '비교 후 교환, 유니폼 로드, 텍스처 배리어',
      },
      descriptions: {
        hello: '가장 작은 완전한 TypeShade 프로그램입니다.',
        'hello-vsout':
          '삼각형을 다시 그리되, 이번에는 버텍스 스테이지에서 프래그먼트 스테이지로 `uv` varying을 넘깁니다. 두 스테이지가 `VsOut` 클래스 하나를 함께 씁니다.',
        'hello-vsin': '`vertex_index` 대신 버퍼에서 버텍스 입력을 받습니다.',
        'bare-position': '가장 작은 렌더 쌍입니다.',
        'twin-structs':
          '필드가 똑같은 IO 구조체 둘, 곧 버텍스 출력과 프래그먼트 입력입니다. 객체 리터럴이 어느 쪽을 만드는지는 리터럴이 놓인 세 자리가 각각 정합니다.',
        'hello-uniform': '`declare const scale: uniform<f32>` 한 줄뿐입니다.',
        'hello-uniform-struct': 'GLSL ES 3.00 형태가 있는 쪽의 유니폼입니다.',
        'hello-camera':
          '`mat4`와 `vec3`를 담은 `Camera` 클래스를 `uniform<Camera>` 뒤에 두고, 평범한 헬퍼 함수가 읽습니다.',
        'textured-quad':
          '전체 화면 삼각형이 `sampler`를 거쳐 `texture_2d<f32>`를 샘플링하고, `override<f32>` 특수화 상수 두 개로 색을 입힙니다.',
        'array-length':
          '런타임 크기 스토리지 배열을 도는 커널이라면 반드시 필요한 경계 검사입니다.',
        'storage-texture':
          '컴퓨트 진입점이 텍셀 좌표로 직접 쓰는 이미지입니다. 샘플러도 필터링도 없습니다.',
        'shadow-compare':
          '`sampler_comparison`을 거쳐 깊이 텍스처를 `textureSampleCompare`와 `textureSampleCompareLevel`로 읽습니다. 평범한 2D 그림자 맵과 캐스케이드 배열 양쪽에서 씁니다.',
        'cube-env':
          '환경 맵은 방향으로 찾는 `texture_cube<f32>`, 컬러 그레이딩 표는 셰이딩한 색으로 색인하는 `texture_3d<f32>`이입니다. `textureSampleBias`와 `textureSampleGrad`를 쓰고, 점광원의 그림자는 광원에서 나가는 방향으로 비교하는 `texture_depth_cube`이입니다.',
        'cube-array-gather':
          '색상 램프는 `texture_1d<f32>`, 환경 맵 둘은 레이어로 고르는 `texture_cube_array<f32>`이입니다. `textureGatherCompare`로 퍼센티지 클로저 필터를 손으로 짜고, `textureGather`로 텍셀 네 개에서 채널 하나를 모으며, 점광원의 그림자는 `texture_depth_cube_array`이입니다.',
        'msaa-resolve':
          'MSAA 렌더 타깃을 `texture_multisampled_2d<f32>`로 두고 `textureLoad(t, coords, sampleIndex)`로 샘플을 하나씩 읽어 `textureNumSamples`만큼 평균을 구합니다. 깊이 어태치먼트는 `texture_depth_multisampled_2d`이입니다.',
        'module-const':
          '컴파일러가 허용하는 모든 스칼라 타입으로 모듈 범위 상수를 하나씩 선언합니다.',
        'palette-const':
          '전체 화면 삼각형을 모듈 범위의 `array<vec4, 3>` 팔레트와 `array<f32, 3>` 구간값으로 띠 지어 칠하고, 앞서 선언한 스칼라 상수로 만든 `vec3` 상수도 함께 씁니다.',
        'array-literal-ramp':
          '전체 화면 삼각형의 꼭짓점은 `array<f32, 3>` 목록 두 개에서 오고, 색은 `array<i32, 3>`으로 가중한 `array<vec3, 3>` 구간값에서 옵니다.',
        'convert-grid':
          '전체 화면 삼각형의 꼭짓점은 `vec2(vec2u(...))`에서 오고, 색은 `f32`에서 `u32`로 갔다가 다시 `f32`로 돌아오는 왕복에서 옵니다.',
        'normal-matrix': '`matCxR`는 모두 타입입니다.',
        'fp64-lane-stripes': '소스로 쓴 `f64` 인터페이스입니다.',
        'bitfield-bands':
          '전체 화면 삼각형의 색을 `switch`로 고릅니다. 띠 번호는 `&=`, `|=`, `<<=`, `>>=`, `^=`로 만들고, `let x: f32`는 값을 넣기 전에 먼저 선언하며, varying은 `{ pos, uv }` 축약형으로 돌려줍니다.',
        'block-scope':
          '`i`를 도는 반복문 둘이 이어지고, 반복문 본문의 `p` 옆에 `if` 분기의 `p`가 있으며, 안쪽 `p`가 바깥쪽을 가립니다.',
        'pick-composite': '분기 둘은 구조체, 다른 둘은 고정 길이 배열이고, 실행 중에 고릅니다.',
        cutout:
          '프래그먼트 진입점이 부르는 헬퍼 안에서 `discard`를 씁니다. `fwidth`가 테두리를 부드럽게 하고, `saturate`, `exp2`, `**`가 감쇠 곡선을 만듭니다.',
        'default-args': '매개변수에 기본값을 둔 헬퍼 셋입니다. 호출마다 생략하는 인자가 다릅니다.',
        'reference-parameters':
          '호출한 쪽의 변수를 바꾸는 함수들입니다. 아직 값이 없는 지역 변수에 결과를 쓰는 함수도 있습니다.',
        'bit-bump':
          '`reflect`, `refract`, `faceForward`가 범프에 빛을 주고, `transpose`와 `determinant`가 호스트 행렬을 읽으며, 비트 내장 함수(`firstLeadingBit`, `reverseBits`, `countOneBits`, `extractBits`, `insertBits`)가 화면에 띠를 만듭니다. 띠가 시작하는 자리는 `fwidthCoarse`가 표시합니다.',
        'bool-select': '벡터 둘을 비교하면 결과는 불 벡터입니다.',
        'ray-class':
          '생성자와 메서드 하나, 정적 함수 하나를 둔 `class Ray`, 그리고 `hit(ray)` 메서드가 광선을 따라간 거리를 돌려주는 `class Sphere`이입니다.',
        'capsule-corp-namek-class':
          '드래곤볼 Z의 캡슐 코퍼레이션 우주선을 나메크에 놓은 장면입니다. 우주선, 착륙 장치, 나무, 지형, 글자, 재질, 셀 셰이딩과 카메라를 공유 SDF 장면을 중심으로 TypeShade 클래스로 구성합니다.',
        'orbit-inout':
          '`class Body`의 `step`, `turn`, `advance`가 `this`에 값을 넣으므로, 각 메서드는 자기 객체를 참조로 받습니다.',
        'particle-step':
          '`class Particle`의 `step`, `bounce`, `tick`이 `this`에 값을 넣고, 스토리지 요소 위에서 호출됩니다.',
        'shape-inheritance':
          '구체 메서드 하나와 추상 메서드 하나를 둔 `abstract class Shape`, 이를 상속한 클래스 둘, 그리고 그 하위 클래스를 다시 상속해 `super`를 부르는 클래스 하나입니다.',
        'mixin-surface':
          '본문이 `return class extends Base { ... }` 하나뿐인 `function Tinted(Base)`를 서로 다른 도형 클래스 둘에 적용합니다.',
        'generic-helpers':
          '제네릭 헬퍼 셋입니다. 파일이 부를 때 쓴 인자 타입 조합마다 한 번씩 컴파일됩니다.',
        'generic-class':
          'f32와 vec3에 쓴 `class Slot<T>`이다. 모듈에는 `Slot_f32`와 `Slot_vec3`가 서로 다른 구조체로 들어가고, 저마다 생성자와 모든 메서드의 복사본을 따로 갖습니다.',
        'tuple-and-brand':
          '튜플은 타입이 길이를 정해 둔 목록이고 `array<T, N>`이 바로 그것이므로, `[f32, f32]`는 곧 `array<f32, 2>`이입니다.',
        'class-syntax': 'TypeScript 클래스를 쓰는 방식 그대로 작성한 `class Ring`이입니다.',
        'rng-method':
          '`next()`가 생성기의 상태를 앞으로 옮기고 뽑은 값을 돌려주는 `class Rng`입니다.',
        'class-builder':
          '모든 `return`이 `return this`인 메서드는 자기 객체를 돌려주므로 `a.at(p).tinted(c)`는 호출을 차례로 `a`에서 실행하고, `new Disc().at(p).sized(r)`는 `new`가 만든 값을 임시 변수에 담는다(규칙 8.10).',
        'class-parts':
          '`ring.advance(dt)`는 자신이 담은 `Mover`의 `step`을 불러 고리를 옮깁니다. 그래서 `step`이 어느 클래스의 것이든 `advance`는 자기 객체를 바꾸고 참조로 받는다(규칙 8.10).',
        'rt-renderer-class':
          '추상 SDF 도형 클래스와 상속으로 만든 3D 레이 트레이서입니다. 구체, 상자, 토러스, 평면을 구면 추적으로 렌더링합니다.',
        'imported-noise': '다른 셰이더 파일의 `fbm`으로 구름을 그립니다.',
        'separable-blur': '두 패스로 나눈 블러이입니다.',
        'feedback-trail': '궤적을 남기는 점입니다.',
        closures:
          '`ring`은 TypeScript 클로저처럼 프래그먼트 진입점의 `p`와 `width`를 읽고 그 `glow`에 더합니다.',
        'higher-order':
          '`cover`와 `around4`는 거리 필드를 함수 `f: Field`로 받고, 제네릭 함수가 타입 인자 조합마다 한 번 컴파일되듯 호출이 넘기는 함수마다 한 번씩 컴파일된다(규칙 8.18).',
        'inferred-returns':
          '반환 타입을 적은 함수가 하나도 없고, TypeScript가 추론하듯 저마다 본문이 돌려주는 것을 돌려준다(규칙 8.19).',
        'array-methods':
          '`array<Light, 3>`에 든 조명 세 개를 TypeScript 작성자가 먼저 떠올리는 배열 메서드로 비춥니다. 호출마다 배열 타입과 넘긴 함수에 맞춘 카운트 루프가 만들어진다(규칙 8.18, 언어 문서 §63).',
        'loops-over-data':
          '데이터를 다루는 프로그램이 쓰는 세 가지 루프를 Tint와 실제 WebGL2 컨텍스트로 확인합니다.',
        'path-tracer': '평범한 TypeScript로 쓴 작은 경로 추적기입니다.',
        'workgroup-tile-2d': '`@compute([8, 8])`는 WGSL의 `@workgroup_size(8, 8)`이입니다.',
        'loop-kernel': '로드맵에 나오는 지형 예제입니다.',
        'loop-reduction': '배열을 도는 루프로 합, 평균과 분산, 히스토그램을 구합니다.',
        'loop-struct-array': '파티클 한 걸음을 `array<Particle>`을 도는 루프로 씁니다.',
        'loop-on-cpu':
          '반복이 서로 독립인지 보는 증명이 거부하는 루프를 규칙마다(R1부터 R6까지) 하나씩 둡니다.',
        'kernel-array-methods':
          '`sumOfSquares`, `scale`, `firstAbove`는 TypeScript 개발자가 먼저 쓰는 `Array.prototype`의 메서드로 배열을 줄이고, 쓰고, 찾는다(변경 0079).',
        'kernel-image-invert':
          '`invert`는 `texture_2d<f32>`를 읽고 `texture_storage_2d`에 저장하므로 커널 함수이다(규칙 8.22, 변경 0077).',
        'kernel-push':
          '`strong`은 문턱값보다 큰 원소의 인덱스를 `out.push(i)`로 덧붙인다(변경 0078).',
        'kernel-set-unique':
          '`labels`는 영이 아닌 픽셀의 라벨을 `seen.add(...)`로 `Set<u32>`에 넣고(변경 0080), `latest`는 키마다 마지막에 넣은 값을 `Map<u32, f32>`에 둡니다.',
        'private-state':
          '최상위의 평범한 `let seed: u32`는 WGSL의 `var<private>`이입니다. 인보케이션마다 복사본이 하나씩 있고, 그 인보케이션의 모든 함수가 함께 씁니다.',
        'workgroup-scratch':
          '`let tile: workgroup<array<f32, 64>>`는 WGSL의 `var<workgroup>`이입니다. 워크그룹마다 복사본이 하나씩 있어 그 안의 인보케이션들이 함께 쓰며, 여기서는 인보케이션이 한 칸씩 차지하는 스크래치로 씁니다. 원자적 값의 워크그룹 배열과 인보케이션별 카운터도 함께 둡니다.',
        'workgroup-reduce':
          '인보케이션 64개가 값 64개를 워크그룹 메모리로 하나에 모읍니다. `workgroupBarrier()`가 라운드 순서를 잡습니다.',
        'atomic-histogram':
          '여러 인보케이션이 `atomicAdd(bins[bin], 1)`로 같은 칸에 동시에 값을 더합니다. 한 번의 호출은 쪼갤 수 없는 한 걸음이고, 스토리지 구조체의 필드와 `storage<atomic<u32>>` 선언이 위치를 적는 나머지 두 가지 모양을 보여 주며, 원자 연산이 돌려주는 값은 더하기 전에 들어 있던 값입니다.',
        'gpu-console':
          '컴퓨트 커널 안에서 `console.log("i =", gid.x, p)`를 부릅니다. 문자열 리터럴은 라벨이 되고, 크기가 정해진 값은 무엇이든 인자로 넘길 수 있습니다.',
        'compute-reduction-twin':
          '@workgroup_size가 붙은 컴퓨트 커널이입니다. 입력 스토리지 버퍼의 한 구간을 reduce()로 접어 출력 원소 하나로 만듭니다.',
        'workgroup-override':
          '`override<u32>` 하나가 컴퓨트 진입점의 워크그룹 크기와 공유 스크래치 배열의 바깥쪽 길이를 정합니다.',
        'hillshade-twin': '음영 기복.',
        'plasma-twin': '사인파를 여러 개 더해 만든 고전 플라스마에 RGB 팔레트로 색을 입혔습니다.',
        'julia-twin': '탈출 시간으로 그리는 줄리아 프랙탈.',
        'mandelbrot-twin': '탈출 시간을 매끄럽게 이어 칠한 만델브로 집합.',
        'domain-warp-twin': 'fbm 출력을 다시 fbm에 넣습니다.',
        'tunnel-twin': '데모신 시절의 터널.',
        'ocean-twin': '원리부터 계산해 그린 바다 풍경.',
        'starfield-twin': '텍스처 없이 그린 밤하늘.',
        'kaleidoscope-twin': '극좌표로 접는 거울 반사.',
        'gradient-twin': '섞는 비율을 조절할 수 있는 세로 방향 두 색 그러데이션.',
        'voronoi-twin': '움직이는 셀룰러 노이즈.',
        'fp64-deep-zoom-twin': '에뮬레이션 배정밀도(f32 두 개로 만든 df64).',
        'fp64-checker-plane-twin': '월드 평면 위의 1단위 체커보드.',
        'fp64-loran-twin': 'LORAN 방식의 해도 격자.',
        'fp64-rtc-twin': '행성 규모 엔진이 시점 기준으로 렌더링하는 이유.',
        'fp64-julia-twin': '같은 배정밀도 기법을 줄리아 집합으로 보인 예제.',
        'fp64-burning-ship-twin':
          '버닝 십 프랙탈입니다. 제곱하기 전에 |Re z|, |Im z|로 접고, 바늘처럼 뾰족한 부분을 확대합니다.',
        'fp64-newton-twin':
          'z³ = 1을 푸는 뉴턴 방법입니다. 색은 그 픽셀이 어느 세제곱근으로 수렴하는지 나타냅니다.',
        'fp64-mandelbrot-de-twin':
          '거리 추정(d = ½·|z|·ln|z|/|dz|)으로 만델브로 경계를 그립니다. 정밀도는 식 중간에서 나눕니다.',
        'fp64-clock-twin': '오래 켜 두면 생기는 애니메이션 버그.',
        'fp64-cancellation-twin': '수치해석 교과서의 그 그래프를 GPU로 그립니다.',
        'fp64-sine-sweep-twin':
          '큰 기준값에 화면에서 조금씩 움직이는 값을 더한 x로 sin(x)를 구합니다.',
        'id-pick': 'WGSL 방식의 진입점 입출력입니다.',
        'clip-planes':
          '`@builtin("clip_distances")`로 사용자 클립 평면 네 개를 둡니다. 래스터라이저가 래스터화하기 전에 읽는 버텍스 출력입니다.',
        'uniform-array': '`array<f32, 4>`를 담은 `uniform`이입니다.',
        'sample-branch': 'WGSL은 `textureSample`을 균일한 제어 흐름에서만 부르게 합니다.',
        'integer-math':
          '레지스트리가 이식 가능하다고 했지만 실제로는 그렇지 않았던 내장 함수 둘입니다.',
        'packing-bitcast': 'WGSL에는 있지만 이 언어에 없던 이식 가능한 내장 함수들입니다.',
        'packed-bytes':
          '`u32` 하나를 바이트 네 개로 읽거나 네 개를 다시 써 넣는 내장 함수 여덟 개입니다.',
        'compute-sync': 'WGSL에는 있지만 이 언어에 없던 동기화 내장 함수 세 개입니다.',
      },
    },
    host: {
      h: '호스트 예제',
      p: '예제마다 파일이 두 개입니다. 하나는 `"use typeshade"` 모듈이고, 다른 하나는 애플리케이션이 쓰는 방식 그대로 그 모듈을 실행하는 `host.ts`이입니다. 호스트는 Vite 플러그인으로 모듈을 가져와 모듈이 내보내는 것을 부릅니다. 페이지마다 두 파일과, 호스트가 실행되는 tier를 보여 줍니다.',
      cover: '모듈과 그 모듈을 실행하는 호스트, 두 파일입니다.',
      titles: {
        'host-draw': '캔버스에 그리기',
        'host-compute': '컴퓨트 진입점 디스패치',
        'host-kernel': '커널 함수 호출',
        'host-resident': '데이터를 GPU에 두기',
        'host-helper': 'CPU와 GPU가 함께 쓰는 헬퍼',
        'host-program': '컴파일된 프로그램 실행',
        'loop-fuse': '커널 호출 체인 합치기',
        'string-keys-record': '문자열 키와 Record',
        'host-set-unique': 'Set과 Map에 모으기',
      },
      descriptions: {
        'host-draw': '전체 화면 `@fragment` 진입점과 이를 그리는 호스트입니다.',
        'host-compute': '`@compute` 진입점과 호스트입니다.',
        'host-kernel': '커널 함수 두 개와 이를 부르는 호스트입니다.',
        'host-resident':
          '커널 함수 세 개와, 이를 `resident()` 배열 위에서 이어 부르는 호스트입니다.',
        'host-helper':
          '프래그먼트 진입점이 GPU에서 그리고 호스트가 CPU에서 부르는 지형 함수 `height`입니다.',
        'host-program':
          '버텍스 진입점과 프래그먼트 진입점, 그리고 엔진처럼 이를 실행하는 호스트입니다.',
        'loop-fuse':
          '커널 함수 다섯 개와, `typeshade/fuse`의 `fuse()` 안에서 이를 부르는 호스트입니다.',
        'string-keys-record':
          '채널 이름은 u32 id가 되고 Record는 id 순서의 배열이 된다(변경 0081).',
        'host-set-unique':
          'JavaScript의 `Set`과 `Map`을 받는 커널 함수 네 개와, 이를 부르는 호스트이다(변경 0080).',
      },
      blurbs: {
        'host-draw':
          '전체 화면 `@fragment` 진입점과 이를 그리는 호스트입니다. 호스트는 `fs`를 가져와 프레임마다 `fs(canvas, { frame })`를 한 번 부르고, 유니폼에 시간을 넣습니다. 그리는 것은 전체 화면 삼각형 하나입니다. WebGPU가 먼저이고, 없으면 WebGL2, 그다음은 CPU tier입니다. 호스트 코드에는 파이프라인도 버퍼도 바인드 그룹도 없다(규칙 8.24).',
        'host-compute':
          '`@compute` 진입점과 이를 실행하는 호스트입니다. `run()`은 선언한 기본값을 쓰고, `runSpecialized()`는 직접 호출과 `device.fuse()` 안의 호출에 `{ constants }`를 넘깁니다. `WIDTH`는 워크그룹 크기를, `GAIN`은 출력 배율을 정합니다. 호스트는 선택한 폭으로 그룹 개수를 계산하고, 계획의 배열을 Resident로 유지한 뒤 결과와 디스패치 리포트를 돌려준다(규칙 8.24). 상수를 선택한 디바이스 계획에서는 WebGPU와 CPU tier가 워크그룹당 32개 인보케이션을 사용하며, WebGL2는 기본값 64를 유지하면서 `GAIN`을 선택합니다.',
        'host-kernel':
          '커널 함수 두 개와 이를 부르는 호스트입니다. `exposure`는 `array<f32>`를 돌고, `peak`는 그 배열을 하나의 값으로 줄입니다. 호스트는 `Float32Array`를 넘겨 `await exposure(1.5, pixels)`를 부르고, 숫자 하나를 얻으려고 `await peak(pixels)`를 부릅니다. 컴파일러가 반복이 서로 독립이라고 증명한 루프는 GPU에서 반복마다 인보케이션 하나로 실행되고, 배열은 제자리에서 바뀌어 돌아온다(규칙 8.22).',
        'host-resident':
          '커널 함수 세 개와, 이를 `resident()` 배열 위에서 이어 부르는 호스트입니다. `decay`와 `accumulate` 호출은 큐에 들어가기만 합니다. 배열은 장치의 버퍼에 그대로 남고, 다음 호출이 같은 버퍼를 바인딩합니다. 호스트는 `sum`을 기다릴 때 한 번만 기다리고, `read()`로 배열을 한 번만 읽어 온다(규칙 11.8).',
        'host-helper':
          '프래그먼트 진입점이 GPU에서 그리고 호스트가 CPU에서 부르는 지형 함수 `height`입니다. 호스트는 `fs(canvas, { view })`로 지형을 그린 뒤, 커서 아래의 높이를 얻으려고 `height([u, v])`를 부릅니다. 결과는 평범한 숫자이고, 같은 코드를 `f32` 정밀도로 계산한 값입니다. 캔버스는 읽지 않는다(언어 문서 §64).',
        'host-program':
          '버텍스 진입점과 프래그먼트 진입점, 그리고 엔진처럼 이를 실행하는 호스트입니다. 모듈의 기본 내보내기가 매니페스트입니다. 호스트는 프로그램 런타임에서 `rt.load()`로 매니페스트를 불러오고, 렌더 파이프라인을 만들어 프레임마다 텍스처에 전체 화면 삼각형을 그립니다. 유니폼은 이름으로 바인딩합니다. 마지막으로 텍스처를 읽어 온다(규칙 11.10, 11.11).',
        'loop-fuse':
          '커널 함수 다섯 개와, `typeshade/fuse`의 `fuse()` 안에서 이를 부르는 호스트입니다. `add`, `mul`, `relu` 호출은 저마다 바로 앞 호출이 같은 인덱스에 쓴 값을 읽습니다. 그래서 WebGPU에서는 스코프가 이 호출들을 디스패치 하나로 실행하고, 리포트에도 그렇게 적힙니다. `pairsum`은 `t[i ^ 1]`을 읽는데, 이 원소는 다른 인보케이션이 씁니다. 그래서 이 호출을 가운데 둔 스코프는 디스패치 두 번으로 실행되고, 리포트가 그 줄을 짚어 줍니다. 리덕션 호출로 끝나는 스코프도 있습니다. `total`로 끝나는 스코프는 `add`와 `mul`을 그 루프의 프롤로그로 실행합니다. 그래서 세 호출이 리덕션과 함께 디스패치 하나가 됩니다.',
        'string-keys-record':
          '정해진 채널 이름을 u32 id로 바꾸고, Record는 id 순서의 배열로 표현합니다. 호스트가 호출하는 커널 함수는 키 타입 매개변수로 게인을 고릅니다. 프래그먼트 진입점은 픽셀 위치로 채널을 고르고 같은 테이블을 읽습니다. 호스트는 커널에 채널 문자열을, 헬퍼에 객체를 넘깁니다. WebGPU, WebGL2, CPU tier에서 같은 값이 나옵니다.',
        'host-set-unique':
          'JavaScript의 `Set`과 `Map`을 받는 커널 함수 네 개와, 이를 부르는 호스트입니다. `labels`는 영이 아닌 라벨을 한 번씩 넣고, `latest`는 키마다 마지막에 넣은 값을 남깁니다. `lookup`은 `has`로 확인한 뒤 `get`으로 값을 읽고, `present`는 한 루프에서 값을 넣고 다음 루프에서 읽습니다. 호스트는 `new Set()`과 `new Map()`을 넘깁니다. 각 프라미스가 이행되면 그 안에는 루프를 차례로 실행했을 때 남는 항목이 들어 있습니다. 키는 처음 넣은 순서대로 한 번씩 들어가고, 값은 마지막에 넣은 것입니다. WebGPU에서는 add나 set마다 레코드를 덧붙이고 호출이 이를 순서대로 적용합니다. 조회는 업로드한 키를 이진 탐색합니다. WebGL2는 지원하지 않습니다.',
      },
      page: {
        // 영어와 같은 방식입니다. 60자 상한에 들어가는 가장 긴 꼬리말을 고릅니다.
        title: (name: string) => {
          const suffixes = [
            ', TypeShade 호스트 예제의 셰이더 모듈과 그 모듈을 실행하는 호스트 파일',
            ', TypeShade 호스트 예제의 모듈과 호스트 파일',
            ', TypeShade 호스트 예제',
          ];
          return name + (suffixes.find((s) => (name + s).length <= 60) ?? '');
        },
        files: '모듈과 호스트',
        module: '모듈',
        host: '호스트 파일',
        tiersLabel: '실행 tier',
        tiers: { webgpu: 'WebGPU', webgl2: 'WebGL2', cpu: 'CPU tier' },
        tiersNote:
          '이 목록은 컴파일러가 확인합니다. tier(호출이 실행되는 백엔드)는 호스트의 실행 전체가 그 tier 하나만으로 기준값을 낼 때만 목록에 오릅니다. 컴파일러의 저니 게이트가 호스트마다 WebGPU와 WebGL2에서 실행하고, 단위 테스트가 CPU tier에서 실행합니다.',
        filesNote: `두 파일 모두 커밋 ${facts.pinnedCommit}의 컴파일러에 있는 그대로이며, [예제 디렉터리](examplesDir)에서 읽어 왔습니다.`,
        moduleLink: 'GitHub의 모듈',
        hostLink: 'GitHub의 호스트 파일',
      },
    },
    page: {
      // 영어와 같은 방식입니다. 60자 상한에 들어가는 가장 긴 꼬리말을 고르고, 꼬리말 사이 간격을
      // 15자 이하로 두어 어떤 예제 이름이 와도 45자 아래로 내려가지 않게 했습니다.
      title: (name: string) => {
        const suffixes = [
          ', TypeShade 예제 소스와 컴파일러가 낸 셰이더 코드를 한 화면에서 봅니다',
          ', TypeShade 예제와 컴파일러가 낸 셰이더 코드',
          ', TypeShade 셰이더 예제',
          ' 예제, TypeShade',
        ];
        const fitting = suffixes.find((suffix) => (name + suffix).length <= 60);
        return fitting ? name + fitting : name;
      },
      description: (name: string, blurb: string) => `TypeShade 예제 ${name}. ${blurb}`,
      descriptionPad: `소스와 WGSL 출력, ${glsl} 단계까지 한 페이지에 모았습니다.`,
      source: '소스',
      tabs: '소스와 출력 결과',
      canvas: (name: string) => ({
        neutral: `${name}. 빌드할 때 그린 화면입니다.`,
        webgpu: `${name}. WebGPU에서 실행 중입니다.`,
        webgl2: `${name}. WebGL2에서 실행 중입니다.`,
        none: `${name}. 빌드할 때 그린 화면입니다. 이 브라우저에는 WebGPU도 WebGL2도 없습니다.`,
        reduced: `${name}. 시스템이 움직임 줄이기를 켜 두어 한 프레임만 그렸습니다.`,
      }),
      emittedNote: `WGSL과 GLSL 탭은 커밋 ${facts.pinnedCommit}의 컴파일러가 직접 낸 출력입니다. 컴파일러의 출력 검사가 저장한 골든 파일에서 그대로 읽어 왔다([emit-goldens.test.ts](goldens)).`,
      wgsl: 'WGSL',
      glslVertexTab: 'GLSL 버텍스',
      glslFragmentTab: 'GLSL 프래그먼트',
      glslVertex: `${glsl} 버텍스`,
      glslFragment: `${glsl} 프래그먼트`,
      github: 'GitHub의 파일',
      playground: 'Playground에서 열기',
      editable:
        '편집기에는 이 예제의 파일이 들어 있고, 프로그램은 이 파일과 이 파일이 가져오는 파일로 이루어집니다. 내용을 고치면 브라우저에서 다시 컴파일하고, 편집기 옆의 탭이 따라 바뀝니다.',
      runtime: {
        title: '이 사이트 빌드 이후에 추가된 TypeShade 예제',
        description:
          '이 사이트를 빌드한 뒤 컴파일러에 추가된 TypeShade 예제입니다. 소스 파일과 컴파일러가 내는 WGSL, GLSL을 함께 보여 줍니다.',
        name: 'TypeShade 예제',
        blurb: '이 사이트를 빌드한 뒤 컴파일러에 추가된 예제입니다.',
        note: '이 예제는 사이트를 마지막으로 빌드한 뒤 컴파일러에 추가되어, 컴파일러의 main 브랜치가 게시한 예제 데이터로 이 페이지를 채웠습니다. 다음 빌드에서 그림과 사이트의 번역이 붙습니다.',
      },
      noPicture: {
        'no-glsl': `이 예제는 ${glsl} 형태가 없고 캔버스는 두 백엔드에서 같은 프로그램을 돌리므로, 이 페이지에는 그림이 없습니다.`,
        control:
          '이 예제를 움직이는 컨트롤에 페이지가 넣을 값이 없어서, 이 페이지에는 그림이 없습니다.',
        texture:
          '이 예제가 읽는 텍스처에 페이지가 넣을 데이터가 없어서, 이 페이지에는 그림이 없습니다.',
        uniform:
          '이 예제가 선언한 유니폼 필드에 페이지가 넣을 값이 없어서, 이 페이지에는 그림이 없습니다.',
        'vertex-buffer':
          '이 예제는 버텍스 속성을 버퍼에서 읽는데 페이지가 그 버퍼를 바인딩하지 않아서, 그림이 없습니다.',
      },
    },
    glsl: {
      h: `gradient 패스의 ${glsl} 출력`,
      p1: `gradient 패스 \`${hero.file}\`는 프래그먼트 단계로 이 ${glsl} \`main\`을 낸다.`,
      p2: `모듈 전체는 WGSL로 ${hero.emit.wgslLines}줄이고, GLSL은 버텍스 단계 ${hero.emit.glslVertexLines}줄, 프래그먼트 단계 ${hero.emit.glslFragmentLines}줄이다. 유니폼 타입, 바이트 오프셋, 바인드 그룹 항목, 진입점 시그니처는 [\`reflect()\`](apiReflect)에서 나온다. reflect()는 같은 중간 표현을 읽지만 출력 경로에는 관여하지 않으므로, 호스트는 그 레이아웃대로 유니폼 버퍼를 채우면 된다. [검증 페이지](checks)에는 유니폼 블록의 복원된 레이아웃이 잘못 쓴 필드의 진단과 나란히 있다.`,
    },
    f64: {
      h: '에뮬레이션 배정밀도',
      p1: `WGSL에도 ${glsl}에도 배정밀도 부동소수점은 없다. TypeShade는 f32 값 두 개를 합치지 않고 나란히 든 쌍으로 이를 에뮬레이션하고, 산술, 비교, 일부 내장 함수를 그 쌍에 대한 호출로 바꿔 낸다. 그 범위 밖의 연산은 출력할 때 코드가 붙은 오류로 실패한다. 쓰는 코드는 그대로이고 선언한 타입만 다르다. deep-zoom 예제에서 \`${facts.deepZoomOrigin.name}\` 필드는 소스에서 \`${facts.deepZoomOrigin.sourceType}\`로 선언되고 유니폼 블록에서는 \`${facts.deepZoomOrigin.layoutType}\` 자리를 차지하며, 호스트가 그 자리를 분리한 쌍으로 채운다.`,
      p2: 'f64 산술을 하는 모듈에는 가드 텍스처 바인딩도 주입되는데, 호스트는 이 텍스처를 흰색 텍셀 하나로 채워야 합니다. GPU 드라이버의 셰이더 컴파일러는 텍셀 읽기를 미리 계산해 버릴 수 없는데, 그 읽기가 없으면 오차 보정 항을 마음대로 최적화해 없앨 수 있기 때문입니다. 연산마다 f32의 몇 배가 들므로 이 타입은 값 하나하나에 대해 골라서 씁니다. 예제는 [fp64-deep-zoom-twin.shade.ts](deepZoom)입니다.',
      p3: "이 가드는 에뮬레이션의 `'float'` 플레이버에 속합니다. Apple GPU에는 `'integer'` 플레이버가 필요합니다. 이 플레이버는 같은 오차 항을 정수 연산으로 계산하고, 가드를 바인딩하지 않습니다. 기본값은 실제 디바이스나 컨텍스트에서 자동으로 선택하며, 사용 가능한 경우 사용자 에이전트 정보도 참고합니다. Apple이나 Metal 신호가 있으면 `'integer'`를, CPU이거나 GPU 신호를 알 수 없으면 `'float'`를 선택합니다. 신호를 알 수 없을 때의 선택이 확장 정밀도를 보장하지는 않습니다. `createDevice({ fp64Flavor })`나 `configure({ fp64Flavor })`로 선택을 재정의할 수 있습니다. `recommendFp64Flavor`는 이 선택 함수를 제공합니다.",
      caption: `같은 월드 좌표를 두 번 그렸습니다. 왼쪽은 ${split[0]}, 오른쪽은 ${split[1]}이입니다. ${split[0]} 쪽은 줄무늬가 계단처럼 나오는데, 이 거리에서는 ${split[0]}의 ulp 하나가 줄무늬에 필요한 소수 부분보다 거칠기 때문입니다. 다른 쪽은 매끄럽게 나옵니다.`,
      captionNone: '빌드할 때 렌더링한 화면입니다. 이 브라우저에는 WebGPU도 WebGL2도 없습니다.',
    },
  },

  guide: {
    title: 'TypeShade 작성 가이드: TypeScript로 셰이더 쓰기',
    description:
      'TypeShade의 작성 API를 절마다 설명합니다. 값, 제어 흐름, 레이아웃, 진단, 에뮬레이션 f64, 배포용 생성, GLSL 셰이더 옮기기.',
    contents: '목차',
    sectionTitle: (title: string) => `${title}, TypeShade 작성 가이드`,
    sections,
    referenceTableHeading: '참조 표',
    note: `커밋 ${facts.pinnedCommit}의 [AUTHORING.md](guideSource)를 한국어로 옮긴 것입니다. 패키지는 ${facts.nextVersion}에서 쓸 \`typeshade\`라는 이름으로 가져온다.`,
    noteUntranslated: `커밋 ${facts.pinnedCommit}의 [AUTHORING.md](guideSource)를 그대로 옮긴 것으로, 이 절의 본문은 아직 영어입니다. 패키지는 ${facts.nextVersion}에서 쓸 \`typeshade\`라는 이름으로 가져온다.`,
  },

  // The language guide: src/components/pages/LanguagePage.astro and the Language*Page.astro topic pages.
  language: {
    overview: {
      title: 'TypeShade 언어 가이드',
      description:
        'TypeShade 문법과 GPU 실행 규칙을 예제로 설명하는 가이드입니다. 타입, 리소스, 함수, 셰이더 스테이지가 컴파일 결과에 미치는 영향도 함께 다룹니다.',
      h1: 'TypeShade 언어 가이드',
      intro:
        'TypeShade 셰이더의 문법은 TypeScript와 같습니다. 이 가이드는 컴파일 규칙과 GPU 실행 방식을 설명합니다.',
      boundaryH: '1. `use typeshade`란?',
      boundaryP:
        '`"use typeshade"`는 TypeShade 셰이더 파일을 나타내는 첫 지시문입니다. 컴파일러는 이 지시문으로 파일을 구분하고, GPU 타입과 리소스, 스테이지, builtin 규칙을 적용합니다.',
      boundaryNote: '이 지시문은 일반 TypeScript 모듈과 TypeShade 셰이더 파일을 나누는 기준입니다.',
      syntaxH: '2. TypeScript 문법',
      syntaxP:
        '변수, 함수, 타입 별칭, 클래스, 조건문, 반복문은 TypeScript와 같은 문법입니다. GPU 코드로 변환할 수 있는 값과 연산만 지원합니다.',
      syntaxTableHeader1: 'TypeScript',
      syntaxTableHeader3: 'GPU 해석',
      syntaxTableRows: [
        ['function', 'helper 또는 entry point', '지원되는 함수 본문을 GPU 코드로 변환합니다.'],
        ['type', 'GPU 값 타입', 'GPU 타입 규칙에 맞는지 검사합니다.'],
        ['class', 'GPU struct', 'JavaScript 객체를 만들지 않고 구조체를 정의합니다.'],
        ['if / for', 'GPU control flow', '조건과 반복문을 GPU에서 실행할 수 있는지 검사합니다.'],
      ],
      gpuH: '3. GPU 인터페이스',
      gpuP: '소스에 GPU 인터페이스가 드러납니다. 리소스에는 `declare`, entry point에는 stage decorator, GPU 입력에는 `@builtin(...)` 매개변수를 씁니다.',
      gpuNote:
        '`camera`와 `pixels`는 호스트가 전달하는 리소스입니다. 셰이더가 값을 만들지 않습니다. `gid`도 전역 변수가 아니라 함수 매개변수입니다.',
      functionH: '4. 함수와 entry point',
      functionP:
        '매개변수와 반환 타입은 함수의 입력과 결과를 나타냅니다. Stage decorator와 builtin 매개변수는 entry point의 GPU 역할을 지정합니다.',
      functionNote:
        '`addBias`는 재사용하는 helper입니다. `paint`는 compute entry point입니다. 둘은 같은 함수 문법을 쓰지만 pipeline에서 맡는 역할이 다릅니다.',
      resourceH: '5. GPU 리소스',
      resourceP:
        '`uniform<T>`와 `storage<T>`는 호스트가 제공하는 GPU 리소스입니다. `declare`는 셰이더가 만들지 않는 리소스를 표시합니다.',
      resourceNote:
        '리소스는 `const`로 선언합니다. `storage<T>`는 읽기 전용이며, `storage<T, "read_write">`는 쓰기도 가능합니다.',
      stageH: '6. 셰이더 스테이지',
      stageP:
        '`@vertex`, `@fragment`, `@compute`는 entry point의 스테이지를 지정합니다. GPU builtin은 전역 변수로 자동 주입되지 않습니다. 필요한 builtin은 매개변수로 선언합니다.',
      completeH: '7. 전체 예제',
      completeP:
        '이 예제는 지시문, GPU struct, 리소스, compute entry point, builtin 매개변수를 하나로 구성합니다.',
      tsH: '8. TypeScript와 다른 점',
      tsRows: [
        ['`declare`', '호스트가 제공하는 GPU 리소스를 선언합니다.'],
        ['함수 매개변수', 'GPU 값이나 스테이지 builtin 입력을 받습니다.'],
        ['class', 'GPU struct와 필드 메타데이터를 정의합니다.'],
        ['number', '`f32`, `i32`, `u32` 같은 GPU 숫자 타입을 씁니다.'],
      ],
      tsNote:
        'TypeShade는 TypeScript 문법으로 셰이더를 작성하고 GPU 규칙에 따라 컴파일합니다. JavaScript의 런타임 동작을 모두 지원하지는 않습니다.',
      refsH: '9. 참고 자료',
      refsP:
        '타입과 함수는 TypeScript Handbook에서, 실행 모델은 MDN의 JavaScript Guide에서 확인할 수 있습니다. 다음으로 GPU 개념을 읽습니다.',
      nextH: '10. 학습 순서',
      nextP:
        'Quick start에서 첫 파일을 작성한 뒤 Types, Functions, Control flow, GPU types, Resources, Shader stages 순서로 읽습니다.',
      nextLink: 'Quick start',
    },
    topics: {
      stringKeys: {
        title: 'TypeShade의 문자열 키와 Record',
        description:
          '정해진 이름 집합을 GPU id로 표현합니다. 문자열 키로 Record 테이블을 인덱싱하고, JavaScript 호스트에서 셰이더를 호출하는 방법을 설명합니다.',
        h1: '문자열 키와 Record',
        intro:
          '문자열 리터럴 타입의 유니온은 키 타입입니다. 채널이나 모드처럼 사용할 이름이 정해진 값 집합을 나타냅니다.',
        keys: '키 타입',
        keysP:
          '컴파일러는 멤버를 UTF-16 코드 단위로 정렬하고 각 멤버에 `u32` id를 부여합니다. 문자열 리터럴 타입 하나도 키 타입입니다. 멤버 집합이 같으면 id도 같습니다. 모든 타깃에서 GPU는 이 id를 받습니다.',
        operationsP:
          '키는 동등 비교와 멤버를 나누는 `switch`를 지원합니다. 산술 연산, 대소 비교, 숫자로의 변환은 거부됩니다. 키 타입이 필요한 자리에 쓴 문자열 리터럴은 해당 멤버가 됩니다. 값 집합이 열린 `string`은 계속 거부됩니다.',
        record: 'Record',
        recordP:
          '`Record<K, V>`는 `K`의 멤버마다 `V` 값 하나를 담으며, id 순서의 고정 배열로 표현됩니다. `by[c]`, `by.r`, `by["r"]`로 원소를 선택합니다. 객체 리터럴은 모든 멤버를 포함하고 추가 프로퍼티는 없어야 합니다. 다른 키 타입, 숫자, `.length`는 거부됩니다.',
        numeric: '숫자 키',
        numericP:
          '서로 다른 값이 정확히 0부터 N-1까지인 enum이나 정수 리터럴 유니온은 `Record`의 키가 될 수 있습니다. 각 멤버는 자신의 값으로 인덱싱합니다. 건너뛴 값, 음수, 정수가 아닌 값은 실제 값을 명시한 문장으로 거부됩니다. 값 집합이 열린 `Record<u32, V>`도 거부됩니다.',
        host: '호스트 호출',
        hostP:
          '호스트에서 키 매개변수나 반환값은 문자열입니다. `Record` 매개변수나 반환값은 모든 멤버를 갖춘 객체입니다. 알 수 없는 문자열, 빠진 프로퍼티, 추가 프로퍼티는 `TypeError`를 냅니다.',
        deviationP:
          '진입점 바인딩과 크기를 지정하지 않은 커널 배열에서는 키가 숫자 id이고, Record는 id 순서의 배열입니다. 제안 0081은 이 차이를 D1으로 열어 둡니다.',
        collections: 'Map과 Set',
        collectionsP:
          '커널은 `Map<Channel, V>`와 `Set<Channel>`을 받습니다. 호스트는 문자열 키를 넘깁니다. 호출은 루프를 실행하기 전에 키를 id로 바꾸고, 끝난 뒤에는 문자열로 되돌리며 삽입 순서를 유지합니다. 알 수 없는 문자열은 `TypeError`를 냅니다. 값 집합이 열린 `Map<string, V>`와 `Set<string>`은 거부됩니다.',
        exampleP:
          '[string-keys-record](exampleStringKeysRecord)는 WebGPU, WebGL2, CPU에서 Record를 인덱싱하는 커널을 호출합니다. [제어 흐름](languageControlFlow)은 컬렉션 루프와 지원 tier를 설명합니다.',
      },
      types: {
        title: 'TypeShade 타입',
        description:
          'TypeScript의 type과 class 개념을 TypeShade의 GPU 값, 구조체, 필드 레이아웃과 연결하는 방법을 설명합니다.',
        h1: 'Types: TypeScript 타입에서 GPU 값으로',
        intro:
          'TypeShade는 TypeScript 문법으로 GPU 값의 타입을 정의합니다. TypeScript의 구조적 타이핑과 타입 별칭을 사용하며, GPU 레이아웃 메타데이터가 필요할 때는 클래스와 필드 데코레이터를 사용합니다.',
        ts: 'TypeScript에서 출발하기',
        tsP: '타입 별칭은 값의 구조에 이름을 붙입니다. TypeShade도 같은 문법을 사용하며, 사용 가능한 타입과 표현식은 셰이더 언어 규칙에 따라 정해집니다.',
        alias: '1. 타입 별칭은 plain data에 사용',
        aliasP:
          '필드에 데코레이터가 필요 없다면 타입 별칭가 가장 단순한 표현입니다. 여러 함수의 인자나 반환값에서 같은 GPU 값의 구조를 공유할 때도 유용합니다.',
        struct: '2. class는 구조체와 그 함수들',
        structP:
          'TypeShade의 class는 GPU 구조체이면서 그 곁에 쓴 함수들입니다. 필드는 호스트가 채우는 바이트입니다. 생성자와 메서드와 static 함수는 각각 평범한 함수로 내려가서, `new Ray(o, d)`는 `Ray_new`를 부르고 `r.at(t)`는 `Ray_at(r, t)`를 부릅니다. 그 사이에 살아 있는 객체는 없습니다.',
        attrs: '3. 필드 데코레이터는 레이아웃을 설명',
        attrsP:
          '필드에는 파이프라인의 자리에 연결하는 `@location`과 `@builtin`을 붙이고, 스테이지 사이를 오가는 값이나 출력의 성질을 정하는 `@interpolate`, `@invariant`, `@blend_src`도 붙일 수 있습니다. `@align`은 읽고 나서 거부하며 `@size`, `@offset`, `@ignore`는 컴파일러가 아는 어트리뷰트가 아닙니다. 받아들이는 전체 집합은 `@vertex`, `@fragment`, `@compute`, `@builtin`, `@location`, `@interpolate`, `@invariant`, `@blend_src`, `@diagnostic`이고, 함수의 매개변수에는 `@inout`과 `@out`을 붙입니다.',
        boundary: '4. TypeScript의 class와 다른 점',
        boundaryItems: [
          '진입점은 최상위 함수이고 메서드가 아닙니다.',
          '인스턴스 필드가 없는 class도 생성할 수 있으며 메서드, 접근자와 static 멤버를 가질 수 있습니다. 호스트에서는 `{}` 값입니다. 리플렉션은 소스에 필드를 추가하지 않고 GPU 내부 표현의 크기를 반영합니다. std430에서는 4바이트, std140에서는 16바이트입니다.',
          '베이스 타입으로 읽기만 하며 메서드 선택이 같다고 컴파일러가 입증하면 파생 값을 베이스 class 자리에 쓸 수 있습니다. 메서드 재정의, 수신 객체의 변경이나 별칭을 통한 관찰 가능한 변경이 있으면 구체적인 타입을 쓰거나 지원 범위 밖에 남습니다.',
          'getter와 setter는 각각 제 함수로 내려가고, 생성자는 TypeScript처럼 클래스마다 하나입니다.',
          '`new`는 함수 본문 안에서 값을 만들고, 모듈 상수는 객체 리터럴로 씁니다.',
          '데코레이터가 필요한 필드가 없다면 타입 별칭가 더 명확합니다.',
        ],
        mapping: '5. 개념 대응표',
        mappingRows: [
          ['TypeScript', 'TypeShade'],
          ['타입 별칭 / object 구조', 'GPU 값의 구조'],
          ['class fields', 'GPU 구조체 fields'],
          ['class method', '구조체를 첫 매개변수로 받는 함수'],
          ['`new`', '만들어진 생성자 함수 호출'],
          ['`extends` with `super`', '베이스 필드를 이어 붙이고 본문을 다시 내림'],
          ['데코레이터 메타데이터', 'GPU 레이아웃 / 스테이지 메타데이터'],
          ['런타임 객체', '해당하지 않음'],
          ['structural compatibility', '셰이더 타입 검사 범위에서 적용'],
        ],
        example: '6. 실제 진입점와 연결하기',
        exampleP:
          '구조체를 정의한 뒤 진입점 매개변수에서 사용할 수 있습니다. 이때 값의 구조와 필드 메타데이터가 셰이더 입력의 의미를 결정합니다.',
        next: '다음: Functions',
      },
      functions: {
        title: 'TypeShade 함수',
        description:
          'TypeScript 함수에서 출발해 TypeShade 헬퍼, 셰이더 진입점, 매개변수, 반환 타입, builtin과 스테이지 메타데이터를 이해하는 상세 가이드.',
        h1: 'Functions: TypeScript 함수에서 GPU 함수로',
        intro:
          'TypeShade의 함수는 계산에 이름을 붙이고 입력과 출력을 정의합니다. TypeScript와 같은 함수 문법을 사용하며, `"use typeshade"` 파일의 함수 본문은 GPU IR로 변환할 수 있는 계산이어야 합니다.',
        anatomy: '1. 함수의 구조',
        anatomyP:
          '함수는 이름, 매개변수 목록, 반환 타입, 본문로 구성됩니다. TypeShade는 이 익숙한 구조를 유지하면서 매개변수와 반환 타입에 GPU 의미를 부여합니다.',
        anatomyNote:
          '여기서 <code>value</code>는 입력 매개변수이고 <code>f32</code>는 입력과 결과의 GPU 타입입니다. <code>return</code>은 함수가 계산한 값을 호출자에게 돌려줍니다.',
        params: '2. Parameter와 반환 타입',
        paramsP:
          '매개변수는 함수가 읽는 입력이고 반환 타입은 계산 결과의 GPU 값의 구조를 설명합니다. 값 매개변수를 다시 대입하면 해당 호출의 지역 복사본이 바뀌고 호출자의 값은 유지됩니다. 헬퍼, 메서드와 스테이지 입력에 모두 적용됩니다. 타입은 컴파일러가 표현식의 유효성을 판단하는 정보입니다.',
        paramsTable: [
          ['부분', '역할'],
          ['`a`, `b`', 'GPU 입력 값입니다.'],
          ['`amount: f32`', '스칼라 입력이며 컴파일러가 연산 타입을 확인합니다.'],
          ['`: vec4`', '호출자에게 반환할 GPU 값의 구조입니다.'],
        ],
        paramsRefP:
          '`@inout`으로 선언한 매개변수는 호출자의 변수 자체입니다. 호출은 그 변수를 아무 표시 없이 넘기고, 매개변수나 그 필드, 성분, 요소에 대입하면 호출자의 변수에 값이 들어갑니다. `@out`으로 선언한 매개변수는 값 없이 시작합니다. 함수는 이 매개변수를 읽기 전에 쓰고, 모든 경로에서 쓴다(`TS8075`). 그래서 호출자는 아직 값이 없는 `let`을 넘길 수 있습니다. 함수가 둘 중 하나라도 쓴다면, 호출 하나가 같은 변수를 이런 매개변수 둘에 넘길 수는 없다(`TS8074`). 한정자는 파일 최상위나 네임스페이스에 선언한 함수에만 붙고, 메서드와 진입점과 지역 함수는 값을 받는다(`TS8073`). 다만 한정자가 붙은 함수 안의 지역 함수는 바깥의 다른 변수처럼 그 매개변수를 읽고 씁니다. 구조체, 배열 요소, 행렬의 열을 같은 방식으로 넘기는 모습은 [되돌려 쓰는 매개변수](shadeReferenceParameters) 예제에 있습니다.',
        helper: '3. Helper function',
        helperP:
          '스테이지 데코레이터가 없는 최상위 함수은 다른 셰이더 함수에서 호출할 수 있는 헬퍼입니다. 반복되는 계산을 이름 있는 함수로 분리하면 셰이더를 읽고 검증하기 쉬워집니다.',
        helperNote:
          '헬퍼는 파이프라인 진입점가 아니므로 스테이지 데코레이터가 없습니다. 이 구조는 계산을 작은 단위로 나누고 진입점의 역할을 읽기 쉽게 만듭니다.',
        call: '4. 함수 호출',
        callP:
          '함수 호출은 일반적인 TypeScript 호출과 같은 문법을 사용합니다. 호출 대상과 인수에는 TypeShade의 GPU 타입 규칙이 적용되며, 일반 JavaScript API를 호출할 수는 없습니다.',
        callNote:
          '호출은 일반 함수 호출처럼 보이지만, `addBias`의 입력과 반환값은 TypeShade가 이해하는 GPU 타입이어야 합니다.',
        entry: '5. Shader 진입점 함수',
        entryP:
          '파이프라인이 실행을 시작하는 함수는 top-level `export function`에 스테이지 데코레이터를 붙여 선언합니다. `@compute`, `@vertex`, `@fragment`가 각각 GPU 실행 단계와 연결됩니다.',
        entryNote:
          '`export`는 TypeScript 모듈 개념과 함께 진입점를 컴파일러가 발견할 수 있게 합니다. 스테이지 데코레이터는 그 내보낸 함수이 어느 파이프라인 스테이지인지 추가로 설명합니다.',
        builtin: '6. Builtin은 매개변수로 받습니다',
        builtinP:
          'GPU가 제공하는 스테이지 입력은 숨겨진 전역 변수가 아니라 함수 시그니처에 명시합니다. 이렇게 하면 함수의 입력이 코드만 읽어도 드러나고 헬퍼와 진입점의 경계도 분명해집니다.',
        builtinTable: [
          ['표현', '의미'],
          ['`@builtin("global_invocation_id")`', 'GPU가 제공하는 compute 입력을 지정합니다.'],
          ['`gid: vec3u`', '그 입력의 TypeShade 타입과 지역 이름입니다.'],
          ['`gid.x`', '현재 인보케이션의 x 성분를 읽습니다.'],
        ],
        compute: '7. Compute 진입점를 읽는 법',
        computeP:
          '`@compute([64, 1, 1])`는 워크그룹 크기를 선언하고, `gid`는 `global_invocation_id` builtin을 받는 매개변수입니다. `gid.x`를 통해 현재 인보케이션의 x 좌표를 읽습니다.',
        computeNote:
          '이 함수의 데코레이터는 스테이지와 워크그룹 크기를 지정합니다. 매개변수는 GPU 입력을 선언하고, 본문은 해당 입력으로 수행할 계산을 정의합니다.',
        graphics: '8. Vertex와 fragment 진입점',
        graphicsP:
          'vertex와 fragment도 같은 함수 모델을 사용합니다. 스테이지 데코레이터가 실행 단계를 결정하고 매개변수와 반환 타입이 파이프라인 인터페이스를 설명합니다.',
        graphicsNote:
          'vertex의 `vid`와 `vin`은 서로 다른 입력입니다. 하나는 GPU builtin이고 다른 하나는 사용자 정의 구조체 입력입니다. fragment의 `pid` 역시 시그니처에 명시되어 있으므로 함수만 읽어도 필요한 입력을 알 수 있습니다.',
        scope: '9. 함수와 스코프',
        scopeP:
          '지역 변수는 함수 호출마다 생깁니다. 매개변수와 함수 본문의 지역 변수는 모듈 값과 같은 이름을 쓸 수 있으며, 클로저는 가장 가까운 선언을 찾습니다. 같은 스코프의 중복 선언은 여전히 오류입니다. 모든 선언은 `target`이나 `half`처럼 TypeScript에서 유효한 이름을 쓸 수 있습니다. 변수, 매개변수, 리소스, 진입점, 구조체, 필드가 모두 그렇습니다. 셰이더 작성기는 대상 언어가 예약한 이름을 그 대상에서만 새 표기로 바꿔 출력하고, 호스트는 여전히 작성한 이름으로 바인딩하고 호출합니다.',
        scopeNote:
          '`factor`는 함수 안에서만 존재하는 지역 값입니다. 반대로 `camera`나 `pixels` 같은 리소스는 호스트와 연결된 셰이더 인터페이스이며, builtin 매개변수는 GPU 스테이지가 제공하는 입력입니다.',
        boundary: '10. TypeScript 함수와의 차이',
        boundaryItems: [
          '임의의 JavaScript 런타임 API를 호출하지 않습니다.',
          '동적 객체 생성과 일반적인 런타임 부수 효과를 셰이더 계산으로 가정하지 않습니다.',
          '진입점는 class method가 아니라 내보낸 최상위 함수입니다.',
          'builtin은 암시적 전역 변수이 아니라 명시적인 매개변수입니다.',
          '매개변수와 반환 타입은 GPU 값의 의미에 맞아야 합니다.',
        ],
        example: '11. 작은 함수에서 실제 진입점까지',
        exampleP:
          '아래 예제는 헬퍼가 계산을 담당하고 진입점가 builtin과 리소스를 연결하는 전형적인 구조입니다.',
        exampleNote:
          '이 예제는 헬퍼와 진입점의 역할을 구분합니다. `addBias`는 재사용 가능한 계산이고, `paint`는 스테이지와 builtin을 선언하면서 실제 GPU 인보케이션과 리소스를 연결합니다.',
        next: '다음: Control flow',
      },
      controlFlow: {
        title: 'TypeShade 제어 흐름: 분기, 루프, 커널',
        description:
          'TypeScript에서 익숙한 조건문과 반복문의 개념을 TypeShade의 GPU 실행 모델로 연결하고, 실제 셰이더에서 컴파일 가능한 분기와 반복을 안전하게 작성하는 방법을 단계적으로 설명합니다.',
        h1: 'Control flow: 익숙한 흐름, 명시적인 GPU 실행',
        intro:
          'TypeShade는 TypeScript의 조건문과 반복문 문법을 사용합니다. 코드는 GPU에서 실행되므로 제어 흐름에 사용할 수 있는 계산은 컴파일러의 지원 범위로 제한됩니다.',
        ts: '1. TypeScript의 흐름에서 출발하기',
        tsP: 'if/else와 for 같은 구문은 익숙하지만, TypeShade에서는 각 조건식과 반복식이 GPU 코드로 변환할 수 있어야 합니다. 문법이 같다는 것이 JavaScript 런타임 의미론 전체를 가져온다는 뜻은 아닙니다.',
        branch: '2. 조건 분기',
        branchP:
          'if/else는 계산 경로를 표현합니다. 분기 안에서도 TypeShade가 이해하는 값과 리소스만 사용합니다.',
        branchValueP: `조건에 따라 값을 고를 때는 \`c ? a : b\`로 쓴다. WGSL에는 \`?:\` 연산자가 없다. 스칼라나 벡터라면 WGSL 출력은 \`select(b, a, c)\`이다. 거짓일 때의 값이 먼저 오고 조건이 마지막에 온다. WGSL은 두 값을 모두 계산하므로 비용이 큰 쪽은 \`if\`에 두십시오. ${glsl}에서는 \`?:\`가 그대로 남는다. 구조체나 배열은 두 타깃 모두 변수 하나와 \`if\`로 고른다.`,
        loop: '3. 반복',
        loopP:
          'for 루프와 while 루프, 배열을 도는 for...of를 씁니다. for 루프는 유니폼 필드나 배열의 길이처럼 실행 중에야 정해지는 값까지 셀 수 있습니다. 배열의 map, forEach, some, every, reduce, fill, findIndex, findLastIndex, indexOf, lastIndexOf, includes도 저마다 카운트 루프로 컴파일되며, map은 길이가 정해진 배열에 씁니다.',
        kernel: '4. 커널로 도는 루프',
        kernelP:
          '진입점이 아니면서 크기가 없는 배열 `array<T>`나 2D 스토리지 텍스처 `texture_storage_2d<F, A>`를 받는 내보낸 함수는 커널 함수이다(규칙 8.22). 샘플링하는 텍스처만 받는 함수는 커널 함수가 아닙니다. 그런 텍스처를 읽는 내보낸 함수는 헬퍼로 남습니다. 배열이나 텍스처는 호출한 쪽의 것이며, 함수는 그 자리에서 읽고 씁니다. 본문 최상위의 `for`는 저마다 컴파일러가 GPU에서 반복 하나당 호출 하나로 돌릴 수 있는 루프이고, 호스트 파일은 다른 가져오기처럼 이 함수를 await로 호출합니다. `@compute`나 바인딩, `global_invocation_id`는 쓰지 않습니다. 함수 앞에 `@workgroup_size([128])`를 쓰면 WebGPU에서 그 루프들의 워크그룹 크기가 정해지며, 쓰지 않으면 64입니다. 리덕션을 하는 루프는 언제나 256 크기의 워크그룹으로 돕니다. 그래서 그런 루프가 있는 함수에 이 어트리뷰트를 쓰면 거부된다(`TS8077`).',
        kernelRulesP:
          '컴파일러는 어떤 반복도 다른 반복이 건드리는 것을 건드리지 않는다고 증명할 때 루프를 GPU에서 돌립니다. 루프는 상수만큼 나아가는 카운트 `for`나 `for...of`여야 하고, 안에서 반환하거나 빠져나가는 곳이 없어야 합니다. 쓰기는 다음 자리에만 합니다. 루프 안에서 선언한 이름, 루프 자신의 인덱스로 만든 자리의 바깥 배열이나 텍스처, 아무 인덱스에나 합쳐 넣는 정수 배열이 그 자리입니다. `+=`, `*=`, `min`, `max`, `&`, `|`, `^`로 합치는 변수도 됩니다. 합치는 변수는 GPU와 CPU가 같은 트리 순서로 접습니다. `push`로 덧붙이기만 하는 배열과, 루프가 값을 넣는 `Map`이나 `Set`도 됩니다. 루프는 자신이 쓰는 배열을 쓰는 자리에서만 읽습니다. 합치는 변수, 덧붙이는 배열, 값을 넣는 `Map`과 `Set`은 읽지 않습니다. 모듈 변수나 바인딩을 쓰는 함수를 부르지 않고, 배리어와 워크그룹 메모리, `console` 호출이 없어야 합니다.',
        kernelLayoutP:
          '일반 WebGPU 커널 호출은 읽기 전용 객체 배열에서 실제로 쓰는 필드만 업로드할 수 있습니다. 중첩되지 않은 `f32`, `i32`, `u32` 필드의 선언 순서는 유지됩니다. 호스트가 넘긴 모든 선언 필드는 계속 검사하며, 속성을 읽는 순서도 같습니다. 쓰기 대상, resident, fused 입력이나 분석으로 확인하지 못한 입력은 전체 레이아웃을 유지합니다. `typeshade({ fuse: true })`로 빌드한 모듈도 같습니다. 진입점 바인딩, 리플렉션, 매니페스트와 raw bytes의 외부 레이아웃은 바뀌지 않습니다. CPU와 WebGL2의 표현도 유지됩니다. 업로드가 작아져도 전체 호출이 빨라진다는 보장은 없으므로, 실제 기기에서 측정해야 합니다.',
        kernelWarnP:
          '증명이 받아들이지 않은 루프는 CPU에서 돌며, 어느 쪽이든 프로그램은 올바르게 동작합니다. 진입점이나 헬퍼, 프래그먼트 셰이더 안의 루프는 증명 대상이 아니며, 지금처럼 호출마다 도는 코드로 남습니다. 컴파일러는 거부한 루프에 경고 `TS8070`을 붙입니다. 첫 문장은 해당 줄과 코드에 쓴 이름을 짚고, 둘째 문장은 고치는 방법을 알려 줍니다. 고정된 컴파일러에서 경고는 다음과 같습니다.',
        kernelRule: '규칙',
        kernelWarning: '경고',
        methods: '5. 배열 메서드, push, Map과 Set',
        methodsP:
          '`map`을 뺀 배열 메서드는 커널 함수의 배열에서도 씁니다. `forEach`, `reduce`, `some`, `every`, `fill`, `findIndex`, `findLastIndex`, `indexOf`, `lastIndexOf`, `includes`가 그 메서드이다(규칙 8.18). 각 메서드는 자신이 나타내는 루프가 되어, 호출한 자리에 그대로 들어갑니다. 넘긴 함수는 그 루프의 본문이 됩니다. 증명은 이 루프를 `for` 루프와 똑같이 읽으므로, 아래의 두 루프는 모두 GPU에서 돕니다. `forEach`는 `out`의 자기 인덱스에 쓰고, `+`를 쓰는 `reduce`는 리덕션입니다.',
        methodsOrderP:
          '`reduce`는 모든 tier에서 리덕션의 트리 순서로 더합니다. TypeScript는 왼쪽부터 더하므로, `f32` 합은 끝자리가 다를 수 있습니다. 결정성 보고서는 이를 `order`로 적는다(규칙 7.2). `some`, `every`, `includes`는 모든 원소에 대한 `|`와 `&`입니다. `findIndex`, `indexOf`와 그 `Last` 형태는 조건을 만족하는 인덱스의 `min`이나 `max`이며, 답을 정하는 첫 원소의 답과 같습니다. 넘긴 함수는 원소마다 실행되므로, 캡처한 값을 변경하는 함수는 거부됩니다.',
        pushP:
          '루프는 `out.push(v)`로 배열 매개변수에 값을 덧붙입니다. 문장으로 쓰며, 한 반복 안에서 몇 번이든, 어느 분기에서든 쓸 수 있습니다. 함수 안에서 이 배열은 빈 상태로 시작합니다. 원소는 모든 tier에서 루프를 차례로 실행했을 때 덧붙는 순서대로 놓이고, 루프 뒤의 `out.length`는 덧붙인 개수입니다.',
        pushHostP:
          '호스트 배열의 길이가 용량입니다. 호출은 앞에서부터 용량만큼 원소를 쓰고, 나머지는 그대로 둡니다. 함수가 돌려주는 개수는 용량보다 클 수 있습니다. 그래서 `n > out.length`를 본 호스트는 더 큰 배열로 다시 호출할 수 있습니다. WebGPU에서 이 루프는 디스패치 세 번으로 돕니다. 먼저 반복마다 덧붙일 개수를 세고, 워크그룹 하나가 그 개수를 오프셋으로 스캔한 뒤, 반복마다 자기 오프셋에 값을 저장합니다. WebGL2는 값을 덧붙이는 루프를 돌리지 않습니다.',
        collectionsP:
          '매개변수는 ECMAScript의 `Set<K>`나 `Map<K, V>`일 수도 있습니다. `K`는 `u32`, `i32`, `f32` 또는 [키 타입](languageStringKeys)입니다. 루프는 `s.add(k)`나 `m.set(k, v)`로 값을 넣습니다. 호스트는 JavaScript의 `Set`이나 `Map`을 그대로 넘깁니다. 호출이 끝나면 루프를 차례로 실행했을 때 남는 항목이 그 안에 들어 있습니다. 키는 한 번씩, 처음 넣은 순서대로 들어가고, 값은 마지막에 넣은 것입니다. 뒤의 루프는 `has`, `get`, `size`로 읽으며, `m.get(k)!`는 `m.has(k)`로 확인한 자리에서만 읽습니다. 컬렉션 루프는 WebGPU와 CPU tier에서 실행됩니다. WebGL2는 지원하지 않습니다. 호출은 루프 전에 문자열 키를 id로 바꾸고, 끝난 뒤 문자열로 되돌리며 삽입 순서를 유지합니다. 알 수 없는 호스트 문자열은 `TypeError`를 냅니다. 값 집합이 열린 `Map<string, V>`와 `Set<string>`은 계속 거부됩니다. [kernel-set-unique](exampleKernelSetUnique)와 [호스트-set-unique](exampleHostSetUnique)가 두 가지를 모두 보여 줍니다.',
        fuse: '6. 커널 호출 체인',
        fuseP:
          '호스트는 등록용 import 없이 `device.fuse()` 안에서 커널 함수 여러 개를 부를 수 있다(규칙 11.13). 기본 소유자를 사용하는 `typeshade/fuse`의 `fuse()`도 계속 지원합니다. 이 컴파일러 버전에서는 합칠 수 있는 호출을 분석하는 정보를 얻으려면 여전히 `typeshade({ fuse: true })`로 빌드해야 합니다. WebGPU에서는 바로 앞 호출이 같은 인덱스에 쓴 값을 읽는 호출들이 제출 하나 안의 디스패치 하나로 실행됩니다. 스코프가 돌려주는 리포트는 그룹마다 이름을 대고, 두 호출이 따로 실행되는 이유를 알려 줍니다. 본문 안의 진입점 호출은 혼자 그룹을 이루며, 배열에 값을 덧붙이는 루프도 그렇습니다. `Map`이나 `Set`을 받는 호출도 별도 그룹이며, 리포트는 `b takes a Map or a Set`이나 CPU에서 실행하는 이유를 표시합니다. `FuseReport`와, 여러 리포트를 하나로 합치는 `mergeReports`는 `typeshade/runtime`에서도 가져올 수 있습니다. 그래서 리포트를 읽기만 하는 호스트는 플래너를 싣지 않습니다.',
        fuseIndirectP:
          '진입점 호출은 앞선 호출이 쓴 배열에서 워크그룹 개수를 읽을 수 있습니다. `entry(bindings, { indirect, offset })`는 호출이 실행될 때 `Resident<Uint32Array>`의 `offset` 원소에서 개수 세 개를 읽습니다. 그러면 호출 체인 사이에 읽기가 필요 없습니다. 스코프 안에서는 이런 호출의 그룹이 리포트에 `indirect: true`로 적힙니다.',
        fuseOverrideP:
          '`device.fuse()` 안에서도 가져온 컴퓨트 진입점의 세 번째 인자로 `{ constants }`를 넘깁니다. 크기가 없는 스토리지 배열은 그 소유자의 Resident여야 합니다. 호출은 계획의 제출 안에서 혼자 그룹을 이루며, 소유자의 fp64 방식을 유지합니다. WebGPU에서는 `workgroupShapes`가 `[[32, 1, 1]]`처럼 선택한 차원을 표시합니다. 상수 선택으로 제출이나 대기, 읽기가 추가되지는 않습니다. [host-compute 예제](exampleHostCompute)는 리포트를 돌려주고 계획이 끝난 뒤 출력을 읽습니다.',
        deviceP:
          '`typeshade/runtime`의 `createDevice()`는 호출의 소유자를 엽니다. `device.array()`는 그 호출이 받는 `Resident` 배열을 만들고, `device.fuse()`는 본문의 호출을 그 디바이스에서 계획 하나로 실행합니다. 일반 호출은 배열과 텍스처의 유일한 소유자를 선택하며, 소유자가 있는 리소스가 없으면 기본 소유자를 씁니다. 여러 소유자가 섞이면 실행 전에 거부합니다. `Resident`의 소유자는 수명 동안 바뀌지 않습니다. `device.release(r)`는 배열을 디바이스의 풀에 돌려주며, 원소와 길이가 같은 다음 `array()`가 그 배열을 다시 씁니다.',
        chunkP:
          '디스패치 하나 안에서 반복하는 커널은 GPU 워치독이 디바이스를 재설정할 만큼 오래 돌 수 있습니다. 그런 루프는 청크로 나눕니다. `device.chunkSize(key, max)`는 디바이스의 시간 예산 `createDevice({ timeBudgetMs })` 안에서 다음 청크의 단위 수를 줍니다. `device.fuse(body, { chunk: { key, units } })`는 그 청크를 혼자 실행하고 시간을 잽니다. 리포트에는 `chunk` 행이 붙고, `device.chunkRates`에는 디바이스가 잰 값이 쌓입니다.',
        modulesP:
          '`typeshade/algorithms`와 `typeshade/random`은 TypeShade로 쓴 커널 함수이며, 한 스코프 안에서 직접 쓴 커널 함수와 합쳐집니다. [알고리즘](languageAlgorithms)과 [난수](languageRandom)에서 목록을 볼 수 있습니다.',
        boundary: '7. JavaScript와의 경계',
        boundaryItems: [
          'filter, find처럼 길이를 바꾸거나 undefined를 줄 수 있는 배열 메서드는 루프로 씁니다. findIndex와 indexOf는 찾는 원소가 없으면 -1을 줍니다.',
          '일반 런타임 객체에 의존하지 않습니다.',
          '조건과 반복에는 GPU에서 계산 가능한 값과 범위만 사용할 수 있습니다.',
          'TypeScript에서 유효한 제어 흐름이라고 해서 TypeShade 셰이더 언어 규칙에서도 자동으로 유효한 것은 아닙니다.',
        ],
        next: '다음: GPU types',
      },
      gpuTypes: {
        title: 'TypeShade GPU 타입',
        description:
          'TypeScript의 타입 표면과 TypeShade의 scalar, vector, matrix, array GPU 값을 연결하는 방법을 설명합니다.',
        h1: 'GPU types: TypeScript 표면에서 GPU 값으로',
        intro:
          'TypeShade의 타입은 TypeScript 문법으로 작성하지만 TypeScript의 모든 런타임 값 타입을 그대로 가져오지는 않습니다. GPU에서 계산에 사용하는 값은 스칼라, 벡터, 행렬, 배열로 나뉩니다.',
        mapping: '1. TypeScript 타입과 GPU 타입의 관계',
        mappingP:
          'TypeScript의 `number`처럼 넓은 런타임 타입을 그대로 셰이더 값으로 취급하기보다 `f32`, `i32`, `u32`처럼 GPU 표현을 명시합니다. `vec*`, `mat*`도 JavaScript 객체가 아니라 GPU 연산 값입니다.',
        scalar: '2. 스칼라',
        scalarP:
          '단일 숫자 값은 GPU scalar 타입으로 표현합니다. 리소스와 구조체 필드의 타입을 명시할 때 사용합니다.',
        vector: '3. 벡터',
        vectorP:
          'vec2, vec3, vec4는 여러 scalar 값을 하나의 GPU 값으로 묶습니다. 셰이더 계산과 vertex/fragment 데이터에서 자주 사용합니다.',
        matrix: '4. 행렬',
        matrixP:
          'mat4 같은 matrix 타입은 변환 계산에 사용합니다. TypeScript 객체가 아니라 GPU 연산 값입니다.',
        arrays: '5. 배열',
        arraysP:
          '배열은 여러 GPU 값을 표현합니다. 길이가 고정된 배열과 같은 타입의 원소로 이루어진 튜플은 함수 안의 const, let 바인딩 패턴을 지원합니다. 일부 원소를 생략하거나 패턴을 중첩할 수 있으며, 각 바인딩은 값을 복사합니다. 런타임이나 특수화 상수에 따라 길이가 정해지는 배열은 이 패턴을 지원하지 않습니다. 리소스 원소 타입과 함께 쓰면 호스트가 제공하는 버퍼의 구조를 나타냅니다.',
        live: '6. 라이브 예제',
        liveP:
          '아래 진입점은 줄마다 GPU 타입이 하나씩 나옵니다. 위치는 `vec2`, 거리와 반지름은 `f32`, 색은 `vec3`이입니다.',
        liveTitle: '원반',
        liveCaption: '원반 하나입니다. vec2가 자리를, f32가 크기를, vec3이 색을 정합니다.',
        liveAnchor:
          '`d`는 픽셀에서 원반 테두리까지의 거리입니다. 안쪽은 음수, 테두리 위는 0, 바깥쪽은 양수입니다. `edge`는 그 `f32` 하나를 마스크로 바꾸고, `mix`는 그 마스크를 읽어 색을 고릅니다.',
        liveExercises: [
          '`p` 줄의 `vec2(ratio, 1.)`을 `vec2(1., 1.)`로 바꿉니다. 원반이 늘어나 타원이 됩니다. `ratio`가 x 성분에만 곱해지고 있었고, 성분마다 다르게 다루는 것이 `vec2`로 할 수 있는 일입니다.',
          '`return` 줄을 `return vec4(vec3(fract(d * 10.)), 1.)`로 바꿉니다. 나타나는 고리가 바로 `d`이입니다. `vec3`은 그 `f32` 하나를 색 채널 세 개에 그대로 펼칩니다.',
          '`length(p)`를 `max(abs(p.x), abs(p.y))`로 바꾸면 원반이 정사각형이 되고, `abs(p.x) + abs(p.y)`로 바꾸면 마름모가 됩니다. 원하는 모양을 재는 `f32`를 직접 작성합니다.',
        ],
        liveCenter: 'uv 공간 기준 위치',
        liveRadius: 'uv 단위 반지름',
        liveTint: '원반 색',
        next: '다음: Resources',
      },
      resources: {
        title: 'TypeShade 리소스',
        description:
          'TypeScript의 선언과 타입 표면에서 출발해 uniform과 storage 리소스의 GPU 의미와 호스트 계약을 이해합니다.',
        h1: 'Resources: TypeScript 선언에서 GPU 리소스로',
        intro:
          'TypeShade 리소스는 셰이더가 소유하는 JavaScript 객체가 아니라 호스트가 채우는 바인딩 슬롯입니다. 제품 코드에서는 `declare`로 이 경계를 명시합니다.',
        mapping: '1. TypeScript 선언과 대응하기',
        mappingP:
          'TypeScript의 `declare`가 런타임 값을 만들지 않고 타입 수준의 존재를 설명하듯, TypeShade의 `declare`는 호스트가 제공하는 GPU 리소스를 소스에 표현합니다. 다만 TypeShade에서는 `uniform<T>`와 `storage<T>`가 GPU 메모리 의미까지 지정합니다.',
        decl: '2. `declare`로 리소스 선언',
        declP: 'initializer 없이 리소스의 타입과 접근 권한을 선언합니다.',
        access: '3. 접근 권한은 타입에 씁니다',
        accessP:
          'uniform은 읽기 전용이고 `uniform<T>`는 타입 인자를 하나만 받습니다. storage는 `storage<T>`면 읽기 전용이고, `storage<T, "read_write">`면 읽고 쓸 수 있습니다. 접근 권한은 WGSL에서처럼 두 번째 타입 인자로 씁니다. 리소스는 모두 `const`로 선언합니다.',
        slots: '4. 바인딩 순서와 호스트 계약',
        slotsP:
          '리소스 슬롯은 파일의 declare 순서와 연결됩니다. 실제 바인딩 번호를 코드에 흩뿌리기보다 컴파일러와 호스트의 reflection 결과를 계약으로 사용하는 방향이 기본입니다.',
        workgroup: '5. 워크그룹 메모리',
        workgroupP:
          '`workgroup<T>` 값은 한 워크그룹의 인보케이션들이 함께 씁니다. 내부 배열의 길이는 `@compute`와 같은 override로 정할 수 있습니다. 호스트는 파이프라인을 만들 때 그 값을 선택합니다.',
        invalid: '6. 자주 하는 실수',
        invalidItems: [
          '`declare const x: f32`처럼 `uniform<T>`나 `storage<T>` 없이 선언하지 않습니다.',
          '리소스를 `let`으로 선언하지 않습니다. 컴파일러는 `declare let x: storage<T>`를 거부하고, 대신 쓸 `declare const` 줄을 알려 줍니다.',
          'read-only 리소스에 대입하지 않습니다.',
          '리소스를 class의 bind group처럼 모델링하지 않습니다.',
        ],
        next: '다음: Shader stages',
      },
      stages: {
        title: 'TypeShade 셰이더 스테이지',
        description:
          'TypeScript 함수와 모듈 개념에서 출발해 compute, vertex, fragment 진입점와 명시적인 builtin 매개변수를 이해합니다.',
        h1: 'Shader stages: GPU 실행 지점을 명시하기',
        intro:
          'TypeShade의 진입점는 class가 아니라 내보낸 최상위 함수입니다. 데코레이터가 함수의 셰이더 스테이지와 필요한 메타데이터를 표시합니다.',
        mapping: '1. TypeScript 함수와 모듈에서 출발하기',
        mappingP:
          'TypeScript에서 `export function`은 모듈의 공개 함수입니다. TypeShade에서는 여기에 스테이지 데코레이터를 더하면 파이프라인 진입점라는 GPU 의미가 생깁니다. 데코레이터가 없는 함수는 재사용 가능한 헬퍼로 남습니다.',
        compute: '2. Compute',
        computeP:
          'compute 진입점의 `@compute` 차원에는 `override<u32>` 이름을 쓸 수 있습니다. 숫자로 적던 차원도 계속 쓸 수 있습니다. `global_invocation_id` 같은 builtin은 명시적인 매개변수로 받습니다.',
        computeHostP:
          '일반 TypeScript에서 크기를 고른 뒤 `program.compute()`의 이름 있는 상수로 넘깁니다. 디스패치 수는 `pipeline.workgroupShape`에서 계산합니다. 가져온 진입점은 `entry(bindings, groups, { constants: { WG_SIZE: selected } })`로 부르며, `device.fuse()` 안에서도 같습니다. 선택한 크기에 맞춰 `groups`를 계산하고, 마지막 그룹에서 입력을 벗어난 인보케이션은 셰이더에서 걸러냅니다. WebGL2는 기본 워크그룹 모양을 사용해야 합니다. [host-compute 예제](exampleHostCompute)에 전체 호스트와 셰이더가 있습니다.',
        graphics: '3. Vertex와 fragment',
        graphicsP:
          '`@vertex`와 `@fragment`는 그래픽스 파이프라인의 진입점를 표현합니다. 입력과 출력은 TypeShade 값 타입과 명시적인 builtin 매개변수로 선언합니다. 스테이지마다 무엇을 건네받고 무엇을 돌려주는지는 [셰이더 파이프라인](conceptsPipeline)이 설명합니다.',
        helper: '4. Helper function',
        helperP:
          '데코레이터가 없는 함수는 진입점가 아니라 헬퍼이입니다. 진입점를 class method로 만들거나 `this`를 파이프라인 객체로 취급하지 않습니다.',
        next: '다음: 알고리즘',
      },
      algorithms: {
        title: 'typeshade/algorithms: 맵, 리덕션, 스캔',
        description:
          'TypeShade가 커널 함수로 제공하는 공용 알고리즘입니다. 복사, 맵, 리덕션, 스캔, 압축, 히스토그램을 모든 tier에서, fuse() 안에서도 씁니다.',
        h1: '알고리즘: typeshade/algorithms',
        intro:
          '`typeshade/algorithms`는 공용 모듈입니다. `"use typeshade"`로 쓴 커널 함수를 패키지의 하위 경로로 내보낸다(규칙 11.20). 배열에 대한 복사, 채우기, 맵, 리덕션, 스캔, 압축, 히스토그램이 들어 있습니다. 각 함수는 WebGPU, WebGL2, CPU tier에서 돌며, 어느 쪽에서든 CPU 오라클과 같은 비트를 냅니다. `fuse` 스코프 안에서는 사실이 허용하는 만큼 주변 호출과 합쳐집니다.',
        host: '1. 호스트 인터페이스',
        hostP:
          '호스트 코드는 다른 패키지처럼 이 하위 경로를 가져오고, 각 함수를 `Resident` 배열 위에서 부릅니다. 따로 부를 수도 있고 `fuse` 본문 안에서 부를 수도 있습니다. 각 함수는 출력의 모든 원소를 쓰므로, 디바이스 풀에서 받은 배열을 따로 초기화할 필요가 없습니다. 예외는 `histogram` 하나입니다. 이 함수는 받은 칸에 개수를 더하므로, 호출하는 쪽이 칸을 먼저 초기화합니다.',
        functions: '2. 함수 목록',
        functionsP: '행에 따로 적지 않은 배열 매개변수는 `array<f32>`이입니다.',
        functionsColumns: ['묶음', '함수', '하는 일'],
        functionsRows: [
          [
            '복사와 채우기',
            '`copy(out, x)`, `fill(out, value)`, `sequence(out, start, step)`',
            '`i`에서 도는 루프 하나입니다. `sequence`는 `start + f32(i) * step`을 씁니다.',
          ],
          [
            '이항 맵',
            '`(out, a, b)` 형태의 `add`, `sub`, `mul`, `div`와 `scale(out, x, k)`',
            '`i`의 루프 하나.',
          ],
          [
            '단항 맵',
            '`(out, x)` 형태의 `abs`, `neg`, `sqrt`, `rsqrt`, `exp`, `log`, `expm1`, `log1p`, `floor`, `ceil`, `round`, `sign`, `sin`, `cos`, `tan`, `tanh`, `sigmoid`, `relu`와 `clip(out, x, lo, hi)`',
            '`i`에서 도는 루프 하나입니다. 셰이더 모듈에서는 `absMap`처럼 `<op>Map`이라는 이름을 씁니다. 커널 함수는 내장 함수의 이름을 가질 수 없기 때문입니다.',
          ],
          [
            '전체 리덕션',
            '`sum(x)`, `max(x)`, `min(x)`이며, 각각 `f32`를 돌려줍니다',
            '모든 tier에서 같은 트리 순서로 접는다(규칙 7.2). 셰이더 모듈에서는 `sum`, `maxAll`, `minAll`이다.',
          ],
          [
            '축 리덕션',
            '`(out, x, axis, inner)` 형태의 `sumAxis`, `meanAxis`, `prodAxis`, `maxAxis`, `minAxis`, `argMaxAxis`, `argMinAxis`',
            '`x`를 `[outer, axis, inner]`로 읽습니다. `out`의 각 원소는 오름차순으로 차례로 접은 값입니다.',
          ],
          [
            '스캔',
            '`array<u32>`에 대한 `inclusiveScan(out, x, sums)`, `exclusiveScan(out, x, sums)`',
            '커널 함수 하나 안의 루프 두 개입니다. `sums`는 호출하는 쪽의 스크래치이며, 원소가 하나 이상이고 `x` 길이의 제곱근 정도면 됩니다.',
          ],
          [
            '압축',
            '`compact(out, x, flags, offsets)`',
            '플래그가 1인 원소를 원래 순서대로 모읍니다. `offsets`는 `flags`의 배타적 스캔입니다.',
          ],
          [
            '히스토그램',
            '`histogram(bins, x, lo, hi)`',
            '`[lo, hi)`를 같은 너비로 나눈 각 칸에 드는 `x`의 개수를 `bins`에 더합니다. WebGPU에서는 더하기마다 원자 연산입니다.',
          ],
        ],
        fuse: '3. 호출이 합쳐지는 방식',
        fuseP:
          '모든 맵은 `out`의 `i`에 쓰고 입력도 `i`에서 읽습니다. 그래서 맵의 체인은 디스패치 하나가 되고, 전체 리덕션은 체인의 마지막 호출로 합류합니다. 축 리덕션, 스캔, 압축은 입력을 다른 인덱스에서 읽습니다. 그래서 그 입력을 쓴 호출 뒤에서는 저마다 새 그룹을 시작합니다. 예제의 첫 스코프에서는 `fill`, `add`, `relu`가 디스패치 하나로, `sumAxis`가 두 번째 디스패치로 실행되며, 둘은 제출 하나에 담깁니다.',
        tiers: '4. 함수가 실행되는 곳',
        tiersP:
          '컴파일러의 차등 게이트는 모든 함수를 WebGPU와 WebGL2에서 불러 CPU 오라클과 비교합니다. 결정성 보고서에 행이 없는 함수는 비트 단위로 같아야 하고, `exp`나 `sin`처럼 행이 있는 함수는 정해진 범위 안에 들어야 합니다. WebGL2는 전체 리덕션 세 개, 스캔 두 개, `compact`, `histogram`을 거부합니다. 그래서 이 호출들은 선택된 소유자의 `prefer` 정책에서 다음 tier로 넘어간다(규칙 11.8).',
        device: '5. 디바이스 인터페이스',
        deviceP:
          '`"use typeshade"` 파일도 `typeshade/algorithms`에서 가져올 수 있습니다. 이 하위 경로는 `typeshade` 조건에서 셰이더 모듈을 가리킵니다. 그 내보내기는 커널 함수이고, 커널 함수는 다른 함수가 부르지 않습니다. 그래서 이번 버전에서 셰이더 파일이 이 모듈에서 부를 함수는 없습니다. 커널이 자기 워크그룹 메모리 위에서 조합하는 헬퍼는 다음에 나옵니다.',
        later: '6. 아직 없는 것',
        laterP:
          '정렬, 분할, 구간별 리덕션, `reduceByKey`, 최근접 이웃 탐색, 행렬 곱, `f64` 선형대수, 워크그룹 메모리 스캔은 다음에 나옵니다.',
        next: '다음: 난수',
      },
      random: {
        title: 'typeshade/random: 해시와 균등 분포 난수',
        description:
          'TypeShade가 제공하는 공용 난수 생성기입니다. 커널에서는 hash32, xorshift32, uniform을, 호스트에서는 fillUniform, fillWords, generator를 쓰며, 모든 tier에서 결과가 같습니다.',
        h1: '난수: typeshade/random',
        intro:
          '`typeshade/random`은 두 번째 공용 모듈이다(규칙 11.20). 커널이 난수를 뽑는 생성기와 해시, 호스트가 부르는 채우기 함수가 들어 있습니다. 모두 모든 tier에서 같은 비트를 냅니다.',
        device: '1. 디바이스 인터페이스',
        deviceP:
          '`"use typeshade"` 파일은 스칼라 헬퍼 세 개를 가져와 자기 커널이나 진입점에서 부릅니다. 예제의 난수는 시드와 인덱스에만 달려 있으므로, tier나 디스패치 모양이 바뀌어도 그대로입니다.',
        deviceColumns: ['함수', '하는 일'],
        deviceRows: [
          [
            '`xorshift32(state: u32): u32`',
            'xorshift32를 한 단계 진행합니다. 상태가 영이면 계속 영이므로, 영이 아닌 값으로 시드를 줍니다.',
          ],
          [
            '`hash32(x: u32): u32`',
            '32비트 정수 마무리 해시이며, 상태 없이 인덱스에서 난수를 뽑을 때 씁니다. `hash32(0)`은 0입니다.',
          ],
          [
            '`uniform(word: u32): f32`',
            '`word`의 상위 24비트를 `[0, 1)` 범위의 `f32`로 바꿉니다. 이 값은 `f32`에서 정확하므로, 같은 워드는 모든 tier에서 같은 수가 됩니다.',
          ],
        ],
        host: '2. 호스트 인터페이스',
        hostP:
          '호스트 코드도 같은 하위 경로를 가져옵니다. 세 헬퍼는 CPU에서 도는 함수로 여기에도 있고, 그 옆에 함수 세 개가 더 있습니다. `generator(seed)`는 같은 `hash32`와 `uniform`을 씁니다. 그래서 같은 시드라면 호스트에서 섞은 결과와 디바이스에서 뽑은 난수가 비트 단위로 맞습니다.',
        hostColumns: ['함수', '하는 일'],
        hostRows: [
          [
            '`fillUniform(out, seed: u32)`',
            '커널 함수입니다. 원소 `i`는 `uniform(hash32(seed ^ i))`이며, `[0, 1)` 범위의 난수입니다.',
          ],
          [
            '`fillWords(out: array<u32>, seed: u32)`',
            '커널 함수입니다. 원소 `i`는 `hash32(seed ^ i)`이입니다.',
          ],
          [
            '`generator(seed: u32): () => number`',
            '평범한 JavaScript 함수입니다. 부를 때마다 0에서 시작하는 카운터의 다음 난수를 줍니다.',
          ],
        ],
        held: '3. 검증 방식',
        heldP:
          '컴파일러의 테스트는 CPU tier의 `fillUniform(out, seed)`를 원소마다 `generator(seed)`와 비교합니다. 차등 게이트는 WebGPU와 WebGL2에서 두 채우기 함수를 CPU 오라클과 비교합니다.',
        later: '4. 아직 없는 것',
        laterP:
          '정규 분포, Philox나 PCG처럼 상태가 더 큰 카운터 기반 생성기, 순열은 다음에 나옵니다.',
        next: '언어 개요로 돌아가기',
      },
    },

    // 구성 요소 대응 페이지 네 개. 표 자체는 컴파일러 레지스트리에서 생성하므로
    // 여기에는 표를 둘러싼 문장만 둡니다.
    mapping: {
      fromTypescript: {
        title: 'TypeScript 문법과 그 변환 결과',
        description: `"use typeshade" 파일에서 TypeScript 문법 ${facts.constructRows}가지가 각각 무엇이 되는지 정리합니다. 선언, 함수, 클래스, 제어 흐름, 그리고 컴파일러가 생성하는 셰이더 코드를 함께 싣습니다.`,
        h1: 'TypeScript 문법',
        intro: `TypeShade는 셰이더 컴파일러가 검사하는 TypeScript 문법입니다. 문법 하나는 셰이더 코드로 하향 변환되거나, 이유를 명시한 진단과 함께 거부됩니다. 카드마다 오른쪽 칸에 놓인 코드는 고정된 커밋의 컴파일러가 낸 것입니다. 아래 섹션 페이지에 ${facts.constructRows}가지를 나눠 실었습니다.`,
        readingH: '카드 하나를 읽는 법',
        readingP:
          '카드 머리에는 문법의 이름이 있고, 언어가 거절하는 문법에는 표시가 하나 붙습니다. 이름 아래에는 변환 결과를 설명합니다. 왼쪽 칸은 TypeScript이며, 이 페이지를 빌드할 때 컴파일하는 `"use typeshade"` 프로그램에서 그대로 가져옵니다. 오른쪽 칸은 생성된 WGSL이고, 그 프로그램에서 이름으로 잘라 낸 부분입니다. 거절되는 카드에는 그 자리에 컴파일러가 낸 코드와 메시지가 들어갑니다.',
        guidesP:
          '각 카드에는 변환 결과를 제시합니다. 관련 언어 규칙은 [타입](languageTypes), [함수](languageFunctions), [제어 흐름](languageControlFlow), [GPU 타입](languageGpuTypes), [리소스](languageResources)에서 설명합니다. 내장 함수는 [별도의 표](languageBuiltins)에 있습니다.',
        paneTs: 'TypeScript',
        paneWgsl: '생성된 WGSL',
        paneDiagnostic: '컴파일러 진단',
        refused: '거절',
        pagesH: '섹션',
        constructs: (n: number) => `구성 요소 ${n}가지`,
        pages: {
          declarations: {
            title: '선언과 그 변환 결과',
            description:
              '"use typeshade" 파일에서 상수와 변수, enum, 타입 별칭, 인터페이스, 네임스페이스가 각각 무엇이 되고 무엇이 생성되는지 싣습니다.',
          },
          functions: {
            title: '함수와 그 변환 결과',
            description:
              '헬퍼와 화살표 함수, 오버로드, 재귀, 진입점, 그리고 컴파일러가 거절하는 호출을 하나씩 짚고, 각각에 대해 생성된 셰이더 코드를 함께 놓습니다.',
          },
          classes: {
            title: '클래스와 그 변환 결과',
            description:
              '생성자와 메서드, 정적 멤버, 상속, 믹스인, 제네릭이 각각 무엇이 되는지, 컴파일러가 쓰는 구조체와 함수를 옆에 나란히 놓고 보여 줍니다.',
          },
          controlFlow: {
            title: '제어 흐름과 삼항 연산이 WGSL로 바뀌는 결과',
            description:
              '조건, 횟수가 정해진 루프, while, switch, break, continue, discard, 그리고 WGSL에 없는 삼항 연산을 각각의 WGSL과 함께 놓고, 거절되는 루프도 보여 줍니다.',
          },
          expressions: {
            title: '식과 타입, 그리고 그 변환 결과',
            description:
              'TypeScript의 타입 단언과 구조 분해, 전개, 리터럴, 그리고 런타임에 생성할 수 없는 값을 생성 코드 또는 컴파일 진단과 비교합니다.',
          },
          double: {
            title: 'TypeShade 파일의 배정밀도 에뮬레이션',
            description:
              '두 타깃 모두 64비트 부동소수점이 없어서 배정밀도 값은 단정밀도 워드 쌍입니다. 컴파일러가 무엇을 다시 쓰고 어떤 호출로 연산을 대신하는지 봅니다.',
          },
        },
        /** The headings the cards of a section page run under, one per run of rows
         *  (src/lib/typescript-lowering.ts). The page's outline lists them. */
        crumbs: '현재 위치',
        groups: {
          constantsAndVariables: '상수와 변수',
          typeDeclarations: '타입과 네임스페이스',
          parametersAndNames: '매개변수와 이름',
          kindsOfFunction: '함수의 종류',
          calls: '호출',
          fieldsAndConstructors: '필드와 생성자',
          methods: '메서드',
          inheritance: '상속과 인터페이스',
          accessors: '접근 제어와 접근자',
          mixinsAndGenerics: '믹스인과 제네릭',
          conditionsAndLoops: '조건문과 반복문',
          choosingAValue: '값 고르기',
          leavingEarly: '일찍 빠져나가기',
          builtValues: '객체, 배열, 튜플',
          claims: '타입 주장',
          operators: '연산자',
          primitives: '문자열, 숫자, 불리언',
          writingDoubles: 'double 쓰기',
          whereItStops: 'double이 멈추는 곳',
        },
        sections: {
          declarations: {
            h: '선언',
            p: '선언은 상수나 변수나 레이아웃에 이름을 붙입니다. 셋 중 무엇이냐에 따라 생성되는 코드가 있는지 없는지가 갈립니다.',
          },
          functions: {
            h: '함수',
            p: '모든 함수는 모듈의 함수입니다. 함수 값도, 가둬 둘 환경도, 호출 스택도 없습니다.',
          },
          classes: {
            h: '클래스',
            p: '클래스는 함수를 두른 구조체입니다. 디스패치가 정적이라 상속과 믹스인과 제네릭은 파일을 컴파일하는 동안 다 정해집니다.',
          },
          controlFlow: {
            h: '제어 흐름',
            p: '루프는 GPU가 끝낼 수 있는 모양이어야 하고, 두 값 중 하나를 고르는 식은 타깃에 연산자가 있는 모양이어야 합니다.',
          },
          expressions: {
            h: '식과 타입',
            p: '타입 주장은 지워집니다. GPU에 대응하는 말이 있는 모양은 남습니다. TypeScript가 실행 시점에 만들 값은 적힌 자리에서 거절합니다.',
          },
          double: {
            h: '배정밀도 에뮬레이션',
            p: `두 타깃 모두 64비트 부동소수점이 없다. \`f64\`는 \`f32\` 두 워드 쌍이며, 백엔드가 보기 전에 \`vec2<f32>\`와 \`df64_\` 호출로 바뀐다. [fp64-lane-stripes](shadeLaneStripes)가 ${split[0]} 경로와 ${split[1]} 경로를 나란히 그립니다.`,
          },
        },
        rows: {
          constScalar: {
            name: '스칼라 `const`',
            p: '모듈 상수입니다. 스칼라는 선언 자리에서 값 하나로 접힙니다. [module-const](shadeModuleConst)',
          },
          constVector: {
            name: '벡터 `const`',
            p: '벡터나 배열 상수는 값을 식으로 지니고, 백엔드가 그 식을 평가합니다. [palette-const](shadePaletteConst)',
          },
          letNoInit: {
            name: '지역 `let`',
            p: '변경 가능한 지역 변수입니다. 타입은 표기가 정하고, 모든 타깃이 영에서 시작합니다. [bitfield-bands](shadeBitfieldBands)',
          },
          unassignedRead: {
            name: '대입 전 읽기',
            p: '대입하지 않은 경로에서 지역 변수를 읽으면 `TS8075`로 거부합니다. TypeScript가 TS2454로 보고하는 규칙과 같습니다. 편집기도 TS2454 대신 `TS8075`를 보여 줍니다.',
          },
          moduleLet: {
            name: '모듈 `let`',
            p: '모듈 변수입니다. 호출마다 하나씩 생깁니다. [private-state](shadePrivateState)',
          },
          varRefused: { name: '`var`', p: '호출별 변수는 `let`, 모듈 상수는 `const`이입니다.' },
          enumRow: {
            name: '`enum`',
            p: '멤버마다 모듈 상수가 하나씩 생깁니다. 이름은 `Enum_Member`, 타입은 `i32`이입니다.',
          },
          constEnum: {
            name: '`const enum`',
            p: '같은 상수가 생깁니다. 여기서 `const enum`은 다르지 않습니다.',
          },
          typeAlias: {
            name: '`type` 별칭',
            p: '대상을 가리키는 다른 이름입니다. 타입이 올 수 있는 자리마다 풀립니다.',
          },
          interfaceRow: {
            name: '`interface`',
            p: '구조체입니다. 같은 필드를 쓴 class와 결과가 같습니다.',
          },
          classStruct: {
            name: '구조체가 되는 클래스',
            p: '구조체입니다. 필드가 호스트의 메모리 레이아웃을 정합니다. [ray-class](shadeRayClass)',
          },
          namespaceRow: {
            name: '`namespace`',
            p: '멤버는 `Ns_member`로 펼쳐지고, namespace 자체는 아무것도 생성하지 않습니다.',
          },
          topFunction: {
            name: '최상위 함수',
            p: '이름과 매개변수와 반환 타입이 같은 모듈 함수가 됩니다.',
          },
          mutableParameter: {
            name: '매개변수 재대입',
            p: '입력값을 지역 복사본에 담습니다. 다시 대입해도 호출자의 값은 바뀌지 않으며, 호출자의 값을 바꾸려면 매개변수를 `@inout`으로 선언합니다.',
          },
          referenceParameter: {
            name: '`@inout` 매개변수',
            p: `\`@inout\`으로 선언한 매개변수는 호출자의 변수 자체이고, 호출은 그 변수를 아무 표시 없이 넘긴다. \`this\`에 값을 넣는 메서드처럼 WGSL은 포인터를, ${glsl}은 \`inout\` 매개변수를 쓴다. [reference-parameters](shadeReferenceParameters)`,
          },
          outParameter: {
            name: '`@out` 매개변수',
            p: '함수는 이 매개변수를 읽기 전에 쓰고, 모든 경로에서 씁니다. 그래서 인자로 아직 값이 없는 `let`을 넘길 수 있습니다. 두 타깃 모두 `@inout`과 같은 방식으로 하향 변환합니다.',
          },
          referenceAlias: {
            name: '한 변수를 가리키는 참조 둘',
            p: `호출 하나가 값을 쓰는 \`@inout\`이나 \`@out\` 매개변수 둘에 같은 변수를 넘길 수 없다. WGSL은 이런 포인터 별칭을 거부하고, ${glsl}은 두 값을 정해지지 않은 순서로 되돌려 씁니다.`,
          },
          lexicalShadow: {
            name: '모듈 값과 같은 이름',
            p: '매개변수나 함수 본문의 지역 변수는 모듈 값과 같은 이름을 쓸 수 있습니다. 클로저는 가장 가까운 선언을 찾으며, 같은 스코프의 중복 선언은 여전히 오류입니다.',
          },
          localFunction: {
            name: '지역 함수',
            p: '모듈의 함수가 됩니다. 이름은 이를 선언한 함수에서 따옵니다.',
          },
          closure: {
            name: '이름 캡처',
            p: '로컬 함수는 바깥 함수에서 읽는 이름을 매개변수로 받고, 쓰는 이름은 참조로 받습니다.',
          },
          defaultArgs: {
            name: '기본 인자',
            p: '매개변수는 모두 남고, 빠뜨린 인자는 호출 지점에 적힙니다. [default-args](shadeDefaultArgs)',
          },
          overloads: {
            name: '오버로드 시그니처',
            p: '시그니처는 건너뛰고 구현 하나만 하향 변환합니다.',
          },
          recursion: {
            name: '재귀 호출',
            p: 'WGSL에는 호출 스택이 없고, 검사는 호출 그래프를 읽습니다.',
          },
          callStatement: {
            name: '문으로 쓴 호출',
            p: '문 하나가 됩니다. 값을 돌려주는 내장 함수가 홀로 서면 계산하는 것이 없어 최적화가 지웁니다.',
          },
          phonyAssign: {
            name: '효과가 있는 호출',
            p: '값을 돌려주면서 효과도 있는 내장 함수에는 WGSL의 `_ =` 대입이 붙습니다. Tint가 반환값을 반드시 쓰도록 요구하기 때문입니다. [atomic-histogram](shadeAtomicHistogram)',
          },
          mathAlias: {
            name: '`Math` 이름',
            p: '`Math.sin`은 `sin`과 같은 내장 함수이고, `Math.PI`는 값으로 접힙니다.',
          },
          constructorNew: {
            name: '`constructor`와 `new`',
            p: '`new`는 `Ray_new` 호출입니다. 구조체를 지어 돌려줍니다.',
          },
          fieldlessClass: {
            name: '필드 없는 클래스',
            p: '인스턴스 필드 없이도 생성하고 메서드를 호출할 수 있습니다. 호스트 값은 `{}`이며, GPU에는 소스 값에 없는 내부 저장 멤버를 둡니다.',
          },
          method: {
            name: '메서드',
            p: '첫 매개변수가 구조체인 함수가 되고, `this`는 그 매개변수로 읽힙니다.',
          },
          staticFn: {
            name: '`static` 메서드',
            p: '수신자가 없는 함수가 되며, 클래스 이름을 앞에 답니다.',
          },
          thisAssign: {
            name: '`this`를 바꾸는 메서드',
            p: `객체를 바꾸는 메서드는 WGSL에서 포인터로, ${glsl}에서 \`inout\`으로 객체를 받는다. [orbit-inout](shadeOrbitInout)`,
          },
          extendsSuper: {
            name: '`extends`와 `super`',
            p: '기반 클래스의 필드가 앞에 오고, 물려받은 메서드는 다시 하향 변환됩니다. `super`는 자기 함수가 됩니다. [구조-inheritance](shadeShapeInheritance)',
          },
          baseValue: {
            name: '기반 타입 자리에 쓰는 파생 값',
            p: '기반 타입으로 읽기만 하며 메서드 선택이 같다고 입증하면 기반 표현을 한 번 구성합니다. 메서드 재정의, 수신 객체의 변경이나 별칭을 통한 관찰 가능한 변경은 이 입증 범위 밖입니다.',
          },
          abstractRow: {
            name: '`abstract` 클래스',
            p: 'abstract 클래스에는 구조체가 없습니다. 하위 클래스가 저마다 필드와 메서드 복사본을 가집니다.',
          },
          implementsRow: {
            name: '`implements`',
            p: 'TypeScript만 검사합니다. 구조체는 그 클래스 자신의 필드입니다.',
          },
          accessModifiers: {
            name: '접근 제어자',
            p: '받아들이지만 셰이더에는 아무 뜻이 없습니다. 강제하는 쪽은 TypeScript입니다.',
          },
          getter: {
            name: '게터와 세터',
            p: '각각 모듈의 함수 `Disc_get_area`와 `Disc_set_area`가 되고, 읽기와 쓰기가 그 함수를 부릅니다. [class-syntax](shadeClassSyntax)',
          },
          mixin: {
            name: '믹스인 함수',
            p: '함수는 컴파일하는 동안 실행됩니다. 멤버는 클래스에 끼워 넣고, `Tinted`는 어디에도 생성되지 않습니다. [mixin-surface](shadeMixinSurface)',
          },
          genericFunction: {
            name: '제네릭 함수',
            p: '프로그램이 쓰는 타입 인자 조합마다 함수가 하나씩 생기고, `pick`이라는 이름은 없습니다. [generic-helpers](shadeGenericHelpers)',
          },
          genericClass: {
            name: '제네릭 클래스',
            p: '타입 인자 조합마다 구조체가 하나씩 생기고, 메서드도 조합마다 따로 생깁니다. [generic-class](shadeGenericClass)',
          },
          ifRow: { name: '`if`', p: '적은 그대로 `if`입니다.' },
          forRow: {
            name: '횟수를 세는 `for`',
            p: '횟수를 세는 루프입니다. 정수 변수와 상수 증가가 있고, 종료 조건은 본문이 쓰지 않는 경계와 변수를 비교합니다. [block-스코프](shadeBlockScope)',
          },
          forRuntime: {
            name: '런타임 경계까지 도는 `for`',
            p: '시작값과 경계는 실행 중에야 알게 되는 값이어도 되고, 반복 횟수에 상한이 없습니다.',
          },
          whileRow: {
            name: '`while`',
            p: '컴파일러가 카운터를 붙인 루프가 됩니다. 본문이 경계로 다가가는지는 아무것도 검사하지 않습니다.',
          },
          switchRow: {
            name: '`switch`',
            p: '`switch`가 됩니다. case는 저마다 `break`로 끝나고, 하향 변환이 그것을 떼어 냅니다. 본문 끝까지 실행이 이어질 수 있는 case는 거절한다(`TS8017`). TypeScript에서는 그런 case가 다음 case까지 이어서 실행되지만, WGSL은 case 하나만 실행합니다. [bitfield-bands](shadeBitfieldBands)',
          },
          ternaryScalar: {
            name: '스칼라 삼항 연산',
            p: `WGSL에는 \`?:\` 연산자가 없어서 삼항 연산이 \`select\`가 된다. 거짓일 때의 값이 먼저, 조건이 마지막에 온다. WGSL은 두 값을 모두 계산한다. ${glsl}에는 삼항 연산자가 그대로 남습니다.`,
          },
          ternaryStruct: {
            name: '구조체 삼항 연산',
            p: '두 타깃 모두 이런 연산자가 없어서, 값을 슬롯 하나와 `if`로 끌어올립니다. [pick-composite](shadePickComposite)',
          },
          breakRow: {
            name: '`break`',
            p: '`break`이입니다. 횟수가 정해진 루프를 일찍 빠져나오는 방법입니다. [julia-twin](shadeJuliaTwin)',
          },
          continueRow: {
            name: '`continue`',
            p: '`continue`이입니다. 루프가 감싸지 않은 `switch` 안에서는 거절합니다.',
          },
          discardRow: {
            name: '`discard`',
            p: '`discard`이입니다. 프래그먼트 진입점이나 그 진입점이 부르는 함수에 씁니다. [cutout](shadeCutout)',
          },
          destructuring: {
            name: '구조 분해',
            p: '객체 패턴은 필드를 읽습니다. 함수 안의 `const`, `let` 배열 패턴은 길이가 고정된 배열이나 같은 타입의 원소로 이루어진 튜플에서 값을 순서대로 복사합니다. 생략한 자리도 인덱스를 차지하며, 중첩 패턴을 지원하고 원본 식은 한 번만 계산합니다. 범위, 원소 타입과 읽기 전용 접근 규칙은 유지됩니다. 나머지 원소, 기본값, 구조 분해 대입, 매개변수, 벡터의 배열 패턴과 런타임 또는 특수화 상수에 따라 길이가 정해지는 배열은 지원하지 않습니다.',
          },
          spread: {
            name: '객체 스프레드',
            p: '구조체의 필드마다 읽기가 하나씩 생기고, 뒤에 적은 필드가 그 위를 덮습니다.',
          },
          arrayLiteral: {
            name: '배열 리터럴',
            p: '문맥에서 원소 타입과 길이가 정해진 배열 초기자입니다. `array<T, N>` 선언이 그 예입니다. 함수 안의 배열 바인딩 패턴은 같은 타입으로 이루어진 리터럴 초기자에서 타입과 길이를 추론할 수도 있습니다. [array-literal-ramp](shadeArrayLiteralRamp)',
          },
          tuple: {
            name: '튜플',
            p: '튜플은 타입이 길이를 고정한 배열입니다. 반환 자리에서도 그렇습니다. [tuple-and-brand](shadeTupleAndBrand)',
          },
          literalUnion: {
            name: '리터럴 유니온',
            p: '문자열 리터럴 유니온은 [키 타입](languageStringKeys)입니다. 그 밖에 멤버가 모두 한 타입을 가리키는 유니온은 그 타입을 가리킵니다.',
          },
          brand: {
            name: '브랜드 타입',
            p: '브랜드는 지워지고 매개변수는 `f32`이입니다. [tuple-and-brand](shadeTupleAndBrand)',
          },
          typeClaims: {
            name: '타입 주장',
            p: '타입에 대한 주장일 뿐 변환이 아니라서, 피연산자가 생성하는 코드를 그대로 생성합니다.',
          },
          power: { name: '거듭제곱 연산자', p: '두 타깃 모두 `pow`입니다.' },
          logicalScalar: {
            name: '`bool`에 쓰는 `&&`',
            p: '두 타깃이 모두 가진 연산자이며, 한 번에 `bool` 하나를 다룹니다.',
          },
          logicalVector: {
            name: '마스크에 쓰는 `&&`',
            p: '마스크는 `all`이나 `any`나 `select`로 묶습니다. [bool-select](shadeBoolSelect)',
          },
          optionalMember: {
            name: '선택 필드',
            p: '구조체 필드는 호스트가 채우는 메모리에 언제나 있습니다.',
          },
          stringValue: {
            name: '문자열 값',
            p: '문자열 리터럴은 [키 타입](languageStringKeys)이 필요한 자리에서 허용됩니다. 값 집합이 열린 `string`은 계속 거부됩니다.',
          },
          numberType: { name: '`number`', p: 'GPU의 수에는 너비가 있습니다.' },
          booleanType: { name: '`boolean`', p: '셰이더 표기는 `bool`이입니다.' },
          integerLiteral: {
            name: '정수 리터럴',
            p: '정수로 적은 지역 초기값은 선언된 비제네릭 함수, 생성자나 메서드의 인자 자리에서 요구하는 `i32` 또는 `u32`를 따를 수 있습니다. 타입이 명시된 초기화와 단순 대입도 지역 변수에 의존하지 않고 타입이 정해져 있으면 양쪽 방향으로 같은 요구를 전달합니다. 서로 다른 구체 타입이 요구되면 `TS8003`을 보고하므로 타입 표기나 캐스트로 정합니다. 정수 타입을 요구하는 사용처가 없으면 타입 표기 없는 지역 변수는 `f32`이입니다. 실수로 적은 초기값, 모듈 상수와 루프 유도 변수는 기존 규칙을 따릅니다.',
          },
          increment: { name: '증감 연산자', p: '값이 한 걸음 옮겨 간 결과를 대입합니다.' },
          f64Scalar: {
            name: '`f64` 스칼라',
            p: '`f32` 두 워드의 쌍이 되고, 연산마다 `df64_` 호출이 붙습니다. [fp64-lane-stripes](shadeLaneStripes)',
          },
          f64Literal: {
            name: '`f64` 리터럴',
            p: '`f64`라고 밝힌 자리의 리터럴은 배정밀도 값을 그대로 지닙니다.',
          },
          f64Vector: {
            name: '`f64` 벡터',
            p: '배정밀도 벡터입니다. hi 평면과 lo 평면으로 하향 변환됩니다. `vec2d`는 `vec2f64`의 짧은 표기입니다.',
          },
          f64Builtin: {
            name: '`f64` 내장 함수',
            p: '스칼라에서 내장 함수 열 개, 벡터에서 열세 개가 에뮬레이션 본체를 가집니다.',
          },
          f64Refused: {
            name: '`f64` 본체가 없는 내장 함수',
            p: '호출 자리에서 거절하며, 그 열 개와 좁히는 방법을 함께 알려 줍니다.',
          },
          f64Guard: {
            name: '유니폼 안의 `f64`',
            p: '`_fp64` 텍스처가 주입됩니다. 호스트가 `1.0`으로 채우고, 리플렉션이 다른 바인딩처럼 보여 줍니다.',
          },
          f64Varying: {
            name: '스테이지 사이의 `f64`',
            p: '배정밀도 값은 필요한 스테이지에서 읽거나, 경계에서 `f32`로 좁힙니다.',
          },
        },
        sourceP:
          '이 페이지의 프로그램은 사이트를 빌드할 때 고정된 커밋에서 모두 컴파일합니다. 컴파일되지 않는 코드가 생기면 빌드가 멈춥니다. 문법 자체는 [작성 인터페이스 문서](surfaceSource)에 있습니다.',
      },
      fromWgsl: {
        title: 'WGSL을 TypeShade로: 타입, 리소스, 진입점',
        description:
          'WGSL 작성 인터페이스를 구성 요소별로 훑고 각각의 TypeShade 표기를 보여 줍니다. 스칼라, 벡터, 텍스처, 주소 공간, 스테이지 속성, 문을 다룹니다.',
        h1: 'WGSL을 TypeShade로',
        intro: `이미 WGSL을 쓰는 사람이 이 사이트에서 찾는 것은 하나이다. 눈앞에 있는 구성 요소를 TypeShade로 어떻게 적느냐이다. 이 페이지는 그 방향으로 읽힌다. 왼쪽에 WGSL 형태, 오른쪽에 \`"use typeshade"\` 파일에 적을 코드, 그리고 둘이 맞아떨어지지 않는 자리에는 설명을 단다. [WGSL과 ${glsl} 비교](conceptsWgsl)에서는 셰이더 하나를 두 타깃으로 컴파일하고 서로 다른 곳을 짚습니다.`,
        readingH: '표 읽는 법',
        readingP: `오른쪽 칸은 커밋 ${facts.pinnedCommit}의 컴파일러가 실제로 받아들이는 소스이고, 왼쪽 칸은 그 컴파일러가 같은 소스에 대해 생성한 WGSL입니다. 두 칸 모두 이 페이지를 빌드할 때 측정합니다. 컴파일러가 더 이상 그렇게 쓰지 않게 되면 다음 고정 시점에 바뀐 행으로 여기에 도착합니다.`,
        colWgsl: 'WGSL',
        colSource: 'TypeShade',
        colType: '타입',
        colNote: '설명',
        colInstead: '대신 적을 것',
        pagesH: '섹션',
        pages: {
          types: {
            title: 'WGSL 스칼라와 벡터, 행렬의 표기',
            description:
              'WGSL 타입 표면을 TypeShade 표기와 나란히 놓습니다. 스칼라와 벡터, 행렬, 배열과 atomic, 텍스처와 샘플러를 다룹니다.',
          },
          resources: {
            title: 'WGSL 리소스와 주소 공간의 TypeShade 표기',
            description:
              '리소스는 declare로 적고, 주소 공간과 접근 모드는 타입 주석에 씌우는 래퍼 타입입니다. 슬롯 번호는 파일에 적은 순서가 정합니다.',
          },
          entries: {
            title: 'WGSL 진입점과 속성의 TypeShade 표기',
            description:
              '스테이지 속성과 워크그룹 크기, 버텍스 진입점이 내야 하는 값, 파이프라인이 주는 builtin 이름, 그리고 WGSL에 없는 이름을 다룹니다.',
          },
          statements: {
            title: 'WGSL의 문과 식, 그리고 그 TypeShade 표기',
            description:
              '문은 TypeScript의 문이고, 하나하나가 옆에 놓인 WGSL과 같은 뜻입니다. 생성된 코드는 이 페이지를 빌드할 때 컴파일한 파일 하나에서 나옵니다.',
          },
        },
        typesH: '타입',
        typesP:
          '타입은 WGSL이 타입을 적는 자리, 곧 선언과 매개변수와 필드와 반환 위치에 그대로 적습니다. WGSL이 타입 인자를 받는 자리에서는 요소 타입이 이름 안으로 들어가므로 `vec3<u32>`는 `vec3u`가 되고, 꺾쇠 안에서 틀릴 것이 남지 않습니다.',
        scalarsH: '스칼라',
        f64P: '배정밀도에는 대응하는 WGSL 타입이 없습니다. 선언에는 `f64`라고 적고, 생성기가 돌기 전에 한 패스가 이를 모두 `f32` 레인 두 개와 그 위의 함수 라이브러리로 하향 변환합니다. 배정밀도 곱셈 하나는 WGSL에서 호출 한 번이 됩니다.',
        vectorsH: '벡터',
        vectorsP:
          '`vec2`와 `vec4`도 위의 세 가지와 같은 방식으로 읽습니다. `vec3`와 `vec3f`는 같은 타입이고, `vec3d`와 `vec3f64`도 마찬가지입니다.',
        matricesH: '행렬',
        matricesP:
          '정사각 행렬에는 두 타깃이 모두 주는 짧은 이름도 있어서 `mat4`와 `mat4x4`는 같은 선언입니다. `C`와 `R`의 뜻도 WGSL과 같아서 앞이 열, 뒤가 행입니다.',
        arraysH: '배열과 atomic',
        arraysP:
          '튜플은 타입이 길이를 고정한 목록이고, 크기를 아는 배열이 바로 그것입니다. 그래서 `[f32, f32]`와 `array<f32, 2>`는 같은 타입에 닿습니다. 길이가 실행 시점에 정해지는 배열과 atomic은 각각 스토리지 바인딩 안에 놓입니다.',
        texturesH: '텍스처와 샘플러',
        texturesP:
          '텍스처와 샘플러는 주소 공간 래퍼 없이 그냥 적습니다. 핸들은 어느 주소 공간에도 놓이지 않기 때문입니다. 샘플링 텍스처는 `f32`나 `i32`나 `u32`를 받고, 그 요소 타입이 WGSL 표기와 적용 가능한 읽기 방식을 함께 결정합니다. 스토리지 텍스처는 포맷과 접근 모드를 문자열 리터럴 타입으로 받으므로 이 컴파일러보다 `tsc`가 먼저 검사합니다.',
        resourcesH: '리소스와 주소 공간',
        resourcesP:
          '리소스는 `declare`로 적습니다. 다른 쪽이 제공하는 값을 가리키는 TypeScript의 표현이 그것입니다. 주소 공간과 접근 모드는 타입 주석의 래퍼 타입이 나타냅니다. 셰이더가 쓰는 `storage` 바인딩은 `storage<T, "read_write">`이고, 리소스는 모두 `const`이입니다.',
        slotsP:
          '`@group`이나 `@binding`은 적지 않습니다. 슬롯 번호는 파일 안 `declare`의 등장 순서이고, 위의 WGSL이 그 결과입니다. 텍스처와 샘플러도 같은 방식으로 다음 슬롯을 가져갑니다.',
        stagesH: '진입점과 속성',
        stagesP:
          '스테이지 속성은 export한 함수에 붙이는 데코레이터입니다. 셋 중 아무것도 붙지 않은 함수는 헬퍼입니다. `@compute` 차원은 숫자나 이름 있는 override로 적습니다. 숫자로 적던 방식도 계속 쓸 수 있습니다.',
        stagesOverrideP:
          'WGSL에서는 모듈 수준 `override`로 값을 선언하고 `@workgroup_size`에서 이름을 씁니다. TypeShade에서는 같은 override로 워크그룹 배열의 바깥쪽 길이도 정할 수 있습니다.',
        returnsP:
          '버텍스 진입점은 반드시 위치를 만들어 내야 합니다. 반환 타입이 `vec4`이면 그 자체가 position builtin을 답니다. 구조체를 반환하면 위치는 필드 하나가 나르고, 프로그램이 원하는 만큼 `@location` varying을 덧붙입니다. position 필드가 없는 구조체 반환, `void` 반환, `vec4`가 아닌 단일 타입은 각각 거부되며 어떤 필드나 타입을 적어야 하는지 함께 알려 줍니다.',
        builtinValuesH: 'builtin 값',
        builtinValuesP: `\`@builtin(...)\`의 이름 목록은 WGSL의 것이고 ${facts.wgslBuiltinIds}개를 문자열로 그대로 넘긴다. 그래서 WGSL 속성은 같은 이름에서 따옴표만 뺀 모양이다. 매개변수 타입이 이 이름들만 담은 닫힌 유니온이라, 오타는 작성자가 적은 줄에서 \`tsc\` 오류가 된다. WGSL은 id 하나를 빼고 모두 타입을 고정하므로, 타입 칸이 곧 이 속성이 말해야 하는 타입이다.`,
        clipDistancesP: '타입이 고정되지 않은 유일한 id입니다. 배열 길이는 작성자가 정합니다.',
        absentH: 'WGSL에 없는 이름',
        absentP:
          'GLSL 작성자가 손이 가는 이름 셋에는 대응하는 WGSL builtin이 없습니다. 프런트엔드는 선언 자리에서 각각을 거부하고 받아들이는 이름들을 함께 보여 줍니다. 오른쪽 칸은 백엔드가 속성 이름 뒤에 이어 붙이는 문장이고, 대신 무엇을 쓰면 되는지 말해 줍니다.',
        statementsH: '문과 식',
        statementsP:
          '문은 TypeScript의 것이고, 각각이 옆의 WGSL과 같은 뜻입니다. 생성된 텍스트는 빌드 시점에 컴파일한 파일 하나에서 가져왔으므로 괄호와 접힌 상수도 생성기가 쓴 그대로입니다.',
        functionsH: '내장 함수',
        functionsP:
          '컴파일러가 표기할 수 있는 내장 함수와 각각에 대해 생성하는 WGSL 텍스트는 [내장 함수 표](languageBuiltins)에 있습니다. 파일이 직접 선언한 함수는 같은 이름의 내장 함수보다 우선합니다.',
        refusals: {
          'scalars.f16':
            '이 인터페이스에는 타입 이름이 없습니다. `"use typeshade"` 옆에 `"enable f16"`을 적으면 WGSL의 `enable f16;`이 생성되고, 리플렉션에는 호스트가 `shader-f16`으로 요청할 기능이 실립니다. 그래도 값을 선언할 `f16`은 아직 없습니다.',
          'scalars.f64':
            'WGSL에는 64비트 부동소수점이 없습니다. 아래 패스가 생성기보다 먼저 선언을 바꿔 놓습니다.',
          'vectors.vec3d': 'WGSL에는 64비트 벡터도 없어서 같은 패스가 이것도 바꿔 놓습니다.',
        },
        notes: {
          'stages.vertex': '진입점 하나에 스테이지 데코레이터 하나를 export한 함수에 붙입니다.',
          'stages.fragment':
            '프래그먼트 진입점은 아무것도 반환하지 않아도 됩니다. 스토리지 바인딩에만 쓰는 프로그램이 그런 모양입니다.',
          'stages.compute':
            '목록이 워크그룹 크기입니다. 목록 없는 `@compute`는 `[64, 1, 1]`이입니다.',
          'stages.location': 'location은 진입점 매개변수와 클래스 필드와 반환 자리에 붙습니다.',
          'stages.vertexBare':
            '반환 타입이 `vec4`이면 그 자체가 position builtin을 답니다. 그래서 가장 작은 버텍스 셰이더에는 구조체도 매개변수도 필요 없습니다.',
          'stages.vertexStruct':
            '구조체를 반환하면 위치는 필드 하나가 나르고, 그 옆에 프로그램이 원하는 만큼 varying을 덧붙입니다.',
          'stages.fragmentReturn':
            '프래그먼트가 단일 값을 반환하면 너비와 상관없이 location 0을 가져갑니다. 그래서 `f32`, `vec2`, `vec3`, `vec4`가 모두 드로 버퍼 포맷이 됩니다. 구조체 반환은 렌더 타깃이 여럿일 때 쓰는 형태입니다.',
          'statements.let':
            'WGSL의 `let`은 그대로 있는 값이고, TypeScript에서 그 뜻을 말하는 것이 `const`이입니다.',
          'statements.var':
            'WGSL의 `var`는 바뀌는 지역 변수입니다. 초기값 없는 `let b: f32`가 그것을 선언하고 값은 나중 대입에 맡깁니다. 대입하지 않은 경로에서 읽으면 거부되며(`TS8075`, 규칙 7.6), 모든 타깃이 이 지역 변수를 영에서 시작합니다.',
          'statements.for':
            '`for`는 횟수가 세어지는 형태여야 합니다. 정수 유도 변수와 상수 증감이 있고, 종료 조건은 본문이 쓰지 않는 경계와 변수를 비교합니다. 시작값과 경계는 런타임 값이어도 되고, 반복 횟수에 상한이 없습니다. 증감에는 `+=`, `-=`, `*=`, `/=`를 쓸 수 있습니다.',
          'statements.while':
            '`while`이 `loop` 자리를 대신합니다. 열린 루프라서 조건이 거짓이 되거나 `break`나 `return`을 만나면 끝나고, `while (true)`는 본문에 둘 중 하나가 있어야 합니다.',
          'statements.switch':
            'case는 저마다 `break`로 끝냅니다. WGSL의 case에는 없는 문이며, 하향 변환이 떼어 냅니다. 본문 끝까지 실행이 이어질 수 있는 case는 TypeScript에서 다음 case로 넘어가 실행되므로 거절한다(`TS8017`). 마지막 case에는 `break`가 필요 없습니다. 레이블은 한 번만 쓸 수 있는 정수 상수입니다. 본문 하나 위에 레이블 두 개를 겹쳐 쓰면 선택자가 둘인 case 하나가 되며, WGSL에서는 `case 0, 1:`로 나옵니다.',
          'statements.select':
            'WGSL에는 삼항 연산자가 없어서 스칼라와 벡터 조건식은 `select`가 됩니다. 첫 인자가 조건이 고르지 않은 쪽입니다. 구조체나 배열을 고르는 조건식은 슬롯과 `if`로 풀립니다. 그 경우에는 어느 타깃에도 연산자가 없기 때문입니다.',
          'statements.call': '결과를 버리고 동작만 보고 부르는 함수입니다.',
          'statements.phony':
            '같은 방식으로 결과를 버린 내장 함수 호출에는 가짜 대입이 붙습니다. Tint가 그런 내장 함수를 모두 `@must_use`로 읽기 때문입니다.',
          'statements.discard': '같은 낱말이고 같은 문입니다.',
          'statements.struct':
            'WGSL 구조체는 클래스입니다. 객체 모양의 타입 별칭과 인터페이스도 같은 선언에 닿습니다.',
          'statements.fn': '스테이지 데코레이터가 붙지 않은 함수는 모듈의 헬퍼입니다.',
        },
      },
      fromGlsl: {
        title: `${glsl}을 TypeShade로: 타입과 유니폼 블록`,
        description: `${glsl} 작성 인터페이스를 구성 요소별로 훑고 각각의 TypeShade 표기를 보여 줍니다. 샘플러, 유니폼 블록, varying, builtin 변수, 함수를 다룹니다.`,
        h1: `${glsl}을 TypeShade로`,
        intro: `WebGL2용 셰이더는 ${glsl}로 씁니다. 그 대부분에는 두 타깃에 같은 프로그램을 생성하는 TypeShade 표기가 있습니다. 각 구성 요소의 TypeShade 표기와 WebGPU 전용 여부, 두 타깃 모두에서 거부하는 문법을 함께 정리합니다. [WGSL과 ${glsl} 비교](conceptsWgsl)에서는 셰이더 하나를 두 타깃으로 컴파일하고 서로 다른 곳을 짚습니다.`,
        readingH: '표 읽는 법',
        readingP: `오른쪽 칸은 커밋 ${facts.pinnedCommit}의 컴파일러가 실제로 받아들이는 소스이고, 왼쪽 칸은 그 컴파일러가 같은 소스에 대해 생성한 ${glsl}이입니다. GLSL에 형태가 없는 행에서는 없는 표기를 지어내는 대신 컴파일러가 직접 내는 문장을 그 칸에 싣습니다.`,
        colGlsl: glsl,
        colSource: 'TypeShade',
        colNote: '설명',
        colMessage: '컴파일러 메시지',
        colInstead: '대신 적을 것',
        colCapability: '기능',
        colDirective: '소스 지시문',
        colExtension: 'WebGL2 확장',
        noDirective: '없습니다. 프로그램을 링크하기 전에 호스트가 확장을 켭니다.',
        pagesH: '섹션',
        pages: {
          types: {
            title: `${glsl} 타입과 그 TypeShade 표기`,
            description: `${glsl} 타입 표면을 TypeShade 표기와 나란히 놓습니다. 스칼라와 벡터, 행렬, 배열, 샘플러, 그리고 GLSL이 거부하는 타입을 다룹니다.`,
          },
          uniforms: {
            title: `${glsl}의 유니폼과 버퍼, 그 TypeShade 표기`,
            description:
              '유니폼 바인딩은 생성기가 블록으로 내보내는 구조체이고, varying은 양쪽 모두에서 필드입니다. 지원 기능은 행마다 하나씩 정리합니다.',
          },
          variables: {
            title: `${glsl}의 builtin 변수와 그 TypeShade 표기`,
            description:
              'gl_ 전역 변수는 매개변수나 클래스 필드나 반환 자리에 붙는 builtin 속성이고, 그것이 어느 전역 변수가 될지는 생성기가 정합니다.',
          },
          functions: {
            title: `${glsl}의 함수와 연산자, 그 TypeShade 표기`,
            description:
              '호출은 공통 이름으로 표현하고, 각 백엔드는 타깃 언어의 표기로 변환합니다. GLSL 작성자가 찾는 미분과 텍스처, 비트, 나머지 형태를 싣습니다.',
          },
        },
        typesH: '타입',
        typesP:
          '스칼라와 벡터 이름은 WGSL의 것입니다. 소스 하나가 두 타깃을 모두 맡아야 하기 때문입니다. GLSL 생성기가 그 이름을 GLSL 표기로 변환하므로, 선언에 `f32`라고 적은 것이 생성된 셰이더에서는 `float`가 됩니다.',
        scalarsH: '스칼라',
        vectorsH: '벡터',
        vectorsP:
          '`vec2`와 `vec4`도 같은 방식으로 읽고, 각각의 정수형과 부호 없는 정수형과 불리언 형태도 마찬가지입니다. 배정밀도 벡터는 어느 타깃에도 형태가 없어서 생성기가 돌기 전에 `f32` 레인으로 하향 변환됩니다.',
        arraysH: '행렬과 배열',
        matricesH: '행렬',
        matricesP:
          '정사각 행렬은 드라이버 오류 메시지가 쓰는 짧은 이름을 그대로 씁니다. 나머지 여섯 가지 모양은 GLSL 표기와 같은 `matCxR`로, 앞이 열이고 뒤가 행입니다.',
        arraysP:
          '튜플은 타입이 길이를 고정한 목록이므로 `[f32, f32]`와 `array<f32, 2>`는 같은 타입에 닿습니다. 실행해 봐야 길이를 아는 배열은 스토리지 버퍼이고 GLSL에는 그 형태가 없어서, 그런 모듈은 데이터 텍스처에서 읽도록 다시 쓰입니다.',
        samplersH: '샘플러',
        samplersP:
          'GLSL은 텍스처와 샘플러를 결합 샘플러 하나로 합치고, WebGPU는 둘을 따로 둡니다. TypeShade 파일은 둘을 WebGPU 방식으로 선언하고 GLSL 생성기가 합치므로, 샘플러 인자는 모든 읽기에서 사라지고 그 자리를 차지하던 바인딩도 호스트가 바인딩하는 레이아웃에서 빠집니다.',
        shadowP:
          '깊이 텍스처는 그 합치기의 예외입니다. 결합 타입이 모듈이 그것을 어떻게 읽느냐에 달려 있어서 바인딩 생성 단계가 결정합니다. 이 인터페이스가 허용하는 깊이 텍스처 읽기는 모두 비교이고, 그래서 항상 shadow 형태가 됩니다.',
        noFormH: 'GLSL 형태가 없는 타입',
        noFormP:
          '아래 타입은 모두 생성기가 거부하며, 옆 칸은 생성기의 오류 메시지입니다. 그런 타입을 든 모듈도 WGSL은 생성하므로, 셰이더를 WebGPU 전용으로 만드는 줄이 바로 이것들입니다.',
        uniformsH: '유니폼과 버퍼',
        uniformsP:
          '유니폼 바인딩은 구조체이고, 생성기는 이것을 std140 블록으로 생성합니다. 스토리지 버퍼는 GLSL에 아예 형태가 없어서, 그런 모듈은 기능 게이트가 돌기 전에 데이터 텍스처에서 읽도록 다시 쓰입니다.',
        varyingsH: 'varying',
        varyingsP:
          '버텍스 스테이지에서 프래그먼트 스테이지로 넘어가는 값은 양쪽 모두에서 `@location(n)` 필드입니다. GLSL은 그 둘을 이름으로 잇고 WebGPU는 번호로 이으므로, 생성된 GLSL에서 맞아야 하는 것은 필드 이름입니다.',
        capabilitiesH: '확장과 기능',
        capabilitiesP: `\`#extension\` 줄은 GPU 기능의 한쪽 절반이고, 호스트의 \`getExtension\` 호출이 나머지 절반이다. GLSL의 프로파일에는 행이 ${facts.glslCapabilities}개 있고 그중 하나만 소스에 지시문을 넣습니다. 행이 아예 없는 기능은 텍스트를 쓰기도 전에 GLSL에서 모듈을 차단합니다.`,
        enablesP:
          '`"use typeshade"` 파일에는 이 네 가지를 적을 방법이 없습니다. `"enable ..."`은 WGSL 확장 이름을 받는데 넷 중 어느 것도 WGSL 확장이 아니므로, 호스트가 필요한 기능을 컴파일된 모듈의 `enables`에 적는다: `{ ...compile(source).module, enables: [...] }`. 스토리지 바인딩, 컴퓨트 진입점, `@builtin("clip_distances")`처럼 모듈의 모양에서 따라오는 기능은 파일에서 도출되며, 그중 어느 것도 이 표에 행이 없습니다.',
        variablesH: 'builtin 변수',
        variablesP:
          '`gl_*` 전역 변수는 매개변수나 클래스 필드나 반환 자리에 붙는 `@builtin(...)` 속성입니다. 어떤 값인지는 속성이 말하고 그것이 어느 전역 변수가 될지는 생성기가 정합니다. 파일 하나가 두 타깃에 모두 닿는 방식이 이것입니다.',
        absentH: '어느 생성기도 받지 않는 변수',
        absentP:
          '둘은 이 인터페이스에 이름이 없습니다. 프런트엔드가 선언 자리에서 그 표기를 거부하며, 아래 문장은 같은 이름에 대해 WGSL 백엔드가 내는 말이고 대신 무엇을 쓰면 되는지 알려 줍니다.',
        functionsH: '함수와 연산자',
        functionsP:
          '컴파일러는 호출을 공통 이름으로 표현하고, 각 백엔드는 타깃 언어의 표기로 변환합니다. 그래서 적어야 할 이름은 오른쪽 칸의 것입니다. 아래는 GLSL 작성자가 특히 많이 찾는 이름들입니다.',
        operatorsP:
          '연산자도 같은 방식으로 갈립니다. 벡터 두 개를 비교할 때는 연산자로 적고 GLSL에는 함수로 도착하며, 성분마다 고르는 연산은 양쪽 모두 `select`입니다.',
        operatorsH: '연산자',
        restP:
          '컴파일러가 표기할 수 있는 내장 함수와 두 타깃에서 각각 생성하는 텍스트는 [내장 함수 표](languageBuiltins)에 있습니다.',
        edslH: '관련 페이지',
        edslP: `이 페이지는 구성 요소를 하나씩 다룹니다. [GLSL 셰이더 옮기기](internalsGlslShader)는 ${glsl} 셰이더 전체에 걸린 것을 다룬다. 유니폼 블록, \`#ifdef\`, \`#include\`, \`#extension\`이 그 예이다. 그 페이지의 행마다 \`"use typeshade"\` 표기가 있다. [WGSL과 ${glsl} 비교](conceptsWgsl)는 셰이더 하나를 두 타깃으로 컴파일해 보여 주고, 이 페이지의 WGSL 쪽은 [WGSL을 TypeShade로](languageFromWgsl)입니다.`,
        refusals: {
          'uniforms.precision': '적을 것이 없습니다.',
        },
        notes: {
          'uniforms.block':
            '클래스가 블록이고 `declare`가 그 인스턴스입니다. 필드 순서가 곧 레이아웃입니다.',
          'uniforms.loose':
            '`glUniform*`로 값을 넣는 기본 블록 유니폼은 여기에 표기가 없습니다. 그래서 스칼라나 벡터나 행렬 하나를 담은 유니폼 바인딩은 WebGPU에만 닿습니다.',
          'uniforms.storage': '버퍼가 데이터 텍스처가 되고, 호스트는 같은 숫자를 텍셀로 올립니다.',
          'uniforms.fetch':
            '버퍼를 인덱스로 읽는 자리가 이 함수 호출이 됩니다. 생성기는 이 함수를 부르는 모듈에만 정의를 넣습니다.',
          'uniforms.define':
            '특수화 상수에는 GLSL 형태가 없어서, 기본값을 전처리기 치환으로 적어 둡니다. 호스트는 스테이지를 컴파일하기 전에 그 값을 덮어쓸 수 있습니다.',
          'uniforms.precision':
            '생성기가 스테이지마다 맨 위에 한정자를 넣고, `floatPrecision` 옵션이 float 줄을 `highp`로 할지 `mediump`로 할지 정합니다. 정수 줄은 `highp`로 둡니다. 데이터 텍스처를 거쳐 되읽는 값에는 정수 범위가 온전히 필요하기 때문입니다.',
          'varyings.out': '버텍스 진입점이 반환하는 구조체의 필드에 적습니다.',
          'varyings.in': '그 값을 읽는 프래그먼트 진입점 매개변수에 같은 이름으로 적습니다.',
          'varyings.target':
            '프래그먼트가 단일 값을 반환하면 location 0을 가져가고, 출력 이름은 생성기가 직접 붙입니다.',
          'variables.glPosition':
            '버텍스 출력에 붙는 같은 id입니다. `vec4` 하나를 반환하는 버텍스 진입점은 아무것도 적지 않아도 이것을 답니다.',
          'variables.glFragCoord':
            '프래그먼트 입력에 붙는 같은 id입니다. y 원점이 다릅니다. GLSL은 창 아래쪽부터 세고 WebGPU는 위쪽부터 세므로, `.y`를 읽는 셰이더는 스스로 뒤집어야 합니다.',
          'variables.glVertexID':
            '인덱스는 TypeShade에서 `u32`, GLSL에서 `int`이므로 생성기가 읽은 값을 선언된 타입으로 변환합니다.',
          'variables.glInstanceID': '같은 이유로 같은 방식으로 감쌉니다.',
          'variables.glFrontFacing': '양쪽 모두 `bool`이라 읽기에 캐스트가 붙지 않습니다.',
          'variables.glFragDepth':
            '프래그먼트 진입점이 반환하는 구조체의 필드로, 색상 옆에 적습니다.',
          'functions.dpdx': 'WGSL 이름으로 부르는 같은 미분입니다.',
          'functions.dpdy': '축만 다른 같은 미분입니다.',
          'functions.dpdxCoarse':
            'coarse와 fine 변형은 WGSL에서 이름을 유지하고 GLSL에서는 하나로 합쳐집니다. GLSL에는 축마다 미분 함수가 하나뿐이기 때문입니다.',
          'functions.dpdyFine': '같은 방식으로 합쳐집니다.',
          'functions.mod':
            '나누는 수의 부호를 따르는 내림 기반 나머지이며 GLSL의 `mod`에 해당합니다. `%` 연산자는 잘라 내는 나머지입니다.',
          'functions.textureSample':
            '결합 샘플러가 이미 샘플러를 들고 있으므로 샘플러 인자가 사라집니다.',
          'functions.textureLoad': '정수 좌표와 밉 레벨로 텍셀 하나를 읽습니다.',
          'functions.textureDimensions':
            '반환할 크기는 부호 없는 값이므로, 생성기가 GLSL의 부호 있는 반환값을 변환합니다.',
          'functions.faceForward': '표기만 다릅니다.',
          'functions.inverseSqrt': '이것도 표기만 다릅니다.',
          'functions.round': '두 타깃이 함께 쓰는 반올림은 절반을 짝수 쪽으로 보내는 방식입니다.',
          'functions.countOneBits':
            'GLSL에는 비트 내장 함수가 하나도 없어서, 생성기가 여기에 있는 시프트와 마스크로 작은 함수를 정의합니다.',
          'functions.firstLeadingBit':
            '그런 함수가 하나 더 있고, 부르는 모듈에만 정의가 들어갑니다.',
          'operators.mod': '나누는 수 쪽으로 내림한 나머지라 부호가 나누는 수를 따릅니다.',
          'operators.remainder':
            '잘라 내는 나머지라 부호가 나뉘는 수를 따릅니다. GLSL에는 실수에 쓰는 `%`가 없어서 생성기가 식을 풀어서 적습니다.',
          'operators.lessThan':
            '벡터 비교는 GLSL에서 함수, WGSL에서 연산자로 표현합니다. TypeShade 소스에는 연산자로 작성합니다.',
          'operators.equal': '같은 방식이고, TypeScript가 받는 것은 엄격 비교 쪽입니다.',
          'operators.select':
            '스칼라 선택은 GLSL에서는 삼항 연산자이고 WGSL에서는 `select`라, 이름 하나가 양쪽을 맡습니다.',
          'operators.vectorSelect':
            '불리언 벡터로 성분마다 고르는 연산은 GLSL에서 `mix`이고, GLSL 작성자가 이미 쓰던 모양이 그것입니다.',
        },
      },
      builtins: {
        title: `내장 함수와 WGSL, ${glsl} 표기`,
        description: `컴파일러가 표기할 수 있는 내장 함수 ${facts.builtins}개를 모두 모아, 각 함수가 WGSL과 ${glsl}로 어떤 코드가 되는지 계열별로 정리했습니다.`,
        h1: '내장 함수',
        intro: `내장 함수는 GPU 셰이더 언어가 제공하는 함수입니다. 호출은 컴파일러 안에서 공통 이름으로 표현하며, 각 백엔드가 타깃 언어의 표기로 변환합니다. 그래서 한 번 작성한 호출이 두 벌로 생성됩니다. 레지스트리에 담긴 이름은 ${facts.builtins}개입니다.`,
        readingH: '한 행을 읽는 법',
        readingP: `첫째 칸은 호출이 달고 다니는 이름이며, 인자가 들어갈 자리마다 플레이스홀더를 하나씩 넣었습니다. 다음 두 칸은 WGSL 백엔드와 ${glsl} 백엔드가 그 호출에 대해 쓰는 코드로, 고정된 커밋의 컴파일러 표기표를 그대로 실행해 얻었습니다. 이 가운데 ${facts.portableBuiltins}개는 두 타깃에서 표기가 같고, ${facts.glslAbsentBuiltins}개는 ${glsl}에 형태가 아예 없어 그 칸에 컴파일러가 낸 메시지를 싣습니다. ${facts.mathAliasBuiltins}개는 \`Math.\` 이름으로도 부를 수 있으며, 수학과 캐스트 표의 마지막 칸이 그 이름을 보여 준다. [WGSL과 ${glsl} 비교](conceptsWgsl)에서는 셰이더 하나를 두 타깃으로 컴파일하고 서로 다른 곳을 짚습니다.`,
        idsP: `이 이름 가운데 몇 개는 컴파일러가 고르는 것이라 손으로 적지 않는다. 레이어 텍스처 읽기, 깊이 비교, 스토리지 fetch, 부호 없는 좌표로 하는 텍셀 읽기는 저마다 자기 이름을 받는다. 그래야 호출의 인자 순서가 어떤 텍스처에 쓰였는지에 따라 달라지지 않는다. 부호 없는 값의 \`abs\`와 정수 \`dot\`도 따로 이름을 받는다. ${glsl}에는 둘 다 그 타입의 오버로드가 없기 때문입니다.`,
        precedenceH: '파일이 직접 선언한 이름',
        precedenceP:
          '파일에 선언한 함수는 같은 이름의 내장 함수보다 우선합니다. 그런 이름은 내장 함수가 되기 전에는 작성자의 함수를 가리켰고, 기능을 더한다고 해서 이미 돌아가던 프로그램의 뜻이 바뀌면 안 되기 때문입니다.',
        colName: 'TypeShade',
        colWgsl: 'WGSL',
        colGlsl: glsl,
        colMath: 'Math 이름',
        colBuiltin: '내장 함수',
        colHelper: 'GLSL 함수',
        noForm: '이 타깃에는 형태가 없습니다.',
        preEmit: '두 백엔드가 돌기 전에 `f32` 레인 두 개로 바뀝니다.',
        families: {
          maths: '수학',
          geometry: '기하 연산',
          derivatives: '화면 공간 미분',
          bits: '비트 연산',
          packing: '패킹',
          casts: '캐스트',
          textures: '텍스처와 스토리지',
          atomics: '원자적 연산',
          barriers: '배리어',
          f64: '에뮬레이션 배정밀도',
        },
        bitsP: `${glsl}에는 비트 내장 함수가 하나도 없습니다. 그래서 위 칸은 GLSL 생성기가 정의하는 작은 함수를 부릅니다. 그 정의는 해당 타깃에 있는 시프트와 마스크, 비교만으로 쓰여 있습니다. 하나도 부르지 않는 모듈은 정의도 싣지 않습니다.`,
        helpersH: 'GLSL 헬퍼 함수',
        helpersP: `스토리지 버퍼는 ${glsl}에 형태가 없어서, 스토리지를 읽는 코드는 데이터 텍스처를 읽는 코드로 바뀝니다. 아래가 그 읽기를 대신하는 함수들이며, 모듈이 부르는 함수의 정의는 GLSL 생성기가 함께 생성합니다.`,
        sourceP:
          '이 페이지의 모든 행은 고정된 커밋의 [표기 레지스트리](intrinsicRegistry)에서 읽어 온 것이고, 사이트에서 별도로 작성한 항목은 없습니다.',
      },
    },
  },

  gallery: {
    title: '셰이더 갤러리, TypeShade',
    description:
      'TypeShade Playground에서 작성해 제출한 셰이더 모음입니다. 각 셰이더는 Playground에서 열어 편집할 수 있습니다.',
    h1: '갤러리',
    intro:
      'Playground에서 작성해 제출한 셰이더입니다. 각 셰이더는 Playground에서 열어 편집할 수 있습니다.',
    howTo:
      '직접 올리려면 [Playground](playground)에서 작성한 뒤 제출을 누르십시오. 관리자가 검토한 뒤에 공개됩니다.',
    empty: '아직 승인된 작품이 없습니다.',
    sortLabel: '정렬',
    sortRecent: '최신순',
    sortPopular: '조회순',
    by: '{name} 작성',
    views: '조회 {count}회',
    viewOne: '조회 1회',
  },

  issue: {
    heading: '문제 보고',
    titleLabel: '제목',
    textLabel: '설명(선택)',
    addImages: '이미지 붙여넣기, 끌어다 놓기, 선택',
    note: '보낸 내용은 누구나 볼 수 있습니다. 개인 정보는 적지 마십시오.',
    send: '보내기',
    cancel: '취소',
    close: '닫기',
    runtime: {
      removeImage: '이미지 빼기',
      removeProgram: '프로그램 빼기',
      program: 'Playground의 프로그램도 함께 보냅니다.',
      sending: '보내는 중…',
      sent: '보냈습니다. 고맙습니다.',
      preview: '미리보기에서는 확인만 하고 보내지 않습니다.',
      limit: '오늘은 더 보낼 수 없습니다. 내일 다시 시도해 주십시오.',
      image: `이미지는 한 장에 ${ISSUE_IMAGE_BYTES / 1024 / 1024} MB, 모두 ${ISSUE_IMAGES_MAX}장까지 PNG, JPEG, GIF, WebP로 올릴 수 있습니다.`,
      challenge: '사람인지 확인하지 못했습니다. 다시 시도해 주십시오.',
      failed: '보내지 못했습니다. 잠시 뒤에 다시 시도해 주십시오.',
    },
  },

  mnist: {
    demo: {
      title: '브라우저에서 MNIST 직접 학습',
      description:
        '실제 TypeShade Compute 프로그램으로 학습하고, 테스트 숫자를 확인한 뒤 직접 그린 숫자를 분류합니다.',
      codePreviewTitle: '실제로 실행되는 TypeShade 코드: 순전파',
      codePreviewExplanation:
        '아래 forward는 28×28 픽셀을 열 개 숫자의 점수로 변환하는 실제 Compute 함수입니다. 학습과 추론이 이 코드를 함께 사용합니다.',
      codeWalkthroughLink: '전체 학습 과정과 코드 해설 7단계 보기',
      sourceToggle: '실행 중인 TypeShade 원본 코드 보기',
      sourceDescription:
        '위 MNIST 모델을 WebGPU/WebGL2용으로 컴파일한 실제 softmax.shade.ts 원본입니다. 학습과 추론에 사용되는 여섯 개의 Compute 함수를 모두 볼 수 있습니다.',
      sourceGitHub: 'GitHub에서 이 소스 버전 열기',
      backend: '백엔드',
      auto: '자동 (WebGPU, 이후 WebGL2)',
      webgpu: 'WebGPU',
      webgl2: 'WebGL2',
      samples: '학습 이미지',
      epochs: '에폭',
      epochsHelp: `${mnistEpochs.min}에서 ${mnistEpochs.max}까지 정수를 입력하세요. 에폭마다 선택한 학습 이미지 전체를 한 번씩 처리합니다.`,
      epochsError: `${mnistEpochs.min}에서 ${mnistEpochs.max}까지 정수를 입력하세요.`,
      resourceNote:
        '에폭을 늘리면 GPU 연산이 반복되어 실행 시간, 전력 소모와 발열이 늘어납니다. 실행 시간은 백엔드와 이미지 수에 따라 달라집니다. 에폭이 많아도 평가 정확도가 좋아진다는 보장은 없습니다. 중단은 현재 배치가 끝난 뒤 처리됩니다.',
      learningTitle: '학습 과정 보기',
      learningExplanation:
        '학습 배치마다 숫자 점수를 예측하고 손실과 기울기를 계산해 가중치를 갱신합니다. 에폭이 끝나면 가중치를 바꾸지 않고 갱신된 모델을 평가합니다.',
      metricsExplanation: `그래프는 에폭마다 같은 테스트 이미지 ${mnistTestSamples}개로 측정한 결과입니다. 손실이 낮을수록 예측 오차가 작고, 정확도는 정답을 맞힌 비율입니다. 이 일부 이미지가 MNIST 테스트 전체를 대표하지는 않습니다.`,
      trainingProgress: '학습 이미지 처리 진행률',
      progressNote:
        '막대는 전체 에폭의 학습 이미지 처리 수를 표시합니다. 평가는 에폭마다 별도로 진행합니다.',
      lossCurve: '에폭별 평가 교차 엔트로피 손실',
      accuracyCurve: '에폭별 평가 정확도',
      evaluating: '평가 중',
      batch: '완료 배치',
      chartEmpty: '첫 평가가 끝나면 결과가 표시됩니다.',
      stopping: '현재 작업과 자원 정리를 기다리며 중단하는 중',
      start: '데이터 받아 학습',
      cancel: '중단',
      dataNote:
        '시작하면 공식 MNIST gzip 파일 약 12 MB를 다운로드합니다. 데이터는 브라우저 안에서 처리하며 이미지나 그림을 TypeShade 서버에 보내지 않습니다.',
      idle: '백엔드를 고르고 학습을 시작하세요.',
      downloading: '공식 MNIST 데이터를 다운로드하고 검사하는 중',
      compiling: 'TypeShade Compute 파이프라인 생성 중',
      running: '학습 중',
      completed: '학습 완료',
      cancelled: '학습 중단',
      error: 'MNIST 실행 오류',
      epoch: '에폭',
      testAccuracy: '평가 정확도',
      loss: '손실',
      canvas: '숫자 그리기',
      drawNote:
        '학습 후 검은 사각형에 흰색 숫자를 그려 보세요. TypeShade 순전파와 예측 커널로 계산합니다.',
      clear: '지우기',
      sample: '다음 테스트 숫자',
      drawFirst: '먼저 숫자를 그려 주세요.',
      drawPrompt: '숫자를 그리거나 테스트 이미지를 고르세요.',
      prediction: '예측:',
      actualLabel: 'MNIST 정답:',
      distribution: '숫자 0에서 9까지의 점수',
      resultHeading: '학습 진행 상황',
      computeNote:
        '호스트는 이미지를 읽고 배치를 제어합니다. 학습과 추론 로짓은 선택한 TypeShade WebGPU 또는 WebGL2 백엔드에서 계산합니다. WebGL2는 GLSL ES 3.00 패스를 사용합니다.',
    },
    title: 'TypeShade MNIST 학습',
    description:
      'TypeShade Compute로 손글씨 숫자를 학습하고 CPU, WebGPU, WebGL2 실행 결과를 확인하는 재현 실험입니다.',
    h1: 'TypeShade Compute로 MNIST 학습',
    short:
      '실제 MNIST 데이터에서 순전파, 손실, 기울기와 SGD 업데이트를 TypeShade로 계산한 실험입니다.',
    open: 'MNIST 학습 실험 살펴보기',
    intro:
      '손글씨 숫자를 분류하는 소프트맥스 모델을 학습합니다. 모델 계산은 TypeShade가 맡고, 호스트는 데이터를 읽어 배치를 제어합니다.',
    browserH: '실행 범위:',
    browserNote:
      '실습 도구는 실제 MNIST 데이터 일부를 브라우저에서 학습합니다. 아래 전체 데이터 수치는 별도로 진행한 재현 실험 결과입니다.',
    walkthrough: {
      intro:
        '아래 코드는 실제 브라우저 실습에서 컴파일해 실행하는 TypeShade 원본입니다. 모델은 28×28 픽셀(784개)을 입력받아 0~9까지의 점수 10개를 계산하는 소프트맥스 회귀입니다. CNN이나 사전 학습된 모델이 아닙니다.',
      flowTitle: 'MNIST 단계별 실행 순서',
      trainFlow: '학습:',
      testFlow: '평가:',
      predictFlow: '직접 그린 숫자 예측:',
      readGuide:
        '각 단계는 계산의 목적과 구현을 설명합니다. 모든 코드 블록은 컴파일에 사용되는 softmax.shade.ts에서 자동 추출합니다.',
      steps: [
        {
          title: 'TypeScript에서 GPU 데이터를 선언하기',
          purpose:
            '"use typeshade"로 시작한 파일에서 픽셀, 정답, 가중치, 편향, 기울기와 결과 버퍼를 선언합니다. batch는 현재 미니배치 크기와 학습률을 전달합니다.',
          explanation:
            '픽셀 한 장은 784개의 f32이며 10개 클래스의 가중치는 784×10=7,840개입니다. storage 버퍼의 가중치와 편향은 학습 중 GPU에 상주하고 다음 배치에서도 재사용됩니다. stableProbability는 큰 로짓에도 안정적인 소프트맥스 값을 계산하는 공통 함수입니다.',
        },
        {
          title: '순전파: 픽셀을 클래스 점수로 바꾸기',
          purpose:
            'forward는 각 이미지의 784개 픽셀과 10개 클래스 가중치를 곱해 더하고 편향을 더해 로짓(logit)을 만듭니다.',
          explanation:
            'gid.x는 처리할 이미지의 행 번호입니다. 각 클래스 c에 대해 z = bias[c] + sum pixels[p]×weights[p×10+c]를 계산합니다. @compute([64])는 작업 그룹의 호출 크기이며 이미지 수가 작업 그룹 크기와 반드시 같다는 뜻은 아닙니다. 마지막 배치의 범위를 검사합니다.',
        },
        {
          title: '손실과 오차 신호: 왜 학습이 필요한지 계산',
          purpose:
            'objective는 로짓의 최대값을 먼저 빼는 안정적 소프트맥스를 사용해 정답 클래스의 교차 엔트로피 손실을 계산합니다.',
          explanation:
            '오차 신호 delta는 (예측 확률 - 정답 원-핫 값) / 배치 크기입니다. 이 식이 다음 backward에서 각 가중치가 어느 방향으로 변해야 하는지 알려 줍니다. 여기서 exp와 log도 TypeShade 커널 안에서 계산됩니다.',
        },
        {
          title: '역전파: 모든 가중치의 기울기를 합산',
          purpose:
            'backward는 현재 배치의 픽셀과 delta를 사용해 7,840개 가중치 및 10개 편향의 기울기를 계산합니다.',
          explanation:
            '각 가중치의 gradW[p×10+c] = sum pixels[row,p]×delta[row,c]입니다. gradB는 해당 클래스의 delta 합계입니다. 이 구현은 자동 미분이 아니라 TypeShade에 직접 작성한 명시적 기울기 계산입니다.',
        },
        {
          title: 'SGD: GPU 버퍼의 모델을 직접 갱신',
          purpose:
            'update는 계산된 기울기에 학습률을 곱해 기존 가중치와 편향에서 빼는 SGD 단계를 실행합니다.',
          explanation:
            'weights[k] -= batch.rate × gradW[k]가 핵심입니다. 결과를 매 배치 JavaScript로 읽어 모델을 갱신하지 않습니다. 가중치는 GPU storage에 남고 다음 forward가 갱신된 값을 읽습니다.',
        },
        {
          title: '평가: 평균 손실과 맞힌 개수 집계',
          purpose:
            'reduce는 각 이미지의 손실과 가장 높은 로짓을 확인해 배치의 평균 손실 및 정답 수를 계산합니다.',
          explanation:
            'stats[0]은 배치 평균 손실, stats[1]은 맞힌 개수입니다. 이 커널이 합산하는 것은 가중치 기울기가 아니라 평가 지표입니다. 호스트는 작은 stats 배열만 읽어 전체 평가 결과를 합산합니다.',
        },
        {
          title: '추론: 0~9 확률과 최종 숫자를 GPU에서 결정',
          purpose:
            'predict는 forward가 기록한 10개 로짓을 정규화해 확률 분포를 만들고 가장 큰 값을 가진 숫자를 선택합니다.',
          explanation:
            '확률은 probabilities[c]에, 예측 숫자는 predicted[0]에 기록됩니다. 브라우저 JavaScript는 이 값을 읽어 막대그래프를 표시할 뿐, Math.exp로 소프트맥스를 다시 계산하지 않습니다. 정답 라벨도 추론에는 필요하지 않습니다.',
        },
      ],
      hostTitle: '이 TypeShade 커널들이 브라우저에서 어떻게 연결될까요?',
      hostIntro:
        '실습의 JavaScript는 공식 IDX 파일을 다운로드하고 픽셀을 0~1로 정규화한 뒤 TypeShade 프로그램의 Compute 단계들을 호출합니다. 아래는 별도의 의사 코드가 아니라 실제 공통 브라우저 세션의 메서드입니다.',
      hostTrainTitle: '학습 배치 하나를 실행하는 실제 코드',
      hostTrainExplanation:
        'setBatch가 픽셀과 정답을 GPU 입력 버퍼에 기록하고 forward → objective → backward → update를 순서대로 실행합니다. 동일한 가중치와 편향 버퍼가 다음 배치까지 유지됩니다.',
      hostPredictTitle: '손글씨 한 장을 분류하는 실제 코드',
      hostPredictExplanation:
        'forward → predict로 GPU에서 클래스별 확률과 최종 숫자를 계산하고, 10개 확률과 정수 결과만 브라우저로 읽습니다. 훈련·예측 요청은 직렬화되어 동시 GPU 버퍼 덮어쓰기를 방지합니다.',
      boundary:
        '실행 경계: 모델 수학(순전파, 소프트맥스, 손실, 기울기, SGD, 추론)은 TypeShade가 담당합니다. 데이터 로딩, 배치 제어, 캔버스, 화면 표시, 최종 수치 집계는 JavaScript 호스트가 담당합니다. WebGL2는 네이티브 Compute가 아니라 TypeShade가 생성한 GLSL ES 3.00 패스로 실행됩니다.',
    },
    modelH: '학습 파이프라인',
    modelP:
      '입력 특성은 784개, 출력 클래스는 10개입니다. 학습과 추론은 TypeShade Compute 진입점 여섯 개로 계산합니다.',
    kernels: [
      'forward는 클래스별 로짓을 계산합니다.',
      'objective는 안정적인 소프트맥스와 교차 엔트로피를 계산합니다.',
      'reduce는 배치의 평균 손실과 정답 개수를 계산합니다.',
      'backward는 가중치와 편향의 기울기를 계산합니다.',
      'update는 확률적 경사 하강법으로 매개변수를 갱신합니다.',
      'predict는 TypeShade에서 숫자별 확률과 최종 클래스를 계산합니다.',
    ],
    resultsH: '검증된 결과',
    resultsP:
      '전체 데이터 결과는 저장소에 기록된 수치입니다. WebGL2 검증은 더 작은 데이터셋으로 별도 진행했습니다.',
    backend: '실행 백엔드',
    data: '학습 / 평가, 에폭',
    accuracy: '평가 정확도',
    cpu: '생성된 CPU',
    webgpu: 'WebGPU (SwiftShader)',
    webgl2: 'WebGL2 패스',
    epochs: '에폭',
    webgl2Dataset: '1,024 train / 1,000 test subset',
    notEstablished: '전체 데이터 결과 미검증',
    softwareNote:
      'WebGPU 측정에는 소프트웨어 렌더러 Google SwiftShader를 사용했습니다. 물리 GPU 가속 성능을 입증한 결과가 아닙니다.',
    webgl2Note:
      'WebGL2 테스트는 모든 패스를 실제 실행해 독립 수치 기준과 대조하고 일부 실제 데이터도 학습했습니다. 근거:',
    validationRun: 'MNIST WebGL2 검증 워크플로',
    runH: '실험 재현하기',
    runP: '컴파일러 저장소 루트에서 Node 24와 Bun을 준비하고 의존성을 설치한 뒤 WebGL2 테스트를 실행합니다.',
    fullP: '데이터를 다운로드한 뒤 WebGPU 백엔드로 전체 학습을 실행하는 명령어:',
    runtimeNote:
      '이 명령어는 로컬 Chromium을 사용하며 필요할 때 MNIST 데이터를 다운로드합니다. 성능은 어댑터와 호스트 환경에 따라 달라집니다.',
    limitsH: '검증 범위와 한계',
    limits: [
      'WebGL2는 네이티브 컴퓨트 셰이더가 아니라 생성된 GLSL ES 3.00 패스를 사용합니다.',
      'WebGL2 CI는 수치 계산과 실제 데이터 일부를 검증했습니다. 전체 데이터 정확도와 속도는 아직 검증하지 않았습니다.',
      '공개된 전체 WebGPU 학습 결과는 소프트웨어 렌더링으로 측정했습니다. 물리 GPU 가속 성능은 주장하지 않습니다.',
      '실습 도구는 선택한 데이터 일부로 브라우저에서 TypeShade 계산을 실행합니다. 전체 데이터 실험 결과는 별도 기록입니다.',
    ],
    sourceH: '소스와 검증 기록',
    sourceP: '소스와 결과는 사이트 빌드에 사용한 컴파일러 커밋을 가리킵니다.',
    kernelSource: 'MNIST TypeShade 셰이더 소스',
    instructions: '학습 및 검증 안내',
    resultRecord: '전체 데이터 결과 기록',
    typenn: {
      h: 'TypeNN의 MNIST',
      p: '이 가이드는 직접 작성한 커널로 소프트맥스 회귀를 학습합니다. TypeNN은 TypeShade 위에 만든 신경망 라이브러리입니다. 모델은 레이어를 쌓아 정의하고, 각 레이어는 TypeShade 커널 함수로 실행됩니다. 아래 코드는 은닉층이 하나인 모델을 정의하고 배치 단위로 학습합니다.',
      lab: 'TypeNN 실습 도구 열기',
      github: 'GitHub에서 TypeNN 보기',
    },
  },

  notFound: {
    title: '페이지를 찾을 수 없음, TypeShade',
    description: 'typeshade.dev의 이 주소에는 아무것도 없습니다.',
    h1: '이 주소에는 아무것도 없습니다.',
    p: '페이지가 옮겨졌을 수 있습니다. 첫 페이지와 작성 가이드는 그대로 있습니다.',
    links: '[첫 페이지로 돌아가거나](home) [작성 가이드](guide)를 읽어 보십시오.',
  },
};
