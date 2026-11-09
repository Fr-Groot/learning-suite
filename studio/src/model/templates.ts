// Modèles de page (schema/templates/), chargés au démarrage de Studio.
import type { Mode, Page } from "@player/types.ts";
import type { StudioKey } from "../i18n/index.ts";

const files = import.meta.glob("@schema/templates/*/*.json", { eager: true, import: "default" }) as Record<string, Page>;

export interface PageTemplate {
  id: string;
  labelKey: StudioKey;
  mode: Mode;
  page: Page;
}

const ORDER = ["titre-texte-image", "image-pleine-page", "deux-colonnes", "citation", "question", "resultat"];

export const TEMPLATES: PageTemplate[] = Object.entries(files)
  .map(([path, page]) => {
    const [, mode, name] = /\/(slides|vertical)\/([^/]+)\.json$/.exec(path) ?? [];
    return { id: name, labelKey: `tpl_${name.replace(/-/g, "_")}` as StudioKey, mode: mode as Mode, page };
  })
  .filter((t) => t.id)
  .sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

export const templatesFor = (mode: Mode) => TEMPLATES.filter((t) => t.mode === mode);

/** Page vide, pour « Page blanche ». */
export const blankPage = (title = "Nouvelle page"): Page => ({ id: "page", title, blocks: [] });
