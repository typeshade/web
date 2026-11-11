import type {
  RecentProject,
  StartScreen,
} from "../../../hooks/project/useStartScreen.ts";

const details = (p: { layers: number; seconds?: number }) =>
  [
    p.layers ? `${p.layers} ${p.layers === 1 ? "layer" : "layers"}` : "Sound",
    p.seconds === undefined ? "" : `${p.seconds.toFixed(1)} s`,
  ]
    .filter(Boolean)
    .join(" · ");

const savedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export function StartRecentProjects({
  recent,
  current,
  error,
  onContinue,
  onOpen,
  onRemove,
}: {
  recent: RecentProject[];
  current: StartScreen["current"];
  error: string;
  onContinue: () => void;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section
      className="start-section"
      id="start-recent"
      aria-labelledby="start-recent-title"
    >
      <h2 id="start-recent-title">Recent</h2>
      <p className="start-hint">
        A copy is kept here each time you leave a project or open another one.
        Copies stay in this browser; save a project file to move one elsewhere.
      </p>
      {error && (
        <p className="start-error" role="alert">
          {error}
        </p>
      )}
      <ul className="start-recent-list">
        {current && (
          <li className="start-recent-item" data-last-document>
            <div>
              <strong>{current.name}</strong>
              <small>Last open · {details(current)}</small>
            </div>
            <button className="primary" onClick={onContinue}>
              Continue
            </button>
          </li>
        )}
        {recent.map((copy) => (
          <li className="start-recent-item" key={copy.id} data-recent={copy.id}>
            <div>
              <strong>{copy.name}</strong>
              <small>
                <time dateTime={copy.savedAt}>
                  Saved {savedAt(copy.savedAt)}
                </time>
                {" · "}
                {details(copy)}
              </small>
            </div>
            <button
              aria-label={`Open ${copy.name}`}
              onClick={() => onOpen(copy.id)}
            >
              Open
            </button>
            <button
              className="start-remove"
              aria-label={`Remove ${copy.name} from Recent`}
              onClick={() => onRemove(copy.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {!current && !recent.length && !error && (
        <p className="start-hint">
          Nothing yet. Projects you leave or replace appear here.
        </p>
      )}
    </section>
  );
}
