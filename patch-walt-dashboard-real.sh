#!/usr/bin/env bash
# Aggiunge "Importa da link" al VERO walt-dashboard.tsx (src/routes/) e
# rimuove i componenti doppioni in src/components/walt/ (non collegati a nessuna route).
# Esegui dalla ROOT del progetto.
set -e

if [ ! -f "src/routes/walt-dashboard.tsx" ]; then
  echo "ERRORE: non trovo src/routes/walt-dashboard.tsx. Esegui dalla root del progetto."
  exit 1
fi

echo "1/3 - Aggiungo importClassicStoryFromUrl al backend (se manca)"
if grep -q "importClassicStoryFromUrl" src/lib/admin-stories.functions.ts; then
  echo "   già presente, skip."
else
  cat >> src/lib/admin-stories.functions.ts << 'FILE_EOF'

// ---------------------------------------------------------------------------
// 7. IMPORTA DA LINK — come sopra ma parti da un URL che conosci già
//    (Liber Liber, Wikisource, Progetto Gutenberg...) invece di cercare con
//    Tavily. Utile per caricare in blocco fiabe da fonti di pubblico dominio
//    già verificate, senza consumare le ricerche mensili gratuite.
// ---------------------------------------------------------------------------
const ImportFromUrlSchema = z.object({
  url: z.string().url(),
  age: z.enum(["3-5", "6-8", "9-12"]).default("6-8"),
  holidayTag: z.string().max(40).optional(),
});

async function fetchPageAsSeed(url: string): Promise<TavilyResult> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; WaltImportBot/1.0)" },
  });
  if (!res.ok) throw new Error(`Impossibile scaricare la pagina (${res.status}).`);
  const html = await res.text();

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : url;

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  return { title, url, content: text.slice(0, 4000) };
}

export const importClassicStoryFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImportFromUrlSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("AI non configurata.");

    const seed = await fetchPageAsSeed(data.url);
    if (!seed.content) {
      return { ok: false, reason: "Non sono riuscito a leggere del testo da questa pagina." };
    }

    const groq = createGroq({ apiKey: groqKey });
    const model = groq("llama-3.3-70b-versatile");

    const { text } = await generateText({
      model,
      prompt: buildAdaptationPrompt(seed, data.age),
      temperature: 0.85,
    });

    const titleMatch = text.match(/^TITOLO\s*:\s*(.+)/im);
    const subtitleMatch = text.match(/^SOTTOTITOLO\s*:\s*(.+)/im);
    const authorMatch = text.match(/^AUTORE\s*:\s*(.+)/im);
    const tagMatch = text.match(/^TAG\s*:\s*(.+)/im);
    const splitIdx = text.indexOf("---");
    const content = splitIdx >= 0 ? text.slice(splitIdx + 3).trim() : text.trim();

    const tags = (tagMatch?.[1] ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 5);

    const { data: row, error } = await context.supabase
      .from("stories")
      .insert({
        title: (titleMatch?.[1] ?? seed.title).trim(),
        subtitle: (subtitleMatch?.[1] ?? "").trim(),
        content,
        mode: MODE_FALLBACK,
        language: "it",
        is_preset: true,
        story_type: data.holidayTag ? "seasonal" : "classic",
        author: (authorMatch?.[1] ?? "Tradizione popolare").trim(),
        collection: null,
        age: data.age,
        duration: TARGET_DURATION,
        cover_key: "castle",
        review_status: "pending", // <-- resta in coda finché Walt non approva
        tags,
        holiday_tag: data.holidayTag ?? null,
        source_url: data.url,
        expires_at: null,
      })
      .select(STORY_COLUMNS_ADMIN)
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, story: row };
  });
FILE_EOF
fi

echo "2/3 - Sovrascrivo src/routes/walt-dashboard.tsx con la card Importa da link"
cat > src/routes/walt-dashboard.tsx << 'FILE_EOF'
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Users, BookOpen, Filter, ChevronDown, ChevronUp, Settings, Search, Check, X, Pause, Play, Calendar, Sparkles, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/millestorie-logo-orizzontale.png";
import {
  listStoriesAdmin,
  listPendingReview,
  approveStory,
  rejectStory,
  setStorySuspended,
  scheduleStoryVisibility,
  listHolidayStoriesAdmin,
  setStoryHoliday,
  searchAndProposeClassicStory,
  importClassicStoryFromUrl,
} from "@/lib/admin-stories.functions";

export const Route = createFileRoute("/walt-dashboard")({
  component: WaltDashboard,
});

