import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STORY_COLUMNS_ADMIN =
  "id,title,subtitle,mode,language,age,duration,cover_key,is_preset,story_type,author,collection,review_status,suspended,visible_from,visible_until,tags,holiday_tag,source_url,created_at";

// ---------------------------------------------------------------------------
// Helper: verifica admin lato server (le funzioni sensibili qui sotto NON
// devono fidarsi solo del controllo client-side isAdmin() già esistente)
// ---------------------------------------------------------------------------
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Accesso negato: solo admin.");
}

// ---------------------------------------------------------------------------
// 1. TUTTE LE STORIE — lista filtrabile per il pannello "Tutte le Storie"
// ---------------------------------------------------------------------------
const ListFilterSchema = z.object({
  mode: z.string().optional(),
  age: z.enum(["3-5", "6-8", "9-12"]).optional(),
  storyType: z.enum(["original", "classic", "seasonal"]).optional(),
  reviewStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  onlySuspended: z.boolean().optional(),
});

export const listStoriesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListFilterSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    let q = context.supabase
      .from("stories")
      .select(STORY_COLUMNS_ADMIN + ",content")
      .eq("is_preset", true)
      .order("mode", { ascending: true })
      .order("age", { ascending: true });

    if (data.mode) q = q.eq("mode", data.mode);
    if (data.age) q = q.eq("age", data.age);
    if (data.storyType) q = q.eq("story_type", data.storyType);
    if (data.reviewStatus) q = q.eq("review_status", data.reviewStatus);
    if (data.onlySuspended) q = q.eq("suspended", true);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------------------------------------------------------------------------
// 2. SOSPENDI / RIATTIVA una storia (nasconde dalla libreria senza cancellarla)
// ---------------------------------------------------------------------------
export const setStorySuspended = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), suspended: z.boolean() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("stories")
      .update({ suspended: data.suspended })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 3. SCHEDULA VISIBILITÀ — "visibile dal ___ al ___" (usato anche per Festività)
// ---------------------------------------------------------------------------
export const scheduleStoryVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        visibleFrom: z.string().datetime().nullable(),
        visibleUntil: z.string().datetime().nullable(),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("stories")
      .update({ visible_from: data.visibleFrom, visible_until: data.visibleUntil })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 4. FESTIVITÀ — elenco raggruppabile lato client per holiday_tag
