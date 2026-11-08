// Construction d'un paquet exporté : HTML5 (site autonome) ou SCORM 1.2 (pour un LMS).
// Code sans dépendance au disque : il servira aussi dans Studio (bouton « Exporter »).
import { zipSync, type Zippable } from "fflate";
import type { Project } from "../types.ts";
import { scorm12Manifest } from "./manifest.ts";

export type ExportFormat = "html5" | "scorm12";

export interface ExportInput {
  project: Project;
  /** Fichiers du dossier media/, clés de la forme « media/… ». */
  media: Map<string, Uint8Array>;
  playerJs: string;
  playerCss: string;
  format: ExportFormat;
}

const enc = new TextEncoder();

/** Renvoie la liste des fichiers du paquet (chemin → contenu). */
export function buildPackage({ project, media, playerJs, playerCss, format }: ExportInput): Map<string, Uint8Array> {
  const files = new Map<string, Uint8Array>();
  files.set("index.html", enc.encode(indexHtml(project, format)));
  files.set("player.js", enc.encode(playerJs));
  files.set("player.css", enc.encode(playerCss));
  // Le projet est embarqué dans un script : le paquet marche même ouvert en double-clic.
  files.set("project.js", enc.encode(`window.__LS_PROJECT__ = ${JSON.stringify(project)};\n`));
  for (const [path, data] of [...media].sort(([a], [b]) => a.localeCompare(b))) {
    if (!path.startsWith("media/") || path.includes("..")) throw new Error(`Chemin de média refusé : ${path}`);
    files.set(path, data);
  }
  if (format === "scorm12") {
    files.set("imsmanifest.xml", enc.encode(scorm12Manifest(project, [...files.keys()])));
  }
  return files;
}

/** Compresse le paquet. Les médias déjà compressés (mp3, mp4, png, jpg) sont stockés tels quels. */
export function zipPackage(files: Map<string, Uint8Array>): Uint8Array {
  const tree: Zippable = {};
  const stored = /\.(mp3|mp4|m4a|webm|png|jpe?g|gif|webp|woff2?|zip)$/i;
  for (const [path, data] of files) tree[path] = [data, { level: stored.test(path) ? 0 : 6 }];
  return zipSync(tree);
}

/** Nom de fichier lisible : « Découvrir Learning Suite » → « decouvrir-learning-suite ». */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "module"
  );
}

export const packageName = (project: Project, format: ExportFormat) => `${slugify(project.meta.title)}-${format}.zip`;

export function indexHtml(project: Project, format: ExportFormat): string {
  const title = escapeHtml(project.meta.title);
  const tracker = format === "scorm12" ? "scorm12" : "local";
  return `<!doctype html>
<html lang="${escapeHtml(project.meta.language)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Learning Suite">
<title>${title}</title>
<link rel="stylesheet" href="player.css">
<style>html, body { margin: 0; height: 100%; }</style>
</head>
<body>
<div id="app"></div>
<noscript>Ce module a besoin de JavaScript.</noscript>
<script src="project.js"></script>
<script src="player.js"></script>
<script>LearningPlayer.start({ tracker: "${tracker}" });</script>
</body>
</html>
`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
