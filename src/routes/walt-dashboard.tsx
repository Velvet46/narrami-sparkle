import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Users, BookOpen, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/walt-dashboard")({
  component: WaltDashboard,
});

type ChildRow = {
  id: string;
  name: string;
  age_range: string;
  gender: string;
  language: string;
};

type UserRow = {
  id: string;
  created_at: string;
  children: ChildRow[];
  stories_generated: number;
  stories_listened: number;
};

function WaltDashboard() {
  const nav = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session || data.session.user.email !== "advisor.impresa@gmail.com") {
        nav({ to: "/walt" });
      }
    });
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: children } = await supabase
        .from("child_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: stories } = await supabase
        .from("stories")
        .select("id, parent_id, child_id, mode, created_at");

      const { data: sessions } = await supabase
        .from("listening_sessions")
        .select("id, child_id");

      if (!children) return;

      const parentMap = new Map<string, UserRow>();
      for (const child of children) {
        if (!parentMap.has(child.parent_id)) {
          parentMap.set(child.parent_id, {
            id: child.parent_id,
            created_at: child.created_at,
            children: [],
            stories_generated: 0,
            stories_listened: 0,
          });
        }
        parentMap.get(child.parent_id)!.children.push({
          id: child.id,
          name: child.name,
          age_range: child.age_range,
          gender: child.gender,
          language: child.language,
        });
      }

      if (stories) {
        for (const story of stories) {
          const row = parentMap.get(story.parent_id);
          if (row) row.stories_generated++;
        }
      }

      if (sessions) {
        for (const session of sessions) {
          // match session.child_id → parent
          for (const [, row] of parentMap) {
            if (row.children.some((c) => c.id === session.child_id)) {
              row.stories_listened++;
              break;
            }
          }
        }
      }

      setUsers(Array.from(parentMap.values()));
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.id.toLowerCase().includes(search.toLowerCase()) ||
      u.children.some((c) => c.name.toLowerCase().includes(search.toLowerCase()));
    const matchAge =
      !filterAge || u.children.some((c) => c.age_range === filterAge);
    return matchSearch && matchAge;
  });

  const totalUsers = users.length;
  const totalChildren = users.reduce((s, u) => s + u.children.length, 0);
  const totalStories = users.reduce((s, u) => s + u.stories_generated, 0);
  const totalListened = users.reduce((s, u) => s + u.stories_listened, 0);

  const allAges = Array.from(
    new Set(users.flatMap((u) => u.children.map((c) => c.age_range)))
  ).sort();

  return (
    <div className="min-h-screen bg-[#0d0a1e] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/30">CEO Dashboard</p>
          <h1 className="text-lg font-bold">Walt — MilleStorie</h1>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          <LogOut className="size-4" /> Esci
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
            <Users className="size-5 mx-auto mb-1 text-celeste" />
            <p className="text-2xl font-bold">{totalUsers}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Utenti</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
            <span className="text-xl block mb-1">👶</span>
            <p className="text-2xl font-bold">{totalChildren}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Bambini</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
            <BookOpen className="size-5 mx-auto mb-1 text-giallo" />
            <p className="text-2xl font-bold">{totalStories}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Storie generate</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
            <span className="text-xl block mb-1">🎧</span>
            <p className="text-2xl font-bold">{totalListened}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Storie ascoltate</p>
          </div>
        </div>

        {/* Filtri */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 flex-1 min-w-[160px]">
            <Filter className="size-3 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca bambino…"
              className="bg-transparent text-sm outline-none w-full placeholder:text-white/25"
            />
          </div>
          <select
            value={filterAge}
            onChange={(e) => setFilterAge(e.target.value)}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/70 outline-none"
          >
            <option value="">Tutte le età</option>
            {allAges.map((a) => (
              <option key={a} value={a}>{a} anni</option>
            ))}
          </select>
        </div>

        {/* Lista utenti */}
        {loading ? (
          <p className="text-center text-sm text-white/30 py-12">Caricamento…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-white/30 py-12">Nessun utente trovato</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelected(selected === u.id ? null : u.id)}
                className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 cursor-pointer hover:bg-white/8 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-white/50 truncate max-w-[180px]">
                      {u.id.slice(0, 12)}…
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      Registrato: {new Date(u.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-sm font-bold">{u.children.length}</p>
                      <p className="text-[9px] text-white/30">bambini</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{u.stories_generated}</p>
                      <p className="text-[9px] text-white/30">generate</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{u.stories_listened}</p>
                      <p className="text-[9px] text-white/30">ascoltate</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-white/20">💳</p>
                      <p className="text-[9px] text-white/30">Stripe</p>
                    </div>
                  </div>
                </div>

                {/* Dettaglio espandibile */}
                {selected === u.id && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-white/30">Bambini</p>
                    {u.children.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-semibold">{c.name}</p>
                          <p className="text-[10px] text-white/40">
                            {c.age_range} anni ·{" "}
                            {c.gender === "m" ? "M" : c.gender === "f" ? "F" : "·"} ·{" "}
                            {c.language.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/40">
                      💳 Stripe — da collegare
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}