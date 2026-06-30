import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { generateStory } from "@/lib/stories.functions";

import type { StoryDraft } from "@/lib/types";
import { listChildren } from "@/lib/child-profiles.functions";

export const Route = createFileRoute("/genera")({
  head: () => ({
    meta: [
      { title: "La magia sta prendendo forma… · MilleStorie" },
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

function GeneratePage() {
  const navigate = useNavigate();
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES.length), 2400);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => (p < 92 ? p + (92 - p) * 0.04 : p));
    }, 200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem("millestorie:draft") : null;
    if (!raw) {
      navigate({ to: "/crea" });
      return;
    }
    const draft = JSON.parse(raw) as StoryDraft;

    const childId = typeof window !== "undefined"
      ? window.sessionStorage.getItem("millestorie:childId") ||
        window.localStorage.getItem("millestorie:activeChildId") || undefined
      : undefined;

    (async () => {
      let language = draft.language ?? "it";
      if (childId) {
        try {
          const list = await listChildren();
          const c = list.find((x) => x.id === childId);
          if (c?.language) language = c.language;
        } catch { /* ignore */ }
      }
      return generateStory({ data: { ...draft, language, childId } });
    })()
      .then((res) => {
        setProgress(100);
        setTimeout(() => navigate({ to: "/ascolta", search: { id: res.id } }), 600);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Qualcosa è andato storto.";
        const isAuthError = msg.includes("Unauthorized");
        setError(isAuthError ? "Devi accedere o registrarti per creare una storia." : msg);
        setNeedsAuth(isAuthError);
      });
  }, [navigate]);

  return (
    <AppShell hideNav>
      <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center">
        <div className="relative mb-12">
          <div className="absolute inset-0 -z-10 animate-spin-slow rounded-full bg-[conic-gradient(from_0deg,var(--celeste),var(--giallo),var(--viola),var(--celeste))] blur-2xl opacity-50" />
          <div className="relative grid size-56 place-items-center rounded-full glass-strong animate-breathe">
            <div className="grid size-40 place-items-center rounded-full bg-gradient-to-br from-viola to-notte shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]">
              <span className="text-7xl">📖</span>
            </div>
          </div>
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
              onClick={() => navigate({ to: needsAuth ? "/auth" : "/crea" })}
              className="mt-6 rounded-full bg-giallo px-6 py-3 font-bold text-primary-foreground"
            >
              {needsAuth ? "Accedi o registrati" : "Riprova"}
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