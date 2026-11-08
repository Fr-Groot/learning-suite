// Suivi « aperçu » : rien n'est envoyé nulle part. On garde la dernière session
// dans la mémoire du navigateur et on l'affiche dans la console, pour vérifier.
import type { Meta } from "../types.ts";
import type { Score } from "../quiz.ts";
import type { Tracker } from "./tracker.ts";

export interface LocalRecord {
  moduleId: string;
  startedAt: string;
  lastPage?: string;
  progress: number;
  score?: Score;
  completed: boolean;
}

export class LocalTracker implements Tracker {
  record: LocalRecord | null = null;
  private readonly log: boolean;

  constructor(options: { log?: boolean } = {}) {
    this.log = options.log ?? true;
  }

  start(meta: Meta) {
    this.record = { moduleId: meta.id, startedAt: new Date().toISOString(), progress: 0, completed: false };
    this.save("démarrage");
  }
  pageViewed(pageId: string, progress: number) {
    if (!this.record) return;
    this.record.lastPage = pageId;
    this.record.progress = progress;
    this.save(`page ${pageId}`);
  }
  setScore(score: Score) {
    if (!this.record) return;
    this.record.score = score;
    this.save(`score ${score.percent} %`);
  }
  complete() {
    if (!this.record) return;
    this.record.completed = true;
    this.save("terminé");
  }
  finish() {
    this.save("fin de session");
  }

  private save(event: string) {
    if (this.log) console.info(`[suivi] ${event}`, this.record);
    try {
      if (this.record) localStorage.setItem(`learning-suite:${this.record.moduleId}`, JSON.stringify(this.record));
    } catch {
      // Mémoire du navigateur indisponible (navigation privée…) : sans importance pour l'aperçu.
    }
  }
}
