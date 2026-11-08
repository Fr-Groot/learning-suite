import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown, plainText } from "../src/markdown.ts";

describe("mini-Markdown", () => {
  it("gras, italique et lien", () => {
    expect(parseInline("a **b** *c* [d](https://x.fr)")).toEqual([
      { t: "text", v: "a " },
      { t: "strong", c: [{ t: "text", v: "b" }] },
      { t: "text", v: " " },
      { t: "em", c: [{ t: "text", v: "c" }] },
      { t: "text", v: " " },
      { t: "link", href: "https://x.fr", c: [{ t: "text", v: "d" }] },
    ]);
  });

  it("refuse les liens qui ne sont pas en https", () => {
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ t: "text", v: "[x](javascript:alert(1))" }]);
  });

  it("laisse le HTML tel quel, sous forme de texte", () => {
    expect(parseInline("<b>hop</b>")).toEqual([{ t: "text", v: "<b>hop</b>" }]);
  });

  it("paragraphes, retours à la ligne et listes", () => {
    const blocks = parseMarkdown("Ligne 1\nLigne 2\n\n- un\n- deux\n1. premier");
    expect(blocks.map((b) => b.type)).toEqual(["p", "ul", "ol"]);
    expect(blocks[0]).toMatchObject({ c: [{ v: "Ligne 1" }, { t: "br" }, { v: "Ligne 2" }] });
    expect(blocks[1]).toMatchObject({ items: [[{ v: "un" }], [{ v: "deux" }]] });
  });

  it("une étoile seule reste une étoile", () => {
    expect(plainText("5 * 3")).toBe("5 * 3");
  });
});
