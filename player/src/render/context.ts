// Ce que chaque brique peut demander au lecteur pendant l'affichage.
import type { MultiActivity, Response, QuestionState, Score } from "../activities.ts";
import type { Translate } from "../i18n.ts";
import type { ButtonAction, HtmlBlock, Mode, Project, QuestionBlock } from "../types.ts";

export interface RenderContext {
  project: Project;
  mode: Mode;
  /** Adresse complète d'un fichier media/… */
  resolve(src: string): string;
  /** Exécute l'action d'un bouton. */
  act(action: ButtonAction): void;
  /** Le bouton peut-il agir maintenant ? (ex. « Suivant » verrouillé) */
  canAct(action: ButtonAction): boolean;
  questionState(id: string): QuestionState;
  submit(q: QuestionBlock, response: Response): QuestionState;
  /** Graine de mélange des choix, fixe pendant la session. */
  seed: number;
  /** Un jeu HTML a envoyé un score ou signalé sa fin. */
  reportHtml(b: HtmlBlock, msg: { score?: number; completed?: boolean }): void;
  /** Activité de découverte : un élément (carte, onglet, zone) a été ouvert. */
  openItem(blockId: string, itemId: string, allIds: string[], requireAll: boolean): void;
  /** Valide une activité à plusieurs éléments (texte à trous, glisser-déposer, zones). */
  submitMulti(b: MultiActivity, response: Response): QuestionState;
  score(): Score;
  retry(): void;
  /** Une brique s'abonne pour se redessiner quand l'état change (score, verrous). */
  onUpdate(fn: () => void): void;
  /** Nettoyage à faire quand on quitte la page (écouteurs…). */
  onDispose(fn: () => void): void;
  doc: Document;
  /** Textes du lecteur dans la langue du module. */
  t: Translate;
}

/** Petit utilitaire pour créer un élément avec classes et attributs. */
export function el<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  props: { class?: string; text?: string; attrs?: Record<string, string> } = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const e = doc.createElement(tag);
  if (props.class) e.className = props.class;
  if (props.text !== undefined) e.textContent = props.text;
  for (const [k, v] of Object.entries(props.attrs ?? {})) e.setAttribute(k, v);
  e.append(...children);
  return e;
}
