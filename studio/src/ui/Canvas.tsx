// Toile du mode diapositives : la page à l'échelle de l'écran, briques sélectionnables,
// déplacement et redimensionnement à la souris, repères d'alignement.
import { useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import type { Frame } from "@player/types.ts";
import { setFrames, STAGE } from "../model/actions.ts";
import { resizeFrame, snapMove, type Guides, type Handle } from "../model/snap.ts";
import { store, useEditor } from "../model/store.ts";
import { BlockPreview, pageBackground, useTheme } from "./StageView.tsx";

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

type Gesture =
  | { kind: "move"; x: number; y: number; frames: Record<string, Frame>; primary: string; moved: boolean }
  | { kind: "resize"; x: number; y: number; frame: Frame; id: string; handle: Handle };

export function Canvas() {
  const { project, pageId, selection } = useEditor();
  const wrap = useRef<HTMLDivElement>(null);
  const theme = useTheme(project!);
  const [scale, setScale] = useState(0.5);
  const [guides, setGuides] = useState<Guides>({ x: [], y: [] });
  const gesture = useRef<Gesture | null>(null);

  // Échelle : la toile 1280 × 720 tient dans la place disponible.
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = () => setScale(Math.min((el.clientWidth - 48) / STAGE.w, (el.clientHeight - 48) / STAGE.h));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const page = project?.pages.find((p) => p.id === pageId);
  if (!project || !page) return <div className="st-canvas-wrap" ref={wrap} />;

  const others = (exclude: string[]) => page.blocks.filter((b) => b.frame && !exclude.includes(b.id)).map((b) => b.frame!);

  const startMove = (e: RPointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    let sel = selection;
    if (e.shiftKey) sel = selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id];
    else if (!selection.includes(id)) sel = [id];
    store.select(sel);
    if (!sel.includes(id)) return;
    const frames = Object.fromEntries(page.blocks.filter((b) => sel.includes(b.id) && b.frame).map((b) => [b.id, b.frame!]));
    gesture.current = { kind: "move", x: e.clientX, y: e.clientY, frames, primary: id, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const startResize = (e: RPointerEvent, id: string, handle: Handle) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const b = page.blocks.find((x) => x.id === id);
    if (!b?.frame) return;
    gesture.current = { kind: "resize", x: e.clientX, y: e.clientY, frame: b.frame, id, handle };
    store.beginGesture();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: RPointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dx = (e.clientX - g.x) / scale;
    const dy = (e.clientY - g.y) / scale;
    if (g.kind === "move") {
      if (!g.moved) {
        if (Math.hypot(dx, dy) < 3) return; // un simple clic ne déplace rien
        g.moved = true;
        store.beginGesture();
      }
      const start = g.frames[g.primary];
      // Touche Alt : déplacement sans aimantation.
      const snapped = e.altKey ? { frame: { ...start, x: Math.round(start.x + dx), y: Math.round(start.y + dy) }, guides: { x: [], y: [] } } : snapMove({ ...start, x: start.x + dx, y: start.y + dy }, others(Object.keys(g.frames)));
      const sx = snapped.frame.x - start.x;
      const sy = snapped.frame.y - start.y;
      const frames = Object.fromEntries(Object.entries(g.frames).map(([id, f]) => [id, { ...f, x: f.x + sx, y: f.y + sy }]));
      store.edit((p) => setFrames(p, page.id, frames));
      setGuides(snapped.guides);
    } else {
      const r = resizeFrame(g.frame, g.handle, dx, dy, e.altKey ? [] : others([g.id]));
      store.edit((p) => setFrames(p, page.id, { [g.id]: r.frame }));
      setGuides(r.guides);
    }
  };

  const onUp = () => {
    if (gesture.current && (gesture.current.kind === "resize" || gesture.current.moved)) store.endGesture();
    gesture.current = null;
    setGuides({ x: [], y: [] });
  };

  const single = selection.length === 1 ? page.blocks.find((b) => b.id === selection[0]) : undefined;

  return (
    <div className="st-canvas-wrap" ref={wrap} onPointerDown={() => store.select([])}>
      <div className="st-stage-holder" style={{ width: STAGE.w * scale, height: STAGE.h * scale }}>
        <div
          ref={theme}
          className="lsp-canvas lsp--slides st-stage"
          style={{ transform: `scale(${scale})`, ...pageBackground(page) }}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {page.blocks.map((b) =>
            b.frame ? (
              <div
                key={b.id}
                className={`st-abs st-item ${selection.includes(b.id) ? "is-selected" : ""}`}
                data-block={b.id}
                style={{ left: b.frame.x, top: b.frame.y, width: b.frame.w, height: b.frame.h, transform: b.frame.rotation ? `rotate(${b.frame.rotation}deg)` : undefined }}
                onPointerDown={(e) => startMove(e, b.id)}
                onDoubleClick={() => document.getElementById("st-main-field")?.focus()}
              >
                <BlockPreview block={b} project={project} />
              </div>
            ) : null,
          )}

          {/* Cadre et poignées de la brique sélectionnée (taille constante à l'écran) */}
          {single?.frame && (
            <div className="st-abs st-handles" style={{ left: single.frame.x, top: single.frame.y, width: single.frame.w, height: single.frame.h, ["--inv" as string]: 1 / scale }}>
              {HANDLES.map((h) => (
                <span key={h} className={`st-handle st-handle--${h}`} onPointerDown={(e) => startResize(e, single.id, h)} aria-hidden />
              ))}
              <span className="st-size-label">{single.frame.w} × {single.frame.h}</span>
            </div>
          )}

          {guides.x.map((x, i) => <span key={`x${i}`} className="st-guide st-guide--v" style={{ left: x, ["--inv" as string]: 1 / scale }} />)}
          {guides.y.map((y, i) => <span key={`y${i}`} className="st-guide st-guide--h" style={{ top: y, ["--inv" as string]: 1 / scale }} />)}
        </div>
      </div>
      <p className="st-hint st-muted">
        Cliquez une brique pour la régler à droite · Maj+clic : plusieurs · Flèches : déplacer · Ctrl+D : dupliquer · Suppr : effacer · Alt : sans aimantation
      </p>
    </div>
  );
}
