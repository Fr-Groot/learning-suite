// Langue du lanceur : celle de Windows par défaut, ou celle choisie sur l'accueil (mémorisée).
// t("clé", { valeur }) renvoie le texte ; {nom} est remplacé par la valeur.
import { useSyncExternalStore } from "react";
import { en } from "./en.ts";
import { fr, type LauncherKey } from "./fr.ts";

export type LauncherLang = "fr" | "en";
export const DICTIONARIES: Record<LauncherLang, Record<LauncherKey, string>> = { fr, en };
export type { LauncherKey };

const KEY = "learning-suite-launcher:lang";

function detect(): LauncherLang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "fr" || saved === "en") return saved;
  } catch {
    // sans importance
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "fr";
  return nav.toLowerCase().startsWith("fr") ? "fr" : "en";
}

let lang: LauncherLang = detect();
const listeners = new Set<() => void>();

export const getLang = () => lang;

export function setLang(next: LauncherLang) {
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
export function tr(key: LauncherKey, vars: Record<string, string | number> = {}): string {
  return DICTIONARIES[lang][key].replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

/** Dans un composant : se redessine quand on change de langue. */
export function useT() {
  useSyncExternalStore(
    (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    getLang,
  );
  return tr;
}

