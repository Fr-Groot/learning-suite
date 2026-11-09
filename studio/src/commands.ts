// Les commandes de l'éditeur qui touchent au disque : créer, ouvrir, enregistrer, importer.
import { migrateProject } from "@player/migrate.ts";
import { validateProject } from "@player/validate.ts";
import type { Mode, Project } from "@player/types.ts";
import { backend, backendSync, type MediaKind, type Recent, type SuiteRequest } from "./io/backend.ts";
import { newProject } from "./model/actions.ts";
import { store } from "./model/store.ts";
import { tr } from "./i18n/index.ts";

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

// ---------- Modules récents (partagés avec le lanceur et les autres applis) ----------

export type { Recent } from "./io/backend.ts";

export async function recents(): Promise<Recent[]> {
  try {
    return await (await backend()).recents();
  } catch {
    return [];
  }
}
function remember(dir: string, title: string) {
  void backend().then((b) => b.remember(dir, title)).catch(() => undefined);
}
export function forget(dir: string) {
  void backend().then((b) => b.forget(dir)).catch(() => undefined);
}

// ---------- Fenêtre « Nouveau module » (ouverte depuis l'accueil ou demandée par le lanceur) ----------

let wantNew = false;
const newListeners = new Set<() => void>();
export const newDialog = {
  get: () => wantNew,
  subscribe: (fn: () => void) => (newListeners.add(fn), () => newListeners.delete(fn)),
  set(v: boolean) {
    wantNew = v;
    newListeners.forEach((fn) => fn());
  },
};

// ---------- Demandes venues d'une autre appli (« ouvre ce module », « nouveau module ») ----------

export async function handleRequest(req: SuiteRequest | null) {
  if (!req || (!req.open && !req.new)) return;
  // Le module en cours est enregistré avant d'en ouvrir un autre.
  if (store.get().dirty && !(await saveProject(true))) return;
  if (req.open) {
    if (store.get().dir === req.open) return;
    await openProject(req.open);
  } else if (req.new) {
    store.close();
    newDialog.set(true);
  }
}

// ---------- Créer, ouvrir, enregistrer ----------

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "module";

export async function createProject(opts: { title: string; mode: Mode; themeId: string; dir: string; language?: string }) {
  const project = newProject(opts);
  try {
    await (await backend()).create(opts.dir, serialize(project));
    store.load(project, opts.dir);
    remember(opts.dir, project.meta.title);
    tell(tr("created", { dir: opts.dir }));
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
    newDialog.set(false);
    remember(target, data.meta?.title ?? target);
    if (!check.ok) tell(tr("openedWithIssues", { n: check.errors.length }), "error");
    return true;
  } catch (e) {
    tell(tr("openFailed", { msg: message(e) }), "error");
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
      if (!silent) tell(tr("savedNotice"));
      return true;
    } catch (e) {
      tell(tr("saveFailed", { msg: message(e) }), "error");
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
    if (path) tell(tr("fileAdded", { path }));
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
