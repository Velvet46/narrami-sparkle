import orsoTom from "@/assets/characters/orso-tom.png";
import orsettaLily from "@/assets/characters/orsetta-lily.png";
import dinoDex from "@/assets/characters/dino-dex.png";
import dragoFlame from "@/assets/characters/drago-flame.png";
import unicornoStella from "@/assets/characters/unicorno-stella.png";
import astronautaNeo from "@/assets/characters/astronauta-neo.png";
import pirataJack from "@/assets/characters/pirata-jack.png";
import esploratriceAria from "@/assets/characters/esploratrice-aria.png";

import type { TtsVoice } from "@/lib/tts-player";

export interface PuppetCharacter {
  id: string;
  name: string;
  role: string;
  image: string;
  voice: TtsVoice;
  voiceLabel: string;
  /** short hint passed to the narrator prompt to colour the voice */
  voicePersona: string;
  /** card accent (tailwind classes) */
  accent: string;
}

export const CHARACTERS: PuppetCharacter[] = [
  {
    id: "orso-tom",
    name: "Orso Tom",
    role: "Amico",
    image: orsoTom,
    voice: "ballad",
    voiceLabel: "Calda e abbraccio",
    voicePersona: "voce calda, dolce e rassicurante, come un abbraccio morbido",
    accent: "from-celeste/40 to-celeste/10",
  },
  {
    id: "orsetta-lily",
    name: "Orsetta Lily",
    role: "Amica",
    image: orsettaLily,
    voice: "shimmer",
    voiceLabel: "Luminosa e gentile",
    voicePersona: "voce luminosa e gentile, dolce e leggera",
    accent: "from-pink-300/40 to-pink-100/10",
  },
  {
    id: "dino-dex",
    name: "Dino Dex",
    role: "Eroe",
    image: dinoDex,
    voice: "verse",
    voiceLabel: "Curiosa e vivace",
    voicePersona: "voce curiosa, allegra e vivace, da esploratore",
    accent: "from-emerald-400/40 to-emerald-100/10",
  },
  {
    id: "drago-flame",
    name: "Drago Flame",
    role: "Eroe",
    image: dragoFlame,
    voice: "ash",
    voiceLabel: "Coraggiosa e profonda",
    voicePersona: "voce coraggiosa e profonda, ma amichevole, da piccolo drago buono",
    accent: "from-rose-500/40 to-amber-200/10",
  },
  {
    id: "unicorno-stella",
    name: "Unicorno Stella",
    role: "Eroe",
    image: unicornoStella,
    voice: "coral",
    voiceLabel: "Sognante e magica",
    voicePersona: "voce sognante, magica e melodiosa, piena di stelle",
    accent: "from-fuchsia-300/40 to-violet-200/10",
  },
  {
    id: "astronauta-neo",
    name: "Astronauta Neo",
    role: "Eroe",
    image: astronautaNeo,
    voice: "alloy",
    voiceLabel: "Chiara e spaziale",
    voicePersona: "voce chiara e curiosa, da esploratore dello spazio",
    accent: "from-sky-400/40 to-slate-200/10",
  },
  {
    id: "pirata-jack",
    name: "Pirata Jack",
    role: "Eroe",
    image: pirataJack,
    voice: "echo",
    voiceLabel: "Avventurosa",
    voicePersona: "voce avventurosa e giocosa, da pirata buono dei sette mari",
    accent: "from-amber-500/40 to-amber-100/10",
  },
  {
    id: "esploratrice-aria",
    name: "Esploratrice Aria",
    role: "Eroe",
    image: esploratriceAria,
    voice: "sage",
    voiceLabel: "Saggia e calma",
    voicePersona: "voce saggia, calma e narrante, da esploratrice esperta",
    accent: "from-stone-400/40 to-stone-100/10",
  },
];

export function getCharacter(id?: string | null): PuppetCharacter | undefined {
  if (!id) return undefined;
  return CHARACTERS.find((c) => c.id === id);
}