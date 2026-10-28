# Korean learning headings

## Request

Replace unnatural Korean teaching headings with concise Korean documentation labels.

## Scope

Review the concept lesson headings and function lesson headings added in the learning work.
Keep their meaning, existing heading IDs and explanatory paragraphs. The baseline is
`fix/docs-title-body-spacing` at `48af90302d64af0beba9faf8146234aa9b60a92a`.

## Review

Check localized copy rules, navigation headings and both viewport sizes. Record the exact
label replacements and verification in the pull request.

## Changes

| Previous label     | Replacement          |
| ------------------ | -------------------- |
| 언제 쓰는가        | 활용                 |
| 계산과 판단 예     | 예제                 |
| 실무에서 확인할 점 | 주의사항             |
| 예제의 계산 과정   | 계산 과정            |
| API 사용 가능 여부 | API 지원 여부        |
| 예제로 비교하기    | 예제 비교            |
| 움직이며 이해하기  | 함수 그래프          |
| 입력과 한계        | 입력 범위와 주의사항 |
| 계산 예            | 계산 예제            |

The availability paragraph uses the same term as its label. Existing heading IDs remain
stable. The built Korean pages contain none of the removed use-heading phrase.

## Verification

The production build and translated-copy checks passed on 2026-10-23. The Korean copy audit
reported low risk, a 1.8% edit rate and passing gates. A built-HTML check verified all five
concept lesson headings, 47 graph headings, 127 worked-example headings, and the shared use
and limit headings on 174 function pages. The authored Pow note uses its existing headings.

The pull request records the browser, navigation and SEO results. This copy change is stacked
on the title-spacing change and is not deployed by this task.
