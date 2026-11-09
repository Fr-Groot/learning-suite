// Voix off d'une page : lecture, pause, transcription, et signal de fin.
import type { Translate } from "./i18n.ts";
import type { Page } from "./types.ts";

export interface VoiceoverControls {
  stop(): void;
}

export function startVoiceover(
  page: Page,
  resolve: (src: string) => string,
  ui: { button: HTMLButtonElement; transcriptToggle: HTMLButtonElement; transcript: HTMLElement; t: Translate },
  onEnded: () => void,
): VoiceoverControls {
  const vo = page.voiceover;
  ui.transcript.hidden = true;
  ui.transcriptToggle.setAttribute("aria-expanded", "false");
  if (!vo) {
    ui.button.hidden = true;
    ui.transcriptToggle.hidden = true;
    return { stop() {} };
  }

  const audio = new Audio(resolve(vo.src));
  audio.preload = "auto";
  ui.button.hidden = false;
  ui.transcriptToggle.hidden = !vo.transcript;
  ui.transcript.textContent = vo.transcript ?? "";

  const label = () => {
    const playing = !audio.paused && !audio.ended;
    ui.button.textContent = ui.t(playing ? "voPause" : audio.ended ? "voReplay" : "voListen");
    ui.button.setAttribute("aria-label", ui.t(playing ? "voPauseAria" : "voListenAria"));
  };
  const onClick = () => {
    if (audio.paused || audio.ended) void audio.play().catch(() => {});
    else audio.pause();
  };
  const onToggle = () => {
    ui.transcript.hidden = !ui.transcript.hidden;
    ui.transcriptToggle.setAttribute("aria-expanded", String(!ui.transcript.hidden));
  };
  let finished = false;
  const finish = () => {
    if (!finished) {
      finished = true;
      onEnded();
    }
    label();
  };
  // Si le fichier est introuvable, on ne bloque pas l'apprenant.
  const onError = () => {
    console.warn(`[lecteur] voix off introuvable : ${vo.src}`);
    ui.button.hidden = true;
    finish();
  };

  ui.button.addEventListener("click", onClick);
  ui.transcriptToggle.addEventListener("click", onToggle);
  audio.addEventListener("play", label);
  audio.addEventListener("pause", label);
  audio.addEventListener("ended", finish);
  audio.addEventListener("error", onError);
  label();
  if (vo.autoplay !== false) {
    // Le navigateur peut refuser la lecture automatique : le bouton « Écouter » reste disponible.
    void audio.play().catch(label);
  }

  return {
    stop() {
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", finish);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      ui.button.removeEventListener("click", onClick);
      ui.transcriptToggle.removeEventListener("click", onToggle);
    },
  };
}
