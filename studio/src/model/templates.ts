// Modèles de page (schema/templates/), chargés au démarrage de Studio.
import type { Mode, Page } from "@player/types.ts";

const files = import.meta.glob("@schema/templates/*/*.json", { eager: true, import: "default" }) as Record<string, Page>;

export interface PageTemplate {
  id: string;
  label: string;
  mode: Mode;
  page: Page;
}

const LABELS: Record<string, string> = {
  "titre-texte-image": "Titre, texte et image",
  "image-pleine-page": "Image pleine page",
  "deux-colonnes": "Deux colonnes",
  citation: "Citation",
  question: "Question",
  resultat: "Résultat",
};
const ORDER = Object.keys(LABELS);

export const TEMPLATES: PageTemplate[] = Object.entries(files)
  .map(([path, page]) => {
    const [, mode, name] = /\/(slides|vertical)\/([^/]+)\.json$/.exec(path) ?? [];
    return { id: name, label: LABELS[name] ?? name, mode: mode as Mode, page };
  })
  .filter((t) => t.id)
  .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

export const templatesFor = (mode: Mode) => TEMPLATES.filter((t) => t.mode === mode);

/** Page vide, pour « Page blanche ». */
export const blankPage = (): Page => ({ id: "page", title: "Nouvelle page", blocks: [] });
