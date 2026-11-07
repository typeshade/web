import type { TypeshadeRange } from "typeshade/language-service";
import type { LanguageAnalysis } from "../../../code/language/observeLanguageModel.ts";

export function CodeProblems({
  analysis,
  onReveal,
  onRetry,
}: {
  analysis: LanguageAnalysis;
  onReveal: (range: TypeshadeRange) => void;
  onRetry: () => void;
}) {
  return (
    <div
      className="code-problems"
      aria-label="Code problems"
      data-status={analysis.status}
    >
      <div className="code-problems-heading" role="status">
        <span>
          {analysis.status === "checking"
            ? "Checking TypeShade…"
            : analysis.status === "failed"
              ? "Analysis unavailable"
              : `Problems · ${analysis.problems.length}`}
        </span>
        {analysis.status === "ready" && !analysis.problems.length && (
          <span>No language errors</span>
        )}
      </div>
      {analysis.status === "failed" && (
        <p>
          {analysis.failure} <button onClick={onRetry}>Retry analysis</button>
        </p>
      )}
      {!!analysis.problems.length && (
        <ul>
          {analysis.problems.map((problem, i) => (
            <li key={i}>
              <button
                className={`code-problem-${problem.severity}`}
                onClick={() => onReveal(problem.range)}
              >
                <span>{problem.severity === "error" ? "×" : "!"}</span>
                <span>{problem.message}</span>
                <span>
                  Ln {problem.range.start.line + 1}, Col{" "}
                  {problem.range.start.character + 1}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
