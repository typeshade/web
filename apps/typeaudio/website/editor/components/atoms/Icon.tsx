export function Icon({
  name,
}: {
  name:
    | "play"
    | "stop"
    | "select"
    | "hand"
    | "sound"
    | "film"
    | "plus"
    | "undo"
    | "redo"
    | "volume"
    | "folder"
    | "download"
    | "pause";
}) {
  const paths = {
    play: "m9 5 11 7-11 7Z",
    pause: "M8 5v14M16 5v14",
    stop: "M6 6h12v12H6Z",
    select: "m5 3 14 10-7 1-4 7Z",
    hand: "M8 12V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9c0 4-3 6-6 6h-1c-3 0-5-3-7-6l-2-3a2 2 0 0 1 3-2l3 3",
    sound: "M3 9h4l5-5v16l-5-5H3ZM16 8q5 4 0 8",
    film: "M3 4h18v16H3ZM3 9h18M7 4v5m5-5v5m5-5v5",
    plus: "M12 5v14M5 12h14",
    undo: "m9 5-5 5 5 5M4 10h9a6 6 0 0 1 0 12",
    redo: "m15 5 5 5-5 5m5-5h-9a6 6 0 0 0 0 12",
    volume: "M3 10h4l5-5v14l-5-5H3ZM16 7q6 5 0 10",
    folder: "M3 6h7l2 3h9v11H3Z",
    download: "M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
