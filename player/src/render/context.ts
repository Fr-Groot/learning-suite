// Ce que chaque brique peut demander au lecteur pendant l'affichage.
import type { Response, QuestionState, Score } from "../quiz.ts";
import type { ButtonAction, Mode, Project, QuestionBlock } from "../types.ts";

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
  score(): Score;
  retry(): void;
  /** Une brique s'abonne pour se redessiner quand l'état change (score, verrous). */
  onUpdate(fn: () => void): void;
  doc: Document;
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
