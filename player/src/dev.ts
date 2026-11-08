// Page d'aperçu (npm run open) : charge le projet, le vérifie entièrement, puis l'affiche.
import { mount } from "./index.ts";
import { LocalTracker } from "./tracker/local.ts";
import type { Project } from "./types.ts";
import { validateProject } from "./validate.ts";

const app = document.getElementById("app")!;

function showErrors(title: string, errors: string[]) {
  const box = document.createElement("div");
  box.className = "ls-errors";
  const h = document.createElement("h1");
  h.textContent = title;
  const ul = document.createElement("ul");
  for (const e of errors) {
    const li = document.createElement("li");
    li.textContent = e;
    ul.append(li);
  }
  box.append(h, ul);
  app.replaceChildren(box);
}

try {
  const res = await fetch("/project/project.json", { cache: "no-store" });
  if (!res.ok) throw new Error(`project.json introuvable (erreur ${res.status})`);
  const data: unknown = await res.json();
  const check = validateProject(data);
  if (!check.ok) showErrors("Ce projet contient des erreurs", check.errors);
  else {
    const player = mount(app, data as Project, { baseUrl: "/project/", tracker: new LocalTracker({ resume: false }) });
    // Accès pratique depuis la console du navigateur et pour les tests automatiques.
    (window as unknown as { player: unknown }).player = player;
  }
} catch (e) {
  showErrors("Impossible d'ouvrir le projet", [String(e instanceof Error ? e.message : e)]);
}
