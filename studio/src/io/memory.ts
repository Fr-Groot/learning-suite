// Version « navigateur » : tout reste en mémoire. Sert aux tests automatiques de l'interface
// et à l'aperçu de développement ; l'appli Windows utilise tauri.ts.
import { zipSync } from "fflate";
import { MEDIA_FILTERS, type Backend } from "./backend.ts";

interface MemProject {
  json: string;
  media: Map<string, Blob>;
  urls: Map<string, string>;
}

const projects = new Map<string, MemProject>();

/** Ouvre le sélecteur de fichiers du navigateur. */
function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null));
    input.addEventListener("cancel", () => resolve(null));
    document.body.append(input);
    input.click();
    setTimeout(() => input.remove(), 60_000);
  });
}

const slug = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "fichier";

export const memoryBackend: Backend & { projects: typeof projects } = {
  kind: "memory",
  projects,

  defaultProjectDir: async (s) => `memoire/${s}`,
  pickFolder: async () => "memoire",
  async pickProject() {
    const file = await pickFile(".json");
    if (!file) return null;
    const dir = `memoire/${slug(file.name)}-${projects.size + 1}`;
    projects.set(dir, { json: await file.text(), media: new Map(), urls: new Map() });
    return dir;
  },

  async read(dir) {
    const p = projects.get(dir);
    if (!p) throw new Error(`Projet introuvable : ${dir}`);
    return p.json;
  },
  async create(dir, json) {
    if (projects.has(dir)) throw new Error(`Le dossier n'est pas vide : ${dir}`);
    projects.set(dir, { json, media: new Map(), urls: new Map() });
  },
  async save(dir, json) {
    JSON.parse(json);
    const p = projects.get(dir);
    if (!p) throw new Error(`Dossier du projet introuvable : ${dir}`);
    p.json = json;
  },

  async importMedia(dir, kind) {
    const p = projects.get(dir);
    if (!p) throw new Error(`Projet introuvable : ${dir}`);
    const file = await pickFile(MEDIA_FILTERS[kind].extensions.map((e) => `.${e}`).join(","));
    if (!file) return null;
    let name = `media/${slug(file.name)}`;
    for (let n = 2; p.media.has(name); n++) name = `media/${slug(file.name).replace(/(\.[^.]+)?$/, `-${n}$1`)}`;
    p.media.set(name, file);
    p.urls.set(name, URL.createObjectURL(file));
    return name;
  },

  mediaUrl: (dir, src) => projects.get(dir)?.urls.get(src) ?? src,
  listMedia: async (dir) => [...(projects.get(dir)?.media.keys() ?? [])].sort(),

  async exportZip(dir, suggestedName, texts, media) {
    const p = projects.get(dir);
    const enc = new TextEncoder();
    const tree: Record<string, Uint8Array> = {};
    for (const [name, content] of texts) tree[name] = enc.encode(content);
    for (const name of media) {
      const blob = p?.media.get(name);
      if (blob) tree[name] = new Uint8Array(await blob.arrayBuffer());
    }
    const url = URL.createObjectURL(new Blob([zipSync(tree)], { type: "application/zip" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return suggestedName;
  },

  confirm: async (message) => window.confirm(message),
};
