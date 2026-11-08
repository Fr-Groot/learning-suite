import { describe, expect, it } from "vitest";
import { validateProject } from "@player/validate.ts";
import { addBlock, addPage, defaultBlock, deleteBlocks, deletePage, duplicateBlocks, duplicatePage, movePage, newProject, reorderBlock, setFrames, uniqueId, updateBlock } from "./actions.ts";
import { resizeFrame, snapMove } from "./snap.ts";
import { EditorStore } from "./store.ts";
import { TEMPLATES } from "./templates.ts";

describe("création d'un module", () => {
  it.each(["slides", "vertical"] as const)("un nouveau module %s est valide", (mode) => {
    const p = newProject({ title: "Mon module", mode, themeId: "vert" });
    expect(validateProject(p)).toEqual({ ok: true, errors: [] });
    expect(p.theme.colors.primary).toBe("#0F8A6B");
  });

  it("les 12 modèles de page sont chargés", () => {
    expect(TEMPLATES).toHaveLength(12);
  });

  it.each(["slides", "vertical"] as const)("chaque modèle s'ajoute et le module reste valide (%s)", (mode) => {
    let p = newProject({ title: "M", mode });
    for (const t of TEMPLATES.filter((x) => x.mode === mode)) p = addPage(p, t.id, null).project;
    expect(p.pages).toHaveLength(7);
    expect(validateProject(p).errors.filter((e) => !e.includes("media/"))).toEqual([]);
    // Identifiants uniques partout
    const ids = p.pages.flatMap((pg) => [pg.id, ...pg.blocks.map((b) => b.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("pages", () => {
  it("dupliquer, déplacer, supprimer", () => {
    let p = newProject({ title: "M", mode: "slides" });
    const { project, pageId } = duplicatePage(p, "accueil");
    p = project;
    expect(p.pages.map((x) => x.title)).toEqual(["Accueil", "Accueil (copie)"]);
    p = movePage(p, pageId, 0);
    expect(p.pages[0].id).toBe(pageId);
    p = deletePage(p, pageId);
    expect(p.pages).toHaveLength(1);
    expect(deletePage(p, "accueil").pages).toHaveLength(1); // jamais zéro page
  });

  it("supprimer une page redirige les boutons qui y menaient", () => {
    let p = newProject({ title: "M", mode: "slides" });
    const added = addPage(p, null, null);
    p = updateBlock(added.project, "accueil", "accueil-commencer", { action: { type: "goto", page: added.pageId } } as never);
    p = deletePage(p, added.pageId);
    expect(validateProject(p).ok).toBe(true);
  });
});

describe("briques", () => {
  it("ajout au centre, puis décalé si la place est prise", () => {
    let p = newProject({ title: "M", mode: "slides" });
    const a = addBlock(p, "accueil", defaultBlock("shape"));
    const b = addBlock(a.project, "accueil", defaultBlock("shape"));
    p = b.project;
    const blocks = p.pages[0].blocks;
    expect(blocks.at(-2)!.frame).toEqual({ x: 490, y: 260, w: 300, h: 200 });
    expect(blocks.at(-1)!.frame).toMatchObject({ x: 514, y: 284 });
    expect(a.blockId).not.toBe(b.blockId);
  });

  it("en vertical, pas de position", () => {
    const p = addBlock(newProject({ title: "M", mode: "vertical" }), "accueil", defaultBlock("text")).project;
    expect(p.pages[0].blocks.at(-1)!.frame).toBeUndefined();
    expect(validateProject(p).ok).toBe(true);
  });

  it("dupliquer, déplacer, ordre, supprimer", () => {
    let p = newProject({ title: "M", mode: "slides" });
    const d = duplicateBlocks(p, "accueil", ["accueil-titre"]);
    p = d.project;
    const copy = p.pages[0].blocks.find((b) => b.id === d.blockIds[0])!;
    expect(copy.frame).toMatchObject({ x: 100, y: 240 });
    p = setFrames(p, "accueil", { [copy.id]: { x: 10, y: 10, w: 100, h: 50 } });
    expect(p.pages[0].blocks.find((b) => b.id === copy.id)!.frame).toEqual({ x: 10, y: 10, w: 100, h: 50 });
    p = reorderBlock(p, "accueil", copy.id, "back");
    expect(p.pages[0].blocks[0].id).toBe(copy.id);
    p = deleteBlocks(p, "accueil", [copy.id]);
    expect(p.pages[0].blocks.some((b) => b.id === copy.id)).toBe(false);
  });

  it("identifiants lisibles et uniques", () => {
    const taken = new Set(["texte"]);
    expect(uniqueId(taken, "Texte")).toBe("texte-2");
    expect(uniqueId(taken, "Élément à placer")).toBe("element-a-placer");
  });
});

describe("annuler / rétablir", () => {
  it("chaque modification s'annule, un geste compte pour une seule étape", () => {
    const s = new EditorStore();
    s.load(newProject({ title: "M", mode: "slides" }), null);
    s.edit((p) => addPage(p, null, null).project);
    expect(s.get().project!.pages).toHaveLength(2);
    expect(s.get().dirty).toBe(true);

    s.beginGesture();
    for (let x = 0; x < 50; x += 10) s.edit((p) => setFrames(p, "accueil", { "accueil-titre": { x, y: 0, w: 10, h: 10 } }));
    s.endGesture();
    expect(s.get().project!.pages[0].blocks[0].frame!.x).toBe(40);

    s.undo();
    expect(s.get().project!.pages[0].blocks[0].frame!.x).toBe(80); // tout le geste annulé d'un coup
    s.undo();
    expect(s.get().project!.pages).toHaveLength(1);
    expect(s.get().canUndo).toBe(false);
    s.redo();
    expect(s.get().project!.pages).toHaveLength(2);
  });

  it("la sélection disparaît si la brique est supprimée", () => {
    const s = new EditorStore();
    s.load(newProject({ title: "M", mode: "slides" }), null);
    s.select(["accueil-titre"]);
    s.edit((p) => deleteBlocks(p, "accueil", ["accueil-titre"]));
    expect(s.get().selection).toEqual([]);
  });
});

describe("repères d'alignement", () => {
  it("le centre s'aimante au centre de la diapo", () => {
    const r = snapMove({ x: 537, y: 100, w: 200, h: 100 }, []);
    expect(r.frame.x).toBe(540);
    expect(r.guides.x).toEqual([640]);
  });
  it("pas d'aimantation au-delà de 6 px", () => {
    expect(snapMove({ x: 520, y: 100, w: 200, h: 100 }, []).frame.x).toBe(520);
  });
  it("s'aligne sur le bord d'une autre brique", () => {
    const r = snapMove({ x: 103, y: 300, w: 50, h: 50 }, [{ x: 100, y: 0, w: 300, h: 100 }]);
    expect(r.frame.x).toBe(100);
  });
  it("redimensionnement : taille minimale et aimantation du bord tiré", () => {
    expect(resizeFrame({ x: 100, y: 100, w: 100, h: 100 }, "se", -200, -200, []).frame).toEqual({ x: 100, y: 100, w: 20, h: 20 });
    expect(resizeFrame({ x: 100, y: 100, w: 100, h: 100 }, "e", 437, 0, []).frame.w).toBe(540);
  });
});
