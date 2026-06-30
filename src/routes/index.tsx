import { createFileRoute, Link } from "@tanstack/react-router";
import { Moon, Rocket, Wand2, BookOpen, Play, ChevronRight, Mic, Users, Bluetooth } from "lucide-react";
import { useEffect, useState } from "react";

import logo from "@/assets/millestorie-logo-orizzontale.png";
import { AppShell } from "@/components/AppShell";
import { StoryCover } from "@/components/StoryCover";
import { getLibrary } from "@/lib/story-store";
import { MODE_META, type Story, type StoryMode } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { currentBand } from "@/lib/time-of-day";
import { PuppetConnect } from "@/components/PuppetConnect";
import { isPuppetConnected } from "@/lib/puppet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MilleStorie — Storie magiche per bambini" },
      { name: "description", content: "Crea fiabe personalizzate per i tuoi bambini. Avventura, magia, nanna — narrate con voce dolce in italiano." },
      { property: "og:title", content: "MilleStorie — Storie magiche per bambini" },
      { property: "og:description", content: "Crea fiabe personalizzate per i tuoi bambini, raccontate ad alta voce." },
    ],
  }),
  component: Home,
});

const MODES: StoryMode[] = ["nanna", "avventura", "magica", "educativa"];

function Home() {
  const [recent, setRecent] = useState<Story[]>([]);
  const [authed, setAuthed] = useState(false);
  const [showPuppet, setShowPuppet] = useState(false);
  const [puppetOn, setPuppetOn] = useState(false);
  const band = currentBand();
  useEffect(() => {
    setRecent(getLibrary().slice(0, 3));
    setPuppetOn(isPuppetConnected());
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const last = recent[0];

  return (
    <AppShell hideLogo>
      {/* Top bar */}
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <img src={logo} alt="MilleStorie" className="h-16 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          {authed ? (
            <Link to="/famiglia" className="glass grid size-9 place-items-center rounded-full" aria-label="Famiglia">
              <Users className="size-4" />
            </Link>
          ) : (
            <Link to="/auth" className="glass rounded-full px-3 py-1.5 text-xs font-semibold">
              Entra
            </Link>
          )}
        </div>
      </header>

      {/* Greeting */}
      <section className="mt-8">
        <p className="text-sm font-medium uppercase tracking-widest text-celeste/80">{band.greeting}</p>
        <h1 className="mt-2 text-pretty text-[34px] font-bold leading-[1.05]">
          {band.band === "notte" ? <>È ora della<br />ninna nanna</> :
           band.band === "mattina" ? <>Che avventura<br />vivremo oggi?</> :
           band.band === "sera" ? <>Cosa vogliamo<br />sognare stasera?</> :
           <>Pronti a<br />ridere insieme?</>}
        </h1>
      </section>

      {/* Puppet connect strip */}
      {authed && (
        <button
          onClick={() => setShowPuppet(true)}
          className={`mt-5 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
            puppetOn ? "border-giallo/40 bg-giallo/10" : "border-white/10 bg-white/5"
          }`}
        >
          <span className="flex items-center gap-3">
            <span className={`grid size-9 place-items-center rounded-full ${puppetOn ? "bg-giallo/30 text-giallo" : "bg-celeste/20 text-celeste"}`}>
              <Bluetooth className="size-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{puppetOn ? "Puppet collegato" : "Collega Puppet"}</span>
              <span className="block text-[11px] text-muted-foreground">
                {puppetOn ? "La voce esce dalla cassa nel pupazzo" : "Manda la voce al pupazzo Bluetooth"}
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      )}

      {/* Voice CTA (primary if authed) */}
      {authed ? (
        <>
        <Link
          to="/parla"
          className="group relative mt-8 block overflow-hidden rounded-[36px]"
          aria-label="Parla con MilleStorie"
        >
          <div className="absolute inset-0 -z-10 [background-image:var(--gradient-sun)]" />
          <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/30 blur-2xl animate-float" />
          <div className="relative flex flex-col gap-5 px-6 pt-8 pb-7 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div className="grid size-14 place-items-center rounded-2xl bg-white/30 backdrop-blur-md animate-breathe">
                <Mic className="size-7" />
              </div>
              <span className="rounded-full bg-white/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">Hands-free</span>
            </div>
            <div>
              <h2 className="font-display text-[26px] font-bold leading-tight">Parla con MilleStorie</h2>
              <p className="mt-1 text-sm font-medium opacity-80">L'app ti chiede chi sei e cosa vuoi ascoltare.</p>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-primary-foreground/15 px-4 py-3 backdrop-blur-sm">
              <span className="text-sm font-semibold">Tocca e parla</span>
              <ChevronRight className="size-5" />
            </div>
          </div>
        </Link>
        <Link
          to="/puppet"
          className="mt-3 flex items-center justify-between rounded-2xl border border-viola/40 bg-viola/15 px-4 py-3.5 text-sm font-semibold"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-viola/30 text-base">🧸</span>
            <span>
              <span className="block">Modalità Pupazzo</span>
              <span className="block text-[11px] font-medium text-muted-foreground">
                Schermo nero · storie a catena via Puppet · {band.label.toLowerCase()}
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </Link>
        </>
      ) : (
      <Link
        to="/crea"
        className="group relative mt-8 block overflow-hidden rounded-[36px]"
        aria-label="Inizia una nuova storia"
      >
        <div className="absolute inset-0 -z-10 [background-image:var(--gradient-sun)]" />
        <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white/30 blur-2xl animate-float" />
        <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-orange-500/30 blur-2xl" />
        <div className="relative flex flex-col gap-5 px-6 pt-8 pb-7 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="grid size-14 place-items-center rounded-2xl bg-white/30 backdrop-blur-md animate-breathe">
              <BookOpen className="size-7" />
            </div>
            <span className="rounded-full bg-white/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              AI Magica
            </span>
          </div>
          <div>
            <h2 className="font-display text-[26px] font-bold leading-tight">
              Inizia una nuova storia
            </h2>
            <p className="mt-1 text-sm font-medium opacity-80">
              Una fiaba unica, su misura per te.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-primary-foreground/15 px-4 py-3 backdrop-blur-sm">
            <span className="text-sm font-semibold">Tocca per iniziare</span>
            <ChevronRight className="size-5" />
          </div>
        </div>
      </Link>
      )}

      {showPuppet && <PuppetConnect onClose={() => { setShowPuppet(false); setPuppetOn(isPuppetConnected()); }} />}

      {!authed && (
        <Link to="/auth" className="glass mt-3 flex items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold text-muted-foreground">
          <Mic className="size-4" /> Crea un account per sbloccare la modalità voce
        </Link>
      )}

      {/* Continue listening */}
      {last && (
        <section className="mt-8">
          <h3 className="px-1 font-display text-lg font-bold">Continua l'ascolto</h3>
          <Link
            to="/ascolta"
            search={{ id: last.id }}
            className="glass mt-3 flex items-center gap-4 rounded-3xl p-3 transition-colors hover:bg-white/10"
          >
            <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
              <StoryCover coverKey={last.coverKey} className="size-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-celeste">
                {MODE_META[last.mode].label} · {last.duration} min
              </p>
              <p className="mt-0.5 truncate font-semibold">{last.title}</p>
            </div>
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-giallo text-primary-foreground">
              <Play className="size-4 fill-current" />
            </div>
          </Link>
        </section>
      )}

      {/* Modes */}
      <section className="mt-10">
        <div className="mb-3 flex items-end justify-between px-1">
          <h3 className="font-display text-lg font-bold">Esplora per mondo</h3>
          <span className="text-xs font-semibold text-muted-foreground">4 modalità</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode) => (
            <ModeTile key={mode} mode={mode} />
          ))}
        </div>
      </section>

      {/* Suggestion strip */}
      <section className="mt-10 glass-strong overflow-hidden rounded-3xl">
        <div className="flex items-stretch gap-4 p-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl">
            <StoryCover coverKey="dragon" className="size-full" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-giallo">Suggerito</p>
              <p className="mt-0.5 font-display text-base font-semibold leading-tight">
                Il drago azzurro e la luna di miele
              </p>
            </div>
            <Link
              to="/crea"
              search={{ preset: "dragon" }}
              className="self-start rounded-full bg-giallo px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              Crea questa
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function ModeTile({ mode }: { mode: StoryMode }) {
  const meta = MODE_META[mode];
  const accents: Record<StoryMode, { bg: string; icon: typeof Moon }> = {
    nanna:      { bg: "from-indigo-900/60 to-viola/40", icon: Moon },
    avventura:  { bg: "from-orange-900/40 to-rose-900/40", icon: Rocket },
    magica:     { bg: "from-fuchsia-900/40 to-viola/50", icon: Wand2 },
    educativa:  { bg: "from-emerald-900/40 to-celeste/30", icon: BookOpen },
    divertente: { bg: "from-amber-900/40 to-orange-900/40", icon: Wand2 },
  };
  const { bg, icon: Icon } = accents[mode];
  return (
    <Link
      to="/crea"
      search={{ mode }}
      className={`group relative aspect-[1/1.05] overflow-hidden rounded-[28px] border border-white/5 bg-gradient-to-br ${bg} p-4 transition-transform active:scale-[0.98]`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.12),transparent_60%)]" />
      <div className="relative flex h-full flex-col justify-between">
        <span className="grid size-10 place-items-center rounded-2xl bg-white/10 backdrop-blur-sm">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="font-display text-lg font-bold leading-none">{meta.label}</p>
          <p className="mt-1 text-[11px] font-medium text-white/60">{meta.tagline}</p>
        </div>
      </div>
    </Link>
  );
}
