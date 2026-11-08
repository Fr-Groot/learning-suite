// Moteur des activités : questions, jeux HTML, texte à trous, glisser-déposer, zones,
// et activités de découverte (cartes, onglets…). Correction, essais, score global, seuil.
// Aucun affichage ici : tout est testable sans navigateur.
import { gradeDragDrop } from "./grading/dragdrop.ts";
import { gradeFillBlanks } from "./grading/fillblanks.ts";
import { gradeHotspot } from "./grading/hotspot.ts";
import type { Activity, Block, DragDropBlock, FillBlanksBlock, HotspotBlock, HtmlBlock, Page, Project, QuestionBlock } from "./types.ts";

/**
 * Réponse de l'apprenant : identifiants cochés (question, zones), vrai/faux,
 * ou correspondances « élément → valeur » (texte à trous, glisser-déposer).
 */
export type Response = string[] | boolean | Record<string, string>;

/** Activités à plusieurs éléments, corrigées au prorata ou en tout ou rien. */
export type MultiActivity = FillBlanksBlock | DragDropBlock | HotspotBlock;

/** État d'une activité. */
export interface ActivityState {
  attemptsUsed: number;
  /** Vrai quand l'activité est terminée (bonne réponse, plus d'essai, ou jeu terminé). */
  done: boolean;
  correct: boolean;
  lastResponse?: Response;
  /** Score de 0 à 100 (jeux HTML, activités à plusieurs éléments). Absent pour les questions. */
  score?: number;
  /** Activités de découverte : éléments déjà ouverts (cartes, onglets, zones). */
  opened?: string[];
}

/** Ancien nom, gardé pour la lisibilité du code des questions. */
export type QuestionState = ActivityState;

export const newQuestionState = (): ActivityState => ({ attemptsUsed: 0, done: false, correct: false });

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

/** Part de réussite (0 à 1) d'une activité à plusieurs éléments, avant la règle de notation. */
export function gradeMulti(b: MultiActivity, response: Response): number {
  if (b.type === "hotspot") return Array.isArray(response) ? gradeHotspot(b, response) : 0;
  if (typeof response !== "object" || Array.isArray(response)) return 0;
  return b.type === "fillblanks" ? gradeFillBlanks(b, response) : gradeDragDrop(b, response);
}

/** Valide une activité à plusieurs éléments : prorata (défaut) ou tout ou rien, essais. */
export function submitMulti(b: MultiActivity, state: ActivityState, response: Response): ActivityState {
  if (state.done) return state;
  let ratio = gradeMulti(b, response);
  if (b.scoring === "all-or-nothing") ratio = ratio === 1 ? 1 : 0;
  const attemptsUsed = state.attemptsUsed + 1;
  const correct = ratio === 1;
  return {
    attemptsUsed,
    correct,
    done: correct || attemptsUsed >= (b.attempts ?? 1),
    lastResponse: response,
    score: Math.round(ratio * 10000) / 100,
  };
}

/** Activité de découverte : un élément vient d'être ouvert. Terminée quand tout est vu (si requireAll). */
export function openItem(state: ActivityState, itemId: string, allIds: string[], requireAll: boolean): ActivityState {
  const opened = [...new Set([...(state.opened ?? []), itemId])].filter((id) => allIds.includes(id));
  const done = !requireAll || allIds.every((id) => opened.includes(id));
  return { ...state, opened, done };
}

/** Une brique compte-t-elle dans le score ? Jeux HTML : non par défaut ; autres activités notables : oui. */
export function isGraded(b: Block): b is Activity {
  if (b.type === "question" || b.type === "fillblanks" || b.type === "dragdrop") return b.graded !== false;
  if (b.type === "hotspot") return b.kind === "find" && b.graded !== false;
  if (b.type === "html") return b.graded === true;
  return false;
}

export const gradedActivities = (project: Project): Activity[] => project.pages.flatMap((p) => p.blocks.filter(isGraded));

/** Briques à terminer avant de débloquer « Suivant » (activitiesDone / questionsAnswered). */
export const pageActivities = (page: Page): Block[] =>
  page.blocks.filter(
    (b) =>
      ((b.type === "flipcards" || b.type === "reveal" || (b.type === "hotspot" && b.kind === "explore")) && b.requireAll === true) ||
      b.type === "question" ||
      isGraded(b),
  );

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
function earned(a: Activity, s: ActivityState | undefined): number {
  if (!s) return 0;
  if (a.type === "question") return s.correct ? 1 : 0;
  return (s.score ?? 0) / 100;
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

/** La page attend-elle la fin de ses activités pour débloquer « Suivant » ? */
export const waitsForActivities = (page: Page) =>
  page.unlockNext === "activitiesDone" || page.unlockNext === "questionsAnswered";
