// Version « appli Windows » : commandes Rust (src-tauri/src/lib.rs), qui vérifient tout ce qu'elles lancent.
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Backend, Installed, Overview, Tool } from "./backend.ts";
import { tr } from "../i18n/index.ts";

const pickExe = async (title: string) => {
  const r = await open({ title, filters: [{ name: tr("dlgExeFilter"), extensions: ["exe"] }] });
  return typeof r === "string" ? r : null;
};

export const tauriBackend: Backend = {
  kind: "tauri",
  overview: () => invoke<Overview>("overview"),
  studioOpen: (dir) => invoke("studio_open", { dir }),
  studioNew: () => invoke("studio_new"),
  studioStart: () => invoke("studio_start"),
  folderOpen: (dir) => invoke("folder_open", { dir }),
  moduleForget: (dir) => invoke("module_forget", { dir }),
  clicksyRun: (action) => invoke("clicksy_run", { action: action ?? null }),
  async clicksyLocate() {
    const path = await pickExe(tr("dlgClicksy"));
    return path ? invoke<Installed | null>("clicksy_locate", { path }) : null;
  },
  clicksyFolder: () => invoke<string>("clicksy_folder"),
  async toolAdd() {
    const exe = await pickExe(tr("dlgPickExe"));
    return exe ? invoke<Tool[]>("tool_add", { name: "", exe }) : null;
  },
  toolRemove: (id) => invoke<Tool[]>("tool_remove", { id }),
  toolRun: (id) => invoke("tool_run", { id }),
  pageOpen: (which) => invoke("page_open", { which }),
  mediaUrl: (dir, src) => convertFileSrc(`${dir}\\${src.replace(/\//g, "\\")}`),
};
