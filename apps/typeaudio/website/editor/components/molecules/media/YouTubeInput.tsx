import { useState } from "react";
import type { Editor } from "../../../useEditor.ts";
export // The composition owns the player; the shared editor carries the explicit load request.
function YouTubeInput({ editor: e }: { editor: Editor }) {
  const [url, setUrl] = useState(
    e.state.scene.media.id ? `https://youtu.be/${e.state.scene.media.id}` : "",
  );
  return (
    <div className="youtube-import">
      <label>
        YouTube reference
        <input
          id="youtube-url"
          type="url"
          value={url}
          placeholder="Paste video URL"
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <button
        id="load-youtube"
        onClick={() => {
          e.workspace("picture");
          e.loadYouTube(url);
        }}
      >
        Load reference
      </button>
      <p className="panel-hint">
        Loads YouTube on request. Cue sync is approximate.
      </p>
    </div>
  );
}
