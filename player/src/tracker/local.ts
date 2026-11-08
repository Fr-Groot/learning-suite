// Suivi local : rien n'est envoyé nulle part. Sert à l'aperçu et aux exports HTML5.
// Avec resume = true, l'état est gardé dans la mémoire du navigateur pour la reprise.
import type { Meta } from "../types.ts";
import { isSavedState, type Report, type SavedState, type Tracker } from "./tracker.ts";

export class LocalTracker implements Tracker {
  /** Dernier rapport reçu (utile pour les tests et la console). */
  last: Report | null = null;
  private key = "";
  private readonly log: boolean;
  private readonly resume: boolean;

  constructor(options: { log?: boolean; resume?: boolean } = {}) {
    this.log = options.log ?? true;
    this.resume = options.resume ?? false;
  }

  start(meta: Meta): SavedState | null {
    this.key = `learning-suite:${meta.id}`;
    if (this.log) console.info(`[suivi] démarrage « ${meta.title} »`);
    if (!this.resume) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(this.key) ?? "null")?.state;
      return isSavedState(saved) ? saved : null;
    } catch {
      return null;
    }
  }

  update(report: Report) {
    this.last = report;
    if (this.log) {
      const score = report.score ? `, score ${report.score.percent} %` : "";
      console.info(`[suivi] page ${report.pageId}, ${Math.round(report.progress * 100)} % vu, ${report.status}${score}`);
    }
    try {
      localStorage.setItem(this.key, JSON.stringify(report));
    } catch {
      // Mémoire du navigateur indisponible (navigation privée…) : sans gravité.
    }
  }

  finish() {
    if (this.log) console.info("[suivi] fin de session");
  }
}
