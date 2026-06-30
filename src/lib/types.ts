export type StoryMode = "nanna" | "avventura" | "magica" | "educativa" | "divertente" | "sportiva";
export type AgeRange = "3-5" | "6-8" | "9-12";
export type Duration = 3 | 5 | 10 | 15;
export type Language = "it" | "en" | "es" | "fr" | "de";
export const LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "en", label: "English",  flag: "🇬🇧" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch",  flag: "🇩🇪" },
];
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
  language?: Language;
}
export interface Story {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  mode: StoryMode;
  duration: Duration;
  age: AgeRange;
  coverKey: "dragon" | "forest" | "space" | "castle" | "sea" | "jungle" | "stars" | "books" | "sport";
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
  sportiva:   { label: "Sportiva",   emoji: "⚽", tagline: "Squadra, sfide e fair play" },
};