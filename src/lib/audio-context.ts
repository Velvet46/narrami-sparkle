let sharedCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new AudioContext({ sampleRate: 24000 });
  }
  return sharedCtx;
}

/**
 * Da chiamare in modo SINCRONO dentro un onClick, PRIMA di qualsiasi await.
 * Sblocca l'AudioContext su iOS/WebView (Gmail, Outlook, ecc.).
 */
export function unlockAudioContext(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    /* noop */
  }
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|GSA\/|gmail|Outlook|Twitter|wv\)/i.test(ua);
}
