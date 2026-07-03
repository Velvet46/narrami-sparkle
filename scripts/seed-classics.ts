/**
 * Script standalone (NON è una createServerFn, va lanciato da terminale una tantum)
 * per popolare la sezione "Classiche" della libreria con riscritture originali
 * di fiabe di pubblico dominio.
 *
 * Uso:
 *   1. npm install @supabase/supabase-js ai @ai-sdk/groq
 *      npm install -D tsx
 *   2. Aggiungi al .env: SUPABASE_SERVICE_ROLE_KEY=... (serve la service role,
 *      NON la publishable key, perché questo script bypassa l'auth utente
 *      e scrive direttamente su Supabase)
 *   3. npx tsx scripts/seed-classics.ts
 *
 * Lo script è idempotente: se una storia con stesso titolo+autore+età esiste
 * già, la salta invece di duplicarla. Puoi rilanciarlo in sicurezza.
 */

import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !GROQ_API_KEY) {
  throw new Error(
    "Mancano variabili d'ambiente: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY"
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const groq = createGroq({ apiKey: GROQ_API_KEY });
const model = groq("llama-3.3-70b-versatile");

type AgeRange = "3-5" | "6-8" | "9-12";

type ClassicSeed = {
  author: string;
  collection: string;
  title: string;
  plot: string;
  coverKey: string;
};

const CLASSICS: ClassicSeed[] = [
  {
    author: "Fratelli Grimm",
    collection: "Fiabe del focolare",
    title: "Cappuccetto Rosso",
    plot: "Una bambina con un mantello rosso attraversa il bosco per portare cibo alla nonna malata e incontra un lupo che la inganna sulla strada.",
    coverKey: "forest",
  },
  {
    author: "Fratelli Grimm",
    collection: "Fiabe del focolare",
    title: "Hansel e Gretel",
    plot: "Due fratellini si perdono nel bosco e trovano una casetta di marzapane abitata da una vecchia signora che nasconde un segreto.",
    coverKey: "forest",
  },
  {
    author: "Fratelli Grimm",
    collection: "Fiabe del focolare",
    title: "Biancaneve e i Sette Nani",
    plot: "Una principessa dal cuore gentile trova rifugio presso sette piccoli minatori dopo essere fuggita da un pericolo, e impara il valore dell'amicizia.",
    coverKey: "forest",
  },
  {
    author: "Fratelli Grimm",
    collection: "Fiabe del focolare",
    title: "Cenerentola",
    plot: "Una ragazza gentile e paziente riceve un aiuto magico per partecipare a un grande ballo, e la sua vera natura viene finalmente riconosciuta.",
    coverKey: "castle",
  },
  {
    author: "Fratelli Grimm",
    collection: "Fiabe del focolare",
    title: "Raperonzolo",
    plot: "Una ragazza dai lunghissimi capelli vive chiusa in un'alta torre nel bosco, finché non trova un modo coraggioso per scoprire il mondo.",
    coverKey: "castle",
  },
  {
    author: "Hans Christian Andersen",
    collection: "Fiabe di Andersen",
    title: "Il Brutto Anatroccolo",
    plot: "Un cucciolo diverso dagli altri viene deriso dal resto della fattoria, finché non scopre chi è davvero crescendo.",
    coverKey: "sea",
  },
  {
    author: "Hans Christian Andersen",
    collection: "Fiabe di Andersen",
    title: "La Sirenetta",
    plot: "Una giovane sirena curiosa del mondo sopra il mare desidera scoprire la vita sulla terraferma e impara il valore del coraggio e della gentilezza.",
    coverKey: "sea",
  },
  {
    author: "Hans Christian Andersen",
    collection: "Fiabe di Andersen",
    title: "La Principessa sul Pisello",
    plot: "Una misteriosa ragazza bagnata dalla pioggia bussa a un castello dichiarandosi una vera principessa, e una regina ingegnosa trova il modo di scoprire la verità.",
    coverKey: "castle",
  },
  {
    author: "Charles Perrault",
    collection: "Fiabe di Perrault",
    title: "Il Gatto con gli Stivali",
    plot: "Un gatto astuto e leale aiuta il suo giovane padrone, rimasto con pochissima eredità, a conquistare fortuna e rispetto con l'ingegno.",
    coverKey: "castle",
  },
  {
    author: "Charles Perrault",
    collection: "Fiabe di Perrault",
    title: "Pollicino",
    plot: "Il più piccolo di sette fratelli, grazie alla sua intelligenza, guida i suoi fratelli fuori da un pericolo nel bosco usando l'ingegno più che la forza.",
    coverKey: "forest",
  },
  {
    author: "Esopo",
    collection: "Favole di Esopo",
    title: "La Cicala e la Formica",
    plot: "Una cicala che canta tutta l'estate e una formica che lavora con costanza scoprono, con l'arrivo dell'inverno, il valore della previdenza.",
    coverKey: "jungle",
  },
  {
    author: "Carlo Collodi",
    collection: "Le Avventure di Pinocchio",
    title: "Pinocchio",
    plot: "Un burattino di legno pieno di buone intenzioni ma un po' birichino impara, attraverso tante avventure, cosa significa diventare una persona vera.",
    coverKey: "forest",
  },
];

const AGES: AgeRange[] = ["3-5", "6-8", "9-12"];

const AGE_STYLE: Record<AgeRange, string> = {
  "3-5": "frasi cortissime, vocabolario semplicissimo, massima dolcezza, nessuna tensione forte",
  "6-8": "frasi brevi e chiare, un po' di suspense gestibile, ritmo vivace",
  "9-12": "linguaggio più ricco, qualche descrizione in più, toni leggermente più maturi ma sempre rassicuranti",
};

const WORDS_PER_MINUTE = 130;
const TARGET_DURATION = 5;

function buildPrompt(seed: ClassicSeed, age: AgeRange) {
  const targetWords = TARGET_DURATION * WORDS_PER_MINUTE;
  return `Scrivi una RISCRITTURA ORIGINALE in italiano della celebre fiaba "${seed.title}" (${seed.author}), pensata per bambini di ${age} anni.

IMPORTANTE: non tradurre né copiare nessuna edizione esistente. Scrivi con parole tue, mantenendo solo la trama classica di pubblico dominio riassunta qui sotto.

Trama di riferimento: ${seed.plot}

Stile per questa fascia d'età: ${AGE_STYLE[age]}.

Regole assolute di sicurezza per bambini:
- Ammorbidisci eventuali elementi spaventosi dell'originale (niente violenza esplicita, morte cruda, immagini disturbanti).
- Linguaggio semplice, immagini concrete, ritmo musicale.
- Nessun riferimento a marchi, persone reali, religione, politica.
- Finale sereno e rassicurante.

Lunghezza target: circa ${targetWords} parole.

Formato di output (mantieni queste etichette esatte in maiuscolo):
TITOLO: <titolo della storia, max 6 parole, in italiano>
SOTTOTITOLO: <una frase poetica, max 12 parole>
---
<corpo della storia in italiano, paragrafi brevi separati da riga vuota>`;
}

async function storyAlreadyExists(title: string, author: string, age: AgeRange) {
  const { data, error } = await supabase
    .from("stories")
    .select("id")
    .eq("story_type", "classic")
    .eq("author", author)
    .eq("age", age)
    .ilike("title", `%${title}%`)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

async function generateAndInsert(seed: ClassicSeed, age: AgeRange) {
  const exists = await storyAlreadyExists(seed.title, seed.author, age);
  if (exists) {
    console.log(`⏭️  Salto "${seed.title}" (${age}) — già presente`);
    return;
  }

  const { text } = await generateText({
    model,
    prompt: buildPrompt(seed, age),
    temperature: 0.85,
  });

  const titleMatch = text.match(/^TITOLO\s*:\s*(.+)/im);
  const subtitleMatch = text.match(/^SOTTOTITOLO\s*:\s*(.+)/im);
  const splitIdx = text.indexOf("---");
  const content = splitIdx >= 0 ? text.slice(splitIdx + 3).trim() : text.trim();
  const title = (titleMatch?.[1] ?? seed.title).trim();
  const subtitle = (subtitleMatch?.[1] ?? "").trim();

  const { error } = await supabase.from("stories").insert({
    title,
    subtitle,
    content,
    mode: "magica",
    language: "it",
    is_preset: true,
    story_type: "classic",
    author: seed.author,
    collection: seed.collection,
    age,
    duration: TARGET_DURATION,
    cover_key: seed.coverKey,
    expires_at: null,
  });

  if (error) throw new Error(error.message);
  console.log(`✅ Creata "${title}" — ${seed.author} — ${age}`);
}

async function main() {
  for (const seed of CLASSICS) {
    for (const age of AGES) {
      try {
        await generateAndInsert(seed, age);
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err) {
        console.error(`❌ Errore su "${seed.title}" (${age}):`, err);
      }
    }
  }
  console.log("\nFatto. Rilancia lo script in sicurezza se vuoi aggiungere altre fiabe alla lista CLASSICS.");
}

main();
