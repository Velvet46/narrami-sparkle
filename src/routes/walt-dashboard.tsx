import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Users, BookOpen, Filter, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/millestorie-logo-orizzontale.png";

export const Route = createFileRoute("/walt-dashboard")({
  component: WaltDashboard,
});

type ChildRow = { id: string; name: string; age_range: string; gender: string; language: string; };
type UserRow = { id: string; email: string; full_name: string; city: string; created_at: string; children: ChildRow[]; stories_generated: number; stories_listened: number; };
type Tab = "utenti" | "tono" | "comportamenti";

function WaltDashboard() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("utenti");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);
  const [behaviorLogs, setBehaviorLogs] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session || data.session.user.email !== "advisor.impresa@gmail.com") nav({ to: "/walt" });
    });
    loadData();
    loadPrompt();
    loadBehaviors();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: children } = await supabase.from("child_profiles").select("*");
      const { data: stories } = await supabase.from("stories").select("id, parent_id");
      const { data: sessions } = await supabase.from("listening_sessions").select("id, child_id");
      if (!profiles) return;
      const userMap = new Map<string, UserRow>();
      for (const p of profiles) {
        userMap.set(p.id, { id: p.id, email: p.email || "—", full_name: p.full_name || "—", city: p.city || "—", created_at: p.created_at, children: [], stories_generated: 0, stories_listened: 0 });
      }
      if (children) for (const c of children) { const row = userMap.get(c.parent_id); if (row) row.children.push({ id: c.id, name: c.name, age_range: c.age_range, gender: c.gender, language: c.language }); }
      if (stories) for (const s of stories) { const row = userMap.get(s.parent_id); if (row) row.stories_generated++; }
      if (sessions && children) for (const s of sessions) { const c = children.find((x) => x.id === s.child_id); if (c) { const row = userMap.get(c.parent_id); if (row) row.stories_listened++; } }
      setUsers(Array.from(userMap.values()));
    } finally { setLoading(false); }
  }

  async function loadPrompt() {
    const { data } = await supabase.from("ai_prompts").select("prompt").eq("key", "puppet_conversation").single();
    if (data) setPrompt(data.prompt);
  }

  async function savePrompt() {
    setPromptLoading(true);
    await supabase.from("ai_prompts").update({ prompt, updated_at: new Date().toISOString() }).eq("key", "puppet_conversation");
    setPromptLoading(false);
    setPromptSaved(true);
    setTimeout(() => setPromptSaved(false), 2000);
  }

  async function loadBehaviors() {
    const { data } = await supabase.from("behavior_logs").select("*, child_profiles(name)").order("created_at", { ascending: false }).limit(50);
    if (data) setBehaviorLogs(data);
  }

  async function signOut() { await supabase.auth.signOut(); nav({ to: "/" }); }

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase()) || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.city.toLowerCase().includes(search.toLowerCase()) || u.children.some((c) => c.name.toLowerCase().includes(search.toLowerCase()));
    const matchAge = !filterAge || u.children.some((c) => c.age_range === filterAge);
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
      <div className="bg-[#15102b] border-b border-white/10 px-6 py-4 flex items-center justify-between shadow-sm">
        <img src={logo} alt="MilleStorie" className="h-10 w-auto" />
        <div className="flex items-center gap-4">
          <p className="text-xs text-white/70 uppercase tracking-widest hidden sm:block">Dashboard CEO</p>
          <button onClick={signOut} className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors">
            <LogOut className="size-4" /> Esci
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-amber-200 bg-white px-6">
        <div className="flex gap-6">
          {([["utenti", "👥 Utenti"], ["tono", "🎙 Gestione Tono"], ["comportamenti", "⚠️ Comportamenti"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`py-3 text-sm font-semibold border-b-2 transition-colors ${tab === key ? "border-amber-400 text-amber-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* TAB UTENTI */}
        {tab === "utenti" && (
          <>
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

            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white rounded-xl border border-amber-100 px-4 py-2.5 flex-1 min-w-[160px] shadow-sm">
                <Filter className="size-3.5 text-gray-300" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca nome, email, città…" className="bg-transparent text-sm outline-none w-full placeholder:text-gray-300 text-gray-700" />
              </div>
              <select value={filterAge} onChange={(e) => setFilterAge(e.target.value)} className="bg-white rounded-xl border border-amber-100 px-4 py-2.5 text-sm text-gray-500 outline-none shadow-sm">
                <option value="">Tutte le età</option>
                {allAges.map((a) => <option key={a} value={a}>{a} anni</option>)}
              </select>
            </div>

            {loading ? (
              <p className="text-center text-sm text-gray-400 py-12">Caricamento…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-12">Nessun utente trovato</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((u) => (
                  <div key={u.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                    <div onClick={() => setSelected(selected === u.id ? null : u.id)} className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-amber-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-700 truncate">{u.full_name}</p>
                        <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                        <p className="text-[11px] text-gray-300">{u.city} · {new Date(u.created_at).toLocaleDateString("it-IT")}</p>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-center hidden sm:block"><p className="text-sm font-bold text-gray-700">{u.children.length}</p><p className="text-[10px] text-gray-400">bambini</p></div>
                        <div className="text-center hidden sm:block"><p className="text-sm font-bold text-gray-700">{u.stories_generated}</p><p className="text-[10px] text-gray-400">generate</p></div>
                        <div className="text-center hidden sm:block"><p className="text-sm font-bold text-gray-700">{u.stories_listened}</p><p className="text-[10px] text-gray-400">ascoltate</p></div>
                        <div className="text-center hidden sm:block"><p className="text-[11px] text-gray-300">💳</p><p className="text-[10px] text-gray-300">Stripe</p></div>
                        {selected === u.id ? <ChevronUp className="size-4 text-gray-300" /> : <ChevronDown className="size-4 text-gray-300" />}
                      </div>
                    </div>
                    {selected === u.id && (
                      <div className="border-t border-amber-50 px-5 py-4 bg-amber-50/50 space-y-2">
                        <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-3">Bambini</p>
                        {u.children.length === 0 ? <p className="text-xs text-gray-300">Nessun bambino</p> : u.children.map((c) => (
                          <div key={c.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-amber-100">
                            <div>
                              <p className="text-sm font-semibold text-gray-700">{c.name}</p>
                              <p className="text-[11px] text-gray-400">{c.age_range} anni · {c.gender === "m" ? "M" : c.gender === "f" ? "F" : "·"} · {c.language.toUpperCase()}</p>
                            </div>
                          </div>
                        ))}
                        <div className="bg-white rounded-xl px-4 py-3 border border-amber-100 text-xs text-gray-400">💳 Stripe — da collegare</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB GESTIONE TONO */}
        {tab === "tono" && (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">🎙 Prompt Conversazione Pupazzo</h2>
              <p className="text-sm text-gray-400 mt-1">Questo prompt governa tutte le interazioni del portale con i bambini. Modificalo con cura.</p>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={20}
              className="w-full rounded-xl border border-amber-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-amber-400 font-mono leading-relaxed resize-none"
              placeholder="Caricamento prompt…"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={savePrompt}
                disabled={promptLoading}
                className="rounded-xl bg-amber-400 hover:bg-amber-500 px-6 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50"
              >
                {promptLoading ? "Salvo…" : "💾 Salva prompt"}
              </button>
              {promptSaved && <p className="text-sm text-green-500 font-semibold">✅ Salvato!</p>}
            </div>
          </div>
        )}

        {/* TAB COMPORTAMENTI */}
        {tab === "comportamenti" && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
              <h2 className="text-lg font-bold text-gray-800">⚠️ Log Comportamenti</h2>
              <p className="text-sm text-gray-400 mt-1">Parole o frasi non appropriate rilevate durante le conversazioni.</p>
            </div>
            {behaviorLogs.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-12">Nessun comportamento registrato</p>
            ) : (
              behaviorLogs.map((log, i) => (
                <div key={i} className="bg-white rounded-2xl border border-amber-100 shadow-sm px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{(log as any).child_profiles?.name ?? "—"}</p>
                      <p className="text-xs text-rose-400 font-mono mt-0.5">"{log.word}"</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 italic">"{log.context}"</p>
                    </div>
                    <p className="text-[10px] text-gray-300">{new Date(log.created_at).toLocaleDateString("it-IT")}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
