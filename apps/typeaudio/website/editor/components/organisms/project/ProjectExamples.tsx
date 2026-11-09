import type { Editor } from "../../../useEditor.ts";
import { PROJECTS, projectUrl } from "../../../../project/catalog.ts";

export function ProjectExamples({ editor: e }: { editor: Editor }) {
  return (
    <div className="project-examples">
      <p className="panel-hint">
        Preview without changing your work, then open an editable copy. Each
        passage includes source code, timing and room settings.
      </p>
      {PROJECTS.map((project) => (
        <article className="project-example" key={project.id}>
          <h3>{project.title}</h3>
          <small>
            {project.range} · {project.layers} layers
          </small>
          <p>{project.detail}</p>
          {(["A", "B"] as const).map((variant) => {
            const id = `${project.id}-${variant}`,
              previewing = e.preview?.id === id;
            return (
              <div className="project-variant" key={variant}>
                <p>
                  <strong>{variant}</strong> · {project.variants[variant]}
                </p>
                <div className="button-row">
                  <button
                    data-preview={id}
                    aria-pressed={previewing}
                    onClick={() =>
                      previewing ? e.stopPreview() : void e.previewProject(id)
                    }
                  >
                    {previewing ? "Stop preview" : `Preview ${variant}`}
                  </button>
                  <button
                    data-project={id}
                    aria-label={`Open editable copy ${project.title} ${variant}`}
                    disabled={e.projectLoading}
                    data-tooltip="Open an editable copy. Your previous project is kept in Saved copies."
                    onClick={() => void e.openExample(id)}
                  >
                    Open copy
                  </button>
                  <a
                    href={projectUrl(id)}
                    download
                    aria-label={`Download ${project.title} ${variant} source project`}
                  >
                    JSON
                  </a>
                </div>
              </div>
            );
          })}
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
            Save project file
          </button>
        </div>
      )}
    </div>
  );
}
