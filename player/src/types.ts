// Types TypeScript du format project.json v1.
// Ils reflètent schema/project.v1.schema.json, qui reste la source de vérité.

export type Mode = "slides" | "vertical";

export interface Project {
  $schema?: string;
  schemaVersion: "1.0";
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

export type UnlockRule = "always" | "voiceoverEnded" | "questionsAnswered";

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
  graded?: boolean;
}

export interface ResultsBlock extends BlockBase {
  type: "results";
  passedMessage?: string;
  failedMessage?: string;
  allowRetry?: boolean;
}

export type Block =
  | TextBlock
  | ImageBlock
  | ShapeBlock
  | ButtonBlock
  | VideoBlock
  | AudioBlock
  | QuestionBlock
  | ResultsBlock;
