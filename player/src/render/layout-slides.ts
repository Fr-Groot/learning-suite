// Mode diapositives : une toile fixe de 1280 × 720, mise à l'échelle de l'écran.
// Chaque brique est placée à ses coordonnées (frame) sur cette toile.
import type { Page } from "../types.ts";
import { renderBlock } from "./blocks.ts";
import { el, type RenderContext } from "./context.ts";

export const STAGE_W = 1280;
export const STAGE_H = 720;

export function renderSlidesPage(page: Page, ctx: RenderContext): { root: HTMLElement; dispose(): void } {
  const { doc } = ctx;
  const wrap = el(doc, "div", { class: "lsp-stage-wrap" });
  const stage = el(doc, "div", { class: "lsp-stage" });
  stage.style.width = `${STAGE_W}px`;
  stage.style.height = `${STAGE_H}px`;
  paintBackground(stage, page, ctx);

  for (const b of page.blocks) {
    const node = renderBlock(b, ctx);
    const f = b.frame!;
    Object.assign(node.style, {
      position: "absolute",
      left: `${f.x}px`,
      top: `${f.y}px`,
      width: `${f.w}px`,
      height: `${f.h}px`,
      transform: f.rotation ? `rotate(${f.rotation}deg)` : "",
    });
    stage.append(node);
  }
  wrap.append(stage);

  // Calcule l'échelle pour que la toile tienne entière dans la zone disponible.
  const fit = () => {
    const scale = Math.min(wrap.clientWidth / STAGE_W, wrap.clientHeight / STAGE_H) || 1;
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  };
  const view = doc.defaultView;
  const ro = view && "ResizeObserver" in view ? new view.ResizeObserver(fit) : null;
  ro?.observe(wrap);
  requestAnimationFrame(fit);
  return { root: wrap, dispose: () => ro?.disconnect() };
}

export function paintBackground(target: HTMLElement, page: Page, ctx: RenderContext) {
  const bg = page.background;
  target.style.backgroundColor = bg?.color ?? "var(--lsp-background)";
  if (bg?.image) {
    target.style.backgroundImage = `url("${ctx.resolve(bg.image).replace(/"/g, "%22")}")`;
    target.style.backgroundSize = "cover";
    target.style.backgroundPosition = "center";
  }
}
