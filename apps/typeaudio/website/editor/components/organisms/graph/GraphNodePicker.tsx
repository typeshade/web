import { useEffect, useId, useRef, useState } from "react";
import { DEFINITIONS } from "typeaudio/graph";
import { insertionError } from "../../../../graph/insertNode.ts";
import type { NodeKind, SoundGraph } from "typeaudio/graph";
import { NODE_METADATA } from "../../../config/graphNodeMetadata.ts";
import type { GraphNodePickerController } from "../../../hooks/graph/useGraphNodePicker.ts";

export function GraphNodePicker({
  graph,
  picker,
}: {
  graph: SoundGraph;
  picker: GraphNodePickerController;
}) {
  const [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDivElement>(null),
    listId = useId();
  const attachment = picker.request!.attachment;
  const items = (Object.keys(NODE_METADATA) as NodeKind[])
    .filter((kind) => kind !== "output")
    .map((kind) => ({
      kind,
      ...NODE_METADATA[kind],
      label: DEFINITIONS[kind].label,
      error: insertionError(graph, kind, attachment),
    }))
    .filter(
      (item) =>
        !item.error?.startsWith("No compatible") &&
        `${item.label} ${item.category} ${item.summary}`
          .toLowerCase()
          .includes(query.toLowerCase().trim()),
    );
  const index = Math.min(active, Math.max(0, items.length - 1));
  useEffect(() => {
    input.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!dialog.current?.contains(event.target as Node)) picker.close();
    };
    document.addEventListener("pointerdown", outside, true);
    return () => document.removeEventListener("pointerdown", outside, true);
  }, []);
  useEffect(() => {
    dialog.current
      ?.querySelector(`#${CSS.escape(listId + "-" + index)}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index, query]);
  return (
    <div
      className="graph-picker-backdrop"
      onPointerDown={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) picker.close();
      }}
    >
      <div
        ref={dialog}
        className="graph-picker"
        role="dialog"
        aria-modal="false"
        aria-label="Add a node"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            picker.close();
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setActive(
              (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
                Math.max(1, items.length),
            );
          }
          if (event.key === "Enter" && event.target === input.current) {
            event.preventDefault();
            const item = items[index];
            if (item && !item.error) picker.choose(item.kind);
          }
          if (event.key === "Tab") {
            event.preventDefault();
            const close = dialog.current!.querySelector<HTMLButtonElement>(
              ".graph-picker-close",
            )!;
            if (
              (!event.shiftKey && document.activeElement === input.current) ||
              (event.shiftKey && document.activeElement === close)
            )
              picker.close();
            else
              (document.activeElement === input.current
                ? close
                : input.current
              )?.focus();
          }
        }}
      >
        <div className="graph-picker-heading">
          <strong>
            {attachment.from && attachment.to
              ? "Insert a node"
              : attachment.from || attachment.to
                ? "Add a connected node"
                : "Add a node"}
          </strong>
          <button
            className="graph-picker-close"
            aria-label="Close node search"
            onClick={picker.close}
          >
            ×
          </button>
        </div>
        <input
          ref={input}
          aria-label="Find a node"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={
            items.length ? listId + "-" + index : undefined
          }
          placeholder="Search nodes…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
        />
        <div
          id={listId}
          role="listbox"
          aria-label="Available nodes"
          className="graph-picker-results"
        >
          {items.map((item, i) => (
            <button
              id={listId + "-" + i}
              key={item.kind}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={i === index}
              aria-disabled={!!item.error}
              className={`graph-picker-option ${i === index ? "active" : ""}`}
              data-node-kind={item.kind}
              onPointerMove={() => setActive(i)}
              onClick={() => {
                if (!item.error) picker.choose(item.kind);
              }}
            >
              <span className="graph-picker-name">
                {item.label}
                <small>{item.category}</small>
              </span>
              <span>{item.error ?? item.summary}</span>
            </button>
          ))}
          {!items.length && (
            <p className="panel-hint">No compatible nodes match this search.</p>
          )}
        </div>
        <p className="graph-picker-help">
          ↑ ↓ Choose · Enter Add · Escape Cancel
          {attachment.from || attachment.to
            ? " · Compatible connections only"
            : ""}
        </p>
      </div>
    </div>
  );
}
