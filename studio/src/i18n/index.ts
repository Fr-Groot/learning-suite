// Langue de Studio : celle de Windows par défaut, ou celle choisie sur l'accueil (mémorisée).
// t("clé", { valeur }) renvoie le texte ; {nom} est remplacé par la valeur.
import { useSyncExternalStore } from "react";
import { en } from "./en.ts";
import { fr, type StudioKey } from "./fr.ts";

export type StudioLang = "fr" | "en";
export const STUDIO_DICTIONARIES: Record<StudioLang, Record<StudioKey, string>> = { fr, en };
export type { StudioKey };

const KEY = "learning-suite-studio:lang";

function detect(): StudioLang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    // sans importance
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "fr";
  return nav.toLowerCase().startsWith("fr") ? "fr" : "en";
}

let lang: StudioLang = detect();
const listeners = new Set<() => void>();

export const getLang = () => lang;

export function setLang(next: StudioLang) {
  lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // sans importance
  }
  if (typeof document !== "undefined") document.documentElement.lang = next;
  listeners.forEach((fn) => fn());
}

/** Texte dans la langue courante (hors composants React : messages, noms par défaut…). */
export function tr(key: StudioKey, vars: Record<string, string | number> = {}): string {
  return STUDIO_DICTIONARIES[lang][key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

/** Dans un composant : se redessine quand on change de langue. */
export function useT() {
  useSyncExternalStore(
    (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    getLang,
  );
  return tr;
}

/** Texte dans une langue précise (ex. contenu par défaut d'un module anglais, quelle que soit la langue de Studio). */
export function trFor(code: string | undefined, key: StudioKey, vars: Record<string, string | number> = {}): string {
  const l: StudioLang = (code ?? "").toLowerCase().startsWith("fr") ? "fr" : "en";
  return STUDIO_DICTIONARIES[l][key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}
