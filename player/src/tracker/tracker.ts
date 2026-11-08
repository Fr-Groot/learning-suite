// Interface unique entre le lecteur et la plateforme qui suit l'apprenant.
// Un adaptateur par format : LocalTracker (aperçu, HTML5), Scorm12Tracker, puis SCORM 2004, cmi5, xAPI.
import type { QuestionState, Score } from "../activities.ts";
import type { Meta } from "../types.ts";

/** Statut de l'apprenant, au sens SCORM. */
export type LessonStatus = "incomplete" | "completed" | "passed" | "failed";

/** Ce qu'il faut mémoriser pour reprendre le module plus tard. */
export interface SavedState {
  v: 1;
  /** Index de la page courante. */
  page: number;
  visited: number[];
  unlocked: number[];
  /** État des questions et jeux, par identifiant de brique. */
  activities: Record<string, QuestionState>;
}

export interface Report {
  pageId: string;
  /** Pages vues / total, de 0 à 1. */
  progress: number;
  status: LessonStatus;
  /** Absent si le module n'a aucune activité notée. */
  score: Score | null;
  state: SavedState;
}

export interface Tracker {
  /** Début de session. Renvoie l'état sauvegardé s'il y en a un (reprise). */
  start(meta: Meta): SavedState | null;
  /** Appelé à chaque changement (page, réponse, score). */
  update(report: Report): void;
  /** Fin de session (fermeture de la fenêtre). */
  finish(): void;
}

/** Vérifie qu'un état relu (LMS, mémoire du navigateur) a la bonne forme. */
export function isSavedState(x: unknown): x is SavedState {
  const s = x as SavedState;
  return (
    !!s && s.v === 1 && Number.isInteger(s.page) &&
    Array.isArray(s.visited) && Array.isArray(s.unlocked) &&
    typeof s.activities === "object" && s.activities !== null
  );
}