type ChildRow = { id: string; name: string; age_range: string; gender: string; language: string; };
type UserRow = { id: string; email: string; full_name: string; city: string; created_at: string; children: ChildRow[]; stories_generated: number; stories_listened: number; };
type StoryAdminRow = {
  id: string; title: string; subtitle: string; mode: string; language: string; age: string;
  duration: number; cover_key: string; is_preset: boolean; story_type: "original" | "classic" | "seasonal";
  author: string | null; collection: string | null; review_status: "pending" | "approved" | "rejected";
  suspended: boolean; visible_from: string | null; visible_until: string | null; tags: string[];
  holiday_tag: string | null; source_url: string | null; created_at: string; content?: string;
};
type Tab = "utenti" | "tono" | "comportamenti" | "storie";
type StorieSubTab = "verifica" | "tutte" | "festivita";

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

  // --- STORIE ---
  const [storieSubTab, setStorieSubTab] = useState<StorieSubTab>("verifica");
  const [pendingStories, setPendingStories] = useState<StoryAdminRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [searchTopic, setSearchTopic] = useState("");
  const [searchAge, setSearchAge] = useState<"3-5" | "6-8" | "9-12">("6-8");
  const [searchHoliday, setSearchHoliday] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  // --- IMPORTA DA LINK ---
  const [linkUrl, setLinkUrl] = useState("");
  const [linkAge, setLinkAge] = useState<"3-5" | "6-8" | "9-12">("6-8");
  const [linkHoliday, setLinkHoliday] = useState("");
  const [linkImporting, setLinkImporting] = useState(false);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);

  const [allStories, setAllStories] = useState<StoryAdminRow[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [filterMode, setFilterMode] = useState("");
  const [filterAgeStorie, setFilterAgeStorie] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [scheduleEdits, setScheduleEdits] = useState<Record<string, { from: string; until: string }>>({});

  const [holidayStories, setHolidayStories] = useState<StoryAdminRow[]>([]);
  const [holidayLoading, setHolidayLoading] = useState(false);
  const [holidayAssignId, setHolidayAssignId] = useState("");
  const [holidayAssignTag, setHolidayAssignTag] = useState("");

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

  async function loadPending() {
    setPendingLoading(true);
    try {
      const rows = await listPendingReview();
      setPendingStories(rows as StoryAdminRow[]);
    } finally {
      setPendingLoading(false);
    }
  }

  async function loadAllStories() {
    setAllLoading(true);
    try {
      const rows = await listStoriesAdmin({
        data: {
          mode: filterMode || undefined,
          age: (filterAgeStorie || undefined) as any,
          storyType: (filterType || undefined) as any,
          reviewStatus: (filterStatus || undefined) as any,
        },
      });
      setAllStories(rows as StoryAdminRow[]);
    } finally {
      setAllLoading(false);
    }
  }

  async function loadHolidayStories() {
    setHolidayLoading(true);
    try {
      const rows = await listHolidayStoriesAdmin();
      setHolidayStories(rows as StoryAdminRow[]);
    } finally {
      setHolidayLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "storie") return;
    if (storieSubTab === "verifica") loadPending();
    if (storieSubTab === "tutte") loadAllStories();
    if (storieSubTab === "festivita") loadHolidayStories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, storieSubTab]);

  async function handleSearchNew() {
    setSearching(true);
    setSearchMsg(null);
    try {
      const res = await searchAndProposeClassicStory({
        data: {
          topic: searchTopic || undefined,
          age: searchAge,
          holidayTag: searchHoliday || undefined,
        },
      });
      if (res.ok) {
        setSearchMsg(`✅ Creata: "${res.story.title}" — in attesa di revisione qui sotto`);
        loadPending();
      } else {
        setSearchMsg(`⚠️ ${res.reason}`);
      }
    } catch (e: any) {
      setSearchMsg(`❌ Errore: ${e.message ?? "sconosciuto"}`);
    } finally {
      setSearching(false);
    }
  }

  async function handleImportFromLink() {
    if (!linkUrl.trim()) return;
    setLinkImporting(true);
    setLinkMsg(null);
    try {
      const res = await importClassicStoryFromUrl({
        data: {
          url: linkUrl.trim(),
          age: linkAge,
          holidayTag: linkHoliday || undefined,
        },
      });
      if (res.ok) {
        setLinkMsg(`✅ Importata: "${res.story.title}" — in attesa di revisione qui sotto`);
        setLinkUrl("");
        loadPending();
      } else {
        setLinkMsg(`⚠️ ${res.reason}`);
      }
    } catch (e: any) {
      setLinkMsg(`❌ Errore: ${e.message ?? "sconosciuto"}`);
    } finally {
      setLinkImporting(false);
    }
  }

  async function handleApprove(id: string) {
    await approveStory({ data: { id } });
    setPendingStories((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleReject(id: string) {
    await rejectStory({ data: { id } });
    setPendingStories((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleToggleSuspend(row: StoryAdminRow) {
    await setStorySuspended({ data: { id: row.id, suspended: !row.suspended } });
    setAllStories((prev) => prev.map((s) => (s.id === row.id ? { ...s, suspended: !s.suspended } : s)));
  }

  async function handleSaveSchedule(id: string) {
    const edit = scheduleEdits[id] ?? { from: "", until: "" };
    await scheduleStoryVisibility({
      data: {
        id,
        visibleFrom: edit.from ? new Date(edit.from).toISOString() : null,
        visibleUntil: edit.until ? new Date(edit.until).toISOString() : null,
      },
    });
    loadAllStories();
  }

  async function handleAssignHolidayManual() {
    if (!holidayAssignId.trim() || !holidayAssignTag.trim()) return;
    await setStoryHoliday({ data: { id: holidayAssignId.trim(), holidayTag: holidayAssignTag.trim() } });
    setHolidayAssignId("");
    setHolidayAssignTag("");
    loadHolidayStories();
    loadAllStories();
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
          {([["utenti", "👥 Utenti"], ["storie", "📚 Storie"], ["tono", "🎙 Gestione Tono"], ["comportamenti", "⚠️ Comportamenti"]] as const).map(([key, label]) => (
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

        {/* TAB STORIE */}
        {tab === "storie" && (
          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              {([["verifica", "🔍 Verifica Nuove Storie"], ["tutte", "📖 Tutte le Storie"], ["festivita", "🎉 Festività"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStorieSubTab(key)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${storieSubTab === key ? "bg-amber-400 text-white" : "bg-white border border-amber-100 text-gray-500 hover:bg-amber-50"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* --- VERIFICA NUOVE STORIE --- */}
            {storieSubTab === "verifica" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-3">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Sparkles className="size-4 text-amber-400" /> Cerca una nuova fiaba classica</h2>
                  <p className="text-xs text-gray-400">L'AI cerca sul web una fiaba di pubblico dominio, ne scrive una versione originale e la mette in coda per la tua approvazione qui sotto.</p>
                  <div className="flex gap-3 flex-wrap">
                    <input
                      value={searchTopic}
                      onChange={(e) => setSearchTopic(e.target.value)}
                      placeholder='Es. "fiabe di Natale" (vuoto = a caso)'
                      className="flex-1 min-w-[220px] rounded-xl border border-amber-100 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
                    />
                    <select value={searchAge} onChange={(e) => setSearchAge(e.target.value as any)} className="rounded-xl border border-amber-100 px-3 py-2.5 text-sm text-gray-600 outline-none">
                      <option value="3-5">3-5 anni</option>
                      <option value="6-8">6-8 anni</option>
                      <option value="9-12">9-12 anni</option>
                    </select>
                    <input
                      value={searchHoliday}
                      onChange={(e) => setSearchHoliday(e.target.value)}
                      placeholder="Festività (opzionale, es. natale)"
                      className="rounded-xl border border-amber-100 px-4 py-2.5 text-sm outline-none focus:border-amber-400 w-48"
                    />
                    <button
                      onClick={handleSearchNew}
                      disabled={searching}
                      className="rounded-xl bg-amber-400 hover:bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Search className="size-4" /> {searching ? "Cerco…" : "Cerca fiaba"}
                    </button>
                  </div>
                  {searchMsg && <p className="text-xs text-gray-500">{searchMsg}</p>}
                </div>

                <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-3">
                  <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Link2 className="size-4 text-amber-400" /> Importa da un link</h2>
                  <p className="text-xs text-gray-400">Hai già il link a una fiaba di pubblico dominio (Liber Liber, Wikisource...)? Incollalo qui: salta la ricerca, l'AI riscrive comunque una versione originale a partire da quel testo.</p>
                  <div className="flex gap-3 flex-wrap">
                    <input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://www.liberliber.it/..."
                      className="flex-1 min-w-[220px] rounded-xl border border-amber-100 px-4 py-2.5 text-sm outline-none focus:border-amber-400"
                    />
                    <select value={linkAge} onChange={(e) => setLinkAge(e.target.value as any)} className="rounded-xl border border-amber-100 px-3 py-2.5 text-sm text-gray-600 outline-none">
                      <option value="3-5">3-5 anni</option>
                      <option value="6-8">6-8 anni</option>
                      <option value="9-12">9-12 anni</option>
                    </select>
                    <input
                      value={linkHoliday}
                      onChange={(e) => setLinkHoliday(e.target.value)}
                      placeholder="Festività (opzionale, es. natale)"
                      className="rounded-xl border border-amber-100 px-4 py-2.5 text-sm outline-none focus:border-amber-400 w-48"
                    />
                    <button
                      onClick={handleImportFromLink}
                      disabled={linkImporting || !linkUrl.trim()}
                      className="rounded-xl bg-gray-800 hover:bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Link2 className="size-4" /> {linkImporting ? "Importo…" : "Importa da link"}
                    </button>
                  </div>
                  {linkMsg && <p className="text-xs text-gray-500">{linkMsg}</p>}
                </div>

                <h3 className="text-xs uppercase tracking-widest text-gray-400 pt-2">In attesa di revisione ({pendingStories.length})</h3>
                {pendingLoading ? (
                  <p className="text-center text-sm text-gray-400 py-8">Caricamento…</p>
                ) : pendingStories.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">Nessuna storia in coda</p>
                ) : (
                  <div className="space-y-3">
                    {pendingStories.map((s) => (
                      <div key={s.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-gray-800">{s.title}</p>
                            <p className="text-xs text-gray-400 italic">{s.subtitle}</p>
                            <p className="text-[11px] text-gray-400 mt-1">{s.author} · {s.mode} · {s.age} anni · {s.story_type === "seasonal" ? `🎉 ${s.holiday_tag}` : "classica"}</p>
                            {s.collection && <p className="text-[10px] text-emerald-600 mt-1">✓ {s.collection}</p>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => handleApprove(s.id)} className="flex items-center gap-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-2 text-xs font-semibold transition-colors">
                              <Check className="size-3.5" /> Approva
                            </button>
                            <button onClick={() => handleReject(s.id)} className="flex items-center gap-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 px-3 py-2 text-xs font-semibold transition-colors">
                              <X className="size-3.5" /> Rifiuta
                            </button>
                          </div>
                        </div>
                        {s.tags?.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap">
                            {s.tags.map((t) => (
                              <span key={t} className="text-[10px] bg-amber-50 text-amber-600 rounded-full px-2 py-0.5">#{t}</span>
                            ))}
                          </div>
                        )}
                        {s.content && (
                          <details className="text-xs text-gray-500">
                            <summary className="cursor-pointer text-amber-500 font-semibold">Leggi anteprima</summary>
                            <p className="mt-2 whitespace-pre-line leading-relaxed">{s.content.slice(0, 800)}{s.content.length > 800 ? "…" : ""}</p>
                          </details>
                        )}
                        {s.source_url && <p className="text-[10px] text-gray-300 truncate">Fonte ispirazione: {s.source_url}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- TUTTE LE STORIE --- */}
            {storieSubTab === "tutte" && (
              <div className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                  <select value={filterMode} onChange={(e) => setFilterMode(e.target.value)} className="rounded-xl border border-amber-100 px-3 py-2 text-sm text-gray-600 outline-none">
                    <option value="">Tutti i generi</option>
                    {["avventura", "divertente", "educativa", "magica", "nanna", "sportiva"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={filterAgeStorie} onChange={(e) => setFilterAgeStorie(e.target.value)} className="rounded-xl border border-amber-100 px-3 py-2 text-sm text-gray-600 outline-none">
                    <option value="">Tutte le età</option>
                    <option value="3-5">3-5 anni</option>
                    <option value="6-8">6-8 anni</option>
                    <option value="9-12">9-12 anni</option>
                  </select>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="rounded-xl border border-amber-100 px-3 py-2 text-sm text-gray-600 outline-none">
                    <option value="">Tutti i tipi</option>
                    <option value="original">Originali</option>
                    <option value="classic">Classiche</option>
                    <option value="seasonal">Festività</option>
                  </select>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-xl border border-amber-100 px-3 py-2 text-sm text-gray-600 outline-none">
                    <option value="">Tutti gli stati</option>
                    <option value="pending">In attesa</option>
                    <option value="approved">Approvate</option>
                    <option value="rejected">Rifiutate</option>
                  </select>
                  <button onClick={loadAllStories} className="rounded-xl bg-amber-400 hover:bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-colors">Filtra</button>
                </div>

                {allLoading ? (
                  <p className="text-center text-sm text-gray-400 py-8">Caricamento…</p>
                ) : allStories.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">Nessuna storia trovata</p>
                ) : (
                  <div className="space-y-3">
                    {allStories.map((s) => {
                      const edit = scheduleEdits[s.id] ?? { from: "", until: "" };
                      return (
                        <div key={s.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-gray-800">{s.title} {s.suspended && <span className="text-[10px] bg-gray-200 text-gray-500 rounded-full px-2 py-0.5 ml-1">sospesa</span>}</p>
                              <p className="text-[11px] text-gray-400">{s.mode} · {s.age} anni · {s.story_type}{s.author ? ` · ${s.author}` : ""}</p>
                            </div>
                            <button
                              onClick={() => handleToggleSuspend(s)}
                              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors shrink-0 ${s.suspended ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700" : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}
                            >
                              {s.suspended ? <Play className="size-3.5" /> : <Pause className="size-3.5" />} {s.suspended ? "Riattiva" : "Sospendi"}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap bg-amber-50/60 rounded-xl p-3">
                            <Calendar className="size-3.5 text-gray-400" />
                            <span className="text-[11px] text-gray-400">Visibile dal</span>
                            <input type="date" value={edit.from} onChange={(e) => setScheduleEdits((p) => ({ ...p, [s.id]: { ...edit, from: e.target.value } }))} className="rounded-lg border border-amber-100 px-2 py-1 text-xs" />
                            <span className="text-[11px] text-gray-400">al</span>
                            <input type="date" value={edit.until} onChange={(e) => setScheduleEdits((p) => ({ ...p, [s.id]: { ...edit, until: e.target.value } }))} className="rounded-lg border border-amber-100 px-2 py-1 text-xs" />
                            <button onClick={() => handleSaveSchedule(s.id)} className="rounded-lg bg-amber-400 hover:bg-amber-500 text-white text-[11px] font-semibold px-3 py-1.5">Salva</button>
                            {(s.visible_from || s.visible_until) && (
                              <span className="text-[10px] text-gray-400 ml-2">
                                attuale: {s.visible_from ? new Date(s.visible_from).toLocaleDateString("it-IT") : "sempre"} → {s.visible_until ? new Date(s.visible_until).toLocaleDateString("it-IT") : "sempre"}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* --- FESTIVITÀ --- */}
            {storieSubTab === "festivita" && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-800">🎉 Storie stagionali per festività</h2>
                  <p className="text-xs text-gray-400 mt-1">Raggruppate per festività. Usa "Verifica Nuove Storie" indicando la festività per generarne di nuove, oppure assegna una festività a una storia già esistente qui sotto.</p>
                </div>

                {holidayLoading ? (
                  <p className="text-center text-sm text-gray-400 py-8">Caricamento…</p>
                ) : holidayStories.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">Nessuna storia di festività ancora</p>
                ) : (
                  Object.entries(
                    holidayStories.reduce<Record<string, StoryAdminRow[]>>((acc, s) => {
                      const key = s.holiday_tag ?? "senza festività";
                      (acc[key] ??= []).push(s);
                      return acc;
                    }, {})
                  ).map(([tag, rows]) => (
                    <div key={tag} className="space-y-2">
                      <h3 className="text-xs uppercase tracking-widest text-amber-500 font-bold">🎉 {tag} ({rows.length})</h3>
                      {rows.map((s) => (
                        <div key={s.id} className="bg-white rounded-xl border border-amber-100 shadow-sm px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{s.title}</p>
                            <p className="text-[11px] text-gray-400">{s.age} anni · {s.review_status}{s.suspended ? " · sospesa" : ""}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}

                <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-2">
                  <h3 className="text-xs font-bold text-gray-700">Assegna festività a una storia esistente</h3>
                  <p className="text-[11px] text-gray-400">Prendi l'ID da "Tutte le Storie" e indica il nome della festività (es. natale, halloween, pasqua, carnevale).</p>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      value={holidayAssignId}
                      onChange={(e) => setHolidayAssignId(e.target.value)}
                      placeholder="ID storia"
                      className="rounded-xl border border-amber-100 px-3 py-2 text-xs w-64"
                    />
                    <input
                      value={holidayAssignTag}
                      onChange={(e) => setHolidayAssignTag(e.target.value)}
                      placeholder="Festività (es. natale)"
                      className="rounded-xl border border-amber-100 px-3 py-2 text-xs w-48"
                    />
                    <button onClick={handleAssignHolidayManual} className="rounded-xl bg-amber-400 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2">Assegna</button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
FILE_EOF

echo "3/3 - Rimuovo i componenti doppioni non usati da nessuna route"
if [ -d "src/components/walt" ]; then
  rm -rf src/components/walt
  echo "   rimossa src/components/walt/ (era un tentativo parallelo, non collegato a nessuna route)."
else
  echo "   nessuna cartella src/components/walt da rimuovere."
fi

echo ""
echo "Fatto. La card 'Importa da un link' è ora dentro /walt-dashboard, sotto Storie > Verifica Nuove Storie."
