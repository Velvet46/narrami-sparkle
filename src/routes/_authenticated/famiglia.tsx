import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Mic, LogOut, Trash2, BookOpen, Bluetooth, Sparkles, Settings } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { listChildren, deleteChild, updateChildCharacter, updateChildPrefs, type ChildProfile } from "@/lib/child-profiles.functions";
import { PuppetConnect } from "@/components/PuppetConnect";
import { isPuppetConnected } from "@/lib/puppet";
import { getCharacter, setCharacterCache, type PuppetCharacter } from "@/lib/characters";
import { listCharacters, isAdmin } from "@/lib/characters.functions";
import { CharacterPicker } from "@/components/CharacterPicker";
import { LANGUAGES, type Language } from "@/lib/types";

function genderAccent(g: ChildProfile["gender"]) {
  if (g === "f") return { ring: "ring-pink-400", chip: "bg-pink-400/80 text-primary-foreground", bg: "from-pink-300/50 to-pink-500/10" };
  if (g === "m") return { ring: "ring-sky-400",  chip: "bg-sky-400/80 text-primary-foreground",  bg: "from-sky-300/50 to-sky-500/10" };
  return { ring: "ring-giallo", chip: "bg-giallo/80 text-primary-foreground", bg: "from-giallo/40 to-celeste/10" };
}

export const Route = createFileRoute("/_authenticated/famiglia")({
  head: () => ({ meta: [{ title: "Famiglia · MilleStorie" }] }),
  component: FamilyPage,
});

const ACTIVE_KEY = "millestorie:activeChildId";

