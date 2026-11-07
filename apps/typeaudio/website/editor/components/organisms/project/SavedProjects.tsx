import type { Editor } from "../../../useEditor.ts";

export function SavedProjects({ editor: e }: { editor: Editor }) {
  return (
    <details className="saved-projects">
      <summary>Saved copies ({e.savedProjects.length})</summary>
      <p>
        Opening a project keeps your previous work here, including code drafts.
        Copies stay in this browser.
      </p>
      <button onClick={e.saveProjectCopy}>Keep a copy now</button>
      {e.savedProjects.length === 0 && <p>No saved copies yet.</p>}
      {e.savedProjects.map((copy) => (
        <div
          className="saved-project"
          key={copy.id}
          data-saved-project={copy.id}
        >
          <strong>{copy.name}</strong>
          <time dateTime={copy.savedAt}>
            {new Date(copy.savedAt).toLocaleString()}
          </time>
          <div className="button-row">
            <button
              disabled={e.projectLoading}
              onClick={() => void e.openSavedProject(copy.id)}
            >
              Open copy
            </button>
            <button
              aria-label={`Remove saved copy ${copy.name}`}
              onClick={() => e.deleteSavedProject(copy.id)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </details>
  );
}
