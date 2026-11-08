// Point d'entrée du lecteur livré dans les exports (dist/player.js + dist/player.css).
// Utilisation : LearningPlayer.mount(document.getElementById("app"), project, { baseUrl: "./" })
import "./player.css";
import { Player, type PlayerOptions } from "./player.ts";
import { checkRules } from "./validate-rules.ts";
import type { Project } from "./types.ts";

export { Player } from "./player.ts";
export { LocalTracker } from "./tracker/local.ts";
export type { Tracker } from "./tracker/tracker.ts";
export type { Project } from "./types.ts";

export function mount(container: HTMLElement, project: Project, options?: PlayerOptions): Player {
  // Le schéma complet est vérifié par Studio avant l'export ; ici on garde les contrôles légers.
  const problems = checkRules(project);
  if (problems.length) console.warn("[lecteur] projet incohérent :", problems);
  return new Player(container, project, options);
}
