// Zones cliquables « à trouver » : correction.
import type { HotspotBlock } from "../types.ts";

/**
 * Part de réussite, de 0 à 1 : bonnes zones trouvées, moins les mauvaises cliquées
 * (sinon il suffirait de tout cocher), rapporté au nombre de bonnes zones.
 */
export function gradeHotspot(b: HotspotBlock, selected: string[]): number {
  const correct = new Set(b.zones.filter((z) => z.correct).map((z) => z.id));
  if (correct.size === 0) return 0;
  const chosen = new Set(selected);
  let hits = 0;
  let wrong = 0;
  for (const id of chosen) {
    if (correct.has(id)) hits++;
    else if (b.zones.some((z) => z.id === id)) wrong++;
  }
  return Math.max(0, hits - wrong) / correct.size;
}
