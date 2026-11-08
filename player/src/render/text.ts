import { renderMarkdown } from "../markdown.ts";
import type { TextBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

export function renderText(b: TextBlock, ctx: RenderContext): HTMLElement {
  const variant = b.variant ?? "body";
  // Les titres sont de vrais titres HTML : utile aux lecteurs d'écran.
  const tag = variant === "title" ? "h2" : variant === "subtitle" ? "h3" : "div";
  const box = el(ctx.doc, tag, { class: `lsp-text lsp-text--${variant}` });
  box.append(renderMarkdown(b.content, ctx.doc));
  return box;
}
