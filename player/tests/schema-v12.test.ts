import { describe, expect, it } from "vitest";
import { validateProject } from "../src/validate.ts";
import type { Project } from "../src/types.ts";
import { miniProject } from "./fixture.ts";

// Tous les fichiers JSON utiles, chargés par Vite au moment des tests.
const projects = import.meta.glob("../../examples/*/project.json", { eager: true, import: "default" });
const templates = import.meta.glob("../../schema/templates/*/*.json", { eager: true, import: "default" });
const clone = <T>(x: T): T => structuredClone(x);

describe("schéma 1.2 : exemples et modèles", () => {
  it("les 6 exemples sont trouvés", () => expect(Object.keys(projects)).toHaveLength(6));
  for (const [file, project] of Object.entries(projects)) {
    it(`${file.replace("../../", "")} est valide`, () => expect(validateProject(clone(project))).toEqual({ ok: true, errors: [] }));
  }

  it("les 12 modèles sont trouvés", () => expect(Object.keys(templates)).toHaveLength(12));
  for (const [file, page] of Object.entries(templates)) {
    it(`modèle ${file.replace("../../schema/templates/", "")} est valide`, () => {
      const p = miniProject();
      p.schemaVersion = "1.2";
      p.mode = file.includes("/vertical/") ? "vertical" : "slides";
      p.pages = [clone(page) as Project["pages"][number]];
      expect(validateProject(p).errors).toEqual([]);
    });
  }
});

describe("schéma 1.2 : erreurs refusées", () => {
  const withBlock = (block: unknown): Project => {
    const p = miniProject();
    p.schemaVersion = "1.2";
    p.mode = "vertical";
    p.pages = [{ id: "p", title: "P", blocks: [block as never] }];
    return p;
  };
  const cases: [string, unknown][] = [
    ["glisser-déposer « catégories » sans catégories", { id: "d", type: "dragdrop", kind: "categorize", items: [{ id: "a", text: "A" }, { id: "b", text: "B" }] }],
    ["glisser-déposer « paires » avec des éléments", { id: "d", type: "dragdrop", kind: "match", items: [{ id: "a", text: "A" }, { id: "b", text: "B" }], pairs: [{ id: "x", prompt: "x", answer: "y" }, { id: "z", prompt: "z", answer: "w" }] }],
    ["texte à trous sans aucun trou", { id: "f", type: "fillblanks", text: "Aucun trou ici." }],
    ["zone qui sort de l'image", { id: "h", type: "hotspot", kind: "find", src: "media/a.png", alt: "", zones: [{ id: "z", x: 120, y: 0, w: 10, h: 10, label: "Z" }] }],
    ["onglets sans éléments", { id: "r", type: "reveal", layout: "tabs", items: [] }],
    ["carte sans recto", { id: "c", type: "flipcards", cards: [{ id: "c1", back: "verso" }] }],
    ["mode de notation inconnu", { id: "f", type: "fillblanks", text: "Un [[trou]]", scoring: "moitié" }],
  ];
  it.each(cases)("refuse : %s", (_name, block) => {
    expect(validateProject(withBlock(block)).ok).toBe(false);
  });
});
