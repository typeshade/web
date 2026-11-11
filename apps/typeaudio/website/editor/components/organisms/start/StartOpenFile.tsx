import { useRef } from "react";

export function StartOpenFile({
  reading,
  error,
  onFile,
}: {
  reading: boolean;
  error: string;
  onFile: (file: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <section
      className="start-section"
      id="start-open"
      aria-labelledby="start-open-title"
    >
      <h2 id="start-open-title">Open a project file</h2>
      <p className="start-hint">
        Choose a TypeAudio project <code>.json</code> file, or drop one anywhere
        on this page. Files can be up to 40 MB, including embedded audio.
      </p>
      <button
        id="start-choose-file"
        className="primary"
        disabled={reading}
        onClick={() => input.current?.click()}
      >
        {reading ? "Checking file…" : "Choose file…"}
      </button>
      <input
        ref={input}
        id="start-project-file"
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      {error && (
        <p className="start-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
