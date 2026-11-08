import { describe, expect, it } from "vitest";
import { validateProject } from "../src/validate.ts";
import { miniProject } from "./fixture.ts";

describe("validation du project.json", () => {
  it("accepte le mini-projet d'exemple", () => {
    expect(validateProject(miniProject())).toEqual({ ok: true, errors: [] });
  });

  it("accepte le mode vertical sans frame", () => {
    const p = miniProject();
    p.mode = "vertical";
    p.pages.forEach((pg) => pg.blocks.forEach((b) => delete b.frame));
    expect(validateProject(p).ok).toBe(true);
  });

  const invalid: [string, (p: any) => void][] = [
    ["frame manquant en mode diapositives", (p) => delete p.pages[0].blocks[0].frame],
    ["frame présent en mode vertical", (p) => (p.mode = "vertical")],
    ["deux bonnes réponses à un choix unique", (p) => (p.pages[1].blocks[0].choices[1].correct = true)],
    ["vrai/faux sans réponse", (p) => delete p.pages[1].blocks[1].answer],
    ["champ inconnu", (p) => (p.pages[0].blocks[0].couleur = "rouge")],
    ["chemin média qui sort du dossier", (p) => (p.pages[0].blocks[2].src = "media/../secret.png")],
    ["lien non sécurisé", (p) => (p.pages[0].blocks[3].action = { type: "url", href: "http://exemple.fr" })],
    ["seuil supérieur à 100", (p) => (p.scoring.passingScore = 120)],
    ["brique inconnue", (p) => (p.pages[0].blocks[0].type = "carrousel")],
  ];
  it.each(invalid)("refuse : %s", (_name, mutate) => {
    const p = miniProject();
    mutate(p);
    const r = validateProject(p);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("explique un champ obligatoire manquant en français", () => {
    const p: any = miniProject();
    delete p.meta.title;
    expect(validateProject(p).errors).toContain("/meta : champ obligatoire manquant : title");
  });

  it("repère les identifiants en double", () => {
    const p = miniProject();
    p.pages[1].id = "accueil";
    expect(validateProject(p).errors.join()).toMatch(/« accueil » est déjà utilisé/);
  });

  it("repère un bouton vers une page inexistante", () => {
    const p: any = miniProject();
    p.pages[0].blocks[3].action = { type: "goto", page: "nulle-part" };
    expect(validateProject(p).errors.join()).toMatch(/« nulle-part », qui n'existe pas/);
  });

  it("repère un verrou sur une page sans question", () => {
    const p = miniProject();
    p.pages[0].unlockNext = "questionsAnswered";
    expect(validateProject(p).errors.join()).toMatch(/aucune question/);
  });
});
