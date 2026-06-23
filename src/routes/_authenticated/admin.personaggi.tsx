import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, Square, Plus, Trash2, Pencil, ShieldAlert, Save } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { listCharacters, upsertCharacter, deleteCharacter, isAdmin, claimAdmin } from "@/lib/characters.functions";

export const Route = createFileRoute("/_authenticated/admin/personaggi")({
  head: () => ({ meta: [{ title: "Personaggi · Admin · MilleStorie" }] }),
  component: AdminCharactersPage,
});

type Row = {
  dbId: string;
  id: string; // slug
  name: string;
  role: string;
  image: string;
  voiceId: string;
  voiceLabel: string;
  voicePersona: string;
  accent: string;
  sortOrder: number;
  active: boolean;
};

const EMPTY: Row = {
  dbId: "",
  id: "",
  name: "",
  role: "Amico",
  image: "",
  voiceId: "",
  voiceLabel: "",
  voicePersona: "",
  accent: "from-celeste/40 to-celeste/10",
  sortOrder: 100,
  active: true,
};

function AdminCharactersPage() {
  const nav = useNavigate();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function refresh() {
    const list = (await listCharacters()) as unknown as Row[];
    setRows(list);
  }

  useEffect(() => {
    isAdmin().then(async (ok) => {
      if (!ok) {
        // try to bootstrap first admin
        const { claimed } = await claimAdmin().catch(() => ({ claimed: false }));
        setAdmin(claimed || ok);
        if (claimed) refresh();
      } else {
        setAdmin(true);
        refresh();
      }
    });
  }, []);

  async function preview(c: Row) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playing === c.dbId) { setPlaying(null); return; }
    setPlaying(c.dbId);
    try {
      const res = await fetch("/api/elevenlabs/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId: c.voiceId, text: `Ciao! Sono ${c.name || "un narratore"}. Ascolta la mia voce.` }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => setPlaying((p) => (p === c.dbId ? null : p));
      await audio.play();
    } catch { setPlaying(null); }
  }

  async function save(r: Row) {
    await upsertCharacter({
      data: {
        dbId: r.dbId || undefined,
        slug: r.id,
        name: r.name,
        role_title: r.role,
        image_url: r.image,
        voice_id: r.voiceId,
        voice_label: r.voiceLabel,
        voice_persona: r.voicePersona,
        accent: r.accent,
        sort_order: r.sortOrder,
        active: r.active,
      },
    });
    setEditing(null);
    refresh();
  }

  async function remove(r: Row) {
    if (!confirm(`Eliminare "${r.name}"?`)) return;
    await deleteCharacter({ data: { dbId: r.dbId } });
    refresh();
  }

  if (admin === null) {
    return <AppShell><p className="mt-10 text-center text-sm text-muted-foreground">Caricamento…</p></AppShell>;
  }
  if (!admin) {
    return (
      <AppShell>
        <div className="glass-strong mt-10 rounded-3xl p-6 text-center">
          <ShieldAlert className="mx-auto size-10 text-giallo" />
          <p className="mt-3 font-display text-lg font-bold">Accesso riservato</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo gli amministratori possono gestire i personaggi.
          </p>
          <button onClick={() => nav({ to: "/famiglia" })} className="mt-4 rounded-full bg-giallo px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Torna a Famiglia
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex items-center gap-3 pt-2">
        <Link to="/famiglia" aria-label="Indietro" className="glass grid size-10 place-items-center rounded-full">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-celeste">Admin</p>
          <h1 className="mt-0.5 font-display text-2xl font-bold">Personaggi</h1>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="rounded-full bg-giallo px-4 py-2 text-sm font-bold text-primary-foreground">
          <Plus className="-mt-0.5 mr-1 inline size-4" /> Nuovo
        </button>
      </header>

      <ul className="mt-6 space-y-3">
        {rows.map((c) => (
          <li key={c.dbId} className={`glass flex items-center gap-3 rounded-3xl p-3 ${c.active ? "" : "opacity-60"}`}>
            <div className={`grid size-14 shrink-0 place-items-end overflow-hidden rounded-2xl bg-gradient-to-b ${c.accent}`}>
              {c.image && <img src={c.image} alt={c.name} className="h-full w-full object-contain object-bottom" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display font-bold">{c.name} <span className="text-[11px] font-normal text-muted-foreground">/{c.id}</span></p>
              <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{c.voiceLabel} · {c.voiceId.slice(0, 10)}…</p>
            </div>
            <button onClick={() => preview(c)} aria-label="Anteprima voce" className={`grid size-9 place-items-center rounded-full ${playing === c.dbId ? "bg-giallo text-primary-foreground" : "bg-white/10"}`}>
              {playing === c.dbId ? <Square className="size-4" /> : <Play className="size-4" />}
            </button>
            <button onClick={() => setEditing(c)} aria-label="Modifica" className="grid size-9 place-items-center rounded-full bg-white/10">
              <Pencil className="size-4" />
            </button>
            <button onClick={() => remove(c)} aria-label="Elimina" className="grid size-9 place-items-center rounded-full text-rose-300">
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      {editing && (
        <EditDialog row={editing} onClose={() => setEditing(null)} onSave={save} onPreview={preview} playing={playing === editing.dbId} />
      )}
    </AppShell>
  );
}

function EditDialog({
  row, onClose, onSave, onPreview, playing,
}: {
  row: Row;
  onClose: () => void;
  onSave: (r: Row) => void | Promise<void>;
  onPreview: (r: Row) => void;
  playing: boolean;
}) {
  const [r, setR] = useState<Row>(row);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function up<K extends keyof Row>(k: K, v: Row[K]) { setR((p) => ({ ...p, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await onSave(r); } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Errore"); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form onSubmit={submit} className="glass-strong w-full max-w-lg space-y-3 rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-bold uppercase tracking-widest text-celeste">{row.dbId ? "Modifica" : "Nuovo"} personaggio</p>
        <h2 className="font-display text-xl font-bold">{r.name || "Senza nome"}</h2>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome">
            <input required value={r.name} maxLength={60} onChange={(e) => up("name", e.target.value)} className="inp" />
          </Field>
          <Field label="Slug (URL)">
            <input required value={r.id} maxLength={40} pattern="[a-z0-9-]+" onChange={(e) => up("id", e.target.value.toLowerCase())} className="inp" placeholder="orso-tom" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ruolo">
            <input value={r.role} maxLength={40} onChange={(e) => up("role", e.target.value)} className="inp" />
          </Field>
          <Field label="Ordine">
            <input type="number" value={r.sortOrder} onChange={(e) => up("sortOrder", Number(e.target.value))} className="inp" />
          </Field>
        </div>
        <Field label="URL immagine">
          <input required value={r.image} maxLength={500} onChange={(e) => up("image", e.target.value)} className="inp" placeholder="https://..." />
        </Field>
        {r.image && (
          <div className={`grid h-32 place-items-end overflow-hidden rounded-2xl bg-gradient-to-b ${r.accent}`}>
            <img src={r.image} alt="" className="h-full object-contain object-bottom" />
          </div>
        )}
        <Field label="Voice ID ElevenLabs">
          <div className="flex gap-2">
            <input required value={r.voiceId} maxLength={100} onChange={(e) => up("voiceId", e.target.value)} className="inp flex-1" placeholder="XrExE9yKIg1WjnnlVkGX" />
            <button type="button" onClick={() => onPreview(r)} disabled={!r.voiceId} className={`grid size-11 place-items-center rounded-2xl ${playing ? "bg-giallo text-primary-foreground" : "bg-white/10"} disabled:opacity-40`}>
              {playing ? <Square className="size-4" /> : <Play className="size-4" />}
            </button>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Etichetta voce">
            <input value={r.voiceLabel} maxLength={60} onChange={(e) => up("voiceLabel", e.target.value)} className="inp" placeholder="Calda e abbraccio" />
          </Field>
          <Field label="Accento (Tailwind)">
            <input value={r.accent} maxLength={120} onChange={(e) => up("accent", e.target.value)} className="inp" />
          </Field>
        </div>
        <Field label="Persona (hint per il narratore)">
          <textarea value={r.voicePersona} maxLength={300} onChange={(e) => up("voicePersona", e.target.value)} className="inp min-h-[80px]" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={r.active} onChange={(e) => up("active", e.target.checked)} /> Attivo
        </label>

        {err && <p className="text-xs text-rose-400">{err}</p>}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-semibold">Annulla</button>
          <button type="submit" disabled={busy} className="flex-1 rounded-2xl bg-giallo py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
            <Save className="-mt-0.5 mr-1 inline size-4" /> {busy ? "Salvo…" : "Salva"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}