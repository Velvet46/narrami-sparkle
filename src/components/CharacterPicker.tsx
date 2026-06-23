import { useRef, useState } from "react";
import { Play, Square } from "lucide-react";

import type { PuppetCharacter } from "@/lib/characters";

export function CharacterPicker({
  characters,
  value,
  onChange,
}: {
  characters: PuppetCharacter[];
  value: string | null;
  onChange: (slug: string) => void;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function preview(c: PuppetCharacter, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playing === c.id) {
      setPlaying(null);
      return;
    }
    setPlaying(c.id);
    try {
      const res = await fetch("/api/elevenlabs/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: c.voiceId,
          text: `Ciao! Sono ${c.name}. ${c.voicePersona || "Vuoi che ti racconti una storia?"}`,
        }),
      });
      if (!res.ok) throw new Error(`preview ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setPlaying((p) => (p === c.id ? null : p));
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setPlaying(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {characters.map((c) => {
        const selected = value === c.id;
        const isPlaying = playing === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={`group relative overflow-hidden rounded-2xl border p-2 text-left transition-all ${
              selected
                ? "border-giallo bg-giallo/10 ring-2 ring-giallo"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div className={`relative mb-2 flex aspect-square items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b ${c.accent}`}>
              <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-contain object-bottom drop-shadow-md" />
              <button
                type="button"
                onClick={(e) => preview(c, e)}
                aria-label={`Ascolta voce di ${c.name}`}
                className={`absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full backdrop-blur transition-colors ${
                  isPlaying ? "bg-giallo text-primary-foreground" : "bg-black/40 text-white hover:bg-black/60"
                }`}
              >
                {isPlaying ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
              </button>
            </div>
            <p className="font-display text-sm font-bold leading-tight">{c.name}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{c.voiceLabel}</p>
          </button>
        );
      })}
    </div>
  );
}