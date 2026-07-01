import { streamStoryTTS, type StreamHandle, type TtsVoice } from "./tts-player";
import { supabase } from "@/integrations/supabase/client";

export function speakOnce(text: string, voice: TtsVoice): StreamHandle {
  return streamStoryTTS({ chunks: [text], voice });
}

export function speakAndWait(text: string, voice: TtsVoice): Promise<void> {
  return new Promise((resolve) => {
    const h = streamStoryTTS({ chunks: [text], voice, onEnded: () => resolve() });
    h.done.finally(() => resolve());
  });
}

// --- text matching helpers ---
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function matchChildName(said: string, children: { id: string; name: string }[]): { id: string; name: string }[] {
  const n = normalize(said);
  if (!n) return [];
  const exact = children.filter((c) => n.split(" ").includes(normalize(c.name)));
  if (exact.length) return exact;
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

export function matchFavoriteTitle<T extends { id: string; title: string }>(said: string, list: T[]): T | null {
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

// --- Parole vietate ---
const BAD_WORDS_HARD = [
  "cazzo", "figa", "vaffanculo", "merda", "coglione", "stronzo", "bastardo",
  "puttana", "troia", "minchia", "fanculo", "porco", "bestemmia", "gesù", "madonna",
  "cristo", "dio cane", "porco dio", "porca", "ostia",
];
const BAD_WORDS_SOFT = ["cacca", "pipì", "culo", "puzza", "scoreggia", "sbavone"];
const SENSITIVE_WORDS = [
  "sangue", "morte", "sesso", "droga", "guerra", "uccidere", "morire",
  "diavolo", "satana", "armi", "pistola", "coltello", "bomba",
  "razzismo", "fascismo", "nazismo", "terrorismo",
];
const POLITICAL_WORDS = [
  "politica", "partito", "governo", "destra", "sinistra", "comunismo",
  "fascismo", "democrazia", "elezioni", "voto", "presidente", "ministro",
];
const RELIGIOUS_WORDS = [
  "allah", "maometto", "corano", "bibbia", "vangelo", "papa", "chiesa",
  "moschea", "sinagoga", "buddha", "krishna", "ateo", "infedele",
];

export type WordCategory = "hard" | "soft" | "sensitive" | "political" | "religious" | "clean";

export function detectBadWord(said: string): { category: WordCategory; word: string } {
  const n = normalize(said);
  for (const w of BAD_WORDS_HARD) if (n.includes(normalize(w))) return { category: "hard", word: w };
  for (const w of BAD_WORDS_SOFT) if (n.includes(normalize(w))) return { category: "soft", word: w };
  for (const w of SENSITIVE_WORDS) if (n.includes(normalize(w))) return { category: "sensitive", word: w };
  for (const w of POLITICAL_WORDS) if (n.includes(normalize(w))) return { category: "political", word: w };
  for (const w of RELIGIOUS_WORDS) if (n.includes(normalize(w))) return { category: "religious", word: w };
  return { category: "clean", word: "" };
}

export async function logBadWord(childId: string, parentId: string, word: string, context: string) {
  try {
    await supabase.from("behavior_logs").insert({ child_id: childId, parent_id: parentId, word, context });
  } catch { /* silent */ }
}

// --- Risposte per categoria e età ---
type AgeRange = "3-5" | "6-8" | "9-12";
type Gender = "m" | "f" | "n";

export function getGreeting(name: string, age: AgeRange, gender: Gender): string {
  if (age === "3-5") return `Ciao ${name}! Come stai oggi?`;
  if (age === "6-8") {
    if (gender === "f") return `Ciao ${name}! Oggi come ti senti, sei felice?`;
    if (gender === "m") return `Ciao ${name}! Tutto bene oggi? Sei pronto per una storia?`;
    return `Ciao ${name}! Come stai oggi?`;
  }
  if (gender === "f") return `Ciao ${name}! Come va oggi? Ti va di ascoltare una storia?`;
  if (gender === "m") return `Ciao ${name}! Ciao! Pronto per un'avventura?`;
  return `Ciao ${name}! Come stai oggi?`;
}

export function getWellResponse(age: AgeRange): string {
  if (age === "3-5") return "Che bello! Allora iniziamo subito!";
  if (age === "6-8") return "Ottimo! Allora costruiamo insieme una storia fantastica!";
  return "Perfetto! Allora creiamo insieme qualcosa di speciale!";
}

export function getBadResponse(age: AgeRange): string {
  if (age === "3-5") return "Oh no! Non ti preoccupare, ti racconto una storia divertente e tutto passerà!";
  if (age === "6-8") return "Mi dispiace! Ma sai cosa? Le storie belle fanno passare anche i momenti tristi. Iniziamo!";
  return "Capisco. A volte le giornate sono così. Ma una bella storia può aiutare. Dai, iniziamo!";
}

export function getNoAnswerResponse(age: AgeRange, attempt: number): string {
  if (attempt >= 3) {
    if (age === "3-5") return "Ok! Allora ti racconto una storia magica!";
    return "Ok, iniziamo con una bella storia!";
  }
  if (age === "3-5") return "Ehi! Ci sei? Come stai?";
  if (age === "6-8") return "Non ti sento bene! Puoi dirmi come stai?";
  return "Non ho sentito bene. Stai bene?";
}

export function getSettingQuestion(age: AgeRange): string {
  if (age === "3-5") return "Dove vuoi che sia la storia? Nel bosco, nel mare o tra le stelle?";
  if (age === "6-8") return "Dove si svolge la nostra avventura? Dimmi un posto!";
  return "Che ambientazione vuoi per la storia? Puoi descriverla come vuoi!";
}

export function getProtagonistQuestion(age: AgeRange, gender: Gender): string {
  if (age === "3-5") {
    if (gender === "f") return "Chi è la protagonista? Una fatina, una principessa o un animale?";
    if (gender === "m") return "Chi è il protagonista? Un drago, un supereroe o un animale?";
    return "Chi sarà il protagonista? Un animale, un bambino o qualcosa di magico?";
  }
  if (age === "6-8") {
    return "Chi vuoi come protagonista della storia?";
  }
  return "Descrivi il protagonista della storia. Chi è, come si chiama?";
}

export function getMoodQuestion(age: AgeRange): string {
  if (age === "3-5") return "Vuoi una storia divertente o una storia per dormire?";
  if (age === "6-8") return "Che tipo di storia vuoi? Avventura, magia, o qualcosa di divertente?";
  return "Che tipo di storia preferisci? Avventura, mistero, magia o umorismo?";
}

export function getBadWordResponse(category: WordCategory, age: AgeRange): string {
  if (category === "hard") {
    if (age === "3-5") return "Ops! Quelle parole non le usiamo. Dimmi qualcos'altro!";
    if (age === "6-8") return "Quella parola non è gentile. Proviamo a dirlo in un altro modo!";
    return "Preferirei che usassimo un linguaggio più rispettoso. Riprova!";
  }
  if (category === "soft") {
    if (age === "3-5") return "Ahah! Ok ok! Ma usiamo parole più carine, dai!";
    return "Capito! Ma proviamo con parole un po' più eleganti!";
  }
  if (category === "political") {
    return "La politica è un argomento complicato per tutti! Restiamo sulle storie!";
  }
  if (category === "religious") {
    return "Le credenze di ognuno sono personali e preziose. Nelle storie esploriamo la fantasia!";
  }
  return "Preferiamo non parlare di queste cose. Torniamo alla storia!";
}

export function detectGenderFromAnswer(said: string, currentGender: Gender): Gender {
  const n = normalize(said);
  const femaleWords = ["principessa", "fatina", "regina", "bambina", "fata", "maga", "sirena", "unicorno"];
  const maleWords = ["drago", "cavaliere", "supereroe", "robot", "pirata", "dinosauro", "guerriero"];
  const hasFemale = femaleWords.some((w) => n.includes(w));
  const hasMale = maleWords.some((w) => n.includes(w));
  if (hasFemale && !hasMale) return "f";
  if (hasMale && !hasFemale) return "m";
  return currentGender; // mantieni quello originale se ambiguo
}

export function sanitizeTheme(said: string): string {
  const { category } = detectBadWord(said);
  if (category !== "clean" && category !== "soft") return "";
  const n = normalize(said);
  return n.split(" ").slice(-6).join(" ").slice(0, 80);
}
