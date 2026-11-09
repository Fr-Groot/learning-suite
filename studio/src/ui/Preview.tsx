// Aperçu : le vrai lecteur, comme l'apprenant le verra, à partir de la page en cours.
import { useEffect, useRef } from "react";
import { Player } from "@player/player.ts";
import { LocalTracker } from "@player/tracker/local.ts";
import { mediaUrl } from "../commands.ts";
import { useEditor } from "../model/store.ts";

export function Preview({ onClose }: { onClose: () => void }) {
  const { project, pageId } = useEditor();
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current || !project) return;
    const title = document.title; // le lecteur change le titre de la fenêtre : on le remettra
    const start = Math.max(0, project.pages.findIndex((p) => p.id === pageId));
    new Player(host.current, structuredClone(project), {
      resolveMedia: mediaUrl,
      tracker: new LocalTracker({ log: false, resume: false }),
      startPage: start,
    });
    const node = host.current;
    return () => {
      // Arrête les sons et vidéos en quittant l'aperçu.
      node.querySelectorAll("audio, video").forEach((m) => (m as HTMLMediaElement).pause());
      node.replaceChildren();
      document.title = title;
    };
    // L'aperçu montre l'état du module au moment de l'ouverture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="st-preview" role="dialog" aria-label="Aperçu du module">
      <div className="st-preview-player" ref={host} />
      <button className="st-btn st-btn--primary st-preview-close" onClick={onClose}>✕ Fermer l'aperçu</button>
    </div>
  );
}
