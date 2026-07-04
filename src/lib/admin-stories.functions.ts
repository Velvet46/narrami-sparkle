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

async function isDuplicateSource(supabase: any, sourceUrl: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("stories")
    .select("id")
    .eq("source_url", sourceUrl)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
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
      .select(STORY_COLUMNS_ADMIN)
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
  holidayTag: z.string().max(40).optional(), // se presente, la storia va in Festività
});

const VALID_AGES = ["3-5", "6-8", "9-12"] as const;

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

const VALID_MODES = ["avventura", "divertente", "educativa", "magica", "nanna", "sportiva"] as const;
const WORDS_PER_MINUTE = 130;
const TARGET_DURATION = 5;

function buildAdaptationPrompt(seed: TavilyResult) {
  const targetWords = TARGET_DURATION * WORDS_PER_MINUTE;
  return `Di seguito trovi il RISULTATO DI UNA RICERCA WEB su una fiaba classica di pubblico dominio (titolo e breve descrizione, NON testo integrale protetto).

Titolo trovato: ${seed.title}
Estratto/descrizione trovata: ${seed.content.slice(0, 600)}

Il tuo compito: scrivi una RISCRITTURA COMPLETAMENTE ORIGINALE in italiano di questa fiaba classica per bambini. Prima di scrivere, valuta TU STESSO a quale fascia d'età si adatta meglio il contenuto originale (temi, complessità, elementi spaventosi) tra: 3-5 anni, 6-8 anni, 9-12 anni. NON copiare o tradurre il testo trovato: usalo solo per capire di quale fiaba si tratta e qual è la trama generale, poi scrivi con parole tue da zero, calibrando linguaggio e ritmo sulla fascia d'età che hai scelto.

Regole assolute di sicurezza per bambini:
- Ammorbidisci elementi spaventosi (niente violenza esplicita, morte cruda).
- Linguaggio e ritmo coerenti con la fascia d'età che scegli.
- Nessun marchio, persona reale, religione, politica.
- Finale sereno.

Lunghezza target: circa ${targetWords} parole.

Formato di output ESATTO (mantieni le etichette in maiuscolo):
TITOLO: <titolo, max 6 parole>
SOTTOTITOLO: <una frase poetica, max 12 parole>
AUTORE: <nome dell'autore/tradizione originale della fiaba, es. "Fratelli Grimm", "Tradizione popolare italiana">
GENERE: <scegli UNA sola parola tra: avventura, divertente, educativa, magica, nanna, sportiva — quella più adatta alla storia>
ETA: <scegli UNA sola tra: 3-5, 6-8, 9-12 — quella più adatta al contenuto>
NOTA_PUBBLICO_DOMINIO: <una frase che spiega perché questa fiaba è di pubblico dominio, es. "Fiaba raccolta dai Fratelli Grimm, morti nel 1859 e nel 1863: opera di pubblico dominio da oltre un secolo">
TAG: <3-5 parole chiave separate da virgola sugli argomenti/temi della storia, es. coraggio, amicizia, bosco, magia>
---
<corpo della storia in italiano, paragrafi brevi separati da riga vuota>`;
}

