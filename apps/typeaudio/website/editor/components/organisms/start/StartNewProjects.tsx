import {
  STARTING_POINTS,
  type StartingPoint,
} from "../../../../project/startingPoints.ts";

export function StartNewProjects({
  onNew,
}: {
  onNew: (template: StartingPoint) => void;
}) {
  return (
    <section
      className="start-section"
      id="start-new"
      aria-labelledby="start-new-title"
    >
      <h2 id="start-new-title">New project</h2>
      <div className="start-new-list">
        {STARTING_POINTS.map((point) => (
          <button
            key={point.id}
            className="start-new-item"
            data-new-project={point.id}
            onClick={() => onNew(point.id)}
          >
            <strong>{point.title}</strong>
            <span>{point.detail}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
