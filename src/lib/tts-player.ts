import { createParser } from "eventsource-parser";
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

// Split long text into chunks that stay under the model input cap.
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

/**
 * Stream TTS audio chunks for a list of text segments, played gaplessly.
 * onProgress is called with elapsed seconds (approx, based on audio scheduling).
 */
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
      await streamOne(opts.chunks[i], i);
    }
    // Wait for the last scheduled audio to actually finish
    const remaining = Math.max(0, playhead - ctx.currentTime);
    await new Promise((r) => setTimeout(r, remaining * 1000 + 100));
    if (!stopped) opts.onEnded?.();
  })();

  async function streamOne(text: string, _idx: number) {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: opts.voice }),
      signal: abort.signal,
    }).catch((e) => {
      if (abort.signal.aborted) return null;
      throw e;
    });
    if (!res || !res.ok || !res.body) {
      if (res && !res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`TTS ${res.status}: ${t}`);
      }
      return;
    }

    let pending = new Uint8Array(0);
    const parser = createParser({
      onEvent(event) {
        if (stopped) return;
        let payload: { type?: string; audio?: string };
        try { payload = JSON.parse(event.data); } catch { return; }
        if (payload.type !== "speech.audio.delta" || !payload.audio) return;
        const bin = atob(payload.audio);
        const incoming = new Uint8Array(bin.length);
        for (let j = 0; j < bin.length; j++) incoming[j] = bin.charCodeAt(j);
        const bytes = new Uint8Array(pending.length + incoming.length);
        bytes.set(pending);
        bytes.set(incoming, pending.length);
        const usable = bytes.length - (bytes.length % 2);
        pending = bytes.slice(usable);
        if (usable === 0) return;
        const samples = new Int16Array(bytes.buffer, 0, usable / 2);
        const floats = Float32Array.from(samples, (s) => s / 32768);
        const buf = ctx.createBuffer(1, floats.length, 24000);
        buf.copyToChannel(floats, 0);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = rate;
        src.connect(gain);
        if (playhead === 0) playhead = ctx.currentTime + 0.08;
        else playhead = Math.max(playhead, ctx.currentTime);
        src.start(playhead);
        playhead += buf.duration / rate;
        sources.push(src);
      },
    });

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    try {
      while (true) {
        const { value, done: rd } = await reader.read();
        if (rd) break;
        if (stopped) break;
        parser.feed(value);
      }
    } catch (e) {
      if (!abort.signal.aborted) throw e;
    }
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