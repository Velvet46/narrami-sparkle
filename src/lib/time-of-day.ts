import type { StoryMode, Duration, AgeRange } from "./types";

export type TimeBand = "mattina" | "pomeriggio" | "sera" | "notte";

export interface BandProfile {
  band: TimeBand;
  label: string;
  emoji: string;
  mode: StoryMode;
  /** Soft duration cap suggested for this band. */
  maxDuration: Duration;
  /** Italian opener used by the voice assistant before any story. */
  opener: (name: string) => string;
  /** Greeting line for home/header. */
  greeting: string;
  /** Hint embedded into the generation prompt. */
  toneHint: string;
}

export function getTimeBand(d: Date = new Date()): TimeBand {
  const h = d.getHours();
  if (h >= 6 && h < 11) return "mattina";
  if (h >= 11 && h < 17) return "pomeriggio";
  if (h >= 17 && h < 20) return "sera";
  return "notte";
}

export const BAND_PROFILES: Record<TimeBand, BandProfile> = {
  mattina: {
    band: "mattina",
    label: "Mattina",
    emoji: "🌅",
    mode: "avventura",
    maxDuration: 10,
    opener: (n) => `Buongiorno ${n}! Pronta o pronto per una nuova avventura?`,
    greeting: "Buongiorno ☀️",
    toneHint:
      "Tono energico, vivace, ritmo allegro. Inizia la giornata con curiosità e azione. Linguaggio luminoso, niente paure.",
  },
  pomeriggio: {
    band: "pomeriggio",
    label: "Pomeriggio",
    emoji: "🎈",
    mode: "divertente",
    maxDuration: 10,
    opener: (n) => `Ciao ${n}! Vuoi che ti faccia ridere con una storia buffa?`,
    greeting: "Buon pomeriggio 🎈",
    toneHint:
      "Tono giocoso e divertente, situazioni buffe, suoni e rime, niente paura. Spazio alla fantasia e ai colori.",
  },
  sera: {
    band: "sera",
    label: "Sera",
    emoji: "✨",
    mode: "magica",
    maxDuration: 10,
    opener: (n) => `Buonasera ${n}! Vuoi una storia magica prima di cena?`,
    greeting: "Buonasera ✨",
    toneHint:
      "Tono caldo e magico, immagini soffuse, rallenta il ritmo verso la fine. Niente paura, finale dolce.",
  },
  notte: {
    band: "notte",
    label: "Ninna nanna",
    emoji: "🌙",
    mode: "nanna",
    maxDuration: 5,
    opener: (n) => `Buonanotte ${n}. Chiudi gli occhi, ti racconto una piccola ninna nanna.`,
    greeting: "È quasi ora della nanna 🌙",
    toneHint:
      "Voce della narratrice molto bassa e dolce. Frasi corte, respiro lento, ripetizioni morbide. Il finale spegne le luci e invita al sonno. Niente azione, niente colpi di scena.",
  },
};

export function currentBand(): BandProfile {
  return BAND_PROFILES[getTimeBand()];
}

/** Pick a sensible default duration honoring the time band cap. */
export function defaultDurationForBand(age: AgeRange, band: TimeBand = getTimeBand()): Duration {
  const cap = BAND_PROFILES[band].maxDuration;
  const byAge: Duration = age === "3-5" ? 5 : age === "6-8" ? 10 : 15;
  return (Math.min(byAge, cap) as Duration);
}