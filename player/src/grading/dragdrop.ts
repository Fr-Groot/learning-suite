// Glisser-déposer : un seul modèle pour les trois variantes.
// Des « éléments » à placer dans des « cibles » :
//   categorize : cibles = catégories (plusieurs éléments chacune)
//   match      : cibles = les débuts de paires (un élément chacune)
//   order      : cibles = les positions 1, 2, 3… (un élément chacune)
import type { DragDropBlock } from "../types.ts";

export interface DragModel {
  items: { id: string; text: string; image?: string; alt?: string }[];
  targets: { id: string; label: string; capacity: number }[];
  /** Bonne cible de chaque élément. */
  expected: Record<string, string>;
}

export function dragModel(b: DragDropBlock): DragModel {
  if (b.kind === "categorize") {
    const items = (b.items ?? []).map(({ category: _c, ...it }) => it);
    return {
      items,
      targets: (b.categories ?? []).map((c) => ({ id: c.id, label: c.label, capacity: Infinity })),
      expected: Object.fromEntries((b.items ?? []).map((it) => [it.id, it.category ?? ""])),
    };
  }
  if (b.kind === "match") {
    const pairs = b.pairs ?? [];
    return {
      items: pairs.map((p) => ({ id: p.id, text: p.answer })),
      targets: pairs.map((p) => ({ id: `slot-${p.id}`, label: p.prompt, capacity: 1 })),
      expected: Object.fromEntries(pairs.map((p) => [p.id, `slot-${p.id}`])),
    };
  }
  const items = (b.items ?? []).map(({ category: _c, ...it }) => it);
  return {
    items,
    targets: items.map((_, i) => ({ id: `pos-${i + 1}`, label: String(i + 1), capacity: 1 })),
    expected: Object.fromEntries(items.map((it, i) => [it.id, `pos-${i + 1}`])),
  };
}

/** Part d'éléments bien placés, de 0 à 1. La réponse associe chaque élément à sa cible. */
export function gradeDragDrop(b: DragDropBlock, response: Record<string, string>): number {
  const { items, expected } = dragModel(b);
  if (items.length === 0) return 0;
  return items.filter((it) => response[it.id] === expected[it.id]).length / items.length;
}
