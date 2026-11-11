import { EXAMPLES } from "../../../../project/catalog.ts";

export function StartExamples({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section
      className="start-section start-examples"
      id="start-examples"
      aria-labelledby="start-examples-title"
    >
      <h2 id="start-examples-title">Examples</h2>
      <p className="start-hint">
        An example opens as an editable copy with its source code, timing and
        room settings.
      </p>
      <div className="start-example-grid">
        {EXAMPLES.map((project) => (
          <article className="start-example" key={project.id}>
            <h3>{project.title}</h3>
            <small>
              {project.range} · {project.layers} layers · {project.status}
            </small>
            <p>{project.detail}</p>
            <div className="start-variant">
              <span />
              <button
                data-start-example={project.id}
                aria-label={`Open ${project.title}`}
                onClick={() => onOpen(project.id)}
              >
                Open
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
