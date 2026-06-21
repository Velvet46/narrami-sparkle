import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { X, Mic } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { listChildren, type ChildProfile } from "@/lib/child-profiles.functions";
import { getLibrary, setCurrentStory } from "@/lib/story-store";
import type { StoryDraft, Story, StoryMode, Duration, AgeRange } from "@/lib/types";
import { startRecording, transcribe, type RecorderHandle } from "@/lib/voice-recorder";
import {
  speakAndWait,
  matchChildName,
  matchStoryChoice,
  matchFavoriteTitle,
  sanitizeTheme,
} from "@/lib/voice-conversation";
import type { TtsVoice } from "@/lib/tts-player";

export const Route = createFileRoute("/_authenticated/parla")({
  head: () => ({ meta: [{ title: "Parla con MilleStorie" }] }),
  component: TalkPage,
});

type Phase = "idle" | "speaking" | "listening" | "thinking" | "done" | "error";

const WORLDS: Record<string, { mode: StoryMode; setting: string }> = {
  bosco: { mode: "magica", setting: "un bosco incantato pieno di lucciole" },
  spazio: { mode: "avventura", setting: "una galassia di stelle dolci" },
  castello: { mode: "magica", setting: "un castello tra le nuvole" },
  mare: { mode: "avventura", setting: "un mare di onde luminose" },
  citta: { mode: "divertente", setting: "una città di giocattoli" },
};

function pickWorld(said: string): { mode: StoryMode; setting: string } {
  const n = said.toLowerCase();
  for (const k of Object.keys(WORLDS)) if (n.includes(k)) return WORLDS[k];
  return { mode: "magica", setting: "un mondo di sogni e meraviglia" };
}

function defaultDuration(age: AgeRange): Duration {
  if (age === "3-5") return 5;
  if (age === "6-8") return 10;
  return 15;
}

