// Repères d'alignement : quand on déplace une brique, ses bords et son centre « s'aimantent »
// aux bords et centres des autres briques et de la diapositive.
import type { Frame } from "@player/types.ts";
import { STAGE } from "./actions.ts";

export interface Guides {
  x: number[];
  y: number[];
}

const THRESHOLD = 6;

function lines(others: Frame[], axis: "x" | "y"): number[] {
  const size = axis === "x" ? STAGE.w : STAGE.h;
  const out = [0, size / 2, size];
  for (const f of others) {
    const start = axis === "x" ? f.x : f.y;
    const len = axis === "x" ? f.w : f.h;
    out.push(start, start + len / 2, start + len);
  }
  return out;
}

/** Meilleur décalage pour aligner l'un des points sur l'une des lignes, s'il est assez proche. */
function bestShift(points: number[], targets: number[]): { shift: number; line: number } | null {
  let best: { shift: number; line: number } | null = null;
  for (const p of points) {
    for (const t of targets) {
      const d = t - p;
      if (Math.abs(d) <= THRESHOLD && (!best || Math.abs(d) < Math.abs(best.shift))) best = { shift: d, line: t };
    }
  }
  return best;
}

/** Déplacement : on aligne bord gauche, centre ou bord droit (idem en hauteur). */
export function snapMove(frame: Frame, others: Frame[]): { frame: Frame; guides: Guides } {
  const sx = bestShift([frame.x, frame.x + frame.w / 2, frame.x + frame.w], lines(others, "x"));
  const sy = bestShift([frame.y, frame.y + frame.h / 2, frame.y + frame.h], lines(others, "y"));
  return {
    frame: { ...frame, x: Math.round(frame.x + (sx?.shift ?? 0)), y: Math.round(frame.y + (sy?.shift ?? 0)) },
    guides: { x: sx ? [sx.line] : [], y: sy ? [sy.line] : [] },
  };
}

export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

/** Redimensionnement depuis une poignée, avec aimantation du bord tiré. Taille minimale : 20 px. */
export function resizeFrame(start: Frame, handle: Handle, dx: number, dy: number, others: Frame[]): { frame: Frame; guides: Guides } {
  let { x, y, w, h } = start;
  const guides: Guides = { x: [], y: [] };
  if (handle.includes("e")) {
    let right = x + w + dx;
    const s = bestShift([right], lines(others, "x"));
    if (s) { right += s.shift; guides.x.push(s.line); }
    w = Math.max(20, right - x);
  }
  if (handle.includes("w")) {
    let left = x + dx;
    const s = bestShift([left], lines(others, "x"));
    if (s) { left += s.shift; guides.x.push(s.line); }
    left = Math.min(left, x + w - 20);
    w = x + w - left;
    x = left;
  }
  if (handle.includes("s")) {
    let bottom = y + h + dy;
    const s = bestShift([bottom], lines(others, "y"));
    if (s) { bottom += s.shift; guides.y.push(s.line); }
    h = Math.max(20, bottom - y);
  }
  if (handle.includes("n")) {
    let top = y + dy;
    const s = bestShift([top], lines(others, "y"));
    if (s) { top += s.shift; guides.y.push(s.line); }
    top = Math.min(top, y + h - 20);
    h = y + h - top;
    y = top;
  }
  return { frame: { ...start, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }, guides };
}
