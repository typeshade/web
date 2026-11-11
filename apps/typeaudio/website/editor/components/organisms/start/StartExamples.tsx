import { FUNCTION_EXAMPLE, PROJECTS } from "../../../../project/catalog.ts";

export function StartExamples({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section
      className="start-section start-examples"
      id="start-examples"
      aria-labelledby="start-examples-title"
    >
      <h2 id="start-examples-title">Examples</h2>
      <p className="start-hint">
        Each passage from the Frieren study opens as an editable copy with its
        source code, timing and room settings. A and B are two versions of the
        same passage.
      </p>
      <div className="start-example-grid">
        {PROJECTS.map((project) => (
          <article className="start-example" key={project.id}>
            <h3>{project.title}</h3>
            <small>
              {project.range} · {project.layers} layers
            </small>
            <p>{project.detail}</p>
            {(["A", "B"] as const).map((variant) => {
              const id = `${project.id}-${variant}`;
              return (
                <div className="start-variant" key={variant}>
                  <span>
                    <strong>{variant}</strong> {project.variants[variant]}
                  </span>
                  <button
                    data-start-example={id}
                    aria-label={`Open ${project.title} ${variant}`}
                    onClick={() => onOpen(id)}
                  >
                    Open {variant}
                  </button>
                </div>
              );
            })}
          </article>
        ))}
        <article className="start-example">
          <h3>{FUNCTION_EXAMPLE.title}</h3>
          <small>Function sound</small>
          <p>{FUNCTION_EXAMPLE.detail}</p>
          <div className="start-variant">
            <span />
            <button
              data-start-example={FUNCTION_EXAMPLE.id}
              aria-label={`Open ${FUNCTION_EXAMPLE.title}`}
              onClick={() => onOpen(FUNCTION_EXAMPLE.id)}
            >
              Open
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
