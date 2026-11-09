// Version « navigateur » : un PC simulé avec les modules d'exemple du dépôt.
// Rien n'est lancé : chaque action est notée dans window.__launcher.log (lu par les tests).
// Paramètres d'adresse pour les tests : ?clicksy=1 (Clicksy installé), ?nostudio=1, ?empty=1.
import type { Project } from "@player/types.ts";
import type { Backend, Installed, ModuleCard, Overview, Tool } from "./backend.ts";

const projects = import.meta.glob<Project>("../../../examples/*/project.json", { eager: true, import: "default" });
const media = import.meta.glob<string>("../../../examples/*/media/*", { eager: true, query: "?url", import: "default" });

const q = () => new URLSearchParams(location.search);
const log: string[] = [];
const state = {
  clicksy: null as Installed | null,
  tools: [] as Tool[],
  forgotten: new Set<string>(),
};
(window as unknown as { __launcher: unknown }).__launcher = { log };

function modules(): ModuleCard[] {
  if (q().has("empty")) return [];
  const day = 86_400_000;
  return Object.entries(projects)
    .map(([path, p], i) => {
      const dir = path.replace(/^\.\.\/\.\.\/\.\.\//, "").replace(/\/project\.json$/, "");
      return {
        dir,
        title: p.meta.title,
        mode: p.mode,
        language: p.meta.language ?? "fr",
        pages: p.pages.length,
        modified: Date.UTC(2026, 10, 9) - i * day,
        recent: i < 2 && !state.forgotten.has(dir),
        preview: { ...p, pages: p.pages.slice(0, 1) },
      };
    })
    .sort((a, b) => Number(b.recent) - Number(a.recent) || b.modified - a.modified);
}

const did = async (what: string) => void log.push(what);

export const memoryBackend: Backend = {
  kind: "memory",
  async overview(): Promise<Overview> {
    if (q().has("clicksy") && !state.clicksy) state.clicksy = { exe: "C:\\Clicksy\\clicksy.exe", version: "0.6.0" };
    return {
      modules: modules(),
      projectsDir: "C:\\Users\\vous\\Documents\\Learning Suite",
      studio: q().has("nostudio") ? null : { exe: "C:\\Studio\\studio.exe", version: "0.3.0" },
      clicksy: state.clicksy,
      tools: [...state.tools],
      version: "0.1.0",
    };
  },
  studioOpen: (dir) => did(`studio --open ${dir}`),
  studioNew: () => did("studio --new"),
  studioStart: () => did("studio"),
  folderOpen: (dir) => did(`dossier ${dir}`),
  moduleForget: async (dir) => void state.forgotten.add(dir),
  clicksyRun: (action) => did(action ? `clicksy --action ${action}` : "clicksy"),
  async clicksyLocate() {
    state.clicksy = { exe: "D:\\Portable\\clicksy.exe", version: null };
    return state.clicksy;
  },
  clicksyFolder: async () => "C:\\Users\\vous\\Documents\\Clicksy",
  async toolAdd() {
    const n = state.tools.length + 1;
    state.tools.push({ id: `t${n}`, name: n === 1 ? "Krita" : `Outil ${n}`, exe: `C:\\Outils\\outil${n}.exe` });
    return [...state.tools];
  },
  async toolRemove(id) {
    state.tools = state.tools.filter((t) => t.id !== id);
    return [...state.tools];
  },
  toolRun: async (id) => void log.push(`outil ${state.tools.find((t) => t.id === id)?.name}`),
  pageOpen: (which) => did(`page ${which}`),
  mediaUrl: (dir, src) => media[`../../../${dir}/${src}`] ?? src,
};
