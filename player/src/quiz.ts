// Logique des activités notées : questions (correction, essais) et jeux HTML (score reçu),
// puis score global et seuil de réussite. Aucun affichage ici : tout est testable sans navigateur.
import type { Activity, Block, HtmlBlock, Page, Project, QuestionBlock } from "./types.ts";

/** Réponse de l'apprenant à une question : identifiants cochés, ou vrai/faux. */
export type Response = string[] | boolean;

/** État d'une activité (question ou jeu HTML). */
export interface QuestionState {
  attemptsUsed: number;
  /** Vrai quand l'activité est terminée (bonne réponse, plus d'essai, ou jeu terminé). */
  done: boolean;
  correct: boolean;
  lastResponse?: Response;
  /** Score de 0 à 100 envoyé par un jeu HTML. Absent pour les questions (tout ou rien). */
  score?: number;
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

/**
 * Message reçu d'un jeu HTML. On garde le meilleur score obtenu.
 * Un message sans score (« terminé ») marque juste l'activité comme finie.
 */
export function reportHtml(state: QuestionState, msg: { score?: number; completed?: boolean }): QuestionState {
  const next: QuestionState = { ...state };
  if (typeof msg.score === "number" && Number.isFinite(msg.score)) {
    const s = Math.round(Math.min(100, Math.max(0, msg.score)) * 100) / 100;
    next.score = Math.max(state.score ?? 0, s);
    next.attemptsUsed = state.attemptsUsed + 1;
  }
  if (msg.completed || next.score !== undefined) next.done = true;
  next.correct = (next.score ?? 0) >= 100;
  return next;
}

/** Une brique compte-t-elle dans le score ? Questions : oui par défaut ; jeux HTML : non par défaut. */
export function isGraded(b: Block): b is Activity {
  if (b.type === "question") return b.graded !== false;
  if (b.type === "html") return b.graded === true;
  return false;
}

export const gradedActivities = (project: Project): Activity[] => project.pages.flatMap((p) => p.blocks.filter(isGraded));

/** Activités à terminer avant de débloquer « Suivant » sur une page « questionsAnswered ». */
export const pageActivities = (page: Page): Activity[] =>
  page.blocks.filter((b): b is Activity => b.type === "question" || (b.type === "html" && b.graded === true));

export interface Score {
  /** Points obtenus (peut être décimal à cause des jeux). */
  raw: number;
  /** Points possibles. */
  max: number;
  /** Pourcentage arrondi à l'unité (0 à 100). */
  percent: number;
  passed: boolean;
  /** Vrai quand toutes les activités notées sont terminées. */
  complete: boolean;
}

/** Part des points gagnée par une activité : 0 à 1. */
function earned(a: Activity, s: QuestionState | undefined): number {
  if (!s) return 0;
  if (a.type === "html") return (s.score ?? 0) / 100;
  return s.correct ? 1 : 0;
}

export function computeScore(project: Project, states: Map<string, QuestionState>): Score {
  let raw = 0;
  let max = 0;
  let complete = true;
  for (const a of gradedActivities(project)) {
    const pts = a.points ?? 1;
    const s = states.get(a.id);
    max += pts;
    if (!s?.done) complete = false;
    raw += pts * earned(a, s);
  }
  raw = Math.round(raw * 100) / 100;
  // Sans activité notée, le module est réussi d'office.
  const percent = max === 0 ? 100 : Math.round((raw / max) * 100);
  return { raw, max, percent, passed: percent >= project.scoring.passingScore, complete };
}

export const hasGradedActivities = (project: Project) => gradedActivities(project).length > 0;

/** Pour les tests et l'affichage : ce type d'activité est-il un jeu HTML ? */
export const isHtml = (a: Activity): a is HtmlBlock => a.type === "html";

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
