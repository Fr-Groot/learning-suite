// Les commandes de l'éditeur qui touchent au disque : créer, ouvrir, enregistrer, importer.
import { migrateProject } from "@player/migrate.ts";
import { validateProject } from "@player/validate.ts";
import type { Mode, Project } from "@player/types.ts";
import { backend, backendSync, type MediaKind } from "./io/backend.ts";
import { newProject } from "./model/actions.ts";
import { store } from "./model/store.ts";

// ---------- Messages à l'utilisateur ----------

type Notice = { text: string; kind: "info" | "error" };
let notice: Notice | null = null;
const noticeListeners = new Set<() => void>();
export const notices = {
  get: () => notice,
  subscribe: (fn: () => void) => (noticeListeners.add(fn), () => noticeListeners.delete(fn)),
};
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
export function tell(text: string, kind: Notice["kind"] = "info") {
  notice = { text, kind };
  noticeListeners.forEach((fn) => fn());
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice = null;
    noticeListeners.forEach((fn) => fn());
  }, kind === "error" ? 8000 : 3000);
}
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ---------- Projets récents (mémorisés dans Studio) ----------

export interface Recent {
  dir: string;
  title: string;
  at: number;
}
const RECENT_KEY = "learning-suite-studio:recent";

export function recents(): Recent[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function remember(dir: string, title: string) {
  const list = [{ dir, title, at: Date.now() }, ...recents().filter((r) => r.dir !== dir)].slice(0, 8);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // sans importance
  }
}
export function forget(dir: string) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents().filter((r) => r.dir !== dir)));
  } catch {
    // sans importance
  }
}

// ---------- Créer, ouvrir, enregistrer ----------

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "module";

export async function createProject(opts: { title: string; mode: Mode; themeId: string; dir: string }) {
  const project = newProject(opts);
  try {
    await (await backend()).create(opts.dir, serialize(project));
    store.load(project, opts.dir);
    remember(opts.dir, project.meta.title);
    tell(`Module créé dans ${opts.dir}`);
    return true;
  } catch (e) {
    tell(message(e), "error");
    return false;
  }
}

export async function openProject(dir?: string) {
  const b = await backend();
  const target = dir ?? (await b.pickProject());
  if (!target) return false;
  try {
    const raw = JSON.parse(await b.read(target)) as Project;
    // Un module d'une version précédente est mis à jour (et sera réenregistré au nouveau format).
    const data = migrateProject(raw);
    const check = validateProject(data);
    store.load(data, target, raw.schemaVersion !== data.schemaVersion);
    remember(target, data.meta?.title ?? target);
    if (!check.ok) tell(`Module ouvert, mais ${check.errors.length} problème(s) à corriger (voir « Vérifier »).`, "error");
    return true;
  } catch (e) {
    tell(`Impossible d'ouvrir ce module : ${message(e)}`, "error");
    if (dir) forget(dir);
    return false;
  }
}

const serialize = (p: Project) => JSON.stringify(p, null, 2) + "\n";

let saving: Promise<boolean> | null = null;
export async function saveProject(silent = false): Promise<boolean> {
  const { project, dir } = store.get();
  if (!project || !dir) return false;
  if (saving) return saving;
  saving = (async () => {
    try {
      await backendSync().save(dir, serialize(project));
      // Si l'auteur a continué à modifier pendant l'écriture, il reste des choses à enregistrer.
      if (store.get().project === project) store.markSaved(dir);
      remember(dir, project.meta.title);
      if (!silent) tell("Enregistré");
      return true;
    } catch (e) {
      tell(`Enregistrement impossible : ${message(e)}`, "error");
      return false;
    } finally {
      saving = null;
    }
  })();
  return saving;
}

/** Sauvegarde automatique toutes les 30 secondes s'il y a des modifications. */
export function startAutosave() {
  const id = setInterval(() => {
    if (store.get().dirty) void saveProject(true);
  }, 30_000);
  return () => clearInterval(id);
}

export async function importMedia(kind: MediaKind): Promise<string | null> {
  const { dir } = store.get();
  if (!dir) return null;
  try {
    const path = await backendSync().importMedia(dir, kind);
    if (path) tell(`Fichier ajouté : ${path}`);
    return path;
  } catch (e) {
    tell(message(e), "error");
    return null;
  }
}

export function mediaUrl(src: string): string {
  const { dir } = store.get();
  return dir ? backendSync().mediaUrl(dir, src) : src;
}
