import { describe, expect, it } from "vitest";
import { STUDIO_DICTIONARIES, trFor } from "./index.ts";

describe("langues de Studio", () => {
  const { fr, en } = STUDIO_DICTIONARIES;
  it("le français et l'anglais ont exactement les mêmes textes", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
    for (const [k, v] of Object.entries(en)) expect(v, k).not.toBe("");
  });
  it("les valeurs à insérer sont les mêmes dans les deux langues", () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const k of Object.keys(fr) as (keyof typeof fr)[]) expect(vars(en[k]), k).toEqual(vars(fr[k]));
  });
  it("le contenu par défaut suit la langue du module", () => {
    expect(trFor("en", "cWelcomePage")).toBe("Welcome");
    expect(trFor("fr-CA", "cWelcomePage")).toBe("Accueil");
  });
});
