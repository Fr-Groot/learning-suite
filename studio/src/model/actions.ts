// Opérations sur un module. Chaque fonction reçoit un projet et en renvoie un NOUVEAU
// (l'ancien n'est jamais modifié) : c'est ce qui permet d'annuler et de rétablir.
import type { Block, Frame, Mode, Page, Project } from "@player/types.ts";
import { THEMES } from "./themes.ts";
import { blankPage, templatesFor } from "./templates.ts";

export const STAGE = { w: 1280, h: 720 };

const clone = <T>(x: T): T => structuredClone(x);

/** Applique une modification sur une copie du projet. */
export function produce(project: Project, change: (draft: Project) => void): Project {
  const draft = clone(project);
  change(draft);
  return draft;
}

// ---------- Identifiants ----------

function allIds(project: Project): Set<string> {
  const ids = new Set<string>();
  for (const p of project.pages) {
    ids.add(p.id);
    for (const b of p.blocks) ids.add(b.id);
  }
  return ids;
}

/** « texte » → « texte », puis « texte-2 », « texte-3 »… selon ce qui existe déjà. */
export function uniqueId(taken: Set<string>, base: string): string {
  const clean = (base.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "id").slice(0, 50);
  let id = clean;
  for (let n = 2; taken.has(id); n++) id = `${clean}-${n}`;
  taken.add(id);
  return id;
}

/** Donne des identifiants neufs à une page copiée (page et briques), en gardant les liens internes. */
function freshIds(page: Page, taken: Set<string>): Page {
  const p = clone(page);
  p.id = uniqueId(taken, p.title || "page");
  for (const b of p.blocks) b.id = uniqueId(taken, `${p.id}-${b.id}`);
  return p;
}

// ---------- Projet ----------

export function newProject(opts: { title: string; mode: Mode; themeId?: string; author?: string }): Project {
  const theme = THEMES.find((t) => t.id === opts.themeId) ?? THEMES[0];
  const project: Project = {
    schemaVersion: "1.2",
    meta: { id: crypto.randomUUID(), title: opts.title.trim() || "Nouveau module", language: "fr", version: "1.0.0", ...(opts.author ? { author: opts.author } : {}) },
    mode: opts.mode,
    theme: clone(theme.theme),
    navigation: { linear: true, allowBack: true, showMenu: true, showProgress: true },
    scoring: { passingScore: 70 },
    pages: [],
  };
  // Première page : le titre du module.
  const first: Page = {
    id: "accueil",
    title: "Accueil",
    blocks: [
      { id: "accueil-titre", type: "text", variant: "title", content: project.meta.title, ...(opts.mode === "slides" ? { frame: { x: 80, y: 220, w: 1120, h: 100 } } : {}) },
      { id: "accueil-texte", type: "text", content: "Sous-titre ou objectif du module.", ...(opts.mode === "slides" ? { frame: { x: 80, y: 340, w: 1120, h: 80 } } : {}) },
      { id: "accueil-commencer", type: "button", label: "Commencer", action: { type: "next" }, ...(opts.mode === "slides" ? { frame: { x: 80, y: 470, w: 240, h: 64 } } : {}) },
    ],
  };
  project.pages.push(first);
  return project;
}

// ---------- Pages ----------

/** Ajoute une page (modèle ou page blanche) après la page indiquée. Renvoie aussi l'id créé. */
export function addPage(project: Project, templateId: string | null, afterPageId: string | null): { project: Project; pageId: string } {
  const template = templateId ? templatesFor(project.mode).find((t) => t.id === templateId)?.page : undefined;
  let pageId = "";
  const next = produce(project, (d) => {
    const page = freshIds(template ?? blankPage(), allIds(d));
    pageId = page.id;
    const i = afterPageId ? d.pages.findIndex((p) => p.id === afterPageId) : d.pages.length - 1;
    d.pages.splice(i + 1, 0, page);
  });
  return { project: next, pageId };
}

export function duplicatePage(project: Project, pageId: string): { project: Project; pageId: string } {
  let newId = "";
  const next = produce(project, (d) => {
    const i = d.pages.findIndex((p) => p.id === pageId);
    if (i < 0) return;
    const copy = freshIds({ ...d.pages[i], title: `${d.pages[i].title} (copie)` }, allIds(d));
    newId = copy.id;
    d.pages.splice(i + 1, 0, copy);
  });
  return { project: next, pageId: newId || pageId };
}

export function movePage(project: Project, pageId: string, toIndex: number): Project {
  return produce(project, (d) => {
    const i = d.pages.findIndex((p) => p.id === pageId);
    if (i < 0) return;
    const [page] = d.pages.splice(i, 1);
    d.pages.splice(Math.max(0, Math.min(toIndex, d.pages.length)), 0, page);
  });
}

/** Supprime une page (il en reste toujours au moins une). */
export function deletePage(project: Project, pageId: string): Project {
  if (project.pages.length <= 1) return project;
  return produce(project, (d) => {
    d.pages = d.pages.filter((p) => p.id !== pageId);
    // Les boutons qui menaient à cette page vont maintenant à la suivante.
    for (const p of d.pages) for (const b of p.blocks) if (b.type === "button" && b.action.type === "goto" && b.action.page === pageId) b.action = { type: "next" };
  });
}

