// Adaptateur SCORM 1.2 : parle à l'objet « API » fourni par le LMS.
// Référence : SCORM 1.2 Run-Time Environment (cmi.core.*, cmi.suspend_data).
import type { Meta } from "../types.ts";
import { isSavedState, type LessonStatus, type Report, type SavedState, type Tracker } from "./tracker.ts";

export interface Scorm12API {
  LMSInitialize(arg: ""): string;
  LMSFinish(arg: ""): string;
  LMSGetValue(name: string): string;
  LMSSetValue(name: string, value: string): string;
  LMSCommit(arg: ""): string;
  LMSGetLastError(): string;
}

/**
 * Cherche l'API du LMS : dans les fenêtres parentes, puis dans la fenêtre qui a ouvert
 * le module (algorithme recommandé par ADL).
 */
export function findScorm12Api(win: Window): Scorm12API | null {
  const search = (start: Window | null): Scorm12API | null => {
    let w = start;
    for (let i = 0; w && i < 10; i++) {
      try {
        const api = (w as unknown as { API?: Scorm12API }).API;
        if (api && typeof api.LMSInitialize === "function") return api;
      } catch {
        // Fenêtre d'un autre domaine : on ne peut pas y lire, on remonte.
      }
      if (!w.parent || w.parent === w) break;
      w = w.parent;
    }
    return null;
  };
  return search(win) ?? search(win.opener as Window | null);
}

/** Limite SCORM 1.2 de cmi.suspend_data. */
export const SUSPEND_MAX = 4096;

/** Met l'état en texte compact, en allégeant si besoin pour tenir dans 4096 caractères. */
export function serializeState(state: SavedState): string {
  let text = JSON.stringify(state);
  if (text.length <= SUSPEND_MAX) return text;
  // 1) on retire les réponses détaillées (le score et le statut restent)
  const light: SavedState = { ...state, activities: {} };
  for (const [id, a] of Object.entries(state.activities)) {
    const { lastResponse: _drop, ...rest } = a;
    light.activities[id] = rest;
  }
  text = JSON.stringify(light);
  if (text.length <= SUSPEND_MAX) return text;
  // 2) en dernier recours : seulement la position et les pages vues
  return JSON.stringify({ ...state, activities: {} }).slice(0, SUSPEND_MAX);
}

/** Durée au format SCORM 1.2 : HHHH:MM:SS.SS */
export function scormTime(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(4, "0")}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
}

export class Scorm12Tracker implements Tracker {
  private readonly api: Scorm12API;
  private readonly now: () => number;
  private startedAt = 0;
  private status: LessonStatus = "incomplete";
  private active = false;

  constructor(api: Scorm12API, options: { now?: () => number } = {}) {
    this.api = api;
    this.now = options.now ?? (() => Date.now());
  }

  start(_meta: Meta): SavedState | null {
    this.active = this.api.LMSInitialize("") === "true";
    if (!this.active) {
      console.warn("[SCORM] LMSInitialize a échoué, erreur", this.api.LMSGetLastError());
      return null;
    }
    this.startedAt = this.now();
    const current = this.api.LMSGetValue("cmi.core.lesson_status");
    if (current === "" || current === "not attempted") this.set("cmi.core.lesson_status", "incomplete");
    else this.status = current as LessonStatus;

    // Reprise : seulement si le LMS dit qu'on revient (entry = resume).
    if (this.api.LMSGetValue("cmi.core.entry") !== "resume") return null;
    try {
      const saved = JSON.parse(this.api.LMSGetValue("cmi.suspend_data") || "null");
      return isSavedState(saved) ? saved : null;
    } catch {
      return null;
    }
  }

  update(r: Report) {
    if (!this.active) return;
    this.set("cmi.core.lesson_location", r.pageId);
    this.set("cmi.suspend_data", serializeState(r.state));
    if (r.score) {
      this.set("cmi.core.score.min", "0");
      this.set("cmi.core.score.max", "100");
      this.set("cmi.core.score.raw", String(r.score.percent));
    }
    if (r.status !== this.status) {
      this.status = r.status;
      this.set("cmi.core.lesson_status", r.status);
    }
    this.api.LMSCommit("");
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    this.set("cmi.core.session_time", scormTime(this.now() - this.startedAt));
    // « suspend » permet au LMS de proposer la reprise la prochaine fois.
    this.set("cmi.core.exit", this.status === "incomplete" || this.status === "failed" ? "suspend" : "");
    this.api.LMSCommit("");
    this.api.LMSFinish("");
  }

  private set(name: string, value: string) {
    if (this.api.LMSSetValue(name, value) !== "true") {
      console.warn(`[SCORM] refus de ${name} =`, value, "erreur", this.api.LMSGetLastError());
    }
  }
}
