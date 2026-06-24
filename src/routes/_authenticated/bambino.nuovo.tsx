import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { createChild } from "@/lib/child-profiles.functions";
import type { ChildGender, ChildLanguage } from "@/lib/child-profiles.functions";
import { listCharacters } from "@/lib/characters.functions";
import { setCharacterCache, type PuppetCharacter } from "@/lib/characters";
import { CharacterPicker } from "@/components/CharacterPicker";
import { LANGUAGES } from "@/lib/types";

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
  const [gender, setGender] = useState<ChildGender>("n");
  const [language, setLanguage] = useState<ChildLanguage>("it");
  const [characters, setCharacters] = useState<PuppetCharacter[]>([]);
  const [characterId, setCharacterId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    listCharacters().then((list) => {
      const active = list.filter((c) => c.active);
      setCharacters(active);
      setCharacterCache(active);
      if (active[0]) setCharacterId(active[0].id);
    }).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const character = characters.find((c) => c.id === characterId);
      if (!character) {
        setErr("Scegli un personaggio");
        setBusy(false);
        return;
      }
      const c = await createChild({
        data: {
          name: name.trim(),
          age_range: age,
          favorite_color: color.trim() || null,
          favorite_animal: animal.trim() || null,
          fears: fears.trim() || null,
          preferred_voice: "sage",
          puppet_character: character.id,
          gender,
          language,
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

        <Field label="Maschio o femmina?">
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: "m" as const, label: "👦 Maschio", on: "bg-sky-400 text-primary-foreground" },
              { v: "f" as const, label: "👧 Femmina", on: "bg-pink-400 text-primary-foreground" },
              { v: "n" as const, label: "✨ Altro",   on: "bg-giallo text-primary-foreground" },
            ]).map((g) => (
              <button key={g.v} type="button" onClick={() => setGender(g.v)}
                className={`rounded-2xl py-3 text-sm font-bold ${gender === g.v ? g.on : "glass text-muted-foreground"}`}>
                {g.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Lingua delle storie">
          <div className="grid grid-cols-5 gap-2">
            {LANGUAGES.map((l) => (
              <button key={l.code} type="button" onClick={() => setLanguage(l.code)}
                aria-label={l.label}
                className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-bold ${
                  language === l.code ? "bg-celeste text-primary-foreground" : "glass text-muted-foreground"
                }`}>
                <span className="text-xl leading-none">{l.flag}</span>
                <span>{l.code.toUpperCase()}</span>
              </button>
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
            Ogni pupazzo ha la sua voce. Tocca ▶︎ per ascoltarla prima di scegliere.
          </p>
          {characters.length === 0 ? (
            <p className="text-xs text-muted-foreground">Caricamento personaggi…</p>
          ) : (
            <CharacterPicker characters={characters} value={characterId} onChange={setCharacterId} />
          )}
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