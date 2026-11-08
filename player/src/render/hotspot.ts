// Image avec zones cliquables.
//  - find : cocher les bonnes zones, puis « Valider » (noté) ;
//  - explore : chaque zone ouvre une information (découverte).
import { renderMarkdown } from "../markdown.ts";
import type { HotspotBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";
import { gradedControls } from "./graded.ts";

export function renderHotspot(b: HotspotBlock, ctx: RenderContext): HTMLElement {
  const { doc } = ctx;
  const root = el(doc, "div", { class: `lsp-question lsp-hotspot lsp-hotspot--${b.kind}`, attrs: { "data-activity": b.id } });
  if (b.prompt) {
    const p = el(doc, "div", { class: "lsp-question-prompt" });
    p.append(renderMarkdown(b.prompt, doc));
    root.append(p);
  }
  root.append(
    el(doc, "p", {
      class: "lsp-question-hint",
      text: b.kind === "find" ? "Touchez les zones concernées, puis validez." : "Touchez les zones pour en savoir plus.",
    }),
  );

  // Les zones sont placées en % par-dessus l'image : le cadre a exactement la taille de l'image.
  const figure = el(doc, "div", { class: "lsp-hotspot-figure" });
  const img = el(doc, "img", { attrs: { src: ctx.resolve(b.src), alt: b.alt, draggable: "false" } });
  figure.append(img);
  const stage = el(doc, "div", { class: "lsp-hotspot-stage" }, figure);
  root.append(stage);
  if (ctx.mode === "slides") {
    // En diapositive, l'image doit tenir dans la place restante sans être déformée.
    const fit = () => {
      const ratio = img.naturalWidth / img.naturalHeight || 16 / 9;
      const w = stage.clientWidth;
      const hgt = stage.clientHeight;
      if (!w || !hgt) return;
      const width = Math.min(w, hgt * ratio);
      figure.style.width = `${width}px`;
      figure.style.height = `${width / ratio}px`;
    };
    img.addEventListener("load", fit);
    const View = doc.defaultView;
    if (View && "ResizeObserver" in View) {
      const ro = new View.ResizeObserver(fit);
      ro.observe(stage);
      ctx.onDispose(() => ro.disconnect());
    }
  }

  const zones = b.zones.map((z) => {
    const btn = el(doc, "button", {
      class: `lsp-zone lsp-zone--${z.shape ?? "rectangle"}`,
      attrs: { type: "button", "aria-label": z.label, "data-zone": z.id },
    });
    Object.assign(btn.style, { left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` });
    figure.append(btn);
    return btn;
  });

  if (b.kind === "explore") {
    const ids = b.zones.map((z) => z.id);
    const info = el(doc, "div", { class: "lsp-hotspot-info", attrs: { "aria-live": "polite" } });
    info.append(el(doc, "p", { class: "lsp-question-hint", text: "Aucune zone ouverte pour l'instant." }));
    root.append(info);
    const seen = ctx.questionState(b.id).opened ?? [];
    zones.forEach((btn, i) => {
      const z = b.zones[i];
      btn.setAttribute("aria-expanded", "false");
      if (seen.includes(z.id)) btn.classList.add("is-seen");
      btn.addEventListener("click", () => {
        zones.forEach((o) => o.setAttribute("aria-expanded", String(o === btn)));
        btn.classList.add("is-seen");
        info.replaceChildren(el(doc, "p", { class: "lsp-hotspot-info-title", text: z.label }));
        if (z.content) info.append(renderMarkdown(z.content, doc));
        ctx.openItem(b.id, z.id, ids, b.requireAll === true);
      });
    });
    return root;
  }

  // find : chaque zone se coche / décoche.
  const picked = new Set<string>();
  const setPicked = (btn: HTMLButtonElement, on: boolean) => {
    const id = btn.dataset.zone!;
    if (on) picked.add(id);
    else picked.delete(id);
    btn.setAttribute("aria-pressed", String(on));
  };
  zones.forEach((btn) => {
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => {
      setPicked(btn, !picked.has(btn.dataset.zone!));
      controls.changed();
    });
  });

  const controls = gradedControls(b, ctx, {
    isReady: () => picked.size > 0,
    response: () => [...picked],
    restore: (r) => {
      if (!Array.isArray(r)) return;
      zones.forEach((btn) => setPicked(btn, r.includes(btn.dataset.zone!)));
    },
    showCorrection: () => {
      zones.forEach((btn, i) => {
        const z = b.zones[i];
        btn.disabled = true;
        const chosen = picked.has(z.id);
        if (z.correct) btn.classList.add(chosen ? "is-right" : "is-missed");
        else if (chosen) btn.classList.add("is-wrong");
      });
    },
  });
  root.append(controls.root);
  controls.init();
  return root;
}
