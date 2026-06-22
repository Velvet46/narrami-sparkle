export type StoryMode = "nanna" | "avventura" | "magica" | "educativa" | "divertente";
export type AgeRange = "3-5" | "6-8" | "9-12";
export type Duration = 3 | 5 | 10 | 15;

export interface StoryDraft {
  protagonist: string;
  setting: string;
  mode: StoryMode;
  duration: Duration;
  age: AgeRange;
  companions?: string;
  moral?: string;
  favoriteColor?: string;
  favoriteAnimal?: string;
  fearsToAvoid?: string;
  toneHint?: string;
}

export interface Story {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  mode: StoryMode;
  duration: Duration;
  age: AgeRange;
  coverKey: "dragon" | "forest" | "space";
  createdAt: number;
  favorite?: boolean;
  childId?: string;
}

export const MODE_META: Record<StoryMode, { label: string; emoji: string; tagline: string }> = {
  nanna:      { label: "Nanna",      emoji: "🌙", tagline: "Storie calme per addormentarsi" },
  avventura:  { label: "Avventura",  emoji: "🚀", tagline: "Eroi e mondi lontani" },
  magica:     { label: "Magia",      emoji: "✨", tagline: "Castelli e incantesimi" },
  educativa:  { label: "Educativa",  emoji: "📚", tagline: "Imparare giocando" },
  divertente: { label: "Divertente", emoji: "🎈", tagline: "Per ridere insieme" },
};