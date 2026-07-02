import { getAudioContext } from "./audio-context";

export type TtsVoice = "shimmer" | "verse";

export const VOICE_OPTIONS: { id: TtsVoice; label: string }[] = [
  { id: "shimmer", label: "Sarah" },
  { id: "verse",   label: "Matilda" },
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
  let playhead = ctx.currentTime;
  let stopped = false;
  let currentRate = opts.rate ?? 1;
  const { chunks, voice, onChunkStart, onEnded } = opts;

  let resolveDone!: () => void;
  const done = new Promise<void>((r) => { resolveDone = r; });

  async function fetchChunk(text: string): Promise<AudioBuffer> {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice }),
    });
    if (!res.ok) throw new Error(`TTS ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return ctx.decodeAudioData(arrayBuffer);
  }

  async function run() {
    try {
      if (ctx.state === "suspended") await ctx.resume();
      for (let i = 0; i < chunks.length; i++) {
        if (stopped) break;
        onChunkStart?.(i);
        const buffer = await fetchChunk(chunks[i]);
        if (stopped) break;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = currentRate;
        source.connect(gain);
        const start = Math.max(ctx.currentTime, playhead);
        source.start(start);
        playhead = start + buffer.duration / currentRate;
        if (i === chunks.length - 1) {
          source.onended = () => { onEnded?.(); resolveDone(); };
        }
      }
    } catch (e) {
      console.error("TTS error:", e);
      resolveDone();
    }
  }

  run();

  return {
    stop: () => {
      stopped = true;
      try { gain.disconnect(); } catch { /* noop */ }
      resolveDone();
    },
    setRate: (rate: number) => { currentRate = rate; },
    done,
  };
}
