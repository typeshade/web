interface Player {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getPlaybackRate(): number;
  setVolume(volume: number): void;
  destroy(): void;
}
interface YouTube {
  Player: new (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => Player;
}
const win = window as unknown as {
  YT?: YouTube;
  onYouTubeIframeAPIReady?: () => void;
};
let loading: Promise<YouTube> | undefined;
export function loadYouTube(): Promise<YouTube> {
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      loading = undefined;
      reject(
        new Error(
          "YouTube could not load. Check your connection or choose a local video file.",
        ),
      );
    };
    const timer = setTimeout(fail, 15000);
    script.onerror = fail;
    win.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      if (win.YT) resolve(win.YT);
      else fail();
    };
    document.head.append(script);
  });
  return loading;
}
export type YouTubePlayer = Player;
export async function createYouTube(
  element: HTMLElement,
  id: string,
  onState: () => void,
  onError: (message: string) => void,
): Promise<Player> {
  const yt = await loadYouTube();
  return new Promise((resolve, reject) => {
    let ready = false;
    const timer = setTimeout(() => {
      player.destroy();
      reject(
        new Error(
          "YouTube did not become ready. Try a video that allows embedding or upload a file.",
        ),
      );
    }, 15000);
    const player = new yt.Player(element, {
      videoId: id,
      width: "100%",
      height: "100%",
      playerVars: { playsinline: 1, origin: location.origin },
      events: {
        onReady: () => {
          ready = true;
          clearTimeout(timer);
          resolve(player);
        },
        onStateChange: onState,
        onError: (event: { data: number }) => {
          const message = `YouTube cannot play this video (code ${event.data}). It may be unavailable or disallow embedding. Try another video or upload a file.`;
          if (!ready) {
            clearTimeout(timer);
            player.destroy();
            reject(new Error(message));
          } else onError(message);
        },
      },
    });
  });
}
