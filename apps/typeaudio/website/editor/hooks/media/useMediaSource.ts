import { useEffect, useRef, useState } from "react";
import type { DocumentController } from "../document/useEditorDocument.ts";
import type { EditorResources } from "../session/useAudioResources.ts";
export function useMediaSource(
  { dispatch }: DocumentController,
  { transport }: EditorResources,
  stopScene: () => void,
) {
  const videoInput = useRef<HTMLInputElement>(null),
    mediaEpoch = useRef(0);
  const [youtubeRequest, setYouTubeRequest] = useState<{
    url: string;
    id: number;
  }>();
  const [mediaUrl, setMediaUrl] = useState(""),
    [mediaLabel, setMediaLabel] = useState("Audio composition"),
    [mediaKind, setMediaKind] = useState<"none" | "file" | "youtube">("none");

  function detach() {
    mediaEpoch.current++;
    stopScene();
    transport.current.detach();
    setMediaUrl("");
    setMediaKind("none");
    setMediaLabel("Audio composition");
  }
  function loadFile(file: File) {
    detach();
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaKind("file");
    transport.current.kind = "file";
    setMediaLabel(file.name);
    dispatch({
      type: "media",
      media: { kind: "file", name: file.name.slice(0, 100) },
    });
  }
  useEffect(
    () => () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    },
    [mediaUrl],
  );
  return {
    videoInput,
    mediaEpoch,
    youtubeRequest,
    mediaUrl,
    mediaLabel,
    mediaKind,
    setMediaKind,
    setMediaLabel,
    detach,
    loadFile,
    loadYouTube: (url: string) => setYouTubeRequest({ url, id: Date.now() }),
  };
}
export type MediaSource = ReturnType<typeof useMediaSource>;
