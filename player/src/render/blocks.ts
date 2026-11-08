// Aiguillage : une fonction d'affichage par type de brique.
import type { Block } from "../types.ts";
import { renderButton } from "./button.ts";
import type { RenderContext } from "./context.ts";
import { renderImage } from "./image.ts";
import { renderAudio, renderVideo } from "./media.ts";
import { renderQuestion } from "./question.ts";
import { renderResults } from "./results.ts";
import { renderShape } from "./shape.ts";
import { applyStyle } from "./style.ts";
import { renderText } from "./text.ts";

export function renderBlock(b: Block, ctx: RenderContext): HTMLElement {
  let content: HTMLElement;
  switch (b.type) {
    case "text": content = renderText(b, ctx); break;
    case "image": content = renderImage(b, ctx); break;
    case "shape": content = renderShape(b, ctx); break;
    case "button": content = renderButton(b, ctx); break;
    case "video": content = renderVideo(b, ctx); break;
    case "audio": content = renderAudio(b, ctx); break;
    case "question": content = renderQuestion(b, ctx); break;
    case "results": content = renderResults(b, ctx); break;
  }
  const wrap = ctx.doc.createElement("div");
  wrap.className = `lsp-block lsp-block--${b.type}`;
  wrap.dataset.block = b.id;
  wrap.append(content);
  applyStyle(wrap, b.style);
  return wrap;
}
