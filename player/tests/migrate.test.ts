import { describe, expect, it } from "vitest";
import { computeScore, exercises, newQuestionState, roleOf, type QuestionState } from "../src/activities.ts";
import { migrateProject } from "../src/migrate.ts";
import type { Block, Project } from "../src/types.ts";
import { validateProject } from "../src/validate.ts";
import { miniProject } from "./fixture.ts";

/** Module « ancien format » : réglages graded, version 1.2. */
function oldProject(): Project {
  const p = miniProject();
  p.schemaVersion = "1.2";
  const blocks = p.pages[1].blocks as Block[];
  (blocks[1] as { graded?: boolean }).graded = false; // q2 : question d'entraînement
  const frame = { x: 0, y: 0, w: 100, h: 100 };
  blocks.push({ id: "jeu", type: "html", src: "media/jeu.html", title: "Jeu", graded: true, points: 2, frame } as Block);
  blocks.push({ id: "jeu2", type: "html", src: "media/jeu2.html", title: "Jeu 2", frame } as Block);
  return p;
}

describe("exercice ou activité", () => {
  it("valeurs par défaut : question = exercice, jeu HTML = activité", () => {
    const p = miniProject();
    expect(roleOf(p.pages[1].blocks[0] as never)).toBe("exercise");
    expect(roleOf({ id: "j", type: "html", src: "media/j.html", title: "J" })).toBe("activity");
  });

  it("l'ancien réglage « graded » est encore compris sans conversion", () => {
    expect(exercises(oldProject()).map((b) => b.id)).toEqual(["q1", "jeu"]);
  });
});

describe("conversion vers 1.3", () => {
  it("remplace graded par role, sans changer ce qui est noté", () => {
    const before = oldProject();
    const after = migrateProject(before);
    expect(after.schemaVersion).toBe("1.3");
    const [q1, q2, , jeu, jeu2] = after.pages[1].blocks as (Block & { role?: string; graded?: boolean })[];
    expect(q1.role).toBeUndefined(); // exercice : valeur par défaut, pas écrite
    expect(q2.role).toBe("activity");
    expect(jeu.role).toBe("exercise");
    expect(jeu2.role).toBeUndefined(); // activité : valeur par défaut d'un jeu
    expect(after.pages[1].blocks.some((b) => "graded" in b)).toBe(false);
    expect(exercises(after).map((b) => b.id)).toEqual(exercises(before).map((b) => b.id));
    expect(before.schemaVersion).toBe("1.2"); // l'original n'est pas modifié
  });

  it("le score ne compte que les exercices", () => {
    const p = migrateProject(oldProject());
    const done: QuestionState = { ...newQuestionState(), attemptsUsed: 1, done: true, correct: true };
    const st = new Map<string, QuestionState>([["q1", done], ["jeu", { ...done, score: 50 }]]);
    // q1 : 1 point sur 1, jeu : 50 % de 2 points → 2 sur 3 ; q2 (entraînement) n'entre pas en compte.
    expect(computeScore(p, st)).toMatchObject({ raw: 2, max: 3, percent: 67, complete: true });
  });

  it("un module converti reste valide", () => {
    const p = migrateProject(oldProject());
    expect(validateProject(p).errors).toEqual([]);
  });
});
