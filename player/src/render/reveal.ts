// Contenus à découvrir : onglets, accordéon, frise chronologique.
import { renderMarkdown } from "../markdown.ts";
import type { RevealBlock, RevealItem } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

let uid = 0;

export function renderReveal(b: RevealBlock, ctx: RenderContext): HTMLElement {
  return b.layout === "accordion" ? accordion(b, ctx) : tabs(b, ctx);
}

function panelContent(item: RevealItem, ctx: RenderContext): Node[] {
  const out: Node[] = [];
  if (item.image) out.push(el(ctx.doc, "img", { class: "lsp-reveal-image", attrs: { src: ctx.resolve(item.image), alt: item.alt ?? "" } }));
  if (item.content) {
    const t = el(ctx.doc, "div", { class: "lsp-reveal-text" });
    t.append(renderMarkdown(item.content, ctx.doc));
    out.push(t);
  }
  return out;
}

/** Onglets et frise : une rangée de boutons (rôle « onglet ») et un panneau. Flèches du clavier. */
function tabs(b: RevealBlock, ctx: RenderContext): HTMLElement {
  const { doc } = ctx;
  const ids = b.items.map((i) => i.id);
  const prefix = `lsp-reveal-${++uid}`;
  const root = el(doc, "div", { class: `lsp-reveal lsp-reveal--${b.layout}` });
  const list = el(doc, "div", { class: "lsp-reveal-tabs", attrs: { role: "tablist" } });
  const panel = el(doc, "div", { class: "lsp-reveal-panel", attrs: { role: "tabpanel", id: `${prefix}-panel`, tabindex: "0" } });
  const buttons = b.items.map((item, i) =>
    el(doc, "button", {
      class: "lsp-reveal-tab",
      attrs: { type: "button", role: "tab", id: `${prefix}-tab-${i}`, "aria-controls": `${prefix}-panel`, "data-item": item.id },
    }, el(doc, "span", { class: "lsp-reveal-tab-label", text: item.title })),
  );

  const select = (i: number, focus = false) => {
    buttons.forEach((btn, j) => {
      btn.setAttribute("aria-selected", String(i === j));
      btn.tabIndex = i === j ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", buttons[i].id);
    panel.replaceChildren(...panelContent(b.items[i], ctx));
    buttons[i].classList.add("is-seen");
    if (focus) buttons[i].focus();
    ctx.openItem(b.id, b.items[i].id, ids, b.requireAll === true);
  };

  buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => select(i));
    btn.addEventListener("keydown", (e) => {
      const n = buttons.length;
      const next = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select((next + n) % n, true);
    });
  });
  // On marque comme déjà vus les éléments ouverts lors d'une session précédente.
  const seen = ctx.questionState(b.id).opened ?? [];
  buttons.forEach((btn) => seen.includes(btn.dataset.item!) && btn.classList.add("is-seen"));

  list.append(...buttons);
  root.append(list, panel);
  select(0);
  return root;
}

/** Accordéon : des sections repliables (éléments <details> natifs, accessibles d'office). */
function accordion(b: RevealBlock, ctx: RenderContext): HTMLElement {
  const { doc } = ctx;
  const ids = b.items.map((i) => i.id);
  const root = el(doc, "div", { class: "lsp-reveal lsp-reveal--accordion" });
  for (const item of b.items) {
    const details = el(doc, "details", { class: "lsp-reveal-section", attrs: { "data-item": item.id } });
    details.append(el(doc, "summary", { text: item.title }), el(doc, "div", { class: "lsp-reveal-panel" }, ...panelContent(item, ctx)));
    details.addEventListener("toggle", () => {
      if (details.open) ctx.openItem(b.id, item.id, ids, b.requireAll === true);
    });
    root.append(details);
  }
  return root;
}
