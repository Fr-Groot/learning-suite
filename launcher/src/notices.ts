// Petits messages en bas de l'écran (« Studio s'ouvre… », erreurs).
import { useSyncExternalStore } from "react";

type Notice = { text: string; kind: "info" | "error" };
let notice: Notice | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

export function tell(text: string, kind: Notice["kind"] = "info") {
  notice = { text, kind };
  listeners.forEach((fn) => fn());
  clearTimeout(timer);
  timer = setTimeout(() => {
    notice = null;
    listeners.forEach((fn) => fn());
  }, kind === "error" ? 8000 : 3000);
}

export const useNotice = () =>
  useSyncExternalStore(
    (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    () => notice,
  );
