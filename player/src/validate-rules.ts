// Règles de cohérence que le schéma ne sait pas exprimer.
// Fichier léger (sans Ajv) : il est aussi embarqué dans le lecteur livré.
import { pageActivities, waitsForActivities } from "./activities.ts";
import type { Project } from "./types.ts";

/** Règles de cohérence hors schéma. */
export function checkRules(project: Project): string[] {
  const errors: string[] = [];
  const pageIds = new Set<string>();
  const blockIds = new Set<string>();

  project.pages.forEach((page, i) => {
    const where = `page ${i + 1} (« ${page.title} »)`;
    if (pageIds.has(page.id)) errors.push(`${where} : l'identifiant de page « ${page.id} » est déjà utilisé.`);
    pageIds.add(page.id);

    for (const block of page.blocks) {
      if (blockIds.has(block.id)) errors.push(`${where} : l'identifiant de brique « ${block.id} » est déjà utilisé.`);
      blockIds.add(block.id);
      if (block.type === "question" && block.choices) {
        const ids = block.choices.map((c) => c.id);
        if (new Set(ids).size !== ids.length) errors.push(`${where} : la question « ${block.id} » a deux choix avec le même identifiant.`);
      }
    }

    if (waitsForActivities(page) && pageActivities(page).length === 0) {
      errors.push(`${where} : « Suivant » attend des réponses, mais la page n'a aucune activité à terminer.`);
    }
    if (page.unlockNext === "voiceoverEnded" && !page.voiceover) {
      errors.push(`${where} : « Suivant » attend la fin de la voix off, mais la page n'en a pas.`);
    }
  });

  for (const page of project.pages) {
    for (const block of page.blocks) {
      if (block.type === "button" && block.action.type === "goto" && !pageIds.has(block.action.page)) {
        errors.push(`Le bouton « ${block.label} » mène à la page « ${block.action.page} », qui n'existe pas.`);
      }
    }
  }
  return errors;
}
