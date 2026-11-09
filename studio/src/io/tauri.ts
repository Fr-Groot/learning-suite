// Version « appli Windows » : commandes Rust (src-tauri/src/project.rs) + boîtes de dialogue Windows.
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { documentDir, join } from "@tauri-apps/api/path";
import { ask, open, save } from "@tauri-apps/plugin-dialog";
import { MEDIA_FILTERS, type Backend } from "./backend.ts";

const dirOf = (file: string) => file.replace(/[\\/][^\\/]*$/, "");

export const tauriBackend: Backend = {
  kind: "tauri",

  async defaultProjectDir(slug) {
    return join(await documentDir(), "Learning Suite", slug);
  },

  async pickFolder() {
    const r = await open({ directory: true, title: "Choisir où créer le module" });
    return typeof r === "string" ? r : null;
  },

  async pickProject() {
    const r = await open({ title: "Ouvrir un module", filters: [{ name: "Module Learning Suite", extensions: ["json"] }] });
    return typeof r === "string" ? dirOf(r) : null;
  },

  read: (dir) => invoke<string>("project_read", { dir }),
  create: (dir, json) => invoke("project_create", { dir, json }),
  save: (dir, json) => invoke("project_save", { dir, json }),

  async importMedia(dir, kind) {
    const f = MEDIA_FILTERS[kind];
    const source = await open({ title: `Importer : ${f.name.toLowerCase()}`, filters: [f] });
    if (typeof source !== "string") return null;
    return invoke<string>("media_import", { dir, source });
  },

  mediaUrl(dir, src) {
    return convertFileSrc(`${dir}\\${src.replace(/\//g, "\\")}`);
  },

  listMedia: (dir) => invoke<string[]>("media_list", { dir }),

  async exportZip(dir, suggestedName, texts, media) {
    const out = await save({ title: "Enregistrer le paquet", defaultPath: suggestedName, filters: [{ name: "Paquet zip", extensions: ["zip"] }] });
    if (!out) return null;
    await invoke("export_zip", { dir, out, texts, media });
    return out;
  },

  confirm: (message, title) => ask(message, { title, kind: "warning", okLabel: "Oui", cancelLabel: "Non" }),
};
