// Vérification d'un project.json : d'abord le schéma, puis les règles
// que le schéma ne sait pas exprimer (identifiants uniques, liens entre pages…).
// Messages en français, destinés à l'auteur du module.
import Ajv2020 from "ajv/dist/2020.js";
import schema from "../../schema/project.v1.schema.json" with { type: "json" };
import type { Project } from "./types.ts";

const ajv = new Ajv2020({ allErrors: true, strict: false });
const checkSchema = ajv.compile(schema);

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateProject(data: unknown): ValidationResult {
  if (!checkSchema(data)) {
    const errors = (checkSchema.errors ?? [])
      // Les erreurs « if/then » répètent l'erreur précise : on les masque.
      .filter((e) => e.keyword !== "if")
      .map((e) => `${e.instancePath || "(racine)"} : ${translate(e.message ?? "", e.params)}`);
    return { ok: false, errors: [...new Set(errors)] };
  }
  const errors = checkRules(data as Project);
  return { ok: errors.length === 0, errors };
}

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

    if (page.unlockNext === "questionsAnswered" && !page.blocks.some((b) => b.type === "question")) {
      errors.push(`${where} : « Suivant » attend des réponses, mais la page n'a aucune question.`);
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

function translate(message: string, params: Record<string, unknown>): string {
  if (message.startsWith("must have required property")) return `champ obligatoire manquant : ${params.missingProperty}`;
  if (message.startsWith("must NOT have additional properties")) return `champ inconnu : ${params.additionalProperty}`;
  if (message.startsWith("must NOT have unevaluated properties")) return `champ inconnu : ${params.unevaluatedProperty}`;
  if (message.startsWith("must be equal to one of the allowed values")) return `valeur non autorisée (attendu : ${(params.allowedValues as string[]).join(", ")})`;
  if (message.startsWith("must match pattern")) return "format incorrect";
  if (message.startsWith("must NOT be valid")) return "combinaison de champs interdite (ex. « frame » en mode vertical, « width » en mode diapositives)";
  if (message.startsWith("must contain")) return "nombre de bonnes réponses incorrect pour ce type de question";
  return message;
}
