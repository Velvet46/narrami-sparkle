import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const DraftSchema = z.object({
  protagonist: z.string().min(1).max(80),
  setting: z.string().min(1).max(120),
  mode: z.enum(["nanna", "avventura", "magica", "educativa", "divertente"]),
  duration: z.union([z.literal(3), z.literal(5), z.literal(10), z.literal(15)]),
  age: z.enum(["3-5", "6-8", "9-12"]),
  companions: z.string().max(160).optional(),
  moral: z.string().max(160).optional(),
  favoriteColor: z.string().max(40).optional(),
  favoriteAnimal: z.string().max(40).optional(),
  fearsToAvoid: z.string().max(160).optional(),
  toneHint: z.string().max(400).optional(),
  language: z.enum(["it", "en", "es", "fr", "de"]).optional().default("it"),
});

const MODE_TONE_IT: Record<string, string> = {
  nanna: "calmo, dolce, ipnotico, ritmato come una ninna nanna; finale rassicurante che induce al sonno",
  avventura: "vivace, eroico, con momenti di scoperta e coraggio; un colpo di scena luminoso",
  magica: "stupefacente, evocativo, pieno di incantesimi e meraviglia; immagini brillanti",
  educativa: "curioso, chiaro, con piccoli concetti spiegati attraverso la storia",
  divertente: "giocoso, leggero, con dialoghi spiritosi e situazioni buffe",
};

const LANG_META: Record<string, { name: string; titleLabel: string; subtitleLabel: string }> = {
  it: { name: "italiano", titleLabel: "TITOLO",   subtitleLabel: "SOTTOTITOLO" },
  en: { name: "English",  titleLabel: "TITLE",    subtitleLabel: "SUBTITLE" },
  es: { name: "español",  titleLabel: "TÍTULO",   subtitleLabel: "SUBTÍTULO" },
  fr: { name: "français", titleLabel: "TITRE",    subtitleLabel: "SOUS-TITRE" },
  de: { name: "Deutsch",  titleLabel: "TITEL",    subtitleLabel: "UNTERTITEL" },
};

const WORDS_PER_MINUTE = 130; // narrazione lenta per bambini

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

export const generateStory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DraftSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI non configurata.");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const { text } = await generateText({
      model,
      prompt: buildPrompt(data),
      temperature: 0.95,
    });

    const titleMatch = text.match(/^(?:TITOLO|TITLE|TÍTULO|TITULO|TITRE|TITEL)\s*:\s*(.+)/im);
    const subtitleMatch = text.match(/^(?:SOTTOTITOLO|SUBTITLE|SUBT[IÍ]TULO|SOUS[- ]TITRE|UNTERTITEL)\s*:\s*(.+)/im);
    const splitIdx = text.indexOf("---");
    const content = splitIdx >= 0 ? text.slice(splitIdx + 3).trim() : text.trim();

    return {
      title: (titleMatch?.[1] ?? "✨").trim(),
      subtitle: (subtitleMatch?.[1] ?? "").trim(),
      content,
    };
  });