import { useEffect, useRef, useState } from "react";
import type { Editor } from "../useEditor.ts";
import { createYouTube } from "../../video-youtube.ts";
import { youtubeId } from "../../video-model.ts";
import { Panel, Icon } from "./Panel.tsx";
export function Composition({ editor: e }: { editor: Editor }) {
  const video = useRef<HTMLVideoElement>(null),
    host = useRef<HTMLDivElement>(null),
    latest = useRef(e);
  latest.current = e;
  const generation = useRef(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    e.transport.video = video.current!;
    return () => {
      generation.current++;
    };
  }, [e.transport, e.mediaUrl]);
  useEffect(() => {
    if (e.mediaKind !== "youtube") {
      generation.current++;
      setLoading(false);
    }
  }, [e.mediaKind]);
  useEffect(() => {
    if (!e.youtubeRequest) return;
    const load = async () => {
      const e = latest.current;
      let id: string;
      try {
        id = youtubeId(latest.current.youtubeRequest!.url.trim());
      } catch (error) {
        e.setNotice(String(error));
        return;
      }
      e.detach();
      const token = ++generation.current;
      const epoch = e.mediaEpoch.current;
      const current = () =>
        token === generation.current && epoch === e.mediaEpoch.current;
      setLoading(true);
      e.setMediaKind("youtube");
      host.current!.replaceChildren();
      const mount = document.createElement("div");
      host.current!.append(mount);
      e.setNotice("Loading YouTube reference…");
      try {
        const player = await createYouTube(
          mount,
          id,
          () => {
            if (!current()) return;
            const e = latest.current;
            if (e.transport.youtube?.getPlayerState() === 0) e.finishScene();
          },
          (message) => {
            if (current()) {
              e.stopScene();
              e.setNotice(message);
            }
          },
        );
        if (!current()) {
          player.destroy();
          return;
        }
        e.transport.youtube = player;
        e.transport.kind = "youtube";
        e.setMediaLabel("YouTube · approximate sync");
        const media = { kind: "youtube" as const, name: id, id };
        if (player.getDuration() > 0)
          e.fitDuration(player.getDuration(), media);
        else e.scene((current) => ({ ...current, media }));
        e.setNotice("YouTube ready. Use Play to enable sound clips.");
      } catch (error) {
        if (current()) {
          e.detach();
          e.setNotice(String(error));
        }
      } finally {
        if (current()) setLoading(false);
      }
    };
    void load();
  }, [e.youtubeRequest]);
  return (
    <Panel
      title="Composition / Picture"
      className="composition-panel"
      actions={
        <span className="mono">
          {e.mediaKind === "youtube" ? "REFERENCE" : "SOURCE"}
        </span>
      }
    >
      <div className="composition-view">
        <video
          key={e.mediaUrl}
          id="video"
          ref={video}
          src={e.mediaUrl || undefined}
          hidden={e.mediaKind !== "file"}
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => {
            if (e.mediaKind !== "file" || video.current !== event.currentTarget)
              return;
            e.transport.kind = "file";
            e.fitDuration(video.current!.duration);
            e.setNotice(
              "Video ready. Position the playhead and add a sound clip.",
            );
          }}
          onEnded={e.finishScene}
          onError={() => {
            if (e.mediaKind === "file") {
              e.detach();
              e.setNotice(
                "Video could not be decoded. Try a supported MP4 or WebM.",
              );
            }
          }}
        />
        <div
          ref={host}
          className="youtube-host"
          hidden={e.mediaKind !== "youtube"}
        />
        {e.mediaKind === "none" && (
          <div className="viewer-empty">
            <Icon name="film" />
            <strong>No footage</strong>
            <span>Import a video from the Project panel.</span>
            <button
              className="primary"
              onClick={() => e.videoInput.current?.click()}
            >
              Import video…
            </button>
            <small>Or build an effects track without video.</small>
          </div>
        )}
        {loading && <div className="loading-overlay">Loading reference…</div>}
      </div>
      <div className="composition-footer">
        <span id="media-label">{e.mediaLabel}</span>
        <label className="seek">
          <span className="sr-only">Playhead</span>
          <input
            id="seek"
            type="range"
            min="0"
            max={Math.min(
              3600,
              Math.max(e.state.scene.end, e.transport.duration() || 0),
            )}
            step=".01"
            value={Math.min(e.position, 3600)}
            onChange={(event) => e.seek(Number(event.target.value))}
          />
        </label>
        <output id="clock" data-scheduled={e.transport.audio.scheduled}>
          {e.position.toFixed(3)} s
        </output>
      </div>
    </Panel>
  );
}