function parseAge(text: string): (typeof VALID_AGES)[number] {
  const etaMatch = text.match(/^ETA\s*:\s*(.+)/im);
  const raw = (etaMatch?.[1] ?? "").trim();
  return (VALID_AGES as readonly string[]).includes(raw) ? (raw as (typeof VALID_AGES)[number]) : "6-8";
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

    if (await isDuplicateSource(context.supabase, found.url)) {
      return { ok: false, reason: "Questa fiaba (stessa fonte) è già presente in libreria." };
    }

    const groq = createGroq({ apiKey: groqKey });
    const model = groq("llama-3.3-70b-versatile");

    const { text } = await generateText({
      model,
      prompt: buildAdaptationPrompt(found),
      temperature: 0.85,
    });

    const titleMatch = text.match(/^TITOLO\s*:\s*(.+)/im);
    const subtitleMatch = text.match(/^SOTTOTITOLO\s*:\s*(.+)/im);
    const authorMatch = text.match(/^AUTORE\s*:\s*(.+)/im);
    const modeMatch = text.match(/^GENERE\s*:\s*(.+)/im);
    const pdNoteMatch = text.match(/^NOTA_PUBBLICO_DOMINIO\s*:\s*(.+)/im);
    const tagMatch = text.match(/^TAG\s*:\s*(.+)/im);
    const splitIdx = text.indexOf("---");
    const content = splitIdx >= 0 ? text.slice(splitIdx + 3).trim() : text.trim();

    const rawMode = (modeMatch?.[1] ?? "").trim().toLowerCase();
    const mode = (VALID_MODES as readonly string[]).includes(rawMode) ? rawMode : "magica";
    const pdNote = (pdNoteMatch?.[1] ?? "").trim();
    const age = parseAge(text);

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
        mode,
        language: "it",
        is_preset: true,
        story_type: data.holidayTag ? "seasonal" : "classic",
        author: (authorMatch?.[1] ?? "Tradizione popolare").trim(),
        collection: pdNote || null,
        age,
        duration: TARGET_DURATION,
        cover_key: "castle",
        review_status: "pending",
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
// ---------------------------------------------------------------------------
// 7. IMPORTA DA LINK — come sopra ma parti da un URL che conosci già
//    (Liber Liber, Wikisource, Progetto Gutenberg...) invece di cercare con
//    Tavily. Utile per caricare in blocco fiabe da fonti di pubblico dominio
//    già verificate, senza consumare le ricerche mensili gratuite.
// ---------------------------------------------------------------------------
const ImportFromUrlSchema = z.object({
  url: z.string().url(),
  holidayTag: z.string().max(40).optional(),
});

async function fetchPageAsSeed(url: string): Promise<TavilyResult> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; WaltImportBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Impossibile scaricare la pagina (${res.status}).`);
  const html = await res.text();

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return { title, url, content: text.slice(0, 4000) };
}

export const importClassicStoryFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImportFromUrlSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("AI non configurata.");

    const seed = await fetchPageAsSeed(data.url);
    if (!seed.content) {
      return { ok: false, reason: "Non sono riuscito a leggere del testo da questa pagina." };
    }

    if (await isDuplicateSource(context.supabase, data.url)) {
      return { ok: false, reason: "Questa fiaba (stesso link) è già presente in libreria." };
    }

    const groq = createGroq({ apiKey: groqKey });
    const model = groq("llama-3.3-70b-versatile");

    const { text } = await generateText({
      model,
      prompt: buildAdaptationPrompt(seed),
      temperature: 0.85,
    });

    const titleMatch = text.match(/^TITOLO\s*:\s*(.+)/im);
    const subtitleMatch = text.match(/^SOTTOTITOLO\s*:\s*(.+)/im);
    const authorMatch = text.match(/^AUTORE\s*:\s*(.+)/im);
    const tagMatch = text.match(/^TAG\s*:\s*(.+)/im);
    const splitIdx = text.indexOf("---");
    const content = splitIdx >= 0 ? text.slice(splitIdx + 3).trim() : text.trim();
    const age = parseAge(text);

    const tags = (tagMatch?.[1] ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);

    const { data: row, error } = await context.supabase
      .from("stories")
      .insert({
        title: (titleMatch?.[1] ?? seed.title).trim(),
        subtitle: (subtitleMatch?.[1] ?? "").trim(),
        content,
        mode: MODE_FALLBACK,
        language: "it",
        is_preset: true,
        story_type: data.holidayTag ? "seasonal" : "classic",
        author: (authorMatch?.[1] ?? "Tradizione popolare").trim(),
        collection: null,
        age,
        duration: TARGET_DURATION,
        cover_key: "castle",
        review_status: "pending", // <-- resta in coda finché Walt non approva
        tags,
        holiday_tag: data.holidayTag ?? null,
        source_url: data.url,
        expires_at: null,
      })
      .select(STORY_COLUMNS_ADMIN)
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, story: row };
  });

// ---------------------------------------------------------------------------
// 8. CORREGGI ETÀ — usato nella coda di revisione se l'AI ha sbagliato fascia
// ---------------------------------------------------------------------------
export const updateStoryAge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), age: z.enum(["3-5", "6-8", "9-12"]) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("stories")
      .update({ age: data.age })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 9. FONTI — lista di siti da cui pescare fiabe (usata dal cron giornaliero)
// ---------------------------------------------------------------------------
export const listStorySources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("story_sources")
      .select("id,url,label,active,last_used_at,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addStorySource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ url: z.string().url(), label: z.string().max(80).optional() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("story_sources")
      .insert({ url: data.url, label: data.label ?? null });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeStorySource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("story_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleStorySource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("story_sources")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// 10. RICERCA AUTOMATICA GIORNALIERA — chiamata dal cron (src/routes/api/cron/*)
//     NON è una createServerFn: niente sessione utente nel cron, la sicurezza
//     è garantita dal secret verificato nella API route che la invoca.
//     Usa un client Supabase con service role, passato dal chiamante.
// ---------------------------------------------------------------------------
export async function runDailySourceSearch(supabaseServiceClient: any) {
  const { data: sources, error: srcErr } = await supabaseServiceClient
    .from("story_sources")
    .select("id,url,active,last_used_at")
    .eq("active", true)
    .order("last_used_at", { ascending: true, nullsFirst: true })
    .limit(1);

  if (srcErr) throw new Error(srcErr.message);
  const source = sources?.[0];
  if (!source) return { ok: false, reason: "Nessuna fonte attiva configurata." };

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("AI non configurata.");

  const seed = await fetchPageAsSeed(source.url);
  if (!seed.content) {
    await supabaseServiceClient
      .from("story_sources")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", source.id);
    return { ok: false, reason: "Pagina della fonte non leggibile, riprovo domani con la prossima." };
  }

  if (await isDuplicateSource(supabaseServiceClient, source.url)) {
    await supabaseServiceClient
      .from("story_sources")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", source.id);
    return { ok: false, reason: "Fonte già usata in passato, salto e segno come usata." };
  }

  const groq = createGroq({ apiKey: groqKey });
  const model = groq("llama-3.3-70b-versatile");

  const { text } = await generateText({
    model,
    prompt: buildAdaptationPrompt(seed),
    temperature: 0.85,
  });

  const titleMatch = text.match(/^TITOLO\s*:\s*(.+)/im);
  const subtitleMatch = text.match(/^SOTTOTITOLO\s*:\s*(.+)/im);
  const authorMatch = text.match(/^AUTORE\s*:\s*(.+)/im);
  const modeMatch = text.match(/^GENERE\s*:\s*(.+)/im);
  const pdNoteMatch = text.match(/^NOTA_PUBBLICO_DOMINIO\s*:\s*(.+)/im);
  const tagMatch = text.match(/^TAG\s*:\s*(.+)/im);
  const splitIdx = text.indexOf("---");
  const content = splitIdx >= 0 ? text.slice(splitIdx + 3).trim() : text.trim();
  const rawMode = (modeMatch?.[1] ?? "").trim().toLowerCase();
  const mode = (VALID_MODES as readonly string[]).includes(rawMode) ? rawMode : "magica";
  const age = parseAge(text);
  const tags = (tagMatch?.[1] ?? "")
    .split(",")
    .map((t: string) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

  const { data: row, error } = await supabaseServiceClient
    .from("stories")
    .insert({
      title: (titleMatch?.[1] ?? seed.title).trim(),
      subtitle: (subtitleMatch?.[1] ?? "").trim(),
      content,
      mode,
      language: "it",
      is_preset: true,
      story_type: "classic",
      author: (authorMatch?.[1] ?? "Tradizione popolare").trim(),
      collection: (pdNoteMatch?.[1] ?? "").trim() || null,
      age,
      duration: TARGET_DURATION,
      cover_key: "castle",
      review_status: "pending",
      tags,
      holiday_tag: null,
      source_url: source.url,
      expires_at: null,
    })
    .select("id,title")
    .single();

  if (error) throw new Error(error.message);

  await supabaseServiceClient
    .from("story_sources")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", source.id);

  return { ok: true, story: row };
}
