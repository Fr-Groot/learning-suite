// Barre « Insérer » : ajoute une brique sur la page courante.
import type { Block } from "@player/types.ts";
import { importMedia } from "../commands.ts";
import type { MediaKind } from "../io/backend.ts";
import { addBlock, defaultBlock } from "../model/actions.ts";
import { store, useEditor } from "../model/store.ts";
import { tr, trFor } from "../i18n/index.ts";

export function InsertBar() {
  const { pageId, project } = useEditor();
  const lang = project?.meta.language;
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
    if (src) insert(defaultBlock(type, src, lang));
  };

  return (
    <div className="st-insert" role="toolbar" aria-label={tr("insertBar")}>
      <span className="st-muted">{tr("insert")}</span>
      <button className="st-btn" onClick={() => insert({ ...defaultBlock("text", undefined, lang), variant: "title", content: trFor(lang, "cTitle") } as Block)}>{tr("insTitle")}</button>
      <button className="st-btn" onClick={() => insert(defaultBlock("text", undefined, lang))}>{tr("insText")}</button>
      <button className="st-btn" onClick={() => void withMedia("image", "image")}>{tr("insImage")}</button>
      <button className="st-btn" onClick={() => insert(defaultBlock("shape", undefined, lang))}>{tr("insShape")}</button>
      <button className="st-btn" onClick={() => insert(defaultBlock("button", undefined, lang))}>{tr("insButton")}</button>
      <button className="st-btn" onClick={() => void withMedia("video", "video")}>{tr("insVideo")}</button>
      <button className="st-btn" onClick={() => void withMedia("audio", "audio")}>{tr("insAudio")}</button>
    </div>
  );
}
