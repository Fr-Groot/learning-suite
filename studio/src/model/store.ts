// Le « magasin » de l'éditeur : le projet ouvert, la sélection, et l'historique
// pour annuler / rétablir. Les composants React s'y abonnent avec useEditor().
import { useSyncExternalStore } from "react";
import type { Project } from "@player/types.ts";

export interface EditorState {
  project: Project | null;
  /** Dossier du projet sur le disque (null = jamais enregistré). */
  dir: string | null;
  /** Modifications non enregistrées. */
  dirty: boolean;
  pageId: string | null;
  selection: string[];
  canUndo: boolean;
  canRedo: boolean;
}

const LIMIT = 100;

export class EditorStore {
  private state: EditorState = { project: null, dir: null, dirty: false, pageId: null, selection: [], canUndo: false, canRedo: false };
  private past: Project[] = [];
  private future: Project[] = [];
  /** Projet avant un geste en cours (déplacement à la souris) : une seule étape d'historique. */
  private gestureStart: Project | null = null;
  private listeners = new Set<() => void>();

  get = () => this.state;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private set(patch: Partial<EditorState>) {
    this.state = { ...this.state, ...patch, canUndo: this.past.length > 0, canRedo: this.future.length > 0 };
    this.listeners.forEach((fn) => fn());
  }

  /** Ouvre un projet (nouveau ou lu sur le disque) : l'historique repart de zéro. */
  load(project: Project, dir: string | null, dirty = false) {
    this.past = [];
    this.future = [];
    this.gestureStart = null;
    this.set({ project, dir, dirty, pageId: project.pages[0]?.id ?? null, selection: [] });
  }

  close() {
    this.past = [];
    this.future = [];
    this.set({ project: null, dir: null, dirty: false, pageId: null, selection: [] });
  }

  /** Applique une modification. Pendant un geste, l'historique n'est noté qu'à la fin. */
  edit(change: (p: Project) => Project) {
    const { project } = this.state;
    if (!project) return;
    const next = change(project);
    if (next === project) return;
    if (!this.gestureStart) {
      this.past.push(project);
      if (this.past.length > LIMIT) this.past.shift();
      this.future = [];
    }
    this.set({ project: next, dirty: true, ...this.fixSelection(next) });
  }

  beginGesture() {
    this.gestureStart = this.state.project;
  }

  endGesture() {
    const start = this.gestureStart;
    this.gestureStart = null;
    if (start && start !== this.state.project) {
      this.past.push(start);
      if (this.past.length > LIMIT) this.past.shift();
      this.future = [];
      this.set({});
    }
  }

  undo() {
    const prev = this.past.pop();
    if (!prev || !this.state.project) return;
    this.future.push(this.state.project);
    this.set({ project: prev, dirty: true, ...this.fixSelection(prev) });
  }

  redo() {
    const next = this.future.pop();
    if (!next || !this.state.project) return;
    this.past.push(this.state.project);
    this.set({ project: next, dirty: true, ...this.fixSelection(next) });
  }

  selectPage(pageId: string) {
    this.set({ pageId, selection: [] });
  }

  select(ids: string[]) {
    this.set({ selection: ids });
  }

  markSaved(dir: string) {
    this.set({ dir, dirty: false });
  }

  /** Après une modification, la page et la sélection doivent encore exister. */
  private fixSelection(p: Project): Partial<EditorState> {
    const page = p.pages.find((x) => x.id === this.state.pageId) ?? p.pages[0];
    const ids = new Set(page?.blocks.map((b) => b.id));
    return { pageId: page?.id ?? null, selection: this.state.selection.filter((id) => ids.has(id)) };
  }
}

export const store = new EditorStore();

export function useEditor(): EditorState {
  return useSyncExternalStore(store.subscribe, store.get);
}
