// Glisser-déposer : ranger dans des catégories, relier des paires, remettre dans l'ordre.
// Trois façons de jouer, toujours disponibles :
//  - toucher un élément, puis toucher sa place (doigt, souris) ;
//  - au clavier : Tab jusqu'à l'élément, Entrée, Tab jusqu'à la place, Entrée ;
//  - glisser vraiment l'élément (souris ou doigt).
import { shuffled } from "../activities.ts";
import { dragModel } from "../grading/dragdrop.ts";
import { renderMarkdown } from "../markdown.ts";
import type { DragDropBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";
import { gradedControls } from "./graded.ts";

const POOL = "";

export function renderDragDrop(b: DragDropBlock, ctx: RenderContext): HTMLElement {
  const { doc } = ctx;
  const model = dragModel(b);
  const placement = new Map<string, string>(model.items.map((it) => [it.id, POOL]));
  let selected: string | null = null;
  let locked = false;

  const root = el(doc, "div", { class: `lsp-question lsp-dragdrop lsp-dragdrop--${b.kind}`, attrs: { "data-activity": b.id } });
  if (b.prompt) {
    const p = el(doc, "div", { class: "lsp-question-prompt" });
    p.append(renderMarkdown(b.prompt, doc));
    root.append(p);
  }
  const hint = ctx.t(({ categorize: "ddCategorize", match: "ddMatch", order: "ddOrder" } as const)[b.kind]);
  root.append(el(doc, "p", { class: "lsp-question-hint", text: `${hint} ${ctx.t("ddHow")}` }));
  const live = el(doc, "p", { class: "lsp-sr-only", attrs: { "aria-live": "polite" } });

  // Éléments à placer
  const chips = new Map<string, HTMLButtonElement>();
  for (const it of shuffled(model.items, ctx.seed + b.id.length)) {
    const chip = el(doc, "button", { class: "lsp-dd-item", attrs: { type: "button", "data-item": it.id, "aria-pressed": "false" } });
    if (it.image) chip.append(el(doc, "img", { attrs: { src: ctx.resolve(it.image), alt: it.alt ?? "", draggable: "false" } }));
    chip.append(el(doc, "span", { text: it.text }));
    chips.set(it.id, chip);
  }

  // Zone de départ + cibles
  const pool = el(doc, "div", { class: "lsp-dd-pool", attrs: { "data-target": POOL, role: "group", "aria-label": ctx.t("ddPool") } });
  const poolBtn = el(doc, "button", { class: "lsp-dd-drop lsp-dd-drop--pool", text: ctx.t("ddBack"), attrs: { type: "button" } });
  pool.append(poolBtn);
  const slots = new Map<string, HTMLElement>([[POOL, pool]]);
  const targets = el(doc, "div", { class: "lsp-dd-targets" });
  for (const t of model.targets) {
    const box = el(doc, "div", { class: "lsp-dd-target", attrs: { "data-target": t.id } });
    const drop = el(doc, "button", { class: "lsp-dd-drop", attrs: { type: "button", "aria-label": ctx.t("ddPlaceHere", { label: t.label }) } }, el(doc, "span", { text: t.label }));
    const slot = el(doc, "div", { class: "lsp-dd-slot" });
    box.append(drop, slot);
    slots.set(t.id, slot);
    targets.append(box);
    drop.addEventListener("click", () => selected && place(selected, t.id));
    box.addEventListener("click", (e) => {
      if (selected && e.target === box) place(selected, t.id);
    });
  }
  poolBtn.addEventListener("click", () => selected && place(selected, POOL));
  const board = el(doc, "div", { class: "lsp-dd-board" }, pool, targets);
  root.append(board, live);

  const labelOf = (targetId: string) => model.targets.find((t) => t.id === targetId)?.label ?? ctx.t("ddReserve");
  const textOf = (itemId: string) => model.items.find((i) => i.id === itemId)?.text ?? itemId;

  function place(itemId: string, targetId: string) {
    if (locked) return;
    const from = placement.get(itemId) ?? POOL;
    const cap = model.targets.find((t) => t.id === targetId)?.capacity ?? Infinity;
    if (targetId !== POOL && cap === 1) {
      // Place déjà prise : l'ancien occupant prend la place d'où vient le nouveau.
      for (const [other, where] of placement) if (where === targetId && other !== itemId) placement.set(other, from);
    }
    placement.set(itemId, targetId);
    live.textContent = ctx.t("ddPlaced", { item: textOf(itemId), target: labelOf(targetId) });
    select(null);
    draw();
    controls.changed();
  }

  function select(itemId: string | null) {
    selected = itemId;
    for (const [id, chip] of chips) chip.setAttribute("aria-pressed", String(id === itemId));
    root.classList.toggle("has-selection", itemId !== null);
  }

  function draw() {
    for (const [id, chip] of chips) {
      const slot = slots.get(placement.get(id) ?? POOL)!;
      if (chip.parentElement !== slot) slot.append(chip);
    }
    // Ordre stable dans la réserve, et bouton « Remettre ici » toujours en dernier.
    for (const chip of chips.values()) if (chip.parentElement === pool) pool.append(chip);
    pool.append(poolBtn);
    pool.classList.toggle("is-empty", [...placement.values()].every((t) => t !== POOL));
  }

  for (const [id, chip] of chips) {
    chip.addEventListener("click", (e) => {
      if (locked) return;
      if (chip.dataset.dragged) {
        delete chip.dataset.dragged;
        return;
      }
      e.stopPropagation();
      select(selected === id ? null : id);
    });
    enableDrag(chip, id);
  }
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") select(null);
  });

  /** Glisser à la souris ou au doigt. Un simple toucher reste un « clic ». */
  function enableDrag(chip: HTMLElement, itemId: string) {
    let start: { x: number; y: number; scale: number } | null = null;
    let over: HTMLElement | null = null;
    chip.addEventListener("pointerdown", (e) => {
      if (locked || e.button !== 0) return;
      const r = chip.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY, scale: r.width / (chip.offsetWidth || r.width) || 1 };
    });
    chip.addEventListener("pointermove", (e) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!chip.classList.contains("is-dragging")) {
        if (Math.hypot(dx, dy) < 6) return;
        chip.setPointerCapture(e.pointerId);
        chip.classList.add("is-dragging");
        select(itemId);
      }
      // L'écran peut être agrandi ou réduit (mode diapositives) : on corrige le déplacement.
      chip.style.transform = `translate(${dx / start.scale}px, ${dy / start.scale}px)`;
      const hit = doc.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-target]") ?? null;
      if (hit !== over) {
        over?.classList.remove("is-over");
        hit?.classList.add("is-over");
        over = hit;
      }
    });
    const end = () => {
      if (!start) return;
      const wasDragging = chip.classList.contains("is-dragging");
      start = null;
      chip.classList.remove("is-dragging");
      chip.style.transform = "";
      over?.classList.remove("is-over");
      if (wasDragging) {
        chip.dataset.dragged = "1";
        if (over) place(itemId, over.dataset.target ?? POOL);
        else select(null);
      }
      over = null;
    };
    chip.addEventListener("pointerup", end);
    chip.addEventListener("pointercancel", end);
  }

  const controls = gradedControls(b, ctx, {
    isReady: () => [...placement.values()].every((t) => t !== POOL),
    response: () => Object.fromEntries(placement),
    restore: (r) => {
      if (typeof r !== "object" || Array.isArray(r)) return;
      for (const id of placement.keys()) placement.set(id, r[id] ?? POOL);
      draw();
    },
    showCorrection: () => {
      locked = true;
      select(null);
      root.classList.add("is-done");
      for (const [id, chip] of chips) {
        chip.disabled = true;
        const ok = placement.get(id) === model.expected[id];
        chip.classList.add(ok ? "is-right" : "is-wrong");
        if (!ok && !chip.querySelector(".lsp-dd-expected")) {
          chip.append(el(doc, "span", { class: "lsp-dd-expected", text: `→ ${labelOf(model.expected[id])}` }));
        }
      }
      board.querySelectorAll<HTMLButtonElement>(".lsp-dd-drop").forEach((d) => (d.disabled = true));
    },
  });
  draw();
  root.append(controls.root);
  controls.init();
  return root;
}
