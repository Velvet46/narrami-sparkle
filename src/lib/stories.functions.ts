import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DraftSchema = z.object({
  protagonist: z.string().min(1).max(80),
  setting: z.string().min(1).max(120),
  mode: z.enum(["nanna", "avventura", "magica", "educativa", "divertente", "sportiva"]),
  duration: z.union([z.literal(3), z.literal(5), z.literal(10), z.literal(15)]),
  age: z.enum(["3-5", "6-8", "9-12"]),
  companions: z.string().max(160).optional(),
  moral: z.string().max(160).optional(),
  favoriteColor: z.string().max(40).optional(),
  favoriteAnimal: z.string().max(40).optional(),
  fearsToAvoid: z.string().max(160).optional(),
  toneHint: z.string().max(400).optional(),
  language: z.enum(["it", "en", "es", "fr", "de"]).optional().default("it"),
  childId: z.string().uuid().optional(),
});

const MODE_TONE_IT: Record<string, string> = {
  nanna: "calmo, dolce, ipnotico, ritmato come una ninna nanna; finale rassicurante che induce al sonno",
  avventura: "vivace, eroico, con momenti di scoperta e coraggio; un colpo di scena luminoso",
  magica: "stupefacente, evocativo, pieno di incantesimi e meraviglia; immagini brillanti",
  educativa: "curioso, chiaro, con piccoli concetti spiegati attraverso la storia",
  divertente: "giocoso, leggero, con dialoghi spiritosi e situazioni buffe",
  sportiva: "energico, di squadra, che celebra impegno e fair play; ritmo dinamico",
};

const LANG_META: Record<string, { name: string; titleLabel: string; subtitleLabel: string }> = {
  it: { name: "italiano", titleLabel: "TITOLO", subtitleLabel: "SOTTOTITOLO" },
  en: { name: "English", titleLabel: "TITLE", subtitleLabel: "SUBTITLE" },
  es: { name: "español", titleLabel: "TÍTULO", subtitleLabel: "SUBTÍTULO" },
  fr: { name: "français", titleLabel: "TITRE", subtitleLabel: "SOUS-TITRE" },
  de: { name: "Deutsch", titleLabel: "TITEL", subtitleLabel: "UNTERTITEL" },
};

const WORDS_PER_MINUTE = 130;

function buildPrompt(d: z.infer<typeof DraftSchema>) {
  const targetWords = d.duration * WORDS_PER_MINUTE;
  const tone = MODE_TONE_IT[d.mode];
  const lang = LANG_META[d.language] ?? LANG_META.it;
  return `Write an original fairy tale for children aged ${d.age}.
OUTPUT LANGUAGE: ${lang.name} — the title, subtitle and full story MUST be written entirely in ${lang.name}. Do not mix languages.

Protagonista: ${d.protagonist}
Ambientazione: ${d.setting}
Tono: ${tone}
${d.companions ? `Personaggi secondari: ${d.companions}` : ""}
${d.favoriteAnimal ? `Includi con grazia questo animale: ${d.favoriteAnimal}` : ""}
${d.favoriteColor ? `Un colore ricorrente nelle immagini: ${d.favoriteColor}` : ""}
${d.moral ? `Morale da trasmettere senza essere didascalica: ${d.moral}` : ""}
${d.moral ? "" : "Concludi con una piccola morale dolce, naturale, integrata nel finale (una o due frasi, mai didascalica)."}
${d.fearsToAvoid ? `EVITA assolutamente questi temi (paure del bambino): ${d.fearsToAvoid}` : ""}
${d.toneHint ? `Adatta il tono al momento della giornata: ${d.toneHint}` : ""}

Regole assolute di sicurezza per bambini:
- Nessuna violenza, sangue, morte, paure profonde, perdita dei genitori, mostri spaventosi.
- Linguaggio semplice, immagini concrete, ritmo musicale.
- Frasi brevi, ricche di sensazioni (suoni, profumi, colori).
- Nessun riferimento a marchi, persone reali, religione, politica.
- Nessun contenuto inappropriato per l'età.

Struttura: apertura accogliente, sviluppo con una piccola sfida, scoperta magica, chiusura serena${d.mode === "nanna" ? " che invita al sonno" : ""}.

Lunghezza target: circa ${targetWords} parole (${d.duration} minuti di narrazione lenta).

Strict output format (keep these exact labels in uppercase, in ${lang.name} as shown):
${lang.titleLabel}: <evocative magical title, max 6 words, in ${lang.name}>
${lang.subtitleLabel}: <one poetic sentence, max 12 words, in ${lang.name}>
---
<full story body in ${lang.name}, short paragraphs separated by blank lines>`;
}

