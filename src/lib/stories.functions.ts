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
});

const MODE_TONE: Record<string, string> = {
  nanna: "calmo, dolce, ipnotico, ritmato come una ninna nanna; finale rassicurante che induce al sonno",
  avventura: "vivace, eroico, con momenti di scoperta e coraggio; un colpo di scena luminoso",
  magica: "stupefacente, evocativo, pieno di incantesimi e meraviglia; immagini brillanti",
  educativa: "curioso, chiaro, con piccoli concetti spiegati attraverso la storia",
  divertente: "giocoso, leggero, con dialoghi spiritosi e situazioni buffe",
};

const WORDS_PER_MINUTE = 130; // narrazione lenta per bambini

function buildPrompt(d: z.infer<typeof DraftSchema>) {
  const targetWords = d.duration * WORDS_PER_MINUTE;
  const tone = MODE_TONE[d.mode];
  return `Scrivi una fiaba originale in italiano per bambini di ${d.age} anni.

Protagonista: ${d.protagonist}
Ambientazione: ${d.setting}
Tono: ${tone}
${d.companions ? `Personaggi secondari: ${d.companions}` : ""}
${d.favoriteAnimal ? `Includi con grazia questo animale: ${d.favoriteAnimal}` : ""}
${d.favoriteColor ? `Un colore ricorrente nelle immagini: ${d.favoriteColor}` : ""}
${d.moral ? `Morale da trasmettere senza essere didascalica: ${d.moral}` : ""}
${d.moral ? "" : "Concludi con una piccola morale dolce, naturale, integrata nel finale (una o due frasi, mai didascalica)."}
${d.fearsToAvoid ? `EVITA assolutamente questi temi (paure del bambino): ${d.fearsToAvoid}` : ""}

Regole assolute di sicurezza per bambini:
- Nessuna violenza, sangue, morte, paure profonde, perdita dei genitori, mostri spaventosi.
- Linguaggio semplice, immagini concrete, ritmo musicale.
- Frasi brevi, ricche di sensazioni (suoni, profumi, colori).
- Nessun riferimento a marchi, persone reali, religione, politica.
- Nessun contenuto inappropriato per l'età.

Struttura: apertura accogliente, sviluppo con una piccola sfida, scoperta magica, chiusura serena${d.mode === "nanna" ? " che invita al sonno" : ""}.

Lunghezza target: circa ${targetWords} parole (${d.duration} minuti di narrazione lenta).

Formato di output (RIGOROSO):
TITOLO: <titolo evocativo e magico, max 6 parole>
SOTTOTITOLO: <una frase poetica, max 12 parole>
---
<testo della storia, in paragrafi brevi separati da righe vuote>`;
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

    const titleMatch = text.match(/TITOLO:\s*(.+)/i);
    const subtitleMatch = text.match(/SOTTOTITOLO:\s*(.+)/i);
    const splitIdx = text.indexOf("---");
    const content = splitIdx >= 0 ? text.slice(splitIdx + 3).trim() : text.trim();

    return {
      title: (titleMatch?.[1] ?? "Una storia magica").trim(),
      subtitle: (subtitleMatch?.[1] ?? "Per i tuoi sogni").trim(),
      content,
    };
  });