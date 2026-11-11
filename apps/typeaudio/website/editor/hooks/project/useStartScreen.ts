import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ProjectHistory,
  type ProjectCopy,
} from "../../projects/ProjectHistory.ts";
import { readProjectFile } from "../../../project/readProjectFile.ts";
import { encodeProject } from "../../../project/encodeProject.ts";
import { projectSummary } from "../../../project/projectSummary.ts";
import { initialDocument } from "../../state/restoreDocument.ts";
import { DOCUMENT_KEY } from "../../state/storageKeys.ts";
import type { LaunchRequest } from "../session/useAppRoute.ts";

export interface RecentProject {
  id: string;
  name: string;
  savedAt: string;
  layers: number;
  seconds?: number;
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** The working document left in this browser, unless a saved copy already holds it. */
function lastDocument(copies: ProjectCopy[]) {
  try {
    if (!localStorage.getItem(DOCUMENT_KEY)) return undefined;
    const d = initialDocument();
    const content = encodeProject(d.scene, [], {
      source: d.source,
      drafts: d.drafts,
      selected: d.selected,
      selection: d.selection ?? [],
    });
    const encoded = JSON.stringify(content);
    if (copies.some((c) => JSON.stringify(c.content) === encoded))
      return undefined;
    return {
      name: d.scene.cues.length ? d.scene.name : d.source.name,
      ...projectSummary(content),
    };
  } catch {
    return undefined;
  }
}

/** Start screen data: Recent from Saved copies, and validation of a chosen project file. */
export function useStartScreen(onEnter: (launch: LaunchRequest) => void) {
  const projectHistory = useMemo(() => new ProjectHistory(), []);
  const [recent, setRecent] = useState<RecentProject[]>([]);
  const [current, setCurrent] = useState<ReturnType<typeof lastDocument>>();
  const [recentError, setRecentError] = useState("");
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const refresh = useCallback(() => {
    let copies: ProjectCopy[] = [];
    try {
      copies = projectHistory.list();
      setRecentError("");
    } catch (error) {
      setRecentError(message(error));
    }
    setRecent(
      copies.map((c) => ({
        id: c.id,
        name: c.name,
        savedAt: c.savedAt,
        ...projectSummary(c.content),
      })),
    );
    setCurrent(lastDocument(copies));
  }, [projectHistory]);
  useEffect(() => {
    refresh();
    // A page restored from the back/forward cache shows Recent as it is now.
    const fn = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener("pageshow", fn);
    return () => window.removeEventListener("pageshow", fn);
  }, [refresh]);
  function remove(id: string) {
    try {
      projectHistory.remove(id);
    } catch (error) {
      setRecentError(message(error));
    }
    refresh();
  }
  async function openFile(file: File) {
    setFileError("");
    setReading(true);
    try {
      const data = await readProjectFile(file);
      onEnter({ kind: "file", data });
    } catch (error) {
      setFileError(`${file.name} was not opened: ${message(error)}`);
      setReading(false);
    }
  }
  return {
    recent,
    current,
    recentError,
    fileError,
    reading,
    remove,
    openFile,
    rejectFiles: () => setFileError("Drop one project file at a time."),
  };
}

export type StartScreen = ReturnType<typeof useStartScreen>;
