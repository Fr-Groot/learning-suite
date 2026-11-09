// Thèmes proposés à la création d'un module (modifiables ensuite dans l'onglet Thème).
import type { Theme } from "@player/types.ts";
import type { StudioKey } from "../i18n/index.ts";

export interface ThemePreset {
  id: string;
  labelKey: StudioKey;
  theme: Theme;
}

export const THEMES: ThemePreset[] = [
  {
    id: "bleu", labelKey: "themeBleu",
    theme: {
      colors: { primary: "#2F5BEA", secondary: "#1B2A4A", accent: "#FFB020", background: "#FFFFFF", surface: "#F3F5FA", text: "#1B2A4A", success: "#1E9E5A", error: "#D64545" },
      fonts: { heading: "Segoe UI", body: "Segoe UI" }, radius: 10,
    },
  },
  {
    id: "vert", labelKey: "themeVert",
    theme: {
      colors: { primary: "#0F8A6B", secondary: "#12343B", accent: "#F2A541", background: "#FFFFFF", surface: "#EEF6F3", text: "#12343B", success: "#1E9E5A", error: "#C8473B" },
      fonts: { heading: "Georgia", body: "Segoe UI" }, radius: 14,
    },
  },
  {
    id: "corail", labelKey: "themeCorail",
    theme: {
      colors: { primary: "#E4572E", secondary: "#2E2A4F", accent: "#29A3A3", background: "#FFFDF9", surface: "#FBF0EA", text: "#2E2A4F", success: "#2E9E62", error: "#C0392B" },
      fonts: { heading: "Trebuchet MS", body: "Segoe UI" }, radius: 18,
    },
  },
  {
    id: "sobre", labelKey: "themeSobre",
    theme: {
      colors: { primary: "#3C4A5C", secondary: "#1F2933", accent: "#2F80ED", background: "#FFFFFF", surface: "#F2F4F7", text: "#1F2933", success: "#27AE60", error: "#D64545" },
      fonts: { heading: "Segoe UI", body: "Segoe UI" }, radius: 4,
    },
  },
];

/** Polices présentes sur tous les Windows récents (pas besoin de les embarquer). */
export const FONTS = ["Segoe UI", "Calibri", "Arial", "Verdana", "Tahoma", "Trebuchet MS", "Georgia", "Cambria", "Consolas"];