function pickCoverKey(d: z.infer<typeof DraftSchema>): string {
  const t = `${d.protagonist} ${d.setting} ${d.companions ?? ""}`.toLowerCase();
  if (d.mode === "nanna") return /drago|dragon/.test(t) ? "dragon" : "stars";
  if (d.mode === "magica") return /drago|dragon/.test(t) ? "dragon" : "castle";
  if (d.mode === "educativa") return "books";
  if (d.mode === "divertente") return "jungle";
  if (d.mode === "sportiva") return "sport";
  if (/spazio|stell|pianeta|astro|luna|moon|galassi/.test(t)) return "space";
  if (/mar[eo]|ocean|isola|nave|pirati|spiaggia/.test(t)) return "sea";
  if (/giungla|foresta|bosco|forest|jungle|animali/.test(t)) return "jungle";
  if (/castello|re|regina|principess|knight|cavalier/.test(t)) return "castle";
  if (/notte|stelle|stars|sogno/.test(t)) return "stars";
  return "forest";
}

const HOURS_48_MS = 48 * 60 * 60 * 1000;
const STORY_COLUMNS =
  "id,title,subtitle,content,mode,language,favorite,created_at,child_id,expires_at,duration,cover_key,age";

export const generateStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DraftSchema.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("AI non configurata.");

    const google = createGoogleGenerativeAI({ apiKey: key });
    const model = google("gemini-2.5-flash-lite");

    const { text } = await generateText({
      model,
      prompt: buildPrompt(data),
      temperature: 0.95,
    });

    const titleMatch = text.match(/^(?:TITOLO|TITLE|TÍTULO|TITULO|TITRE|TITEL)\s*:\s*(.+)/im);
    const subtitleMatch = text.match(/^(?:SOTTOTITOLO|SUBTITLE|SUBT[IÍ]TULO|SOUS[- ]TITRE|UNTERTITEL)\s*:\s*(.+)/im);
    const splitIdx = text.indexOf("---");
    const content = splitIdx >= 0 ? text.slice(splitIdx + 3).trim() : text.trim();

    const title = (titleMatch?.[1] ?? "✨").trim();
    const subtitle = (subtitleMatch?.[1] ?? "").trim();

    const expiresAt = new Date(Date.now() + HOURS_48_MS).toISOString();

    const { data: row, error } = await context.supabase
      .from("stories")
      .insert({
        parent_id: context.userId,
        child_id: data.childId ?? null,
        title,
        subtitle,
        content,
        mode: data.mode,
        language: data.language,
        expires_at: expiresAt,
        duration: data.duration,
        cover_key: pickCoverKey(data),
        age: data.age,
      })
      .select(STORY_COLUMNS)
      .single();

    if (error) throw new Error(error.message);

    return row;
  });

export const listStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase
      .from("stories")
      .delete()
      .eq("parent_id", context.userId)
      .eq("favorite", false)
      .not("expires_at", "is", null)
      .lt("expires_at", new Date().toISOString());

    const { data, error } = await context.supabase
      .from("stories")
      .select(STORY_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveStoryPermanently = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("stories")
      .update({ expires_at: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleStoryFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), favorite: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("stories")
      .update({ favorite: data.favorite, expires_at: null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPresetStories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("stories")
      .select(STORY_COLUMNS)
      .eq("is_preset", true)
      .order("mode", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getStory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("stories")
      .select(STORY_COLUMNS)
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });