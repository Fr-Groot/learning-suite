import { describe, expect, it } from "vitest";
import { isExercise, newQuestionState, openItem, pageActivities, submitMulti } from "../src/activities.ts";
import { dragModel, gradeDragDrop } from "../src/grading/dragdrop.ts";
import { gradeFillBlanks, normalize, parseBlanks } from "../src/grading/fillblanks.ts";
import { gradeHotspot } from "../src/grading/hotspot.ts";
import type { DragDropBlock, FillBlanksBlock, HotspotBlock, Page } from "../src/types.ts";

const fb = (over: Partial<FillBlanksBlock> = {}): FillBlanksBlock => ({
  id: "fb", type: "fillblanks", text: "Le chat [[mange|dévore]] la [[*souris|chaise]].", ...over,
});

describe("texte à trous", () => {
  it("lit les trous : saisie (plusieurs réponses) et liste (l'étoile marque la bonne)", () => {
    const { blanks, parts } = parseBlanks(fb().text);
    expect(blanks).toEqual([
      { index: 0, select: false, options: ["mange", "dévore"], correct: ["mange", "dévore"] },
      { index: 1, select: true, options: ["souris", "chaise"], correct: ["souris"] },
    ]);
    expect(parts[0]).toBe("Le chat ");
  });

  it("tolère majuscules, accents et espaces, sauf si l'auteur l'interdit", () => {
    expect(normalize("  Dévore ")).toBe("devore");
    expect(gradeFillBlanks(fb(), { 0: "DEVORE", 1: "souris" })).toBe(1);
    expect(gradeFillBlanks(fb({ accentSensitive: true }), { 0: "devore", 1: "souris" })).toBe(0.5);
    expect(gradeFillBlanks(fb({ caseSensitive: true }), { 0: "Mange", 1: "souris" })).toBe(0.5);
  });

  it("un trou vide est faux", () => {
    expect(gradeFillBlanks(fb(), { 0: "", 1: "chaise" })).toBe(0);
  });
});

const cat: DragDropBlock = {
  id: "dd", type: "dragdrop", kind: "categorize",
  categories: [{ id: "bon", label: "Bon réflexe" }, { id: "mauvais", label: "Mauvais réflexe" }],
  items: [
    { id: "a", text: "Verrouiller son poste", category: "bon" },
    { id: "b", text: "Noter son mot de passe sur un post-it", category: "mauvais" },
    { id: "c", text: "Mettre à jour", category: "bon" },
    { id: "d", text: "Cliquer sur un lien inconnu", category: "mauvais" },
  ],
};

describe("glisser-déposer", () => {
  it("catégories : au prorata des éléments bien rangés", () => {
    expect(gradeDragDrop(cat, { a: "bon", b: "mauvais", c: "bon", d: "mauvais" })).toBe(1);
    expect(gradeDragDrop(cat, { a: "bon", b: "bon", c: "bon" })).toBe(0.5);
  });

  it("paires : une cible par début de paire", () => {
    const match: DragDropBlock = {
      id: "m", type: "dragdrop", kind: "match",
      pairs: [{ id: "p1", prompt: "Hameçonnage", answer: "Faux mail" }, { id: "p2", prompt: "Rançongiciel", answer: "Fichiers chiffrés" }],
    };
    expect(dragModel(match).targets.map((t) => [t.id, t.capacity])).toEqual([["slot-p1", 1], ["slot-p2", 1]]);
    expect(gradeDragDrop(match, { p1: "slot-p1", p2: "slot-p2" })).toBe(1);
    expect(gradeDragDrop(match, { p1: "slot-p2", p2: "slot-p1" })).toBe(0);
  });

  it("ordre : chaque élément à sa position", () => {
    const order: DragDropBlock = { id: "o", type: "dragdrop", kind: "order", items: [{ id: "x", text: "1" }, { id: "y", text: "2" }, { id: "z", text: "3" }] };
    expect(gradeDragDrop(order, { x: "pos-1", y: "pos-2", z: "pos-3" })).toBe(1);
    expect(gradeDragDrop(order, { x: "pos-1", y: "pos-3", z: "pos-2" })).toBeCloseTo(1 / 3);
  });
});

describe("zones à trouver", () => {
  const hs: HotspotBlock = {
    id: "h", type: "hotspot", kind: "find", src: "media/bureau.svg", alt: "Un bureau",
    zones: [
      { id: "postit", x: 0, y: 0, w: 10, h: 10, label: "Post-it", correct: true },
      { id: "usb", x: 20, y: 0, w: 10, h: 10, label: "Clé USB", correct: true },
      { id: "plante", x: 40, y: 0, w: 10, h: 10, label: "Plante" },
    ],
  };
  it("bonnes zones moins mauvaises, jamais négatif", () => {
    expect(gradeHotspot(hs, ["postit", "usb"])).toBe(1);
    expect(gradeHotspot(hs, ["postit"])).toBe(0.5);
    expect(gradeHotspot(hs, ["postit", "plante"])).toBe(0);
    expect(gradeHotspot(hs, ["plante"])).toBe(0);
  });
  it("seules les zones « à trouver » sont notées", () => {
    expect(isExercise(hs)).toBe(true);
    expect(isExercise({ ...hs, kind: "explore" })).toBe(false);
    expect(isExercise({ ...hs, role: "activity" })).toBe(false);
  });
});

describe("validation des activités", () => {
  it("prorata par défaut, essais, puis terminé", () => {
    let s = submitMulti(fb({ attempts: 2 }), newQuestionState(), { 0: "mange", 1: "chaise" });
    expect(s).toMatchObject({ score: 50, correct: false, done: false, attemptsUsed: 1 });
    s = submitMulti(fb({ attempts: 2 }), s, { 0: "mange", 1: "souris" });
    expect(s).toMatchObject({ score: 100, correct: true, done: true });
  });

  it("tout ou rien : une erreur = 0", () => {
    const s = submitMulti(fb({ scoring: "all-or-nothing" }), newQuestionState(), { 0: "mange", 1: "chaise" });
    expect(s).toMatchObject({ score: 0, done: true });
  });

  it("découverte : terminée quand tout est ouvert (si exigé)", () => {
    let s = openItem(newQuestionState(), "c1", ["c1", "c2"], true);
    expect(s).toMatchObject({ opened: ["c1"], done: false });
    s = openItem(s, "c2", ["c1", "c2"], true);
    expect(s.done).toBe(true);
    expect(openItem(newQuestionState(), "c1", ["c1", "c2"], false).done).toBe(true);
  });

  it("une page attend ses activités notées et ses découvertes obligatoires", () => {
    const page: Page = {
      id: "p", title: "P", blocks: [
        { id: "t", type: "text", content: "x" },
        { id: "cards", type: "flipcards", cards: [{ id: "c", front: "a" }], requireAll: true },
        { id: "tabs", type: "reveal", layout: "tabs", items: [{ id: "i", title: "a" }] },
        fb(),
      ],
    };
    expect(pageActivities(page).map((b) => b.id)).toEqual(["cards", "fb"]);
  });
});

it("« Suivant » attend aussi les activités d'entraînement, mais pas un jeu HTML non noté", () => {
  const page: Page = {
    id: "p", title: "P", blocks: [
      { id: "practice", type: "fillblanks", text: "Un [[trou]]", role: "activity" },
      { id: "game", type: "html", src: "media/jeu.html", title: "Jeu" },
      { id: "graded-game", type: "html", src: "media/jeu2.html", title: "Jeu noté", role: "exercise" },
    ],
  };
  expect(pageActivities(page).map((b) => b.id)).toEqual(["practice", "graded-game"]);
});