// ---------------------------------------------------------------------------
export const listHolidayStoriesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("stories")
      .select(STORY_COLUMNS_ADMIN)
      .eq("story_type", "seasonal")
      .order("holiday_tag", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setStoryHoliday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), holidayTag: z.string().min(1).max(40) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("stories")
      .update({ holiday_tag: data.holidayTag, story_type: "seasonal" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 5. VERIFICA NUOVE STORIE — coda di revisione
// ---------------------------------------------------------------------------
export const listPendingReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("stories")
      .select(STORY_COLUMNS_ADMIN + ",content")
      .eq("review_status", "pending")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const approveStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("stories")
      .update({ review_status: "approved" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("stories")
      .update({ review_status: "rejected" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 6. CERCA NUOVE FIABE — ricerca web (Tavily) + adattamento AI + tag automatici
//    Chiamabile a mano dal bottone in Walt, oppure da un Vercel Cron periodico
//    che chiama questa stessa server function.
// ---------------------------------------------------------------------------
const SearchInputSchema = z.object({
  topic: z.string().max(120).optional(), // es. "fiabe di Natale pubblico dominio"
  age: z.enum(["3-5", "6-8", "9-12"]).default("6-8"),
  holidayTag: z.string().max(40).optional(), // se presente, la storia va in Festività
});

type TavilyResult = { title: string; url: string; content: string };

async function searchPublicDomainTale(topic: string): Promise<TavilyResult | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY non configurata.");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query: `${topic} fiaba pubblico dominio trama riassunto`,
      search_depth: "basic",
      max_results: 5,
    }),
  });
  if (!res.ok) throw new Error(`Tavily error: ${res.status}`);
  const json = await res.json();
  const first = json.results?.[0];
  if (!first) return null;
  return { title: first.title, url: first.url, content: first.content };
}

const MODE_FALLBACK = "magica";
const WORDS_PER_MINUTE = 130;
const TARGET_DURATION = 5;

function buildAdaptationPrompt(seed: TavilyResult, age: string) {
  const targetWords = TARGET_DURATION * WORDS_PER_MINUTE;
  return `Di seguito trovi il RISULTATO DI UNA RICERCA WEB su una fiaba classica di pubblico dominio (titolo e breve descrizione, NON testo integrale protetto).

Titolo trovato: ${seed.title}
Estratto/descrizione trovata: ${seed.content.slice(0, 600)}

Il tuo compito: scrivi una RISCRITTURA COMPLETAMENTE ORIGINALE in italiano di questa fiaba classica, pensata per bambini di ${age} anni. NON copiare o tradurre il testo trovato: usalo solo per capire di quale fiaba si tratta e qual è la trama generale, poi scrivi con parole tue da zero.

Regole assolute di sicurezza per bambini:
- Ammorbidisci elementi spaventosi (niente violenza esplicita, morte cruda).
- Linguaggio semplice, ritmo musicale, frasi brevi per età ${age}.
- Nessun marchio, persona reale, religione, politica.
- Finale sereno.

Lunghezza target: circa ${targetWords} parole.

Formato di output ESATTO (mantieni le etichette in maiuscolo):
TITOLO: <titolo, max 6 parole>
SOTTOTITOLO: <una frase poetica, max 12 parole>
AUTORE: <nome dell'autore/tradizione originale della fiaba, es. "Fratelli Grimm", "Tradizione popolare italiana">
TAG: <3-5 parole chiave separate da virgola sugli argomenti/temi della storia, es. coraggio, amicizia, bosco, magia>
---
<corpo della storia in italiano, paragrafi brevi separati da riga vuota>`;
}

export const searchAndProposeClassicStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SearchInputSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("AI non configurata.");

    const topic = data.topic ?? "fiaba classica per bambini";
    const found = await searchPublicDomainTale(topic);
    if (!found) return { ok: false, reason: "Nessun risultato trovato per questa ricerca." };

    const groq = createGroq({ apiKey: groqKey });
    const model = groq("llama-3.3-70b-versatile");

    const { text } = await generateText({
      model,
      prompt: buildAdaptationPrompt(found, data.age),
      temperature: 0.85,
    });

    const titleMatch = text.match(/^TITOLO\s*:\s*(.+)/im);
    const subtitleMatch = text.match(/^SOTTOTITOLO\s*:\s*(.+)/im);
    const authorMatch = text.match(/^AUTORE\s*:\s*(.+)/im);
    const tagMatch = text.match(/^TAG\s*:\s*(.+)/im);
    const splitIdx = text.indexOf("---");
    const content = splitIdx >= 0 ? text.slice(splitIdx + 3).trim() : text.trim();

    const tags = (tagMatch?.[1] ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);

    const { data: row, error } = await context.supabase
      .from("stories")
      .insert({
        title: (titleMatch?.[1] ?? found.title).trim(),
        subtitle: (subtitleMatch?.[1] ?? "").trim(),
        content,
        mode: MODE_FALLBACK,
        language: "it",
        is_preset: true,
        story_type: data.holidayTag ? "seasonal" : "classic",
        author: (authorMatch?.[1] ?? "Tradizione popolare").trim(),
        collection: null,
        age: data.age,
        duration: TARGET_DURATION,
        cover_key: "castle",
        review_status: "pending", // <-- resta in coda finché Walt non approva
        tags,
        holiday_tag: data.holidayTag ?? null,
        source_url: found.url,
        expires_at: null,
      })
      .select(STORY_COLUMNS_ADMIN)
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, story: row };
  });