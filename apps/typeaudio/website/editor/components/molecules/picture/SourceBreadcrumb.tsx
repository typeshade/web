import type { Editor } from "../../../useEditor.ts";

export function SourceBreadcrumb({ editor: e }: { editor: Editor }) {
  return (
    <div className="source-breadcrumb">
      <button onClick={e.showComposition}>← Composition</button>
      <button className="mobile-layer-back" onClick={e.showLayerProperties}>
        Layer controls
      </button>
      <span>{e.selected?.name} / Source</span>
      <button
        disabled={!e.ready || !e.selected}
        onClick={() => e.selected && void e.auditionCue(e.selected.id)}
      >
        Audition dry
      </button>
    </div>
  );
}
