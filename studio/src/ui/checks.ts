// Vérification complète d'un module avant export : schéma, cohérence, fichiers présents.
import type { Project } from "@player/types.ts";
import { validateProject } from "@player/validate.ts";

/** Chemins « media/… » utilisés par le module. */
export function referencedMedia(project: Project): string[] {
  return [...new Set([...JSON.stringify(project).matchAll(/"(media\/[^"]+)"/g)].map((m) => m[1]))];
}

export function checkProject(project: Project, mediaOnDisk: string[]): string[] {
  const errors = [...validateProject(project).errors];
  const present = new Set(mediaOnDisk);
  for (const m of referencedMedia(project)) if (!present.has(m)) errors.push(`Fichier manquant : ${m} (remplacez-le dans les propriétés de la brique)`);
  return errors;
}
