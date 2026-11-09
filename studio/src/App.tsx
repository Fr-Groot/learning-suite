import { useEffect, useState, useSyncExternalStore } from "react";
import "@player/player.css";
import "./App.css";
import { handleRequest, notices, saveProject, startAutosave } from "./commands.ts";
import { getLang, useT } from "./i18n/index.ts";
import { backend } from "./io/backend.ts";
import { store, useEditor } from "./model/store.ts";
import { Editor } from "./ui/Editor.tsx";
import { Welcome } from "./ui/Welcome.tsx";

function App() {
  const { project, dirty } = useEditor();
  const [ready, setReady] = useState(false);
  const notice = useSyncExternalStore(notices.subscribe, notices.get);
  // Changer de langue redessine toute l'interface (le module ouvert n'est pas touché).
  useT();
  const lang = getLang();
  useEffect(() => void (document.documentElement.lang = lang), [lang]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let alive = true;
    void backend().then(async (b) => {
      setReady(true);
      // Studio lancé par le lanceur (« ouvre ce module ») ou déjà ouvert et sollicité.
      const unlisten = await b.listenRequests((req) => void handleRequest(req));
      if (alive) stop = unlisten;
      else unlisten();
      await handleRequest(await b.startupRequest());
    });
    const stopAutosave = startAutosave();
    return () => {
      alive = false;
      stop?.();
      stopAutosave();
    };
  }, []);

  // Dans l'appli Windows : titre de la fenêtre, et enregistrement automatique à la fermeture.
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/window").then(async ({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      unlisten = await win.onCloseRequested(async (e) => {
        if (!store.get().dirty) return;
        e.preventDefault();
        await saveProject(true);
        await win.destroy();
      });
    });
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    const title = project ? `${dirty ? "• " : ""}${project.meta.title} — Learning Suite Studio` : "Learning Suite Studio";
    document.title = title;
    if ("__TAURI_INTERNALS__" in window) void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => getCurrentWindow().setTitle(title));
  }, [project?.meta.title, dirty]);

  if (!ready) return null;
  return (
    <>
      <div key={lang} className="st-root">{project ? <Editor /> : <Welcome />}</div>
      {notice && (
        <div className={`st-notice st-notice--${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
          {notice.text}
        </div>
      )}
    </>
  );
}

export default App;
