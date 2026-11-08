// Navigation entre pages : page courante, pages vues, verrous « Suivant ».
// Logique pure, sans affichage.
import type { Project } from "./types.ts";

export class Navigator {
  private index = 0;
  private readonly visited = new Set<number>([0]);
  /** Pages dont la condition de déblocage est remplie. */
  private readonly unlocked = new Set<number>();
  private readonly project: Project;

  constructor(project: Project) {
    this.project = project;
    this.refreshUnlock(0);
  }

  get current() {
    return this.index;
  }
  get count() {
    return this.project.pages.length;
  }
  get page() {
    return this.project.pages[this.index];
  }
  get visitedCount() {
    return this.visited.size;
  }
  get allVisited() {
    return this.visited.size === this.count;
  }
  /** Progression de 0 à 1 (pages vues / total). */
  get progress() {
    return this.visited.size / this.count;
  }

  isVisited(i: number) {
    return this.visited.has(i);
  }

  /** Signale qu'une condition (fin de voix off, réponses) est remplie pour la page courante. */
  unlockCurrent() {
    this.unlocked.add(this.index);
  }

  /** Reverrouille une page (ex. « Recommencer le quiz »). Sans effet sur une page « always ». */
  lock(i: number) {
    this.unlocked.delete(i);
    this.refreshUnlock(i);
  }

  isUnlocked(i = this.index) {
    return this.unlocked.has(i);
  }

  canNext() {
    return this.index < this.count - 1 && this.isUnlocked();
  }

  canPrev() {
    return this.index > 0 && this.project.navigation.allowBack !== false;
  }

  /** Le menu permet-il d'aller à la page i ? */
  canJumpTo(i: number) {
    if (i < 0 || i >= this.count || i === this.index) return false;
    if (i < this.index) return this.canPrev();
    if (!this.project.navigation.linear) return true;
    // Parcours imposé : seulement les pages déjà vues, ou la suivante si elle est débloquée.
    return this.visited.has(i) || (i === this.index + 1 && this.isUnlocked());
  }

  /** Va à la page i si c'est permis. Renvoie vrai si la page a changé. */
  goTo(i: number, force = false) {
    if (!force && !this.canJumpTo(i)) return false;
    if (i < 0 || i >= this.count) return false;
    this.index = i;
    this.visited.add(i);
    this.refreshUnlock(i);
    return true;
  }

  next() {
    return this.canNext() && this.goTo(this.index + 1, true);
  }

  prev() {
    return this.canPrev() && this.goTo(this.index - 1, true);
  }

  /** État à sauvegarder pour la reprise. */
  snapshot() {
    return { page: this.index, visited: [...this.visited], unlocked: [...this.unlocked] };
  }

  /** Reprend un état sauvegardé (les valeurs hors limites sont ignorées). */
  restore(s: { page: number; visited: number[]; unlocked: number[] }) {
    const ok = (i: number) => Number.isInteger(i) && i >= 0 && i < this.count;
    s.visited.filter(ok).forEach((i) => this.visited.add(i));
    s.unlocked.filter(ok).forEach((i) => this.unlocked.add(i));
    if (ok(s.page)) {
      this.index = s.page;
      this.visited.add(s.page);
      this.refreshUnlock(s.page);
    }
  }

  indexOf(pageId: string) {
    return this.project.pages.findIndex((p) => p.id === pageId);
  }

  /** Les pages sans condition sont débloquées dès l'arrivée ; une page déjà débloquée le reste. */
  private refreshUnlock(i: number) {
    const rule = this.project.pages[i].unlockNext ?? "always";
    if (rule === "always") this.unlocked.add(i);
  }
}
