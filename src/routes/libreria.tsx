import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Play, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { StoryCover } from "@/components/StoryCover";
import { getLibrary } from "@/lib/story-store";
import { MODE_META, type Story } from "@/lib/types";

export const Route = createFileRoute("/libreria")({
  head: () => ({
    meta: [
      { title: "La tua libreria · MilleStorie" },
      { name: "description", content: "Tutte le tue storie magiche, sempre a portata di mano." },
    ],
  }),
  component: LibraryPage,
});

type Filter = "tutte" | "preferite" | "recenti";

function LibraryPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState<Filter>("tutte");
  const [query, setQuery] = useState("");

  useEffect(() => setStories(getLibrary()), []);

  const filtered = useMemo(() => {
    let list = stories;
    if (filter === "preferite") list = list.filter((s) => s.favorite);
    if (filter === "recenti") list = [...list].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (s) => s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q) || s.content.toLowerCase().includes(q),
      );
    }
    return list;
  }, [stories, filter, query]);

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

      {/* Filters */}
      <div className="mt-4 flex gap-2">
        {(["tutte", "preferite", "recenti"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              filter === f
                ? "bg-giallo text-primary-foreground"
                : "bg-white/5 text-muted-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          filtered.map((s) => (
            <Link
              key={s.id}
              to="/ascolta"
              search={{ id: s.id }}
              className="glass flex items-center gap-4 rounded-3xl p-3 transition-colors hover:bg-white/10"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl">
                <StoryCover coverKey={s.coverKey} className="size-full" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-celeste">
                  {MODE_META[s.mode].label} · {s.duration} min · {s.age}
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
          ))
        )}
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="glass-strong mt-4 flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-giallo/20 text-giallo">
        <Sparkles className="size-6" />
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