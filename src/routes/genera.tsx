import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { generateStory } from "@/lib/stories.functions";
import { saveStoryToLibrary, setCurrentStory } from "@/lib/story-store";
import type { Story, StoryDraft } from "@/lib/types";

export const Route = createFileRoute("/genera")({
  head: () => ({
    meta: [
      { title: "La magia sta prendendo forma… · Narrami" },
      { name: "description", content: "Stiamo creando la tua fiaba magica." },
    ],
  }),
  component: GeneratePage,
});

const PHRASES = [
  "La magia sta prendendo forma…",
  "Le stelle stanno scegliendo le parole…",
  "La luna accende l'inchiostro…",
  "Il libro si sta aprendo…",
];

function pickCover(draft: StoryDraft): Story["coverKey"] {
  const t = `${draft.protagonist} ${draft.setting}`.toLowerCase();
  if (/drago|moon|luna|notte|nanna/.test(t) || draft.mode === "nanna") return "dragon";
  if (/spazio|stell|pianeta|astro/.test(t)) return "space";
  return "forest";
}

function GeneratePage() {
  const navigate = useNavigate();
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES.length), 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // Fake progress that eases toward 90% while waiting
    const t = setInterval(() => {
      setProgress((p) => (p < 92 ? p + (92 - p) * 0.04 : p));
    }, 200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem("narrami:draft") : null;
    if (!raw) {
      navigate({ to: "/crea" });
      return;
    }
    const draft = JSON.parse(raw) as StoryDraft;

    generateStory({ data: draft })
      .then((res) => {
        const story: Story = {
          id: crypto.randomUUID(),
          title: res.title,
          subtitle: res.subtitle,
          content: res.content,
          mode: draft.mode,
          duration: draft.duration,
          age: draft.age,
          coverKey: pickCover(draft),
          createdAt: Date.now(),
        };
        setCurrentStory(story);
        saveStoryToLibrary(story);
        setProgress(100);
        setTimeout(() => navigate({ to: "/ascolta", search: { id: story.id } }), 600);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Qualcosa è andato storto.";
        setError(msg);
      });
  }, [navigate]);

  return (
    <AppShell hideNav>
      <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center">
        {/* Magical book / orb */}
        <div className="relative mb-12">
          <div className="absolute inset-0 -z-10 animate-spin-slow rounded-full bg-[conic-gradient(from_0deg,var(--celeste),var(--giallo),var(--viola),var(--celeste))] blur-2xl opacity-50" />
          <div className="relative grid size-56 place-items-center rounded-full glass-strong animate-breathe">
            <div className="grid size-40 place-items-center rounded-full bg-gradient-to-br from-viola to-notte shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]">
              <span className="text-7xl">📖</span>
            </div>
          </div>
          {/* Floating sparkles */}
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="absolute text-xl animate-float"
              style={{
                top: `${[0, 70, 100, 20, 50][i]}%`,
                left: `${[-10, 100, 20, 110, -5][i]}%`,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              ✨
            </span>
          ))}
        </div>

        {error ? (
          <>
            <h1 className="font-display text-2xl font-bold">Ops, magia interrotta</h1>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => navigate({ to: "/crea" })}
              className="mt-6 rounded-full bg-giallo px-6 py-3 font-bold text-primary-foreground"
            >
              Riprova
            </button>
          </>
        ) : (
          <>
            <h1 key={phraseIdx} className="animate-in fade-in slide-in-from-bottom-2 font-display text-2xl font-bold">
              {PHRASES[phraseIdx]}
            </h1>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Stiamo intrecciando parole, suoni e stelle per te.
            </p>
            <div className="mt-8 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-celeste via-giallo to-viola transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}