import type { Story } from "./types";

const CURRENT_KEY = "millestorie:current";
const LIBRARY_KEY = "millestorie:library";

function safeWindow(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function setCurrentStory(story: Story) {
  const s = safeWindow();
  if (!s) return;
  s.setItem(CURRENT_KEY, JSON.stringify(story));
}

export function getCurrentStory(): Story | null {
  const s = safeWindow();
  if (!s) return null;
  const raw = s.getItem(CURRENT_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Story; } catch { return null; }
}

export function saveStoryToLibrary(story: Story) {
  const s = safeWindow();
  if (!s) return;
  const list = getLibrary();
  const next = [story, ...list.filter((it) => it.id !== story.id)].slice(0, 100);
  s.setItem(LIBRARY_KEY, JSON.stringify(next));
}

export function getLibrary(): Story[] {
  const s = safeWindow();
  if (!s) return [];
  const raw = s.getItem(LIBRARY_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as Story[]; } catch { return []; }
}

export function toggleFavorite(id: string): Story[] {
  const s = safeWindow();
  if (!s) return [];
  const list = getLibrary().map((it) => (it.id === id ? { ...it, favorite: !it.favorite } : it));
  s.setItem(LIBRARY_KEY, JSON.stringify(list));
  return list;
}