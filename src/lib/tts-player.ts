import { getAudioContext } from "./audio-context";

export type TtsVoice =
  | "alloy" | "ash" | "ballad" | "coral" | "echo"
  | "sage" | "shimmer" | "verse" | "marin" | "cedar";

export const VOICE_OPTIONS: { id: TtsVoice; label: string }[] = [
  { id: "sage",    label: "Saggia" },
  { id: "shimmer", label: "Luminosa" },
  { id: "coral",   label: "Calda" },
  { id: "ballad",  label: "Sognante" },
  { id: "verse",   label: "Poetica" },
  { id: "alloy",   label: "Neutra" },
];

export function chunkForTTS(text: string, maxChars = 1200): string[] {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const p of paragraphs) {
    if ((cur + "\n\n" + p).length > maxChars && cur) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? cur + "\n\n" + p : p;
    }
    while (cur.length > maxChars) {
      const cut = cur.lastIndexOf(". ", maxChars);
      const idx = cut > maxChars / 2 ? cut + 1 : maxChars;
      out.push(cur.slice(0, idx).trim());
      cur = cur.slice(idx).trim();
    }
  }
  if (cur) out.push(cur);
  return out;
}

export interface StreamHandle {
  stop: () => void;
  setRate: (rate: number) => void;
  done: Promise<void>;
}

export function streamStoryTTS(opts: {
  chunks: string[];
  voice: TtsVoice;
  rate?: number;
  onChunkStart?: (i: number) => void;
  onEnded?: () => void;
}): StreamHandle {
  const ctx = getAudioContext();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  let playhead = 0;
  let stopped = false;
  let rate = opts.rate ?? 1;
  const sources: AudioBufferSourceNode[] = [];
  const abort = new AbortController();

  const done = (async () => {
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    for (let i = 0; i < opts.chunks.length; i++) {
      if (stopped) break;
      opts.onChunkStart?.(i);
      await playOne(opts.chunks[i]);
    }
    const remaining = Math.max(0, playhead - ctx.currentTime);
    await new Promise((r) => setTimeout(r, remaining * 1000 + 100));
    if (!stopped) opts.onEnded?.();
  })();

  async function playOne(text: string) {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: opts.voice }),
      signal: abort.signal,
    }).catch((e) => {
      if (abort.signal.aborted) return null;
      throw e;
    });
    if (!res) return;
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`TTS ${res.status}: ${t}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    if (stopped) return;
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    if (stopped) return;
    const src = ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.playbackRate.value = rate;
    src.connect(gain);
    if (playhead === 0) playhead = ctx.currentTime + 0.08;
    else playhead = Math.max(playhead, ctx.currentTime);
    src.start(playhead);
    playhead += audioBuffer.duration / rate;
    sources.push(src);
  }

  return {
    stop() {
      stopped = true;
      abort.abort();
      for (const s of sources) {
        try { s.stop(); } catch { /* noop */ }
      }
      try { gain.disconnect(); } catch { /* noop */ }
    },
    setRate(r: number) {
      rate = r;
      for (const s of sources) {
        try { s.playbackRate.value = r; } catch { /* noop */ }
      }
    },
    done,
  };
}