function FamilyPage() {
  const nav = useNavigate();
  const [children, setChildren] = useState<ChildProfile[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [showPuppet, setShowPuppet] = useState(false);
  const [puppetOn, setPuppetOn] = useState(false);
  const [characters, setCharacters] = useState<PuppetCharacter[]>([]);
  const [admin, setAdmin] = useState(false);
  const [changeFor, setChangeFor] = useState<ChildProfile | null>(null);
  const [langFor, setLangFor] = useState<ChildProfile | null>(null);

  async function refresh() {
    const list = await listChildren();
    setChildren(list);
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored && list.some((c) => c.id === stored)) setActive(stored);
    else if (list[0]) {
      setActive(list[0].id);
      localStorage.setItem(ACTIVE_KEY, list[0].id);
    }
  }

  useEffect(() => {
    refresh();
    setPuppetOn(isPuppetConnected());
    listCharacters().then((list) => {
      const active = list.filter((c) => c.active);
      setCharacters(active);
      setCharacterCache(active);
    }).catch(() => {});
    isAdmin().then(setAdmin).catch(() => {});
  }, []);

  function pick(id: string) {
    setActive(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questo profilo?")) return;
    await deleteChild({ data: { id } });
    if (active === id) localStorage.removeItem(ACTIVE_KEY);
    refresh();
  }

  async function changeCharacter(child: ChildProfile, slug: string) {
    await updateChildCharacter({ data: { id: child.id, puppet_character: slug } });
    setChangeFor(null);
    refresh();
  }

  async function setChildLang(child: ChildProfile, language: Language) {
    await updateChildPrefs({ data: { id: child.id, language } });
    setLangFor(null);
    refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-celeste">Famiglia</p>
          <h1 className="mt-1 font-display text-2xl font-bold">I tuoi bambini</h1>
        </div>
        <div className="flex items-center gap-2">
          {admin && (
            <Link to="/admin/personaggi" aria-label="Personaggi" className="glass grid size-10 place-items-center rounded-full">
              <Settings className="size-4" />
            </Link>
          )}
          <button onClick={signOut} aria-label="Esci" className="glass grid size-10 place-items-center rounded-full">
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {children === null ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Caricamento…</p>
      ) : children.length === 0 ? (
        <div className="glass-strong mt-8 rounded-3xl p-6 text-center">
          <p className="font-display text-lg font-bold">Aggiungi il primo bambino</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bastano pochi dati: nome, età e cosa ama. Le storie saranno cucite su misura.
          </p>
          <Link to="/bambino/nuovo" className="mt-4 inline-block rounded-full bg-giallo px-5 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus className="mr-1 inline size-4" /> Aggiungi bambino
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {children.map((c) => (
              (() => { const accent = genderAccent(c.gender); return (
              <li
                key={c.id}
                className={`glass flex items-center gap-3 rounded-3xl p-3 transition-colors ${
                  active === c.id ? `ring-2 ${accent.ring}` : ""
                }`}
              >
                <button onClick={() => pick(c.id)} className="flex flex-1 items-center gap-3 text-left">
                  {(() => {
                    const ch = getCharacter(c.puppet_character);
                    return ch ? (
                      <span className={`grid size-14 place-items-end overflow-hidden rounded-2xl bg-gradient-to-b ${accent.bg}`}>
                        <img src={ch.image} alt={ch.name} className="h-full w-full object-contain object-bottom" />
                      </span>
                    ) : (
                      <span className={`grid size-14 place-items-center rounded-2xl bg-gradient-to-b ${accent.bg} font-display text-xl font-bold`}>
                        {c.name[0]?.toUpperCase()}
                      </span>
                    );
                  })()}
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-display font-bold">
                      {c.name}
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${accent.chip}`}>
                        {c.gender === "f" ? "F" : c.gender === "m" ? "M" : "·"}
                      </span>
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {c.age_range} anni · {(LANGUAGES.find((l) => l.code === c.language)?.flag) ?? "🇮🇹"} {c.language.toUpperCase()}
                      {getCharacter(c.puppet_character) ? ` · ${getCharacter(c.puppet_character)!.name}` : ""}
                    </p>
                  </div>
                </button>
                <button onClick={() => setLangFor(c)} aria-label="Lingua" className="grid size-9 place-items-center rounded-full text-xl">
                  {(LANGUAGES.find((l) => l.code === c.language)?.flag) ?? "🌐"}
                </button>
                <button onClick={() => setChangeFor(c)} aria-label="Cambia personaggio" className="grid size-9 place-items-center rounded-full text-celeste">
                  <Sparkles className="size-4" />
                </button>
                <button onClick={() => remove(c.id)} aria-label="Elimina" className="grid size-9 place-items-center rounded-full text-muted-foreground">
                  <Trash2 className="size-4" />
                </button>
              </li>
              ); })()
            ))}
          </ul>

          <Link to="/bambino/nuovo" className="glass mt-4 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold">
            <Plus className="size-4" /> Aggiungi un altro bambino
          </Link>

          {active && (
            <div className="mt-8 space-y-3">
              <button
                onClick={() => setShowPuppet(true)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                  puppetOn ? "border-giallo/40 bg-giallo/10" : "border-white/10 bg-white/5"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={`grid size-9 place-items-center rounded-full ${puppetOn ? "bg-giallo/30 text-giallo" : "bg-celeste/20 text-celeste"}`}>
                    <Bluetooth className="size-4" />
                  </span>
                  <span className="text-sm font-semibold">
                    {puppetOn ? "Puppet collegato" : "Collega Puppet"}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">{puppetOn ? "Tocca per cambiare" : "Bluetooth"}</span>
              </button>

              <Link
                to="/puppet"
                className="flex items-center justify-center gap-3 rounded-3xl border border-viola/40 bg-viola/15 py-4 font-display text-base font-bold"
              >
                🧸 Modalità Pupazzo
              </Link>

              <Link
                to="/parla"
                className="relative flex items-center justify-center gap-3 overflow-hidden rounded-3xl bg-[var(--gradient-sun)] py-5 font-display text-lg font-bold text-primary-foreground shadow-[0_10px_50px_var(--glow)]"
              >
                <Mic className="size-6" />
                Parla con MilleStorie
              </Link>
              <Link
                to="/crea"
                className="glass flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
              >
                <BookOpen className="size-4" /> Crea una storia a mano
              </Link>
            </div>
          )}
        </>
      )}

      {showPuppet && <PuppetConnect onClose={() => { setShowPuppet(false); setPuppetOn(isPuppetConnected()); }} />}

      {changeFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={() => setChangeFor(null)}>
          <div className="glass-strong w-full max-w-md rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-celeste">Cambia personaggio</p>
            <h2 className="mt-1 font-display text-xl font-bold">Voce per {changeFor.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Tocca ▶︎ per ascoltare la voce, poi scegli.</p>
            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              {characters.length === 0 ? (
                <p className="text-xs text-muted-foreground">Caricamento…</p>
              ) : (
                <CharacterPicker
                  characters={characters}
                  value={changeFor.puppet_character}
                  onChange={(slug) => changeCharacter(changeFor, slug)}
                />
              )}
            </div>
            <button onClick={() => setChangeFor(null)} className="mt-4 w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold">
              Chiudi
            </button>
          </div>
        </div>
      )}

      {langFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center" onClick={() => setLangFor(null)}>
          <div className="glass-strong w-full max-w-md rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-celeste">Lingua delle storie</p>
            <h2 className="mt-1 font-display text-xl font-bold">In che lingua per {langFor.name}?</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {LANGUAGES.map((l) => (
                <button key={l.code} onClick={() => setChildLang(langFor, l.code)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold ${
                    langFor.language === l.code ? "bg-celeste text-primary-foreground" : "glass"
                  }`}>
                  <span className="text-2xl">{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
            <button onClick={() => setLangFor(null)} className="mt-4 w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold">
              Chiudi
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}