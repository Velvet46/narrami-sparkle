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
import {
  speakAndWait, matchChildName, sanitizeTheme,
  getGreeting, getWellResponse, getBadResponse, getNoAnswerResponse,
  getSettingQuestion, getProtagonistQuestion, getMoodQuestion,
  getBadWordResponse, detectBadWord, logBadWord, detectGenderFromAnswer,
  type WordCategory,
} from "@/lib/voice-conversation";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/puppet")({
  head: () => ({ meta: [{ title: "Modalità Pupazzo · MilleStorie" }] }),
  component: PuppetPage,
});

type Phase = "idle" | "greeting" | "thinking" | "telling" | "asking" | "listening" | "done" | "error";
type AgeRange = "3-5" | "6-8" | "9-12";
type Gender = "m" | "f" | "n";

const PROTAGONIST_FALLBACKS = [
  "una stellina coraggiosa",
  "un draghetto azzurro",
  "una volpe gentile",
  "un coniglietto curioso",
];

const MODE_MAP: Record<string, StoryDraft["mode"]> = {
  nanna: "nanna", dormire: "nanna", sonno: "nanna",
  avventura: "avventura", azione: "avventura", coraggio: "avventura",
  magica: "magica", magia: "magica", strega: "magica", fata: "magica",
  divertente: "divertente", buffa: "divertente", ridere: "divertente",
  educativa: "educativa", imparare: "educativa", scuola: "educativa",
};

function detectMode(said: string): StoryDraft["mode"] {
  const n = said.toLowerCase();
  for (const [key, val] of Object.entries(MODE_MAP)) if (n.includes(key)) return val;
  return "magica";
}

// Waveform component
function Waveform({ active, color = "#fff", bars = 12 }: { active: boolean; color?: string; bars?: number }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-150"
          style={{
            width: 3,
            backgroundColor: color,
            height: active ? `${12 + Math.sin(Date.now() / 200 + i) * 10 + Math.random() * 20}px` : "4px",
            opacity: active ? 0.8 + Math.random() * 0.2 : 0.3,
            animationDelay: `${i * 0.05}s`,
            animation: active ? `wave-bar 0.${6 + (i % 4)}s ease-in-out infinite alternate` : "none",
          }}
        />
      ))}
    </div>
  );
}

