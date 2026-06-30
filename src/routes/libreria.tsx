import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Play, Search, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { StoryCover } from "@/components/StoryCover";
import { listStories, listPresetStories } from "@/lib/stories.functions";
import { MODE_META, type StoryMode, type AgeRange } from "@/lib/types";

export const Route = createFileRoute("/libreria")({
  head: () => ({
    meta: [
      { title: "La tua libreria · MilleStorie" },
      { name: "description", content: "Tutte le tue storie magiche, sempre a portata di mano." },
    ],
  }),
  component: LibraryPage,
});

type RemoteStory = {
  id: string;
  title: string;
  subtitle: string | null;
  content: string;
  mode: string;
  language: string;
  favorite: boolean;
  created_at: string;
  child_id: string | null;
  expires_at: string | null;
  duration: number;
  cover_key: string;
  age: string | null;
};

type Section = "mie" | "classiche";
type Filter = "tutte" | "preferite" | "recenti";

const AGE_OPTIONS: { value: AgeRange | "tutte"; label: string }[] = [
  { value: "tutte", label: "Tutte le età" },
  { value: "3-5", label: "3-5 anni" },
  { value: "6-8", label: "6-8 anni" },
  { value: "9-12", label: "9-12 anni" },
];

function LibraryPage() {
  const [myStories, setMyStories] = useState<RemoteStory[]>([]);
  const [presetStories, setPresetStories] = useState<RemoteStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("mie");
  const [filter, setFilter] = useState<Filter>("tutte");
  const [modeFilter, setModeFilter] = useState<StoryMode | "tutte">("tutte");
  const [ageFilter, setAgeFilter] = useState<AgeRange | "tutte">("tutte");
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([listStories(), listPresetStories()])
      .then(([mine, presets]) => {
        setMyStories(mine as RemoteStory[]);
        setPresetStories(presets as RemoteStory[]);
      })
      .catch(() => { /* utente non loggato o errore: mostriamo liste vuote */ })
      .finally(() => setLoading(false));
  }, []);

  const filteredMine = useMemo(() => {
    let list = myStories;
    if (filter === "preferite") list = list.filter((s) => s.favorite);
    if (filter === "recenti")
      list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.subtitle ?? "").toLowerCase().includes(q) ||
          s.content.toLowerCase().includes(q),
      );
    }
    return list;
  }, [myStories, filter, query]);

  const filteredPresets = useMemo(() => {
    let list = presetStories;
    if (modeFilter !== "tutte") list = list.filter((s) => s.mode === modeFilter);
    if (ageFilter !== "tutte") list = list.filter((s) => s.age === ageFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.subtitle ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [presetStories, modeFilter, query]);

  return (
    <AppShell>
      <header className="pt-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-celeste">La tua libreria</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Storie magiche</h1>
      </header>

      {/* Search */}
      <div className="glass mt-6 flex items-center gap-3 rounded-full px-4 py-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Cerca una storia… (es. drago blu)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
        />
      </div>

      {/* Section tabs */}
      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={() => setSection("mie")}
          className={`flex-1 rounded-full py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
            section === "mie" ? "bg-giallo text-primary-foreground" : "bg-white/5 text-muted-foreground"
          }`}
        >
          Le tue storie
        </button>
        <button
          type="button"
          onClick={() => setSection("classiche")}
          className={`flex-1 rounded-full py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
            section === "classiche" ? "bg-giallo text-primary-foreground" : "bg-white/5 text-muted-foreground"
          }`}
        >
          ✨ Classiche
        </button>
      </div>

      {section === "mie" ? (
        <>
          <div className="mt-4 flex gap-2">
            {(["tutte", "preferite", "recenti"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  filter === f ? "bg-giallo/80 text-primary-foreground" : "bg-white/5 text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <LoadingState />
            ) : filteredMine.length === 0 ? (
              <EmptyState />
            ) : (
              filteredMine.map((s) => <StoryRow key={s.id} story={s} />)
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["tutte", ...Object.keys(MODE_META)] as (StoryMode | "tutte")[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModeFilter(m)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  modeFilter === m ? "bg-giallo/80 text-primary-foreground" : "bg-white/5 text-muted-foreground"
                }`}
              >
                {m === "tutte" ? "Tutte" : `${MODE_META[m as StoryMode].emoji} ${MODE_META[m as StoryMode].label}`}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {AGE_OPTIONS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAgeFilter(a.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                  ageFilter === a.value ? "bg-celeste/80 text-primary-foreground" : "bg-white/5 text-muted-foreground"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Fiabe classiche selezionate per tutte le età, sempre disponibili gratuitamente.
          </p>

          <div className="mt-4 space-y-3">
            {loading ? (
              <LoadingState />
            ) : filteredPresets.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Nessuna storia trovata.</p>
            ) : (
              filteredPresets.map((s) => <StoryRow key={s.id} story={s} isPreset />)
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function StoryRow({ story: s, isPreset }: { story: RemoteStory; isPreset?: boolean }) {
  const mode = MODE_META[s.mode as keyof typeof MODE_META];
  return (
    <Link
      to="/ascolta"
      search={{ id: s.id }}
      className="glass flex items-center gap-4 rounded-3xl p-3 transition-colors hover:bg-white/10"
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl">
        <StoryCover coverKey={s.cover_key as any} className="size-full" />
        {isPreset && (
          <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-viola/90">
            <Sparkles className="size-3 text-white" />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-celeste">
          {mode?.emoji} {mode?.label} · {s.duration} min{s.age ? ` · ${s.age} anni` : ""}
        </p>
        <p className="mt-0.5 truncate font-display text-base font-semibold">{s.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.subtitle}</p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-2">
        {s.favorite && <Heart className="size-4 fill-rose-400 text-rose-400" />}
        <span className="grid size-9 place-items-center rounded-full bg-giallo text-primary-foreground">
          <Play className="size-4 fill-current" />
        </span>
      </div>
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
      <span className="size-6 animate-spin rounded-full border-2 border-giallo/40 border-t-giallo" />
      <p className="text-sm">Caricamento…</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-strong mt-4 flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-giallo/20 text-giallo">
        <Wand2 className="size-6" />
      </span>
      <p className="font-display text-lg font-bold">Nessuna storia ancora</p>
      <p className="text-sm text-muted-foreground">Crea la tua prima fiaba magica in pochi tocchi.</p>
      <Link
        to="/crea"
        className="mt-2 rounded-full bg-giallo px-5 py-2.5 text-sm font-bold text-primary-foreground"
      >
        Inizia ora
      </Link>
    </div>
  );
}