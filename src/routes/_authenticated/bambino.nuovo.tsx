import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { createChild } from "@/lib/child-profiles.functions";
import { CHARACTERS } from "@/lib/characters";

export const Route = createFileRoute("/_authenticated/bambino/nuovo")({
  head: () => ({ meta: [{ title: "Nuovo bambino · MilleStorie" }] }),
  component: NewChildPage,
});

const AGES = ["3-5", "6-8", "9-12"] as const;

function NewChildPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [age, setAge] = useState<typeof AGES[number]>("3-5");
  const [color, setColor] = useState("");
  const [animal, setAnimal] = useState("");
  const [fears, setFears] = useState("");
  const [characterId, setCharacterId] = useState<string>(CHARACTERS[0].id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const character = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
      const c = await createChild({
        data: {
          name: name.trim(),
          age_range: age,
          favorite_color: color.trim() || null,
          favorite_animal: animal.trim() || null,
          fears: fears.trim() || null,
          preferred_voice: character.voice,
          puppet_character: character.id,
        },
      });
      localStorage.setItem("millestorie:activeChildId", c.id);
      nav({ to: "/famiglia" });
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell hideNav>
      <header className="pt-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-celeste">Nuovo profilo</p>
        <h1 className="mt-1 font-display text-2xl font-bold">Parlami del tuo bambino</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Questi dati servono per creare storie adatte e sicure. Restano privati nel tuo account.
        </p>
      </header>

      <form onSubmit={save} className="mt-6 space-y-4">
        <Field label="Come si chiama?">
          <input
            required maxLength={40}
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Sofia"
            className="glass w-full rounded-2xl px-4 py-3 text-base outline-none"
          />
        </Field>

        <Field label="Quanti anni ha?">
          <div className="grid grid-cols-3 gap-2">
            {AGES.map((a) => (
              <button key={a} type="button" onClick={() => setAge(a)}
                className={`rounded-2xl py-3 text-sm font-bold ${
                  age === a ? "bg-giallo text-primary-foreground" : "glass text-muted-foreground"
                }`}>{a}</button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Colore preferito">
            <input value={color} maxLength={20} onChange={(e) => setColor(e.target.value)}
              placeholder="azzurro"
              className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none" />
          </Field>
          <Field label="Animale del cuore">
            <input value={animal} maxLength={20} onChange={(e) => setAnimal(e.target.value)}
              placeholder="leone"
              className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none" />
          </Field>
        </div>

        <Field label="Cosa lo spaventa? (verrà sempre evitato)">
          <input value={fears} maxLength={120} onChange={(e) => setFears(e.target.value)}
            placeholder="buio, lupi, perdere mamma"
            className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none" />
        </Field>

        <Field label="Scegli il pupazzo compagno">
          <p className="-mt-1 mb-3 text-[11px] text-muted-foreground">
            Ogni pupazzo ha la sua voce. Sarà lui a raccontare le storie al tuo bambino.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CHARACTERS.map((c) => {
              const selected = characterId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCharacterId(c.id)}
                  className={`group relative overflow-hidden rounded-2xl border p-2 text-left transition-all ${
                    selected
                      ? "border-giallo bg-giallo/10 ring-2 ring-giallo"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <div className={`mb-2 flex aspect-square items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b ${c.accent}`}>
                    <img
                      src={c.image}
                      alt={c.name}
                      loading="lazy"
                      className="h-full w-full object-contain object-bottom drop-shadow-md"
                    />
                  </div>
                  <p className="font-display text-sm font-bold leading-tight">{c.name}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {c.voiceLabel}
                  </p>
                </button>
              );
            })}
          </div>
        </Field>

        {err && <p className="text-xs text-rose-400">{err}</p>}

        <button type="submit" disabled={busy || !name.trim()}
          className="mt-4 w-full rounded-2xl bg-giallo py-4 font-display text-base font-bold text-primary-foreground disabled:opacity-60">
          {busy ? "Salvo…" : "Salva profilo"}
        </button>
      </form>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}