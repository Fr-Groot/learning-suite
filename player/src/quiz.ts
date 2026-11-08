// Logique des questions : correction, essais, score et seuil de réussite.
// Aucun affichage ici : tout est testable sans navigateur.
import type { Project, QuestionBlock } from "./types.ts";

/** Réponse de l'apprenant : identifiants cochés, ou vrai/faux. */
export type Response = string[] | boolean;

export interface QuestionState {
  attemptsUsed: number;
  /** Vrai quand la question est terminée (bonne réponse ou plus d'essai). */
  done: boolean;
  correct: boolean;
  lastResponse?: Response;
}

export const newQuestionState = (): QuestionState => ({ attemptsUsed: 0, done: false, correct: false });

export function isCorrect(q: QuestionBlock, response: Response): boolean {
  if (q.kind === "truefalse") return typeof response === "boolean" && response === q.answer;
  if (!Array.isArray(response)) return false;
  const expected = (q.choices ?? []).filter((c) => c.correct).map((c) => c.id).sort();
  const given = [...new Set(response)].sort();
  // Tout ou rien : toutes les bonnes cases, aucune mauvaise.
  return expected.length === given.length && expected.every((id, i) => id === given[i]);
}

/** Enregistre un essai et renvoie le nouvel état (l'ancien n'est pas modifié). */
export function submit(q: QuestionBlock, state: QuestionState, response: Response): QuestionState {
  if (state.done) return state;
  const correct = isCorrect(q, response);
  const attemptsUsed = state.attemptsUsed + 1;
  const maxAttempts = q.attempts ?? 1;
  return { attemptsUsed, correct, done: correct || attemptsUsed >= maxAttempts, lastResponse: response };
}

export const attemptsLeft = (q: QuestionBlock, s: QuestionState) => Math.max(0, (q.attempts ?? 1) - s.attemptsUsed);

export function gradedQuestions(project: Project): QuestionBlock[] {
  return project.pages.flatMap((p) =>
    p.blocks.filter((b): b is QuestionBlock => b.type === "question" && b.graded !== false),
  );
}

export interface Score {
  /** Points obtenus. */
  raw: number;
  /** Points possibles. */
  max: number;
  /** Pourcentage arrondi à l'unité (0 à 100). */
  percent: number;
  passed: boolean;
  /** Vrai quand toutes les questions notées sont terminées. */
  complete: boolean;
}

export function computeScore(project: Project, states: Map<string, QuestionState>): Score {
  const qs = gradedQuestions(project);
  let raw = 0;
  let max = 0;
  let complete = true;
  for (const q of qs) {
    const pts = q.points ?? 1;
    max += pts;
    const s = states.get(q.id);
    if (!s?.done) complete = false;
    if (s?.correct) raw += pts;
  }
  // Sans question notée, le module est réussi d'office.
  const percent = max === 0 ? 100 : Math.round((raw / max) * 100);
  return { raw, max, percent, passed: percent >= project.scoring.passingScore, complete };
}

/** Mélange stable pour une graine donnée (même ordre à chaque affichage d'une session). */
export function shuffled<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
