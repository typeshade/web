import { GENERATED_DOCUMENT } from "../../../code/codeDraft.ts";
import type { CodeDocuments } from "../../../hooks/code/useCodeDocuments.ts";

export function CodeDocumentTabs({
  documents: d,
}: {
  documents: CodeDocuments;
}) {
  return (
    <div
      className="code-document-tabs"
      role="tablist"
      aria-label="Code documents"
    >
      {d.documents.map((doc, index) => (
        <button
          key={doc.id}
          type="button"
          role="tab"
          id={`code-tab-${doc.id === GENERATED_DOCUMENT ? "generated" : `node-${doc.id}`}`}
          aria-selected={d.id === doc.id}
          aria-controls="code-document-panel"
          tabIndex={d.id === doc.id ? 0 : -1}
          onClick={() => d.select(doc.id)}
          onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight")
              next = (index + 1) % d.documents.length;
            else if (event.key === "ArrowLeft")
              next = (index - 1 + d.documents.length) % d.documents.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = d.documents.length - 1;
            else return;
            event.preventDefault();
            d.select(d.documents[next]!.id);
            (
              event.currentTarget.parentElement!.children[
                next
              ] as HTMLButtonElement
            ).focus();
          }}
          data-tooltip={
            doc.id === GENERATED_DOCUMENT
              ? "Compiled graph source. Read only."
              : doc.kind === "settings"
                ? "Built-in node settings. Select a Code node to edit its calculation."
                : `${doc.label}${doc.dirty ? " — unapplied changes" : " — applied code"}`
          }
        >
          <span className="code-file-icon" aria-hidden="true">
            {doc.id === GENERATED_DOCUMENT
              ? "ƒ"
              : doc.kind === "settings"
                ? "◇"
                : "{}"}
          </span>
          <span>{doc.label}</span>
          {doc.dirty && (
            <span className="code-draft-dot" aria-label="Unapplied changes" />
          )}
        </button>
      ))}
    </div>
  );
}
