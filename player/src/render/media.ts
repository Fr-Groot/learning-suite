import type { AudioBlock, VideoBlock } from "../types.ts";
import { el, type RenderContext } from "./context.ts";

export function renderVideo(b: VideoBlock, ctx: RenderContext): HTMLElement {
  const video = el(ctx.doc, "video", { class: "lsp-video", attrs: { src: ctx.resolve(b.src), controls: "", preload: "metadata", playsinline: "" } });
  if (b.poster) video.poster = ctx.resolve(b.poster);
  if (b.autoplay) {
    // Les navigateurs n'autorisent la lecture automatique qu'en muet.
    video.muted = true;
    video.autoplay = true;
  }
  video.loop = !!b.loop;
  if (b.captions) {
    video.append(
      el(ctx.doc, "track", {
        attrs: { kind: "captions", src: ctx.resolve(b.captions), srclang: ctx.project.meta.language, label: "Sous-titres", default: "" },
      }),
    );
  }
  return video;
}

export function renderAudio(b: AudioBlock, ctx: RenderContext): HTMLElement {
  const box = el(ctx.doc, "figure", { class: "lsp-audio" });
  if (b.label) box.append(el(ctx.doc, "figcaption", { text: b.label }));
  const audio = el(ctx.doc, "audio", { attrs: { src: ctx.resolve(b.src), controls: "", preload: "metadata" } });
  audio.autoplay = !!b.autoplay;
  box.append(audio);
  if (b.transcript) {
    const details = el(ctx.doc, "details", { class: "lsp-transcript-inline" });
    details.append(el(ctx.doc, "summary", { text: "Transcription" }), el(ctx.doc, "p", { text: b.transcript }));
    box.append(details);
  }
  return box;
}
