import { useWorkspaceLayout } from "../layout/useWorkspaceLayout.ts";
import { openContext } from "../../interactions/openContext.ts";
import { useInteractions } from "./useInteractions.ts";
import { type MenuItem } from "../../interactions/types.ts";
import type { Editor } from "../../useEditor.ts";
export function useViewerContextMenu(e: Editor) {
  const layout = useWorkspaceLayout(),
    { openMenu } = useInteractions(),
    picture = e.state.workspace === "picture";
  return (event: React.MouseEvent<HTMLDivElement>) => {
    if (
      event.target instanceof Element &&
      event.target.closest("button,input,select,textarea,video,iframe,a")
    )
      return;
    const items: MenuItem[] = picture
      ? [
          {
            label: "Import video…",
            action: () => e.videoInput.current?.click(),
          },
        ]
      : [
          {
            label: "Waveform",
            checked: !e.spectrum,
            action: () => e.setSpectrum(false),
          },
          {
            label: "Spectrum",
            checked: e.spectrum,
            action: () => e.setSpectrum(true),
          },
          {
            label: "Monitor before FX",
            checked: e.dry,
            action: () => e.setDry(!e.dry),
          },
          { separator: true },
          {
            label: "Render current sound",
            disabled: e.busy,
            action: () => {
              e.setMode("render");
              void e.render();
            },
          },
          {
            label: "Export WAV…",
            disabled: !e.rendered,
            action: e.exportSound,
          },
        ];
    openContext(
      event,
      openMenu,
      "viewer",
      picture ? "Composition actions" : "Monitor actions",
      [
        ...items,
        { separator: true },
        {
          label: "Focus viewer",
          shortcut: "F",
          checked: layout.focused,
          disabled: innerWidth <= 950,
          action: () => layout.focus(!layout.focused),
        },
      ],
    );
  };
}
