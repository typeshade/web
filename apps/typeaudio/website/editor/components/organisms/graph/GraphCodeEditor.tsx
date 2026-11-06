import { useState } from "react";
import type { GraphEditor } from "../../../hooks/graph/useGraphEditor.ts";
import { GraphCodeReference } from "../../molecules/graph/GraphCodeReference.tsx";
export function GraphCodeEditor({
  controller: c,
}: {
  controller: GraphEditor;
}) {
  const n = c.selected;
  const [drafts, setDrafts] = useState<
      Record<string, { base: string; text: string }>
    >({}),
    [generated, setGenerated] = useState(false);
  const id = c.owner + ":" + n?.id,
    draft = drafts[id],
    text = draft?.base === n?.code ? draft!.text : (n?.code ?? ""),
    dirty = text !== n?.code;
  const setDraft = (next: { id: string; base: string; text: string }) =>
    setDrafts((old) => ({
      ...old,
      [next.id]: { base: next.base, text: next.text },
    }));

  return (
    <div className="graph-code-panel">
      <div className="graph-code-toolbar">
        <span>
          {generated
            ? "Generated TypeShade"
            : n?.kind === "code"
              ? `${n.name} · TypeShade`
              : "Node code"}
          {dirty && !generated ? " · unapplied" : ""}
        </span>
        <button onClick={() => setGenerated(!generated)}>
          {generated ? "Edit node" : "Generated source"}
        </button>
        {n?.kind === "code" && !generated && (
          <button
            id="apply-graph-code"
            className="primary"
            disabled={c.busy || !dirty}
            onClick={() => c.edit(n.id, { code: text }, true)}
          >
            {c.busy ? "Compiling…" : "Apply code"}
          </button>
        )}
      </div>
      {generated || n?.kind === "code" ? (
        <textarea
          id="graph-code"
          aria-label={generated ? "Generated TypeShade" : "TypeShade node code"}
          spellCheck={false}
          readOnly={generated}
          value={generated ? c.source : text}
          onChange={(event) =>
            setDraft({ id, base: n!.code, text: event.target.value })
          }
          onKeyDown={(event) => {
            if (
              (event.ctrlKey || event.metaKey) &&
              event.key === "Enter" &&
              !generated &&
              n
            ) {
              event.preventDefault();
              c.edit(n.id, { code: text }, true);
            }
            if (event.key === "Tab" && !generated) {
              event.preventDefault();
              const el = event.currentTarget,
                at = el.selectionStart;
              setDraft({
                id,
                base: n!.code,
                text: text.slice(0, at) + "  " + text.slice(el.selectionEnd),
              });
              requestAnimationFrame(() => el.setSelectionRange(at + 2, at + 2));
            }
          }}
        />
      ) : (
        <p className="panel-hint">
          Select a Code node to write TypeShade. Connect its input to process an
          existing signal, or generate audio from p0–p3 and persistent
          state0–state3. Assign the result to out.
        </p>
      )}
      <GraphCodeReference />
      <p className="graph-code-status" role={c.error ? "alert" : undefined}>
        {c.error ||
          (c.busy
            ? "Compiling off the audio thread…"
            : "Ctrl/⌘ Enter applies code. Draft code is saved to the sound only after a successful compile.")}
      </p>
    </div>
  );
}
