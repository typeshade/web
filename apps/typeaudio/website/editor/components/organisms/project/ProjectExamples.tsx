import type { Editor } from "../../../useEditor.ts";
import { PROJECTS, projectUrl } from "../../../../project/catalog.ts";

export function ProjectExamples({ editor: e }: { editor: Editor }) {
  return (
    <div className="project-examples">
      <p className="panel-hint">
        Open an editable copy with source code, layers, timing and space. Export
        the current project to keep it before opening another.
      </p>
      {PROJECTS.map((project) => (
        <article className="project-example" key={project.id}>
          <h3>{project.title}</h3>
          <small>
            {project.range} · {project.layers} layers
          </small>
          <p>{project.detail}</p>
          <div className="button-row">
            {(["A", "B"] as const).map((variant) => (
              <button
                key={variant}
                data-project={`${project.id}-${variant}`}
                disabled={e.projectLoading}
                data-tooltip={`Open variant ${variant} as an editable composition. Changes belong to your copy.`}
                onClick={() => void e.openExample(`${project.id}-${variant}`)}
              >
                Open {variant}
              </button>
            ))}
            <a href={projectUrl(project.id + "-A")} download>
              JSON
            </a>
          </div>
        </article>
      ))}
      {e.projectLoading && (
        <p role="status" className="panel-hint">
          Preparing project sources…
        </p>
      )}
      {!e.projectLoading &&
        e.state.workspace === "picture" &&
        e.state.scene.origin &&
        !e.ready && (
          <p role="status" className="panel-hint">
            Preparing the composition preview…
          </p>
        )}
      {e.state.scene.origin && (
        <div className="project-origin">
          <strong>{e.state.scene.name}</strong>
          <p>{e.state.scene.origin.notes}</p>
          <button onClick={() => void e.exportProject()}>
            Export edited project
          </button>
        </div>
      )}
    </div>
  );
}
