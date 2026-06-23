/**
 * Character types used across the app. The catalog is now loaded from the
 * `characters` table — see `characters.functions.ts`.
 */
export interface PuppetCharacter {
  /** stable slug used as id in profiles */
  id: string;
  name: string;
  role: string;
  image: string;
  /** ElevenLabs voice id */
  voiceId: string;
  voiceLabel: string;
  /** short hint passed to the narrator prompt to colour the voice */
  voicePersona: string;
  /** card accent (tailwind gradient classes) */
  accent: string;
}

/** Shared in-memory cache populated by the character loader. */
let cache: PuppetCharacter[] = [];
export function setCharacterCache(list: PuppetCharacter[]) {
  cache = list;
}
export function getCharacter(id?: string | null): PuppetCharacter | undefined {
  if (!id) return undefined;
  return cache.find((c) => c.id === id);
}