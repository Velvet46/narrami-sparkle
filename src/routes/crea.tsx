import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { MODE_META, type AgeRange, type Duration, type StoryDraft, type StoryMode } from "@/lib/types";

const searchSchema = z.object({
  mode: z.enum(["nanna", "avventura", "magica", "educativa", "divertente"]).optional(),
  preset: z.enum(["dragon"]).optional(),
});

export const Route = createFileRoute("/crea")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Crea una storia · MilleStorie" },
      { name: "description", content: "Personalizza la tua fiaba: protagonista, ambientazione, modalità e durata." },
    ],
  }),
  component: CreatePage,
});

const MODES: StoryMode[] = ["nanna", "avventura", "magica", "educativa", "divertente"];
const DURATIONS: Duration[] = [3, 5, 10, 15];
const AGES: AgeRange[] = ["3-5", "6-8", "9-12"];

function CreatePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<StoryDraft>({
    protagonist: search.preset === "dragon" ? "il drago azzurro Brillino" : "",
    setting: search.preset === "dragon" ? "una notte tra nuvole di zucchero" : "",
    mode: search.mode ?? "magica",
    duration: 5,
    age: "6-8",
  });

  const steps: Array<{ title: string; render: () => React.ReactElement; canNext: () => boolean }> = [
    {
      title: "Chi sarà il protagonista?",
      canNext: () => draft.protagonist.trim().length > 1,
      render: () => (
        <TextField
          placeholder="es. Luna, una piccola volpe coraggiosa"
          value={draft.protagonist}
          onChange={(v) => setDraft((d) => ({ ...d, protagonist: v }))}
        />
      ),
    },
    {
      title: "Dove si svolgerà?",
      canNext: () => draft.setting.trim().length > 1,
      render: () => (
        <TextField
          placeholder="es. una foresta di cristallo sotto la luna"
          value={draft.setting}
          onChange={(v) => setDraft((d) => ({ ...d, setting: v }))}
        />
      ),
    },
    {
      title: "Quale modalità?",
      canNext: () => true,
      render: () => (
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((m) => {
            const meta = MODE_META[m];
            const active = draft.mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, mode: m }))}
                className={`group relative overflow-hidden rounded-3xl border p-4 text-left transition-all ${
                  active
                    ? "border-giallo bg-giallo/15 shadow-[0_0_30px_var(--glow)]"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <span className="text-2xl">{meta.emoji}</span>
                <p className="mt-2 font-display text-base font-bold">{meta.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{meta.tagline}</p>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Quanto deve durare?",
      canNext: () => true,
      render: () => (
        <div className="grid grid-cols-2 gap-3">
          {DURATIONS.map((d) => (
            <ChipButton key={d} active={draft.duration === d} onClick={() => setDraft((s) => ({ ...s, duration: d }))}>
              {d} minuti
            </ChipButton>
          ))}
        </div>
      ),
    },
    {
      title: "Per che età?",
      canNext: () => true,
      render: () => (
        <div className="grid grid-cols-3 gap-3">
          {AGES.map((a) => (
            <ChipButton key={a} active={draft.age === a} onClick={() => setDraft((s) => ({ ...s, age: a }))}>
              {a} anni
            </ChipButton>
          ))}
        </div>
      ),
    },
    {
      title: "Un tocco in più? (opzionale)",
      canNext: () => true,
      render: () => (
        <div className="space-y-4">
          <TextField
            label="Animale preferito"
            placeholder="es. un coniglietto bianco"
            value={draft.favoriteAnimal ?? ""}
            onChange={(v) => setDraft((d) => ({ ...d, favoriteAnimal: v }))}
          />
          <TextField
            label="Una piccola morale"
            placeholder="es. l'importanza dell'amicizia"
            value={draft.moral ?? ""}
            onChange={(v) => setDraft((d) => ({ ...d, moral: v }))}
          />
          <TextField
            label="Paure da evitare"
            placeholder="es. il buio, i ragni"
            value={draft.fearsToAvoid ?? ""}
            onChange={(v) => setDraft((d) => ({ ...d, fearsToAvoid: v }))}
          />
        </div>
      ),
    },
  ];

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const goNext = () => {
    if (!current.canNext()) return;
    if (isLast) {
      // Stash draft and navigate to generation
      window.sessionStorage.setItem("narrami:draft", JSON.stringify(draft));
      navigate({ to: "/genera" });
    } else {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (step === 0) {
      navigate({ to: "/" });
    } else {
      setStep((s) => s - 1);
    }
  };

  return (
    <AppShell hideNav>
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          aria-label="Indietro"
          className="glass grid size-10 place-items-center rounded-full"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Passo {step + 1} di {steps.length}
        </span>
        <div className="size-10" />
      </header>

      {/* Progress */}
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-celeste to-giallo transition-all duration-500"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      <section className="mt-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-celeste">La voce magica chiede</p>
        <h1 className="mt-2 text-pretty font-display text-3xl font-bold leading-tight">
          {current.title}
        </h1>
        <div className="mt-7">{current.render()}</div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto w-full max-w-md px-5">
          <button
            type="button"
            onClick={goNext}
            disabled={!current.canNext()}
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-giallo px-6 py-4 font-display text-base font-bold text-primary-foreground shadow-[0_10px_40px_var(--glow)] transition-all active:scale-[0.98] disabled:opacity-40"
          >
            {isLast ? (
              <>
                <Sparkles className="size-5" />
                Crea la storia
              </>
            ) : (
              <>
                Continua <ArrowRight className="size-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-3xl border border-white/10 bg-white/5 px-5 py-4 font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-celeste/60 focus:bg-white/10 focus:ring-4 focus:ring-celeste/20"
      />
    </label>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-4 font-display text-base font-semibold transition-all ${
        active
          ? "border-giallo bg-giallo/15 text-foreground shadow-[0_0_25px_var(--glow)]"
          : "border-white/10 bg-white/5 text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}