// Version « appli Windows » : commandes Rust (src-tauri/src/project.rs) + boîtes de dialogue Windows.
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { documentDir, join } from "@tauri-apps/api/path";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { MEDIA_FILTERS, type Backend, type Recent, type SuiteRequest } from "./backend.ts";
import { tr } from "../i18n/index.ts";

const dirOf = (file: string) => file.replace(/[\\/][^\\/]*$/, "");

export const tauriBackend: Backend = {
  kind: "tauri",

  async defaultProjectDir(slug) {
    return join(await documentDir(), "Learning Suite", slug);
  },

  async pickFolder() {
    const r = await open({ directory: true, title: tr("dlgCreateWhere") });
    return typeof r === "string" ? r : null;
  },

  async pickProject() {
    const r = await open({ title: tr("dlgOpen"), filters: [{ name: tr("dlgModuleFilter"), extensions: ["json"] }] });
    return typeof r === "string" ? dirOf(r) : null;
  },

  read: (dir) => invoke<string>("project_read", { dir }),
  create: (dir, json) => invoke("project_create", { dir, json }),
  save: (dir, json) => invoke("project_save", { dir, json }),

  async importMedia(dir, kind) {
    const f = MEDIA_FILTERS[kind];
    const name = tr(f.nameKey);
    const source = await open({ title: tr("dlgImport", { kind: name.toLowerCase() }), filters: [{ name, extensions: f.extensions }] });
    if (typeof source !== "string") return null;
    return invoke<string>("media_import", { dir, source });
  },

  mediaUrl(dir, src) {
    return convertFileSrc(`${dir}\\${src.replace(/\//g, "\\")}`);
  },

  listMedia: (dir) => invoke<string[]>("media_list", { dir }),

  async exportZip(dir, suggestedName, texts, media) {
    const out = await save({ title: tr("dlgSavePackage"), defaultPath: suggestedName, filters: [{ name: tr("dlgZipFilter"), extensions: ["zip"] }] });
    if (!out) return null;
    await invoke("export_zip", { dir, out, texts, media });
    return out;
  },

  confirm: (message, title) => ask(message, { title, kind: "warning", okLabel: tr("yes"), cancelLabel: tr("no") }),

  async recents() {
    await migrateOldRecents();
    return invoke<Recent[]>("suite_recents");
  },
  remember: (dir, title) => invoke("suite_remember", { dir, title }),
  forget: (dir) => invoke("suite_forget", { dir }),
  startupRequest: () => invoke<SuiteRequest | null>("startup_request"),
  listenRequests: (fn) => listen<SuiteRequest>("suite-request", (e) => fn(e.payload)),
};

// Studio 0.3 gardait ses récents dans l'interface : on les verse une fois dans la liste partagée.
const OLD_KEY = "learning-suite-studio:recent";
async function migrateOldRecents() {
  let old: Recent[] = [];
  try {
    old = JSON.parse(localStorage.getItem(OLD_KEY) ?? "[]");
    localStorage.removeItem(OLD_KEY);
  } catch {
    return;
  }
  for (const r of [...old].reverse()) await invoke("suite_remember", { dir: r.dir, title: r.title }).catch(() => undefined);
}
