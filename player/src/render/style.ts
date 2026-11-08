// Applique les surcharges de style d'une brique (par-dessus le thème).
import type { Style } from "../types.ts";

export function applyStyle(target: HTMLElement, style: Style | undefined) {
  if (!style) return;
  const s = target.style;
  if (style.color) {
    s.color = style.color;
    // Les titres et le gras ont leur propre couleur de thème : on la remplace aussi.
    s.setProperty("--lsp-heading-color", style.color);
  }
  if (style.background) s.background = style.background;
  if (style.fontSize) s.setProperty("--lsp-fs", `${style.fontSize}px`);
  if (style.bold !== undefined) s.fontWeight = style.bold ? "700" : "400";
  if (style.align) s.textAlign = style.align;
  if (style.verticalAlign) {
    target.dataset.valign = style.verticalAlign;
  }
  if (style.radius !== undefined) s.borderRadius = `${style.radius}px`;
  if (style.opacity !== undefined) s.opacity = String(style.opacity);
  if (style.padding !== undefined) s.padding = `${style.padding}px`;
}
