import { streamStoryTTS } from "./tts-player";

const KEY = "millestorie:puppet-connected";

export function isPuppetConnected(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setPuppetConnected(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) window.localStorage.setItem(KEY, "1");
  else window.localStorage.removeItem(KEY);
}

/**
 * Plays a short TTS test phrase so the parent can confirm audio
 * is coming out of the Bluetooth speaker hidden inside the puppet.
 */
export async function playPuppetTestSound(): Promise<void> {
  return new Promise((resolve) => {
    const h = streamStoryTTS({
      chunks: [
        "Ciao! Sono il tuo pupazzo magico. Se mi senti bene, sono pronto a raccontarti tante storie!",
      ],
      voice: "sage",
      onEnded: () => resolve(),
    });
    h.done.finally(() => resolve());
  });
}

export function detectDevicePlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}