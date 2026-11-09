import { describe, expect, it } from "vitest";
import { computeScore, isCorrect, newQuestionState, reportHtml, shuffled, submit, type QuestionState } from "../src/activities.ts";
import type { QuestionBlock } from "../src/types.ts";
import { miniProject } from "./fixture.ts";

const single: QuestionBlock = {
  id: "s", type: "question", kind: "single", prompt: "?",
  choices: [{ id: "a", text: "A", correct: true }, { id: "b", text: "B", correct: false }],
};
const multiple: QuestionBlock = {
  id: "m", type: "question", kind: "multiple", prompt: "?", attempts: 2,
  choices: [
    { id: "a", text: "A", correct: true },
    { id: "b", text: "B", correct: true },
    { id: "c", text: "C", correct: false },
  ],
};
const tf: QuestionBlock = { id: "t", type: "question", kind: "truefalse", prompt: "?", answer: false };

describe("correction", () => {
  it("choix unique", () => {
    expect(isCorrect(single, ["a"])).toBe(true);
    expect(isCorrect(single, ["b"])).toBe(false);
    expect(isCorrect(single, [])).toBe(false);
  });
  it("choix multiple : tout ou rien", () => {
    expect(isCorrect(multiple, ["b", "a"])).toBe(true);
    expect(isCorrect(multiple, ["a"])).toBe(false);
    expect(isCorrect(multiple, ["a", "b", "c"])).toBe(false);
  });
  it("vrai/faux", () => {
    expect(isCorrect(tf, false)).toBe(true);
    expect(isCorrect(tf, true)).toBe(false);
    expect(isCorrect(tf, ["a"])).toBe(false);
  });
});

describe("essais", () => {
  it("s'arrête après une bonne réponse", () => {
    const s = submit(multiple, newQuestionState(), ["a", "b"]);
    expect(s).toMatchObject({ attemptsUsed: 1, done: true, correct: true });
  });
  it("permet un deuxième essai, puis s'arrête", () => {
    let s = submit(multiple, newQuestionState(), ["a"]);
    expect(s).toMatchObject({ done: false, correct: false });
    s = submit(multiple, s, ["c"]);
    expect(s).toMatchObject({ attemptsUsed: 2, done: true, correct: false });
    expect(submit(multiple, s, ["a", "b"])).toBe(s);
  });
});

describe("score", () => {
  const p = miniProject(); // 2 questions notées, 1 point chacune, seuil 70 %
  it("0 % au départ, non terminé", () => {
    expect(computeScore(p, new Map())).toEqual({ raw: 0, max: 2, percent: 0, passed: false, complete: false });
  });
  it("1 sur 2 = 50 % : échoué", () => {
    const st = new Map<string, QuestionState>([
      ["q1", { attemptsUsed: 1, done: true, correct: true }],
      ["q2", { attemptsUsed: 1, done: true, correct: false }],
    ]);
    expect(computeScore(p, st)).toMatchObject({ percent: 50, passed: false, complete: true });
  });
  it("2 sur 2 = 100 % : réussi", () => {
    const st = new Map<string, QuestionState>([
      ["q1", { attemptsUsed: 1, done: true, correct: true }],
      ["q2", { attemptsUsed: 1, done: true, correct: true }],
    ]);
    expect(computeScore(p, st)).toMatchObject({ percent: 100, passed: true });
  });
  it("ignore les questions d'entraînement", () => {
    const q = miniProject();
    (q.pages[1].blocks[1] as QuestionBlock).role = "activity";
    const st = new Map([["q1", { attemptsUsed: 1, done: true, correct: true }]]);
    expect(computeScore(q, st)).toMatchObject({ max: 1, percent: 100, passed: true, complete: true });
  });
  it("le seuil est inclusif", () => {
    const q = miniProject();
    q.scoring.passingScore = 50;
    const st = new Map([["q1", { attemptsUsed: 1, done: true, correct: true }]]);
    expect(computeScore(q, st).passed).toBe(true);
  });
});

it("le mélange garde tous les éléments et dépend de la graine", () => {
  const items = [1, 2, 3, 4, 5, 6];
  expect([...shuffled(items, 42)].sort()).toEqual(items);
  expect(shuffled(items, 42)).toEqual(shuffled(items, 42));
});

describe("jeux HTML", () => {
  const withGame = () => {
    const p = miniProject();
    p.pages[1].blocks.push({ id: "jeu", type: "html", src: "media/jeu.html", title: "Jeu", role: "exercise", points: 2 });
    return p;
  };

  it("garde le meilleur score et marque le jeu terminé", () => {
    let s = reportHtml(newQuestionState(), { score: 80 });
    expect(s).toMatchObject({ done: true, score: 80, correct: false });
    s = reportHtml(s, { score: 50 });
    expect(s.score).toBe(80);
    s = reportHtml(s, { score: 150 });
    expect(s).toMatchObject({ score: 100, correct: true });
  });

  it("« terminé » sans score", () => {
    expect(reportHtml(newQuestionState(), { completed: true })).toMatchObject({ done: true, correct: false });
  });

  it("score partiel : 80 % d'un jeu à 2 points = 1,6 point", () => {
    const st = new Map<string, QuestionState>([
      ["q1", { attemptsUsed: 1, done: true, correct: true }],
      ["q2", { attemptsUsed: 1, done: true, correct: true }],
      ["jeu", reportHtml(newQuestionState(), { score: 80 })],
    ]);
    expect(computeScore(withGame(), st)).toEqual({ raw: 3.6, max: 4, percent: 90, passed: true, complete: true });
  });

  it("un jeu non noté ne compte pas", () => {
    const p = withGame();
    (p.pages[1].blocks[3] as { role?: string }).role = "activity";
    expect(computeScore(p, new Map()).max).toBe(2);
  });
});
