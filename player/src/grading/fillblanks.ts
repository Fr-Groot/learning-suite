// Texte à trous : lecture des trous et correction.
//   [[mange|dévore]]       → trou à saisir, plusieurs réponses acceptées
//   [[*mange|dort|court]]  → liste déroulante, l'étoile marque la bonne réponse
import type { FillBlanksBlock } from "../types.ts";

export interface Blank {
  index: number;
  /** Liste déroulante (au moins une option étoilée) ou saisie libre. */
  select: boolean;
  /** Choix proposés (liste) ou réponses acceptées (saisie), sans étoile. */
  options: string[];
  correct: string[];
}

export type Part = string | Blank;

const BLANK = /\[\[([^\]]+)\]\]/g;

export function parseBlanks(text: string): { parts: Part[]; blanks: Blank[] } {
  const parts: Part[] = [];
  const blanks: Blank[] = [];
  let last = 0;
  for (const m of text.matchAll(BLANK)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    const raw = m[1].split("|").map((s) => s.trim()).filter(Boolean);
    const select = raw.some((o) => o.startsWith("*"));
    const options = raw.map((o) => o.replace(/^\*/, "").trim());
    const correct = select ? raw.filter((o) => o.startsWith("*")).map((o) => o.slice(1).trim()) : options;
    const blank: Blank = { index: blanks.length, select, options, correct };
    blanks.push(blank);
    parts.push(blank);
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return { parts, blanks };
}

/** Compare sans tenir compte des espaces en trop, et au choix des majuscules et accents. */
export function normalize(s: string, opts: { caseSensitive?: boolean; accentSensitive?: boolean } = {}): string {
  let out = s.replace(/[’‘`]/g, "'").replace(/\s+/g, " ").trim();
  if (!opts.caseSensitive) out = out.toLocaleLowerCase("fr");
  if (!opts.accentSensitive) out = out.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return out;
}

export function isBlankCorrect(blank: Blank, value: string, b: Pick<FillBlanksBlock, "caseSensitive" | "accentSensitive">): boolean {
  if (blank.select) return blank.correct.includes(value);
  const v = normalize(value, b);
  return v !== "" && blank.correct.some((c) => normalize(c, b) === v);
}

/** Part de trous justes, de 0 à 1. La réponse associe le numéro du trou à la valeur saisie. */
export function gradeFillBlanks(b: FillBlanksBlock, response: Record<string, string>): number {
  const { blanks } = parseBlanks(b.text);
  if (blanks.length === 0) return 0;
  const ok = blanks.filter((bl) => isBlankCorrect(bl, response[String(bl.index)] ?? "", b)).length;
  return ok / blanks.length;
}
