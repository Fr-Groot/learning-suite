import type { StudioKey } from "../i18n/index.ts";
// Tout ce que l'éditeur demande au système : fichiers, boîtes de dialogue.
// Deux versions : Tauri (la vraie appli Windows) et mémoire (navigateur, tests automatiques).

export type MediaKind = "image" | "audio" | "video" | "captions" | "html";

/** Module ouvert récemment (liste partagée entre les applis de la suite). */
export interface Recent {
  dir: string;
  title: string;
  at: number;
}

/** Demande venue d'une autre appli (le lanceur) : ouvrir un module, ou en créer un. */
export interface SuiteRequest {
  open?: string;
  new?: boolean;
}

export interface Backend {
  readonly kind: "tauri" | "memory";
  /** Dossier proposé par défaut pour un nouveau module (Documents\Learning Suite\<nom>). */
  defaultProjectDir(slug: string): Promise<string>;
  /** Choisir un dossier parent (« Changer… »). */
  pickFolder(): Promise<string | null>;
  /** Choisir un project.json existant ; renvoie le dossier du projet. */
  pickProject(): Promise<string | null>;
  read(dir: string): Promise<string>;
  create(dir: string, json: string): Promise<void>;
  save(dir: string, json: string): Promise<void>;
  /** Choisir un fichier sur le PC puis le copier dans media/. Renvoie « media/… » ou null si annulé. */
  importMedia(dir: string, kind: MediaKind): Promise<string | null>;
  /** Adresse utilisable par l'interface pour afficher un média du projet. */
  mediaUrl(dir: string, src: string): string;
  listMedia(dir: string): Promise<string[]>;
  /** Demande où enregistrer le zip, puis l'écrit. Renvoie le chemin choisi, ou null si annulé. */
  exportZip(dir: string, suggestedName: string, texts: [string, string][], media: string[]): Promise<string | null>;
  /** Demande une confirmation (Oui / Non). */
  confirm(message: string, title: string): Promise<boolean>;
  recents(): Promise<Recent[]>;
  remember(dir: string, title: string): Promise<void>;
  forget(dir: string): Promise<void>;
  /** Demande reçue au démarrage (ex. Studio lancé avec « --open <dossier> »). */
  startupRequest(): Promise<SuiteRequest | null>;
  /** Demandes reçues pendant que Studio est ouvert. Renvoie de quoi arrêter l'écoute. */
  listenRequests(fn: (req: SuiteRequest) => void): Promise<() => void>;
}

export const MEDIA_FILTERS: Record<MediaKind, { nameKey: StudioKey; extensions: string[] }> = {
  image: { nameKey: "fImages", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"] },
  audio: { nameKey: "fSounds", extensions: ["mp3", "wav", "m4a", "ogg"] },
  video: { nameKey: "fVideos", extensions: ["mp4", "webm"] },
  captions: { nameKey: "fCaptions", extensions: ["vtt"] },
  html: { nameKey: "fHtml", extensions: ["html", "htm"] },
};

let current: Backend | null = null;

/** La bonne version selon l'endroit où tourne l'interface. */
export async function backend(): Promise<Backend> {
  if (current) return current;
  const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  current = inTauri ? (await import("./tauri.ts")).tauriBackend : (await import("./memory.ts")).memoryBackend;
  return current;
}

/** Accès synchrone une fois l'appli démarrée (après un premier await backend()). */
export function backendSync(): Backend {
  if (!current) throw new Error("Système de fichiers pas encore prêt");
  return current;
}
