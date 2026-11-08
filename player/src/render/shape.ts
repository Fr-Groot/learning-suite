import type { ShapeBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

export function renderShape(b: ShapeBlock, ctx: RenderContext): HTMLElement {
  const box = el(ctx.doc, "div", { class: `lsp-shape lsp-shape--${b.shape}`, attrs: { "aria-hidden": "true" } });
  const width = b.strokeWidth ?? 0;
  if (b.shape === "line") {
    // Une ligne horizontale centrée dans son cadre ; la rotation du cadre l'oriente.
    const line = el(ctx.doc, "div", { class: "lsp-shape-line" });
    line.style.height = `${Math.max(width, 1)}px`;
    line.style.background = b.stroke ?? b.fill ?? "currentColor";
    box.append(line);
  } else {
    if (b.fill) box.style.background = b.fill;
    if (b.stroke && width > 0) box.style.border = `${width}px solid ${b.stroke}`;
  }
  return box;
}
