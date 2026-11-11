import { useEffect, useRef, useState } from "react";
import { decodeProject } from "../../../project/decodeProject.ts";
import { encodeProject } from "../../../project/encodeProject.ts";
import { projectUrl } from "../../../project/catalog.ts";
import { readProjectFile } from "../../../project/readProjectFile.ts";
import {
  MAX_PROJECT_BYTES,
  packAudio,
  unpackAudioAssets,
} from "../../../audio-asset.ts";
import { patchPrograms } from "../../../graph/preparePatch.ts";
import { download } from "../../shared/download.ts";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
import type { MediaSource } from "../media/useMediaSource.ts";
import type { EditorState } from "../../state/documentTypes.ts";
import type { ProjectCopy } from "../../projects/ProjectHistory.ts";
import {
  type DocumentIdentity,
  identitySearch,
  readIdentity,
  writeIdentity,
} from "../../state/documentIdentity.ts";
export function useProjectFiles(
  { editVersion, dispatch, latest, setNotice }: DocumentController,
  { assetLibrary, transport, projectHistory }: EditorResources,
  { detach }: MediaSource,
  setAudioRevision: React.Dispatch<React.SetStateAction<number>>,
  workspace: (next: "picture" | "sound", replace?: boolean) => void,
) {
  const projectRequest = useRef(0);
  const [projectLoading, setProjectLoading] = useState(false);
  const [savedProjects, setSavedProjects] = useState<ProjectCopy[]>([]);
  const [identity, setIdentity] = useState(readIdentity);
  const editorState = (s: EditorState) => ({
    source: s.source,
    drafts: s.drafts ?? {},
    selected: s.selected,
    selection: s.selection ?? [],
  });
  function refreshProjects() {
    try {
      setSavedProjects(projectHistory.list());
    } catch (error) {
      setNotice(String(error));
    }
  }
  useEffect(refreshProjects, []);
  function checkpoint() {
    const s = latest.current.state;
    projectHistory.save(encodeProject(s.scene, [], editorState(s)));
    refreshProjects();
  }
  /** Name the working document's project in storage and in the editor URL. */
  function nameDocument(next: DocumentIdentity | undefined) {
    writeIdentity(next);
    setIdentity(next);
    history.replaceState(
      history.state,
      "",
      location.pathname + identitySearch(next),
    );
  }
  /** Resolves true once the project replaced the working document. */
  async function loadProject(
    read: () => Promise<unknown>,
    name?: DocumentIdentity,
  ): Promise<boolean> {
    const request = ++projectRequest.current,
      version = editVersion.current;
    const current = () =>
      request === projectRequest.current && version === editVersion.current;
    setProjectLoading(true);
    try {
      const { scene: next, audioAssets, editor } = decodeProject(await read());
      for (const cue of next.cues)
        if (!cue.audio) {
          if (!current()) return false;
          await patchPrograms(cue.patch);
        }
      if (editor) await patchPrograms(editor.source.patch);
      const assets = await unpackAudioAssets(
        audioAssets,
        next.cues.flatMap((c) => (c.audio ? [c.audio] : [])),
      );
      if (!current()) return false;
      checkpoint();
      await assetLibrary.put(assets);
      if (!current()) return false;
      detach();
      dispatch({ type: "open", scene: next, editor });
      workspace(
        next.cues.length || next.media.kind !== "none" ? "picture" : "sound",
        true,
      );
      nameDocument(name);
      setAudioRevision((n) => n + 1);
      transport.current.seek(next.start);
      setNotice(
        next.media.kind === "youtube"
          ? "Project opened. Your previous work is in Saved copies. Select a layer to edit or play the composition."
          : next.media.kind === "none"
            ? "Project opened."
            : `Project opened. Re-select video: ${next.media.name}`,
      );
      return true;
    } catch (error) {
      if (current()) setNotice(`Import failed: ${String(error)}`);
      return false;
    } finally {
      if (request === projectRequest.current) setProjectLoading(false);
    }
  }
  async function openProject(file: File) {
    return loadProject(() => readProjectFile(file));
  }
  async function openExample(id: string) {
    return loadProject(
      async () => {
        const response = await fetch(projectUrl(id));
        if (!response.ok)
          throw new Error("This example project could not be loaded.");
        const text = await response.text();
        if (text.length > MAX_PROJECT_BYTES)
          throw new Error("Project file is too large.");
        return JSON.parse(text);
      },
      { kind: "example", id },
    );
  }
  async function exportProject() {
    const document = latest.current.state,
      snapshot = document.scene;
    try {
      const refs = [
        ...new Map(
          snapshot.cues.flatMap((c) =>
            c.audio ? [[c.audio.id, c.audio] as const] : [],
          ),
        ).values(),
      ];
      const audioAssets = [];
      for (const ref of refs)
        audioAssets.push(
          packAudio({ ...ref, pcm: await assetLibrary.read(ref) }),
        );
      const data = JSON.stringify(
        encodeProject(snapshot, audioAssets, editorState(document)),
        null,
        2,
      );
      download(
        new Blob([data], { type: "application/json" }),
        snapshot.origin
          ? `${snapshot.name.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}.typeaudio.json`
          : "typeaudio-scene.json",
      );
      setNotice(
        audioAssets.length
          ? "Project file saved with source audio and code drafts. Re-select local video when reopening."
          : "Project file saved, including applied sounds and code drafts.",
      );
    } catch (error) {
      setNotice(`Export failed: ${String(error)}`);
    }
  }
  const openSavedProject = (id: string) =>
    loadProject(async () => projectHistory.read(id), { kind: "copy", id });
  /** Open validated project data, such as a file chosen on the start screen. */
  const openProjectData = (data: unknown) => loadProject(async () => data);
  /**
   * Keep the working document in Saved copies before leaving the editor.
   * Returns false, with the reason in the notice, when it could not be kept.
   */
  function leaveProject(): boolean {
    if (projectLoading) {
      setNotice("Wait for the project to finish opening, then leave.");
      return false;
    }
    try {
      checkpoint();
      return true;
    } catch (error) {
      setNotice(String(error));
      return false;
    }
  }
  function deleteSavedProject(id: string) {
    try {
      projectHistory.remove(id);
      refreshProjects();
    } catch (error) {
      setNotice(String(error));
    }
  }
  function saveProjectCopy() {
    try {
      checkpoint();
      setNotice(
        "Saved an editable project copy in this browser, including code drafts.",
      );
    } catch (error) {
      setNotice(String(error));
    }
  }
  return {
    identity,
    nameDocument,
    loadProject,
    openProjectData,
    leaveProject,
    openProject,
    openExample,
    projectLoading,
    exportProject,
    savedProjects,
    openSavedProject,
    deleteSavedProject,
    saveProjectCopy,
  };
}
