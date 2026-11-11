import type { Editor } from "../../../useEditor.ts";
import { EXAMPLES, projectUrl } from "../../../../project/catalog.ts";

export function ProjectExamples({ editor: e }: { editor: Editor }) {
  return (
    <div className="project-examples">
      <p className="panel-hint">
        Preview without changing your work, then open an editable copy. An
        example includes its source code, timing and room settings.
      </p>
      {EXAMPLES.map((project) => {
        const id = project.id,
          previewing = e.preview?.id === id;
        return (
          <article className="project-example" key={id}>
            <h3>{project.title}</h3>
            <small>
              {project.range} · {project.layers} layers · {project.status}
            </small>
            <p>{project.detail}</p>
            <div className="project-variant">
              <div className="button-row">
                <button
                  data-preview={id}
                  aria-pressed={previewing}
                  onClick={() =>
                    previewing ? e.stopPreview() : void e.previewProject(id)
                  }
                >
                  {previewing ? "Stop preview" : "Preview"}
                </button>
                <button
                  data-project={id}
                  aria-label={`Open editable copy ${project.title}`}
                  disabled={e.projectLoading}
                  data-tooltip="Open an editable copy. Your previous project is kept in Saved copies."
                  onClick={() => void e.openExample(id)}
                >
                  Open copy
                </button>
                <a
                  href={projectUrl(id)}
                  download
                  aria-label={`Download ${project.title} source project`}
                >
                  JSON
                </a>
              </div>
            </div>
          </article>
        );
      })}
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