function TalkPage() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [caption, setCaption] = useState<string>("");
  const [heard, setHeard] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const recRef = useRef<RecorderHandle | null>(null);
  const stopRef = useRef(false);

  useEffect(() => () => {
    stopRef.current = true;
    recRef.current?.cancel();
  }, []);

  async function say(text: string, voice: TtsVoice) {
    if (stopRef.current) return;
    setCaption(text);
    setPhase("speaking");
    await speakAndWait(text, voice);
  }

  async function listen(maxMs = 6000): Promise<string> {
    setHeard("");
    setPhase("listening");
    const rec = await startRecording();
    recRef.current = rec;
    await new Promise((r) => setTimeout(r, maxMs));
    const blob = await rec.stop();
    recRef.current = null;
    setPhase("thinking");
    const text = await transcribe(blob);
    setHeard(text);
    return text;
  }

  async function run() {
    try {
      stopRef.current = false;
      setErr(null);

      const children = await listChildren();
      if (children.length === 0) {
        nav({ to: "/bambino/nuovo" });
        return;
      }

      // Use first child's voice for the question voice (warmest default)
      const defaultVoice = (children[0].preferred_voice || "sage") as TtsVoice;

      // 1) GREET + ask name (skip if only one child)
      let chosen: ChildProfile;
      if (children.length === 1) {
        chosen = children[0];
        await say(`Ciao ${chosen.name}! Sono pronta a raccontarti una storia magica.`, (chosen.preferred_voice || "sage") as TtsVoice);
      } else {
        await say("Ciao! Chi sta per ascoltare una storia stasera?", defaultVoice);
        let attempt = 0;
        let match: ChildProfile[] = [];
        while (attempt < 3 && match.length !== 1) {
          const said = await listen(4500);
          if (!said) {
            attempt++;
            if (attempt < 3) await say("Non ti ho sentito, prova ancora.", defaultVoice);
            continue;
          }
          const m = matchChildName(said, children);
          if (m.length === 1) { match = m; break; }
          if (m.length > 1) {
            await say(`Sei ${m.map((c) => c.name).join(" o ")}?`, defaultVoice);
          } else {
            await say("Non ti ho riconosciuto, dimmi solo il tuo nome.", defaultVoice);
          }
          attempt++;
        }
        if (match.length !== 1) {
          setErr("Non sono riuscita a riconoscere il bambino. Usa i tasti.");
          setPhase("error");
          return;
        }
        chosen = match[0];
        await say(`Bene ${chosen.name}!`, (chosen.preferred_voice || "sage") as TtsVoice);
      }

      localStorage.setItem("millestorie:activeChildId", chosen.id);
      const voice = (chosen.preferred_voice || "sage") as TtsVoice;

      // 2) Favorite vs new
      const favorites = getLibrary().filter((s) => s.favorite && (!s.childId || s.childId === chosen.id));
      if (favorites.length > 0) {
        await say("Vuoi riascoltare una storia che ti è piaciuta o ne creiamo una nuova insieme?", voice);
        const said = await listen(4500);
        const choice = matchStoryChoice(said);
        if (choice === "favorite") {
          await pickFavorite(favorites, voice);
          return;
        }
      }

      // 3) New story flow
      await newStoryFlow(chosen, voice);
    } catch (e: unknown) {
      if (stopRef.current) return;
      setErr(e instanceof Error ? e.message : "Errore");
      setPhase("error");
    }
  }

  async function pickFavorite(favorites: Story[], voice: TtsVoice) {
    const top = favorites.slice(0, 3);
    if (top.length === 1) {
      await say(`Allora riascoltiamo "${top[0].title}". Inizio subito!`, voice);
      setCurrentStory(top[0]);
      nav({ to: "/ascolta", search: { id: top[0].id } });
      return;
    }
    await say(`Hai queste storie: ${top.map((s) => s.title).join(", ")}. Quale scegli?`, voice);
    const said = await listen(5000);
    const match = matchFavoriteTitle(said, top) ?? top[0];
    await say(`Perfetto, "${match.title}". Inizio!`, voice);
    setCurrentStory(match);
    nav({ to: "/ascolta", search: { id: match.id } });
  }

  async function newStoryFlow(child: ChildProfile, voice: TtsVoice) {
    await say("Di chi vuoi che parli la storia? Un animale, un personaggio, dimmi tu!", voice);
    const protagonistRaw = await listen(5000);
    const protagonist = sanitizeTheme(protagonistRaw) || child.favorite_animal || "una stellina coraggiosa";

    await say("E in che mondo? Bosco, spazio, castello, mare o sorprendimi?", voice);
    const worldRaw = await listen(4500);
    const world = pickWorld(worldRaw);

    await say("Perfetto, preparo la tua storia magica. Aspetta un momento…", voice);

    const draft: StoryDraft = {
      protagonist,
      setting: world.setting,
      mode: world.mode,
      duration: defaultDuration(child.age_range),
      age: child.age_range,
      favoriteAnimal: child.favorite_animal || undefined,
      favoriteColor: child.favorite_color || undefined,
      fearsToAvoid: child.fears || undefined,
    };
    sessionStorage.setItem("millestorie:draft", JSON.stringify(draft));
    sessionStorage.setItem("millestorie:childId", child.id);
    nav({ to: "/genera" });
  }

  return (
    <AppShell hideNav>
      <header className="flex items-center justify-between pt-2">
        <Link to="/famiglia" aria-label="Chiudi" className="glass grid size-10 place-items-center rounded-full">
          <X className="size-5" />
        </Link>
        <p className="text-[10px] font-bold uppercase tracking-widest text-celeste">
          {phase === "speaking" ? "Sto parlando" :
           phase === "listening" ? "Ti ascolto…" :
           phase === "thinking" ? "Penso…" :
           phase === "idle" ? "Pronta a parlare" :
           phase === "error" ? "Ops" : "Fatto"}
        </p>
        <span className="w-10" />
      </header>

      <div className="flex min-h-[70dvh] flex-col items-center justify-center">
        <div className="relative">
          <div className={`absolute inset-0 -z-10 rounded-full bg-[conic-gradient(from_0deg,var(--celeste),var(--giallo),var(--viola),var(--celeste))] blur-2xl opacity-60 ${
            phase === "listening" ? "animate-pulse" : phase === "speaking" ? "animate-spin-slow" : ""
          }`} />
          <div className={`relative grid size-56 place-items-center rounded-full glass-strong ${
            phase === "speaking" || phase === "listening" ? "animate-breathe" : ""
          }`}>
            <Mic className="size-16 text-giallo" />
          </div>
        </div>

        <p className="mt-10 max-w-xs text-center text-base font-medium text-foreground/90 min-h-[3rem]">
          {caption}
        </p>
        {heard && (
          <p className="mt-2 max-w-xs text-center text-xs text-celeste/80">"{heard}"</p>
        )}

        {phase === "idle" && (
          <button onClick={run}
            className="mt-10 rounded-full bg-giallo px-8 py-4 font-display text-base font-bold text-primary-foreground shadow-[0_10px_40px_var(--glow)]">
            Inizia a parlare
          </button>
        )}

        {phase === "error" && (
          <div className="mt-8 text-center">
            <p className="text-sm text-rose-400">{err}</p>
            <Link to="/crea" className="mt-4 inline-block rounded-full glass-strong px-5 py-2.5 text-sm font-semibold">
              Usa i tasti invece
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}