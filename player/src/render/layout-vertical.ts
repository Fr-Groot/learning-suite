// Mode vertical : les briques s'empilent dans une colonne de lecture, on défile.
import type { Page } from "../types.ts";
import { renderBlock } from "./blocks.ts";
import { el, type RenderContext } from "./context.ts";
import { paintBackground } from "./layout-slides.ts";

export function renderVerticalPage(page: Page, ctx: RenderContext): { root: HTMLElement; dispose(): void } {
  const root = el(ctx.doc, "div", { class: "lsp-vertical" });
  paintBackground(root, page, ctx);
  for (const b of page.blocks) {
    const node = renderBlock(b, ctx);
    node.classList.add(b.width === "full" ? "is-full" : "is-content");
    root.append(node);
  }
  return { root, dispose() {} };
}
