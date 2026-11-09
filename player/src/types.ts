// Types TypeScript du format project.json v1.
// Ils reflètent schema/project.v1.schema.json, qui reste la source de vérité.

export type Mode = "slides" | "vertical";

/** Exercice = noté (compte dans le score et le LMS). Activité = jamais notée (entraînement, découverte). */
export type Role = "exercise" | "activity";

export interface Project {
  $schema?: string;
  schemaVersion: "1.0" | "1.1" | "1.2" | "1.3";
  meta: Meta;
  mode: Mode;
  theme: Theme;
  navigation: Navigation;
  scoring: { passingScore: number };
  pages: Page[];
}

export interface Meta {
  id: string;
  title: string;
  description?: string;
  language: string;
  author?: string;
  version?: string;
  estimatedMinutes?: number;
}

export interface Theme {
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
    background: string;
    surface?: string;
    text: string;
    success?: string;
    error?: string;
  };
  fonts: { heading: string; body: string };
  radius?: number;
}

export interface Navigation {
  linear?: boolean;
  allowBack?: boolean;
  showMenu?: boolean;
  showProgress?: boolean;
}

export type UnlockRule = "always" | "voiceoverEnded" | "questionsAnswered" | "activitiesDone";

export interface Page {
  id: string;
  title: string;
  background?: { color?: string; image?: string };
  voiceover?: { src: string; transcript?: string; autoplay?: boolean };
  unlockNext?: UnlockRule;
  blocks: Block[];
}

export interface Frame {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
}

export interface Style {
  color?: string;
  background?: string;
  fontSize?: number;
  bold?: boolean;
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  radius?: number;
  opacity?: number;
  padding?: number;
}

interface BlockBase {
  id: string;
  frame?: Frame;
  width?: "full" | "content";
  style?: Style;
}

export interface TextBlock extends BlockBase {
  type: "text";
  variant?: "title" | "subtitle" | "body" | "caption";
  content: string;
}

export interface ImageBlock extends BlockBase {
  type: "image";
  src: string;
  alt: string;
  fit?: "contain" | "cover";
}

export interface ShapeBlock extends BlockBase {
  type: "shape";
  shape: "rectangle" | "ellipse" | "line";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export type ButtonAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "goto"; page: string }
  | { type: "url"; href: string };

export interface ButtonBlock extends BlockBase {
  type: "button";
  label: string;
  variant?: "primary" | "secondary";
  action: ButtonAction;
}

export interface VideoBlock extends BlockBase {
  type: "video";
  src: string;
  poster?: string;
  captions?: string;
  autoplay?: boolean;
  loop?: boolean;
}

export interface AudioBlock extends BlockBase {
  type: "audio";
  src: string;
  label?: string;
  transcript?: string;
  autoplay?: boolean;
}

export interface Choice {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuestionBlock extends BlockBase {
  type: "question";
  kind: "single" | "multiple" | "truefalse";
  prompt: string;
  choices?: Choice[];
  answer?: boolean;
  feedback?: { correct?: string; incorrect?: string };
  attempts?: number;
  shuffle?: boolean;
  points?: number;
  role?: Role;
  /** @deprecated remplacé par role (schéma 1.3) ; encore lu pour les anciens modules. */
  graded?: boolean;
}

export interface ResultsBlock extends BlockBase {
  type: "results";
  passedMessage?: string;
  failedMessage?: string;
  allowRetry?: boolean;
}

export interface HtmlBlock extends BlockBase {
  type: "html";
  src: string;
  title: string;
  role?: Role;
  /** @deprecated remplacé par role (schéma 1.3) ; encore lu pour les anciens modules. */
  graded?: boolean;
  points?: number;
  height?: number;
}

/** Réglages communs aux activités notées à plusieurs éléments (v1.2). */
interface GradedProps {
  role?: Role;
  /** @deprecated remplacé par role (schéma 1.3) ; encore lu pour les anciens modules. */
  graded?: boolean;
  points?: number;
  attempts?: number;
  /** partial = au prorata (défaut) ; all-or-nothing = 0 point s'il y a une erreur. */
  scoring?: "partial" | "all-or-nothing";
  feedback?: { correct?: string; partial?: string; incorrect?: string };
}

export interface FlipCard {
  id: string;
  front?: string;
  frontImage?: string;
  back?: string;
  backImage?: string;
  alt?: string;
}

export interface FlipCardsBlock extends BlockBase {
  type: "flipcards";
  cards: FlipCard[];
  columns?: number;
  requireAll?: boolean;
}

export interface RevealItem {
  id: string;
  title: string;
  content?: string;
  image?: string;
  alt?: string;
}

export interface RevealBlock extends BlockBase {
  type: "reveal";
  layout: "tabs" | "accordion" | "timeline";
  items: RevealItem[];
  requireAll?: boolean;
}

export interface FillBlanksBlock extends BlockBase, GradedProps {
  type: "fillblanks";
  prompt?: string;
  /** Texte avec trous : [[réponse|autre réponse]] (saisie) ou [[*bonne|mauvaise]] (liste). */
  text: string;
  caseSensitive?: boolean;
  accentSensitive?: boolean;
}

export interface DragItem {
  id: string;
  text: string;
  image?: string;
  alt?: string;
}

export interface DragDropBlock extends BlockBase, GradedProps {
  type: "dragdrop";
  kind: "categorize" | "match" | "order";
  prompt?: string;
  /** categorize : les catégories. */
  categories?: { id: string; label: string }[];
  /** categorize : éléments à ranger (category = bonne catégorie) ; order : éléments dans le bon ordre. */
  items?: (DragItem & { category?: string })[];
  /** match : paires (prompt fixe, answer à déplacer). */
  pairs?: { id: string; prompt: string; answer: string }[];
}

export interface HotspotZone {
  id: string;
  shape?: "rectangle" | "ellipse";
  /** Position et taille en % de l'image. */
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  correct?: boolean;
  content?: string;
}

export interface HotspotBlock extends BlockBase, GradedProps {
  type: "hotspot";
  kind: "find" | "explore";
  prompt?: string;
  src: string;
  alt: string;
  zones: HotspotZone[];
  requireAll?: boolean;
}

/** Activités notées (ou qui peuvent l'être). */
export type Activity = QuestionBlock | HtmlBlock | FillBlanksBlock | DragDropBlock | HotspotBlock;

/** Activités de découverte (jamais notées). */
export type Discovery = FlipCardsBlock | RevealBlock | HotspotBlock;

export type Block =
  | TextBlock
  | ImageBlock
  | ShapeBlock
  | ButtonBlock
  | VideoBlock
  | AudioBlock
  | QuestionBlock
  | ResultsBlock
  | HtmlBlock
  | FlipCardsBlock
  | RevealBlock
  | FillBlanksBlock
  | DragDropBlock
  | HotspotBlock;
