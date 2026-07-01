import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Users, BookOpen, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/millestorie-logo-orizzontale.png";

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
  const allAges = Array.from(new Set(users.flatMap((u) => u.children.map((c) => c.age_range)))).sort();

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <div className="bg-amber-400 border-b border-amber-500 px-6 py-4 flex items-center justify-between shadow-sm">
        <img src={logo} alt="MilleStorie" className="h-10 w-auto" />
        <div className="flex items-center gap-4">
          <p className="text-xs text-white/70 uppercase tracking-widest hidden sm:block">Dashboard CEO</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors"
          >
            <LogOut className="size-4" /> Esci
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { icon: <Users className="size-5 text-amber-400" />, value: totalUsers, label: "Utenti" },
            { icon: <span className="text-xl">👶</span>, value: totalChildren, label: "Bambini" },
            { icon: <BookOpen className="size-5 text-amber-400" />, value: totalStories, label: "Storie generate" },
            { icon: <span className="text-xl">🎧</span>, value: totalListened, label: "Storie ascoltate" },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-2xl border border-amber-100 p-5 text-center shadow-sm">
              <div className="flex justify-center mb-2">{k.icon}</div>
              <p className="text-3xl font-bold text-gray-800">{k.value}</p>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Filtri */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-amber-100 px-4 py-2.5 flex-1 min-w-[160px] shadow-sm">
            <Filter className="size-3.5 text-gray-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca bambino o utente…"
              className="bg-transparent text-sm outline-none w-full placeholder:text-gray-300 text-gray-700"
            />
          </div>
          <select
            value={filterAge}
            onChange={(e) => setFilterAge(e.target.value)}
            className="bg-white rounded-xl border border-amber-100 px-4 py-2.5 text-sm text-gray-500 outline-none shadow-sm"
          >
            <option value="">Tutte le età</option>
            {allAges.map((a) => (
              <option key={a} value={a}>{a} anni</option>
            ))}
          </select>
        </div>

        {/* Lista utenti */}
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-12">Caricamento…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">Nessun utente trovato</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((u) => (
              <div key={u.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                <div
                  onClick={() => setSelected(selected === u.id ? null : u.id)}
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-amber-50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-mono text-gray-400 truncate max-w-[160px]">{u.id.slice(0, 12)}…</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">
                      Registrato: {new Date(u.created_at).toLocaleDateString("it-IT")}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-700">{u.children.length}</p>
                      <p className="text-[10px] text-gray-400">bambini</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-700">{u.stories_generated}</p>
                      <p className="text-[10px] text-gray-400">generate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-700">{u.stories_listened}</p>
                      <p className="text-[10px] text-gray-400">ascoltate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-gray-300">💳</p>
                      <p className="text-[10px] text-gray-300">Stripe</p>
                    </div>
                    {selected === u.id
                      ? <ChevronUp className="size-4 text-gray-300" />
                      : <ChevronDown className="size-4 text-gray-300" />
                    }
                  </div>
                </div>

                {selected === u.id && (
                  <div className="border-t border-amber-50 px-5 py-4 bg-amber-50/50 space-y-2">
                    <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-3">Bambini registrati</p>
                    {u.children.map((c) => (
                      <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{c.name}</p>
                          <p className="text-[11px] text-gray-400">
                            {c.age_range} anni · {c.gender === "m" ? "M" : c.gender === "f" ? "F" : "·"} · {c.language.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div className="bg-white rounded-xl px-4 py-3 border border-amber-100 text-xs text-gray-400">
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
