// Cartes à retourner : un clic (ou Entrée / Espace) montre le verso.
import { renderMarkdown } from "../markdown.ts";
import type { FlipCard, FlipCardsBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

export function renderFlipCards(b: FlipCardsBlock, ctx: RenderContext): HTMLElement {
  const { doc } = ctx;
  const ids = b.cards.map((c) => c.id);
  const grid = el(doc, "div", { class: "lsp-flipcards", attrs: { role: "list" } });
  grid.style.setProperty("--lsp-cols", String(b.columns ?? Math.min(b.cards.length, 4)));

  for (const card of b.cards) {
    const front = face(card, "front", ctx);
    const back = face(card, "back", ctx);
    back.setAttribute("aria-hidden", "true");
    const inner = el(doc, "div", { class: "lsp-flipcard-inner" }, front, back);
    const item = el(doc, "div", {
      class: "lsp-flipcard",
      attrs: { role: "button", tabindex: "0", "aria-pressed": "false", "data-card": card.id },
    }, inner);
    item.setAttribute("aria-label", `Carte : ${front.textContent?.trim() || card.alt || card.id}. Retourner`);

    const flip = () => {
      const flipped = item.classList.toggle("is-flipped");
      item.setAttribute("aria-pressed", String(flipped));
      front.setAttribute("aria-hidden", String(flipped));
      back.setAttribute("aria-hidden", String(!flipped));
      if (flipped) ctx.openItem(b.id, card.id, ids, b.requireAll === true);
    };
    item.addEventListener("click", flip);
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip();
      }
    });
    grid.append(el(doc, "div", { attrs: { role: "listitem" } }, item));
  }
  return grid;
}

function face(card: FlipCard, side: "front" | "back", ctx: RenderContext): HTMLElement {
  const box = el(ctx.doc, "div", { class: `lsp-flipcard-face lsp-flipcard-${side}` });
  const image = side === "front" ? card.frontImage : card.backImage;
  const text = side === "front" ? card.front : card.back;
  if (image) box.append(el(ctx.doc, "img", { attrs: { src: ctx.resolve(image), alt: card.alt ?? "", draggable: "false" } }));
  if (text) {
    const t = el(ctx.doc, "div", { class: "lsp-flipcard-text" });
    t.append(renderMarkdown(text, ctx.doc));
    box.append(t);
  }
  return box;
}
