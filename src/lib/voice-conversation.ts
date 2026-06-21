import { streamStoryTTS, type StreamHandle, type TtsVoice } from "./tts-player";

export function speakOnce(text: string, voice: TtsVoice): StreamHandle {
  return streamStoryTTS({ chunks: [text], voice });
}

export function speakAndWait(text: string, voice: TtsVoice): Promise<void> {
  return new Promise((resolve) => {
    const h = streamStoryTTS({
      chunks: [text],
      voice,
      onEnded: () => resolve(),
    });
    // safety: also resolve when done promise completes
    h.done.finally(() => resolve());
  });
}

// --- text matching helpers (client-only, deterministic) ---

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchChildName(
  said: string,
  children: { id: string; name: string }[],
): { id: string; name: string }[] {
  const n = normalize(said);
  if (!n) return [];
  // exact word match first
  const exact = children.filter((c) => n.split(" ").includes(normalize(c.name)));
  if (exact.length) return exact;
  // contains
  return children.filter((c) => n.includes(normalize(c.name)));
}

const FAVORITE_WORDS = ["preferit", "gia", "già", "ascoltata", "ascoltato", "vecchia", "stessa", "ripeti", "riascolt"];
const NEW_WORDS = ["nuov", "inventa", "inventiamo", "crea", "creiamo", "altra", "diversa", "fresca"];

export type StoryChoice = "favorite" | "new" | "unknown";

export function matchStoryChoice(said: string): StoryChoice {
  const n = normalize(said);
  if (!n) return "unknown";
  const isFav = FAVORITE_WORDS.some((w) => n.includes(w));
  const isNew = NEW_WORDS.some((w) => n.includes(w));
  if (isFav && !isNew) return "favorite";
  if (isNew && !isFav) return "new";
  return "unknown";
}

export function matchFavoriteTitle<T extends { id: string; title: string }>(
  said: string,
  list: T[],
): T | null {
  const n = normalize(said);
  if (!n) return null;
  let best: { item: T; score: number } | null = null;
  for (const it of list) {
    const titleWords = normalize(it.title).split(" ").filter((w) => w.length > 3);
    let score = 0;
    for (const w of titleWords) if (n.includes(w)) score++;
    if (score > 0 && (!best || score > best.score)) best = { item: it, score };
  }
  return best?.item ?? null;
}

// Sanitize a free-text theme answer into 1-3 safe words.
const BAD_WORDS = ["sangue", "morte", "sesso", "droga", "guerra", "uccidere", "morire", "religion", "dio", "diavolo", "satana"];
export function sanitizeTheme(said: string): string {
  const n = normalize(said);
  if (!n) return "";
  for (const bad of BAD_WORDS) if (n.includes(bad)) return "";
  // take last 6 words max
  return n.split(" ").slice(-6).join(" ").slice(0, 80);
}