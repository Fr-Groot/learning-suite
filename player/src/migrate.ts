// Mise à jour d'un module vers la dernière version du format.
// 1.3 : « graded » (oui / non) est remplacé par « role » (exercice noté / activité).
// Les anciens modules restent lisibles : le lecteur comprend aussi l'ancien réglage.
import { isInteraction, roleOf } from "./activities.ts";
import type { Project } from "./types.ts";

export const CURRENT_VERSION = "1.3" as const;

/** Renvoie une copie à jour du module (l'original n'est pas modifié). */
export function migrateProject(project: Project): Project {
  const p = structuredClone(project);
  for (const page of p.pages) {
    for (const b of page.blocks) {
      if (!isInteraction(b)) continue;
      const role = roleOf(b);
      delete b.graded;
      // On n'écrit le rôle que s'il diffère de la valeur par défaut, pour garder des fichiers courts.
      const byDefault = b.type === "html" ? "activity" : "exercise";
      if (role !== byDefault) b.role = role;
      else delete b.role;
    }
  }
  p.schemaVersion = CURRENT_VERSION;
  return p;
}