// Animated waveform with requestAnimationFrame
function LiveWaveform({ active, color = "rgba(255,255,255,0.8)", bars = 16 }: { active: boolean; color?: string; bars?: number }) {
  const [heights, setHeights] = useState<number[]>(Array(bars).fill(4));
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setHeights(Array(bars).fill(4));
      return;
    }
    const animate = () => {
      setHeights(Array.from({ length: bars }, (_, i) => 6 + Math.abs(Math.sin(Date.now() / 150 + i * 0.7)) * 30 + Math.random() * 12));
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, bars]);

  return (
    <div className="flex items-center justify-center gap-[4px] h-16">
      {heights.map((h, i) => (
        <div
          key={i}
          className="rounded-full transition-[height] duration-75"
          style={{ width: 4, height: h, backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function PuppetPage() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [caption, setCaption] = useState("Tocca per iniziare");
  const [err, setErr] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const stopRef = useRef(false);
  const handleRef = useRef<StreamHandle | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const parentIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id) parentIdRef.current = data.session.user.id;
    });
    return () => {
      stopRef.current = true;
      handleRef.current?.stop();
      wakeRef.current?.release().catch(() => {});
    };
  }, []);

  async function requestWakeLock() {
    try {
      const wl = (navigator as any).wakeLock;
      if (wl?.request) wakeRef.current = await wl.request("screen");
    } catch { /* noop */ }
  }

  async function say(text: string, voice: TtsVoice) {
    if (stopRef.current) return;
    setCaption(text);
    setIsSpeaking(true);
    await speakAndWait(text, voice);
    setIsSpeaking(false);
  }

  async function listen(maxMs = 5000): Promise<string> {
    if (stopRef.current) return "";
    setPhase("listening");
    setIsListening(true);
    setCaption("Ti ascolto…");
    try {
      const rec = await startRecording();
      await new Promise((r) => setTimeout(r, maxMs));
      const blob = await rec.stop();
      setIsListening(false);
      setPhase("thinking");
      setCaption("Sto pensando…");
      return await transcribe(blob);
    } catch {
      setIsListening(false);
      return "";
    }
  }

  async function listenWithBadWordCheck(maxMs = 5000, child: ChildProfile, voice: TtsVoice): Promise<string> {
    const said = await listen(maxMs);
    if (!said) return said;
    const { category, word } = detectBadWord(said);
    if (category !== "clean") {
      if (parentIdRef.current) await logBadWord(child.id, parentIdRef.current, word, said);
      const response = getBadWordResponse(category as WordCategory, child.age_range as AgeRange);
      await say(response, voice);
      return "";
    }
    return said;
  }

  async function askWithRetry(question: string, voice: TtsVoice, child: ChildProfile, maxMs = 5000, retries = 2): Promise<string> {
    await say(question, voice);
    for (let i = 0; i <= retries; i++) {
      const answer = await listenWithBadWordCheck(maxMs, child, voice);
      if (answer) return answer;
      if (i < retries) await say(getNoAnswerResponse(child.age_range as AgeRange, i + 1), voice);
    }
    return "";
  }

  async function askHowAreYou(child: ChildProfile, voice: TtsVoice): Promise<"good" | "bad" | "unknown"> {
    const greeting = getGreeting(child.name, child.age_range as AgeRange, child.gender as Gender);
    let answer = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      await say(attempt === 0 ? greeting : getNoAnswerResponse(child.age_range as AgeRange, attempt), voice);
      answer = await listen(5000);
      if (answer) break;
    }
    if (!answer) return "unknown";
    const n = answer.toLowerCase();
    const bad = /\b(male|malissimo|triste|stanco|stufo|arrabbiato|non bene)\b/.test(n);
    const good = /\b(bene|benissimo|ottimo|felice|contento|allegro|super|fantastico)\b/.test(n);
    if (bad) return "bad";
    if (good) return "good";
    return "unknown";
  }

  async function buildStoryFromConversation(child: ChildProfile, voice: TtsVoice): Promise<{ protagonist: string; setting: string; mode: StoryDraft["mode"] }> {
    const age = child.age_range as AgeRange;
    const gender = child.gender as Gender;
    const protagonistAnswer = await askWithRetry(getProtagonistQuestion(age, gender), voice, child, 6000);
    const detectedGender = detectGenderFromAnswer(protagonistAnswer, gender);
    const protagonist = sanitizeTheme(protagonistAnswer) || (detectedGender === "f" ? "una principessa coraggiosa" : detectedGender === "m" ? "un cavaliere avventuroso" : PROTAGONIST_FALLBACKS[Math.floor(Math.random() * PROTAGONIST_FALLBACKS.length)]);
    const settingAnswer = await askWithRetry(getSettingQuestion(age), voice, child, 6000);
    const setting = sanitizeTheme(settingAnswer) || (age === "3-5" ? "un bosco incantato" : "un regno lontano lontano");
    const moodAnswer = await askWithRetry(getMoodQuestion(age), voice, child, 5000);
    const mode = detectMode(moodAnswer);
    return { protagonist, setting, mode };
  }

  async function tellOne(child: ChildProfile, voice: TtsVoice, draft: Partial<StoryDraft>): Promise<void> {
    const band = currentBand();
    setPhase("thinking");
    setCaption("Sto pensando a qualcosa di bello…");
    const fullDraft: StoryDraft = {
      protagonist: draft.protagonist || child.favorite_animal || PROTAGONIST_FALLBACKS[0],
      setting: draft.setting || (band.band === "notte" ? "un cielo di nuvole d'argento" : "un mondo di sogni"),
      mode: draft.mode || (band.band === "notte" ? "nanna" : band.mode),
      duration: defaultDurationForBand(child.age_range, band.band),
      age: child.age_range,
      favoriteAnimal: child.favorite_animal || undefined,
      favoriteColor: child.favorite_color || undefined,
      fearsToAvoid: child.fears || undefined,
      toneHint: band.toneHint,
    };
    const res = await generateStory({ data: fullDraft });
    if (stopRef.current) return;
    const story: Story = {
      id: crypto.randomUUID(),
      title: res.title,
      subtitle: res.subtitle,
      content: res.content,
      mode: fullDraft.mode,
      duration: fullDraft.duration,
      age: fullDraft.age,
      coverKey: "forest",
      createdAt: Date.now(),
      childId: child.id,
    };
    saveStoryToLibrary(story);
    setPhase("telling");
    setCaption(story.title);
    setIsSpeaking(true);
    await new Promise<void>((resolve) => {
      handleRef.current = streamStoryTTS({ chunks: chunkForTTS(story.content), voice, onEnded: () => resolve() });
      handleRef.current.done.finally(() => resolve());
    });
    setIsSpeaking(false);
  }

  async function loop(child: ChildProfile) {
    const voice = (child.preferred_voice || "sage") as TtsVoice;
    const age = child.age_range as AgeRange;
    const band = currentBand();
    setPhase("greeting");
    const mood = await askHowAreYou(child, voice);
    if (mood === "bad") {
      await say(getBadResponse(age), voice);
      await tellOne(child, voice, { mode: "divertente" });
    } else {
      await say(mood === "good" ? getWellResponse(age) : (age === "3-5" ? "Ok! Iniziamo!" : "Perfetto!"), voice);
      setPhase("asking");
      const storyParams = await buildStoryFromConversation(child, voice);
      await tellOne(child, voice, storyParams);
    }
    if (stopRef.current) return;
    let count = 1;
    while (!stopRef.current && count < 5) {
      if (band.band === "notte") {
        await say(age === "3-5" ? "Sogni d'oro! Buonanotte." : "Sogni d'oro. Buonanotte!", voice);
        setPhase("done"); setCaption("Buonanotte 🌙"); return;
      }
      setPhase("asking");
      const continueQ = age === "3-5" ? "Ti è piaciuta? Vuoi un'altra storia?" : age === "6-8" ? "Ti è piaciuta? Ne vuoi un'altra?" : "Vuoi che ne creiamo un'altra?";
      await say(continueQ, voice);
      const reply = await listenWithBadWordCheck(4500, child, voice);
      const n = reply.toLowerCase();
      const yes = /\b(si|sì|certo|dai|ancora|altra|voglio)\b/.test(n);
      const no = /\b(no|basta|stop|fine|nanna|dormire|stanco)\b/.test(n);
      if (no || (!yes && !reply)) {
        await say(age === "3-5" ? "Va bene! A presto!" : "Ok, a presto!", voice);
        setPhase("done"); setCaption("A presto! 💛"); return;
      }
      const newParams = await buildStoryFromConversation(child, voice);
      await tellOne(child, voice, newParams);
      count++;
    }
    await say("Abbiamo ascoltato tante belle storie! Ora riposiamoci.", voice);
    setPhase("done"); setCaption("Bravissimo! 🌟");
  }

  async function start() {
    try {
      stopRef.current = false;
      setErr(null);
      // Fix AudioContext su mobile — resume dopo gesto utente
      try {
        const ctx = new AudioContext();
        await ctx.resume();
        ctx.close();
      } catch { /* noop */ }
      await requestWakeLock();
      setPhase("greeting");
      setCaption("Un attimo…");
      const children = await listChildren();
      if (children.length === 0) { nav({ to: "/bambino/nuovo" }); return; }
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
      setErr("Un momento di pausa magica… riprova!");
      setPhase("error");
    }
  }

  function exit() {
    stopRef.current = true;
    handleRef.current?.stop();
    wakeRef.current?.release().catch(() => {});
    nav({ to: "/famiglia" });
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col text-foreground transition-colors duration-1000 ${phase === "telling" ? "bg-[#0a0520]" : "bg-notte"}`}>
      <header className="flex items-center justify-between p-4">
        <button onClick={exit} aria-label="Esci" className="grid size-10 place-items-center rounded-full bg-white/5">
          <X className="size-5" />
        </button>
        <p className="text-[10px] font-bold uppercase tracking-widest text-celeste/70">
          {phase === "listening" ? "🎙 Ti ascolto…" :
           phase === "thinking" ? "✨ Sto pensando…" :
           phase === "telling" ? "📖 Storia in corso" :
           phase === "done" ? "⭐ Finito!" :
           "Modalità Pupazzo"}
        </p>
        <span className="w-10" />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 gap-6">

        {/* Cerchio animato */}
        <div className="relative">
          <div className={`absolute inset-0 -z-10 rounded-full blur-3xl transition-all duration-700 ${
            isSpeaking ? "bg-giallo/50 scale-125" :
            isListening ? "bg-celeste/50 scale-110" :
            phase === "thinking" ? "bg-viola/40" :
            "bg-celeste/20"
          }`} />
          <div className={`size-40 rounded-full flex items-center justify-center transition-all duration-500 ${
            isSpeaking ? "bg-gradient-to-br from-giallo/40 to-rose-400/20 scale-110" :
            isListening ? "bg-celeste/20 scale-105" :
            "bg-white/5"
          }`}>
            <span className="text-5xl">
              {phase === "idle" ? "🧸" :
               phase === "thinking" ? "✨" :
               phase === "telling" ? "📖" :
               phase === "listening" ? "👂" :
               phase === "done" ? "🌟" :
               "🎙"}
            </span>
          </div>
        </div>

        {/* Onde AI che parla */}
        {isSpeaking && (
          <div className="w-full max-w-xs">
            <p className="text-center text-[10px] uppercase tracking-widest text-giallo/60 mb-2">MilleStorie parla</p>
            <LiveWaveform active={isSpeaking} color="rgba(245, 200, 66, 0.8)" bars={20} />
          </div>
        )}

        {/* Onde microfono bambino */}
        {isListening && (
          <div className="w-full max-w-xs">
            <p className="text-center text-[10px] uppercase tracking-widest text-celeste/60 mb-2">Ti ascolto…</p>
            <LiveWaveform active={isListening} color="rgba(100, 220, 255, 0.8)" bars={20} />
          </div>
        )}

        {/* Caption */}
        {!isSpeaking && !isListening && (
          <p className="max-w-sm text-center text-sm font-medium opacity-80">{caption}</p>
        )}

        {isSpeaking && (
          <p className="max-w-sm text-center text-sm font-medium opacity-60 italic">{caption}</p>
        )}

        {phase === "idle" && (
          <button
            onClick={start}
            className="mt-4 rounded-full bg-giallo px-8 py-4 font-display text-base font-bold text-primary-foreground shadow-[0_10px_40px_var(--glow)]"
          >
            Inizia a parlare 🎙
          </button>
        )}

        {phase === "error" && (
          <div className="mt-4 text-center space-y-4">
            <p className="text-sm text-rose-300">🌟 Un momento magico di pausa… riprova!</p>
            <button onClick={start} className="rounded-full bg-giallo px-6 py-3 font-bold text-primary-foreground">
              Riprova
            </button>
            <Link to="/famiglia" className="mt-2 block text-sm text-white/40">Torna indietro</Link>
          </div>
        )}

        {phase === "done" && (
          <button onClick={exit} className="mt-4 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold">
            Chiudi
          </button>
        )}
      </div>

      <footer className="p-4 text-center text-[10px] uppercase tracking-widest text-white/20">
        {isListening ? "Parla liberamente…" : isSpeaking ? "Ascolta la storia…" : "MilleStorie · Modalità voce"}
      </footer>
    </div>
  );
}