export function updatePage(project: Project, pageId: string, patch: Partial<Page>): Project {
  return produce(project, (d) => {
    const page = d.pages.find((p) => p.id === pageId);
    if (page) Object.assign(page, patch);
    if (page) for (const k of Object.keys(patch) as (keyof Page)[]) if (patch[k] === undefined) delete page[k];
  });
}

// ---------- Briques ----------

/** Brique neuve d'un type donné, avec un contenu de départ. */
export function defaultBlock(type: "text" | "image" | "shape" | "button" | "video" | "audio", src?: string): Block {
  switch (type) {
    case "text": return { id: "", type, content: "Votre texte" };
    case "image": return { id: "", type, src: src ?? "media/image.png", alt: "", fit: "contain" };
    case "shape": return { id: "", type, shape: "rectangle", fill: "#C9D6FF" };
    case "button": return { id: "", type, label: "Suivant", action: { type: "next" } };
    case "video": return { id: "", type, src: src ?? "media/video.mp4" };
    case "audio": return { id: "", type, src: src ?? "media/son.mp3", label: "Écouter" };
  }
}

const DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  text: { w: 600, h: 120 }, image: { w: 480, h: 320 }, shape: { w: 300, h: 200 },
  button: { w: 240, h: 64 }, video: { w: 640, h: 360 }, audio: { w: 480, h: 110 },
};

/** Ajoute une brique sur une page. En diapositive, elle arrive au centre (décalée si la place est prise). */
export function addBlock(project: Project, pageId: string, block: Block): { project: Project; blockId: string } {
  let blockId = "";
  const next = produce(project, (d) => {
    const page = d.pages.find((p) => p.id === pageId);
    if (!page) return;
    const b = clone(block);
    b.id = uniqueId(allIds(d), `${page.id}-${b.type}`);
    blockId = b.id;
    if (d.mode === "slides") {
      if (!b.frame) {
        const size = DEFAULT_SIZE[b.type] ?? { w: 400, h: 200 };
        let x = Math.round((STAGE.w - size.w) / 2);
        let y = Math.round((STAGE.h - size.h) / 2);
        while (page.blocks.some((o) => o.frame && o.frame.x === x && o.frame.y === y)) {
          x += 24;
          y += 24;
        }
        b.frame = { x, y, ...size };
      }
      delete b.width;
    } else {
      delete b.frame;
    }
    page.blocks.push(b);
  });
  return { project: next, blockId };
}

export function updateBlock(project: Project, pageId: string, blockId: string, patch: Partial<Block>): Project {
  return produce(project, (d) => {
    const b = d.pages.find((p) => p.id === pageId)?.blocks.find((x) => x.id === blockId);
    if (!b) return;
    Object.assign(b, patch);
    for (const [k, v] of Object.entries(patch)) if (v === undefined) delete (b as unknown as Record<string, unknown>)[k];
  });
}

/** Change la position/taille de plusieurs briques d'un coup (déplacement de groupe). */
export function setFrames(project: Project, pageId: string, frames: Record<string, Frame>): Project {
  return produce(project, (d) => {
    const page = d.pages.find((p) => p.id === pageId);
    if (!page) return;
    for (const b of page.blocks) if (frames[b.id]) b.frame = { ...b.frame, ...frames[b.id] };
  });
}

export function deleteBlocks(project: Project, pageId: string, blockIds: string[]): Project {
  return produce(project, (d) => {
    const page = d.pages.find((p) => p.id === pageId);
    if (page) page.blocks = page.blocks.filter((b) => !blockIds.includes(b.id));
  });
}

export function duplicateBlocks(project: Project, pageId: string, blockIds: string[]): { project: Project; blockIds: string[] } {
  const created: string[] = [];
  const next = produce(project, (d) => {
    const page = d.pages.find((p) => p.id === pageId);
    if (!page) return;
    const taken = allIds(d);
    for (const id of blockIds) {
      const src = page.blocks.find((b) => b.id === id);
      if (!src) continue;
      const copy = clone(src);
      copy.id = uniqueId(taken, src.id);
      if (copy.frame) copy.frame = { ...copy.frame, x: copy.frame.x + 20, y: copy.frame.y + 20 };
      page.blocks.splice(page.blocks.indexOf(src) + 1 + created.length, 0, copy);
      created.push(copy.id);
    }
  });
  return { project: next, blockIds: created };
}

/** Ordre des briques : en diapositive, la dernière est au-dessus ; en vertical, c'est l'ordre de lecture. */
export function reorderBlock(project: Project, pageId: string, blockId: string, where: "front" | "back" | "up" | "down"): Project {
  return produce(project, (d) => {
    const page = d.pages.find((p) => p.id === pageId);
    if (!page) return;
    const i = page.blocks.findIndex((b) => b.id === blockId);
    if (i < 0) return;
    const [b] = page.blocks.splice(i, 1);
    const to = where === "front" ? page.blocks.length : where === "back" ? 0 : where === "up" ? Math.max(0, i - 1) : Math.min(page.blocks.length, i + 1);
    page.blocks.splice(to, 0, b);
  });
}

// ---------- Réglages du module ----------

export function updateProject(project: Project, change: (d: Project) => void): Project {
  return produce(project, change);
}
