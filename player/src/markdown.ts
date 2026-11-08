// Mini-Markdown : **gras**, *italique*, listes (- ou 1.), [lien](https://…), retours à la ligne.
// On construit les éléments un par un (jamais d'innerHTML) : aucun code ne peut être injecté.

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "link"; href: string; c: Inline[] }
  | { t: "br" };

export type MdBlock =
  | { type: "p"; c: Inline[] }
  | { type: "ul" | "ol"; items: Inline[][] };

const UL = /^\s*[-*]\s+(.*)$/;
const OL = /^\s*\d+[.)]\s+(.*)$/;

export function parseMarkdown(src: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", c: joinLines(para) });
    para = [];
  };
  for (const line of src.replace(/\r\n?/g, "\n").split("\n")) {
    const ul = UL.exec(line);
    const ol = ul ? null : OL.exec(line);
    if (ul || ol) {
      flush();
      const type = ul ? "ul" : "ol";
      const last = blocks[blocks.length - 1];
      const item = parseInline((ul ?? ol)![1]);
      if (last && last.type === type) last.items.push(item);
      else blocks.push({ type, items: [item] });
    } else if (line.trim() === "") {
      flush();
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}

function joinLines(lines: string[]): Inline[] {
  const out: Inline[] = [];
  lines.forEach((l, i) => {
    if (i > 0) out.push({ t: "br" });
    out.push(...parseInline(l));
  });
  return out;
}

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  let i = 0;
  const pushText = () => {
    if (text) out.push({ t: "text", v: text });
    text = "";
  };
  while (i < src.length) {
    if (src.startsWith("**", i)) {
      const end = src.indexOf("**", i + 2);
      if (end > i + 2) {
        pushText();
        out.push({ t: "strong", c: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    } else if (src[i] === "*") {
      const end = src.indexOf("*", i + 1);
      if (end > i + 1 && !src.startsWith("**", end)) {
        pushText();
        out.push({ t: "em", c: parseInline(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    } else if (src[i] === "[") {
      const m = /^\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/.exec(src.slice(i));
      if (m) {
        pushText();
        out.push({ t: "link", href: m[2], c: parseInline(m[1]) });
        i += m[0].length;
        continue;
      }
    }
    text += src[i];
    i++;
  }
  pushText();
  return out;
}

/** Transforme le mini-Markdown en éléments de page. */
export function renderMarkdown(src: string, doc: Document = document): DocumentFragment {
  const frag = doc.createDocumentFragment();
  for (const block of parseMarkdown(src)) {
    if (block.type === "p") {
      const p = doc.createElement("p");
      appendInlines(p, block.c, doc);
      frag.append(p);
    } else {
      const list = doc.createElement(block.type);
      for (const item of block.items) {
        const li = doc.createElement("li");
        appendInlines(li, item, doc);
        list.append(li);
      }
      frag.append(list);
    }
  }
  return frag;
}

function appendInlines(parent: HTMLElement, inlines: Inline[], doc: Document) {
  for (const n of inlines) {
    if (n.t === "text") parent.append(doc.createTextNode(n.v));
    else if (n.t === "br") parent.append(doc.createElement("br"));
    else {
      const el = doc.createElement(n.t === "strong" ? "strong" : n.t === "em" ? "em" : "a");
      if (n.t === "link") {
        (el as HTMLAnchorElement).href = n.href;
        (el as HTMLAnchorElement).target = "_blank";
        (el as HTMLAnchorElement).rel = "noopener noreferrer";
      }
      appendInlines(el, n.c, doc);
      parent.append(el);
    }
  }
}

/** Texte brut, sans mise en forme (pour les titres de fenêtre, l'accessibilité). */
export function plainText(src: string): string {
  const walk = (ins: Inline[]): string =>
    ins.map((n) => (n.t === "text" ? n.v : n.t === "br" ? " " : walk(n.c))).join("");
  return parseMarkdown(src)
    .map((b) => (b.type === "p" ? walk(b.c) : b.items.map(walk).join(" ")))
    .join(" ");
}
