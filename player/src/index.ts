// Point d'entrée du lecteur livré dans les exports (dist/player.js + dist/player.css).
// Dans un paquet exporté : index.html charge project.js (le projet) puis player.js,
// et appelle LearningPlayer.start({ tracker: "scorm12" }) ou start({ tracker: "local" }).
import "./player.css";
import { Player, type PlayerOptions } from "./player.ts";
import { LocalTracker } from "./tracker/local.ts";
import { findScorm12Api, Scorm12Tracker } from "./tracker/scorm12.ts";
import type { Tracker } from "./tracker/tracker.ts";
import type { Project } from "./types.ts";
import { checkRules } from "./validate-rules.ts";

export { Player } from "./player.ts";
export { LocalTracker } from "./tracker/local.ts";
export { Scorm12Tracker, findScorm12Api } from "./tracker/scorm12.ts";
export type { Tracker } from "./tracker/tracker.ts";
export type { Project } from "./types.ts";

export function mount(container: HTMLElement, project: Project, options?: PlayerOptions): Player {
  // Le schéma complet est vérifié avant l'export ; ici on garde les contrôles légers.
  const problems = checkRules(project);
  if (problems.length) console.warn("[lecteur] projet incohérent :", problems);
  return new Player(container, project, options);
}

/** Démarre un paquet exporté : le projet est dans window.__LS_PROJECT__ (fichier project.js). */
export function start(options: { tracker?: "scorm12" | "local"; container?: string } = {}): Player {
  const project = (window as unknown as { __LS_PROJECT__?: Project }).__LS_PROJECT__;
  const container = document.getElementById(options.container ?? "app");
  if (!project || !container) throw new Error("Paquet incomplet : project.js ou #app manquant.");

  let tracker: Tracker = new LocalTracker({ resume: true, log: false });
  if (options.tracker === "scorm12") {
    const api = findScorm12Api(window);
    if (api) tracker = new Scorm12Tracker(api);
    else console.warn("[lecteur] LMS introuvable : le suivi reste dans ce navigateur.");
  }
  return mount(container, project, { tracker });
}
