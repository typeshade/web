import { useEffect } from "react";
import type { LaunchRequest } from "../hooks/session/useAppRoute.ts";
import { useStartScreen } from "../hooks/project/useStartScreen.ts";
import { StartNewProjects } from "../components/organisms/start/StartNewProjects.tsx";
import { StartOpenFile } from "../components/organisms/start/StartOpenFile.tsx";
import { StartRecentProjects } from "../components/organisms/start/StartRecentProjects.tsx";
import { StartExamples } from "../components/organisms/start/StartExamples.tsx";

export function StartPage({
  onEnter,
}: {
  onEnter: (launch: LaunchRequest) => void;
}) {
  const start = useStartScreen(onEnter);
  useEffect(() => {
    document.title = "TypeAudio — audio workspace";
  }, []);
  return (
    <div
      className="start-app"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        if (event.dataTransfer.files.length !== 1) start.rejectFiles();
        else void start.openFile(event.dataTransfer.files[0]!);
      }}
    >
      <header className="start-header">
        <span className="app-brand">
          <img src="/icon.png" width="22" height="22" alt="" />
          <span>TypeAudio</span>
        </span>
        <a href="/docs/architecture/" target="_blank" rel="noopener">
          Help
        </a>
      </header>
      <main className="start-main" id="start-main">
        <div className="start-intro">
          <h1>Projects</h1>
          <p>
            Design procedural sounds with TypeShade code and arrange them
            against picture. Projects stay in this browser until you save a
            project file.
          </p>
        </div>
        <div className="start-columns">
          <div className="start-column">
            <StartNewProjects
              onNew={(template) => onEnter({ kind: "new", template })}
            />
            <StartOpenFile
              reading={start.reading}
              error={start.fileError}
              onFile={(file) => void start.openFile(file)}
            />
          </div>
          <StartRecentProjects
            recent={start.recent}
            current={start.current}
            error={start.recentError}
            onContinue={() => onEnter({ kind: "resume" })}
            onOpen={(id) => onEnter({ kind: "copy", id })}
            onRemove={start.remove}
          />
        </div>
        <StartExamples onOpen={(id) => onEnter({ kind: "example", id })} />
      </main>
    </div>
  );
}
