import { describe, expect, it } from "vitest";
import { DICTIONARIES, langOf, translator } from "../src/i18n.ts";

describe("langues du lecteur", () => {
  it("le français et l'anglais ont exactement les mêmes textes", () => {
    expect(Object.keys(DICTIONARIES.en).sort()).toEqual(Object.keys(DICTIONARIES.fr).sort());
    for (const [k, v] of Object.entries(DICTIONARIES.en)) expect(v, k).not.toBe("");
  });

  it("les valeurs à insérer ({n}, {pct}…) sont les mêmes dans les deux langues", () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of Object.keys(DICTIONARIES.fr) as (keyof typeof DICTIONARIES.fr)[]) {
      expect(vars(DICTIONARIES.en[k]), k).toEqual(vars(DICTIONARIES.fr[k]));
    }
  });

  it("la langue suit celle du module", () => {
    expect(langOf("fr")).toBe("fr");
    expect(langOf("fr-CA")).toBe("fr");
    expect(langOf("en")).toBe("en");
    expect(langOf("es")).toBe("en"); // autre langue : anglais en attendant
    expect(translator("en")("attemptsLeftMany", { n: 3 })).toBe("You have 3 attempts left.");
    expect(translator("fr")("partial", { pct: 75 })).toBe("Partiellement juste : 75 %");
  });
});
