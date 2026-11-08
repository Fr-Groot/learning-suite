import type { ImageBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

export function renderImage(b: ImageBlock, ctx: RenderContext): HTMLElement {
  const img = el(ctx.doc, "img", {
    class: "lsp-image",
    attrs: { src: ctx.resolve(b.src), alt: b.alt, draggable: "false" },
  });
  img.style.objectFit = b.fit ?? "contain";
  return img;
}
