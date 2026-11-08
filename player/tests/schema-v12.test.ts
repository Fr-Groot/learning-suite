import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateProject } from "../src/validate.ts";
import type { Project } from "../src/types.ts";
import { miniProject } from "./fixture.ts";

const root = path.resolve(__dirname, "../..");
const readJson = (p: string) => JSON.parse(fs.readFileSync(path.join(root, p), "utf8"));

describe("schéma 1.2 : exemples et modèles", () => {
  it.each(["examples/activites", "examples/activites-mobile", "examples/jeu-html", "examples/presentation-suite", "examples/vertical-demo"])(
    "%s est valide",
    (dir) => expect(validateProject(readJson(`${dir}/project.json`))).toEqual({ ok: true, errors: [] }),
  );

  for (const mode of ["slides", "vertical"] as const) {
    const dir = `schema/templates/${mode}`;
    for (const file of fs.readdirSync(path.join(root, dir))) {
      it(`modèle ${mode}/${file} est valide`, () => {
        const p = miniProject();
        p.schemaVersion = "1.2";
        p.mode = mode;
        p.pages = [readJson(`${dir}/${file}`)];
        expect(validateProject(p).errors).toEqual([]);
      });
    }
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
