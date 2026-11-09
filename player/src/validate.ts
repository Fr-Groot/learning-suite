// Vérification d'un project.json : d'abord le schéma, puis les règles
// que le schéma ne sait pas exprimer (identifiants uniques, liens entre pages…).
// Messages en français, destinés à l'auteur du module.
// Validateur produit d'avance à partir du schéma (aucun code fabriqué au démarrage : compatible
// avec la sécurité stricte de Studio). Régénéré par « npm test » et « npm run build ».
import checkSchema from "./generated/schema-validator.js";
import type { Project } from "./types.ts";
import { checkRules } from "./validate-rules.ts";

export { checkRules };


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
  const errors = checkRules(data as unknown as Project);
  return { ok: errors.length === 0, errors };
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
