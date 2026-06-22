import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { listChildren, type ChildProfile } from "@/lib/child-profiles.functions";
import { generateStory } from "@/lib/stories.functions";
import { saveStoryToLibrary } from "@/lib/story-store";
import { chunkForTTS, streamStoryTTS, type StreamHandle, type TtsVoice } from "@/lib/tts-player";
import { currentBand, defaultDurationForBand } from "@/lib/time-of-day";
import type { Story, StoryDraft } from "@/lib/types";
import { startRecording, transcribe } from "@/lib/voice-recorder";
import { matchChildName, sanitizeTheme, speakAndWait } from "@/lib/voice-conversation";

export const Route = createFileRoute("/_authenticated/puppet")({
  head: () => ({ meta: [{ title: "Modalità Pupazzo · MilleStorie" }] }),
  component: PuppetPage,
});

type Phase = "idle" | "greeting" | "thinking" | "telling" | "asking" | "listening" | "done" | "error";

const PROTAGONIST_FALLBACKS = [
  "una stellina coraggiosa",
  "un draghetto azzurro",
  "una volpe gentile",
  "un coniglietto curioso",
];

function PuppetPage() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [caption, setCaption] = useState("Tocca per iniziare");
  const [err, setErr] = useState<string | null>(null);
  const stopRef = useRef(false);
  const handleRef = useRef<StreamHandle | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => () => {
    stopRef.current = true;
    handleRef.current?.stop();
    wakeRef.current?.release().catch(() => {});
  }, []);

  async function requestWakeLock() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wl = (navigator as any).wakeLock;
      if (wl?.request) wakeRef.current = await wl.request("screen");
    } catch { /* noop */ }
  }

  async function say(text: string, voice: TtsVoice) {
    if (stopRef.current) return;
    setCaption(text);
    await speakAndWait(text, voice);
  }

  async function listen(maxMs = 5000): Promise<string> {
    setPhase("listening");
    const rec = await startRecording();
    await new Promise((r) => setTimeout(r, maxMs));
    const blob = await rec.stop();
    setPhase("thinking");
    try {
      return await transcribe(blob);
    } catch {
      return "";
    }
  }

  async function tellOne(child: ChildProfile, voice: TtsVoice, protagonistSuggest?: string): Promise<void> {
    const band = currentBand();
    setPhase("thinking");
    setCaption("Sto inventando la tua storia…");

    const protagonist =
      protagonistSuggest ||
      child.favorite_animal ||
      PROTAGONIST_FALLBACKS[Math.floor(Math.random() * PROTAGONIST_FALLBACKS.length)];

    const draft: StoryDraft = {
      protagonist,
      setting:
        band.band === "notte"
          ? "un cielo morbido di nuvole d'argento"
          : "un mondo di sogni e meraviglia",
      mode: band.band === "notte" ? "nanna" : band.mode,
      duration: defaultDurationForBand(child.age_range, band.band),
      age: child.age_range,
      favoriteAnimal: child.favorite_animal || undefined,
      favoriteColor: child.favorite_color || undefined,
      fearsToAvoid: child.fears || undefined,
      toneHint: band.toneHint,
    };

    const res = await generateStory({ data: draft });
    if (stopRef.current) return;

    const story: Story = {
      id: crypto.randomUUID(),
      title: res.title,
      subtitle: res.subtitle,
      content: res.content,
      mode: draft.mode,
      duration: draft.duration,
      age: draft.age,
      coverKey: "forest",
      createdAt: Date.now(),
      childId: child.id,
    };
    saveStoryToLibrary(story);

    setPhase("telling");
    setCaption(story.title);

    await new Promise<void>((resolve) => {
      handleRef.current = streamStoryTTS({
        chunks: chunkForTTS(story.content),
        voice,
        onEnded: () => resolve(),
      });
      handleRef.current.done.finally(() => resolve());
    });
  }

  async function loop(child: ChildProfile) {
    const voice = (child.preferred_voice || "sage") as TtsVoice;
    const band = currentBand();

    await say(band.opener(child.name), voice);
    if (stopRef.current) return;

    // Optional: ask protagonist once, then loop story+ask
    setPhase("asking");
    await say("Di chi vuoi che parli la prima storia?", voice);
    const firstAnswer = await listen(5000);
    const firstProtag = sanitizeTheme(firstAnswer) || undefined;

    let nextProtag = firstProtag;
    let count = 0;
    while (!stopRef.current && count < 5) {
      await tellOne(child, voice, nextProtag);
      if (stopRef.current) return;
      count++;

      if (band.band === "notte" && count >= 1) {
        await say("Sogni d'oro… buonanotte.", voice);
        setPhase("done");
        setCaption("Buonanotte 🌙");
        return;
      }

      setPhase("asking");
      await say("Ti è piaciuta? Vuoi un'altra storia? Dimmi sì o no.", voice);
      const reply = await listen(4500);
      const n = reply.toLowerCase();
      const yes = /\b(si|sì|certo|dai|ancora|altra|un'altra|voglio)\b/.test(n);
      const no = /\b(no|basta|stop|fine|nanna|dormire)\b/.test(n);
      if (no || (!yes && !reply)) {
        await say("Va bene, riposiamoci. A presto!", voice);
        setPhase("done");
        setCaption("Storia finita 💛");
        return;
      }
      await say("Bene! Di chi vuoi che parli adesso?", voice);
      const p = await listen(4500);
      nextProtag = sanitizeTheme(p) || undefined;
    }

    if (count >= 5) {
      await say("Abbiamo già ascoltato tante storie, ora facciamo una pausa.", voice);
      setPhase("done");
    }
  }

  async function start() {
    try {
      stopRef.current = false;
      setErr(null);
      await requestWakeLock();

      setPhase("greeting");
      setCaption("Un attimo…");
      const children = await listChildren();
      if (children.length === 0) {
        nav({ to: "/bambino/nuovo" });
        return;
      }

      let child: ChildProfile;
      if (children.length === 1) {
        child = children[0];
      } else {
        const stored = typeof window !== "undefined" ? localStorage.getItem("millestorie:activeChildId") : null;
        const found = stored ? children.find((c) => c.id === stored) : null;
        if (found) {
          child = found;
        } else {
          const defaultVoice = (children[0].preferred_voice || "sage") as TtsVoice;
          await say("Ciao! Chi sta per ascoltare?", defaultVoice);
          const said = await listen(4500);
          const matched = matchChildName(said, children);
          child = (matched.length === 1 ? children.find((c) => c.id === matched[0].id) : null) || children[0];
        }
      }

      await loop(child);
    } catch (e: unknown) {
      if (stopRef.current) return;
      setErr(e instanceof Error ? e.message : "Errore");
      setPhase("error");
    }
  }

  function exit() {
    stopRef.current = true;
    handleRef.current?.stop();
    wakeRef.current?.release().catch(() => {});
    nav({ to: "/famiglia" });
  }

  const dim = phase === "telling" || phase === "asking" || phase === "listening";

  return (
    <div className={`fixed inset-0 z-50 flex flex-col text-foreground transition-colors duration-1000 ${dim ? "bg-black" : "bg-notte"}`}>
      <header className="flex items-center justify-between p-4">
        <button onClick={exit} aria-label="Esci dalla modalità pupazzo" className="grid size-10 place-items-center rounded-full bg-white/5">
          <X className="size-5" />
        </button>
        <p className="text-[10px] font-bold uppercase tracking-widest text-celeste/70">Modalità Pupazzo</p>
        <span className="w-10" />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="relative">
          <div
            className={`absolute inset-0 -z-10 rounded-full blur-3xl transition-opacity duration-700 ${
              phase === "telling" ? "bg-giallo/40 animate-breathe opacity-90" :
              phase === "listening" ? "bg-celeste/50 animate-pulse opacity-80" :
              phase === "thinking" ? "bg-viola/40 animate-spin-slow opacity-70" :
              phase === "asking" ? "bg-rose-400/30 opacity-70" :
              "bg-celeste/30 opacity-50"
            }`}
          />
          <div
            className={`size-48 rounded-full transition-transform duration-700 ${
              phase === "telling" ? "scale-110 animate-breathe bg-gradient-to-br from-giallo/30 to-rose-400/20" :
              phase === "listening" ? "scale-105 animate-pulse bg-celeste/20" :
              "scale-100 bg-white/5"
            }`}
          />
        </div>

        <p className={`mt-10 max-w-md text-center text-sm font-medium transition-opacity ${dim ? "opacity-40" : "opacity-90"}`}>
          {caption}
        </p>

        {phase === "idle" && (
          <button
            onClick={start}
            className="mt-10 rounded-full bg-giallo px-8 py-4 font-display text-base font-bold text-primary-foreground shadow-[0_10px_40px_var(--glow)]"
          >
            Inizia col Puppet
          </button>
        )}

        {phase === "error" && (
          <div className="mt-10 text-center">
            <p className="text-sm text-rose-400">{err}</p>
            <Link to="/famiglia" className="mt-4 inline-block rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold">
              Torna indietro
            </Link>
          </div>
        )}

        {phase === "done" && (
          <button onClick={exit} className="mt-10 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold">
            Chiudi
          </button>
        )}
      </div>

      <footer className="p-4 text-center text-[10px] uppercase tracking-widest text-white/30">
        Il bambino parla con il pupazzo · niente schermo
      </footer>
    </div>
  );
}