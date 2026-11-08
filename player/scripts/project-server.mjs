// Petit greffon Vite : sert le dossier d'un projet (project.json + media/)
// sous l'adresse /project/, pour l'aperçu en développement.
import fs from "node:fs";
import path from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".vtt": "text/vtt; charset=utf-8",
};

export function projectServer(projectDir) {
  return {
    name: "learning-suite-project",
    configureServer(server) {
      if (!projectDir) return;
      const root = path.resolve(projectDir);
      server.middlewares.use("/project", (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? "/").split("?")[0]);
        const file = path.resolve(root, "." + rel);
        // Refuse tout chemin qui sortirait du dossier du projet.
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          return next();
        }
        res.setHeader("Content-Type", TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream");
        res.setHeader("Cache-Control", "no-store");
        fs.createReadStream(file).pipe(res);
      });
    },
  };
}
