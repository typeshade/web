import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { StudioCommand } from "../../../commands/types.ts";
import { searchCommands } from "../../../commands/searchCommands.ts";

export function CommandPalette({
  mode,
  commands,
  onClose,
}: {
  mode: "commands" | "files";
  commands: StudioCommand[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""),
    [index, setIndex] = useState(0);
  const results = searchCommands(commands, query);
  const selected = Math.min(index, Math.max(0, results.length - 1));
  useLayoutEffect(() => {
    const origin = document.activeElement;
    dialog.current!.showModal();
    input.current!.focus();
    return () => {
      dialog.current?.close();
      if (origin instanceof HTMLElement && origin.isConnected)
        origin.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    document
      .getElementById(`command-option-${selected}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected, query]);
  function run(command: StudioCommand | undefined) {
    if (!command || command.disabled) return;
    onClose();
    requestAnimationFrame(() => command.run());
  }
  return (
    <dialog
      ref={dialog}
      className="studio-command-palette"
      aria-label={mode === "files" ? "Open code document" : "Command palette"}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
      onKeyDown={(event) => {
        if ((event.target as Element).closest("button")) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setIndex(
            (selected + (event.key === "ArrowDown" ? 1 : -1) + results.length) %
              Math.max(1, results.length),
          );
        } else if (event.key === "Enter") {
          event.preventDefault();
          run(results[selected]);
        }
      }}
    >
      <div className="command-search">
        <span aria-hidden="true">{mode === "commands" ? ">" : "⌕"}</span>
        <input
          ref={input}
          role="combobox"
          aria-label={
            mode === "files" ? "Search code documents" : "Search commands"
          }
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls="command-results"
          aria-activedescendant={
            results.length ? `command-option-${selected}` : undefined
          }
          placeholder={
            mode === "files"
              ? "Open a Code node or generated source…"
              : "Search commands…"
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIndex(0);
          }}
        />
        <button aria-label="Close command palette" onClick={onClose}>
          Esc
        </button>
      </div>
      <div
        className="command-results"
        id="command-results"
        role="listbox"
        aria-label="Results"
      >
        {results.map((command, i) => (
          <div
            key={command.id}
            role="option"
            id={`command-option-${i}`}
            aria-selected={selected === i}
            aria-disabled={command.disabled || undefined}
            onPointerMove={() => setIndex(i)}
            onClick={() => run(command)}
          >
            <span className="command-group">{command.group}</span>
            <span className="command-label">{command.label}</span>
            {command.shortcut && <kbd>{command.shortcut}</kbd>}
            {command.disabled && (
              <span className="command-unavailable">Unavailable</span>
            )}
          </div>
        ))}
      </div>
      {!results.length && (
        <p className="command-empty">
          {mode === "files" && !commands.length
            ? "Create a procedural sound to open its Code documents."
            : "No matching commands."}
        </p>
      )}
      <div className="command-help">
        ↑ ↓ Navigate · Enter Run · Esc Close{" "}
        <span>{results.length} results</span>
      </div>
    </dialog>
  );
}
