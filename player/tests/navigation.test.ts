import { describe, expect, it } from "vitest";
import { Navigator } from "../src/navigation.ts";
import type { Project } from "../src/types.ts";
import { miniProject } from "./fixture.ts";

function threePages(): Project {
  const p = miniProject();
  p.pages = [
    { id: "a", title: "A", blocks: [] },
    { id: "b", title: "B", unlockNext: "questionsAnswered", blocks: [] },
    { id: "c", title: "C", blocks: [] },
  ];
  return p;
}

describe("navigation", () => {
  it("avance et recule", () => {
    const n = new Navigator(threePages());
    expect(n.canPrev()).toBe(false);
    expect(n.next()).toBe(true);
    expect(n.current).toBe(1);
    expect(n.prev()).toBe(true);
    expect(n.current).toBe(0);
  });

  it("bloque « Suivant » tant que la condition n'est pas remplie", () => {
    const n = new Navigator(threePages());
    n.next();
    expect(n.canNext()).toBe(false);
    n.unlockCurrent();
    expect(n.canNext()).toBe(true);
  });

  it("une page débloquée le reste quand on revient", () => {
    const n = new Navigator(threePages());
    n.next();
    n.unlockCurrent();
    n.next();
    n.prev();
    expect(n.canNext()).toBe(true);
  });

  it("parcours imposé : pas de saut vers une page non vue", () => {
    const p = threePages();
    p.navigation.linear = true;
    const n = new Navigator(p);
    expect(n.canJumpTo(2)).toBe(false);
    expect(n.canJumpTo(1)).toBe(true);
  });

  it("parcours libre : le menu va partout", () => {
    const p = threePages();
    p.navigation.linear = false;
    const n = new Navigator(p);
    expect(n.goTo(2)).toBe(true);
    expect(n.visitedCount).toBe(2);
  });

  it("sans retour arrière", () => {
    const p = threePages();
    p.navigation.allowBack = false;
    const n = new Navigator(p);
    n.next();
    expect(n.canPrev()).toBe(false);
    expect(n.canJumpTo(0)).toBe(false);
  });

  it("progression et fin", () => {
    const p = threePages();
    p.pages[1].unlockNext = "always";
    const n = new Navigator(p);
    expect(n.progress).toBeCloseTo(1 / 3);
    n.next();
    n.next();
    expect(n.allVisited).toBe(true);
    expect(n.progress).toBe(1);
  });
});
