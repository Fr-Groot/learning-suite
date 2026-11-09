// Tout ce que le lanceur demande au PC. Deux versions : Tauri (la vraie appli Windows)
// et mémoire (navigateur : aperçu de développement et tests automatiques, rien n'est lancé).
import type { Project } from "@player/types.ts";

export interface ModuleCard {
  dir: string;
  title: string;
  mode: string;
  language: string;
  pages: number;
  modified: number;
  recent: boolean;
  /** Thème, mode et première page : de quoi dessiner la miniature. */
  preview: Project;
}

export interface Installed {
  exe: string;
  version: string | null;
}

export interface Tool {
  id: string;
  name: string;
  exe: string;
}

export interface Overview {
  modules: ModuleCard[];
  projectsDir: string | null;
  studio: Installed | null;
  clicksy: Installed | null;
  tools: Tool[];
  version: string;
}

export type ClicksyAction = "video" | "guide" | "session";
export type WebPage = "clicksy" | "suite" | "site";

export interface Backend {
  readonly kind: "tauri" | "memory";
  overview(): Promise<Overview>;
  studioOpen(dir: string): Promise<void>;
  studioNew(): Promise<void>;
  studioStart(): Promise<void>;
  folderOpen(dir: string): Promise<void>;
  moduleForget(dir: string): Promise<void>;
  clicksyRun(action?: ClicksyAction): Promise<void>;
  /** Fait choisir clicksy.exe (version portable). null si annulé. */
  clicksyLocate(): Promise<Installed | null>;
  clicksyFolder(): Promise<string>;
  /** Fait choisir un programme puis l'ajoute. null si annulé. */
  toolAdd(): Promise<Tool[] | null>;
  toolRemove(id: string): Promise<Tool[]>;
  toolRun(id: string): Promise<void>;
  pageOpen(which: WebPage): Promise<void>;
  /** Adresse d'un média d'un module (pour les miniatures). */
  mediaUrl(dir: string, src: string): string;
}

let current: Backend | null = null;

export async function backend(): Promise<Backend> {
  if (current) return current;
  const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  current = inTauri ? (await import("./tauri.ts")).tauriBackend : (await import("./memory.ts")).memoryBackend;
  return current;
}

export function backendSync(): Backend {
  if (!current) throw new Error("Lanceur pas encore prêt");
  return current;
}
