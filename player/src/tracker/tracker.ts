// Interface unique entre le lecteur et la plateforme qui suit l'apprenant.
// Un adaptateur par format : LocalTracker (aperçu), puis SCORM 1.2, SCORM 2004, cmi5, xAPI.
import type { Meta } from "../types.ts";
import type { Score } from "../quiz.ts";

export interface Tracker {
  /** Début de la session. */
  start(meta: Meta): void;
  /** Une page a été affichée ; progress va de 0 à 1. */
  pageViewed(pageId: string, progress: number): void;
  /** Le score a changé. */
  setScore(score: Score): void;
  /** Toutes les pages ont été vues. */
  complete(): void;
  /** Fin de session (fermeture de la fenêtre). */
  finish(): void;
}
