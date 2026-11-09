// Barre « Insérer » : ajoute une brique sur la page courante.
import type { Block } from "@player/types.ts";
import { importMedia } from "../commands.ts";
import type { MediaKind } from "../io/backend.ts";
import { addBlock, defaultBlock } from "../model/actions.ts";
import { store, useEditor } from "../model/store.ts";

export function InsertBar() {
  const { pageId } = useEditor();
  if (!pageId) return null;

  const insert = (block: Block) => {
    let id = "";
    store.edit((p) => {
      const r = addBlock(p, pageId, block);
      id = r.blockId;
      return r.project;
    });
    store.select([id]);
  };

  const withMedia = async (type: "image" | "video" | "audio", kind: MediaKind) => {
    const src = await importMedia(kind);
    if (src) insert(defaultBlock(type, src));
  };

  return (
    <div className="st-insert" role="toolbar" aria-label="Insérer une brique">
      <span className="st-muted">Insérer :</span>
      <button className="st-btn" onClick={() => insert({ ...defaultBlock("text"), variant: "title", content: "Titre" } as Block)}>𝐓 Titre</button>
      <button className="st-btn" onClick={() => insert(defaultBlock("text"))}>¶ Texte</button>
      <button className="st-btn" onClick={() => void withMedia("image", "image")}>🖼 Image</button>
      <button className="st-btn" onClick={() => insert(defaultBlock("shape"))}>◼ Forme</button>
      <button className="st-btn" onClick={() => insert(defaultBlock("button"))}>⏵ Bouton</button>
      <button className="st-btn" onClick={() => void withMedia("video", "video")}>🎬 Vidéo</button>
      <button className="st-btn" onClick={() => void withMedia("audio", "audio")}>🔊 Son</button>
    </div>
  );
}
