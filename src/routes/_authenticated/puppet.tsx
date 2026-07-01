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

const MODE_MAP: Record<string, "nanna" | "avventura" | "magica" | "educativa" | "divertente"> = {
  nanna: "nanna", dormire: "nanna", sonno: "nanna",
  avventura: "avventura", azione: "avventura", coraggio: "avventura",
  magica: "magica", magia: "magica", strega: "magica", fata: "magica",
  divertente: "divertente", buffa: "divertente", ridere: "divertente",
  educativa: "educativa", imparare: "educativa", scuola: "educativa",
};

function detectMode(said: string): StoryDraft["mode"] {
  const n = said.toLowerCase();
  for (const [key, val] of Object.entries(MODE_MAP)) {
    if (n.includes(key)) return val;
  }
  return "magica";
}

function PuppetPage() {
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>("idle");
  const [caption, setCaption] = useState("Tocca per iniziare");
  const [err, setErr] = useState<string | null>(null);
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
    await speakAndWait(text, voice);
  }

  async function listen(maxMs = 5000): Promise<string> {
    if (stopRef.current) return "";
    setPhase("listening");
    setCaption("Ti ascolto…");
    try {
      const rec = await startRecording();
      await new Promise((r) => setTimeout(r, maxMs));
      const blob = await rec.stop();
      setPhase("thinking");
      setCaption("Sto pensando…");
      return await transcribe(blob);
    } catch {
      return "";
    }
  }

  async function listenWithBadWordCheck(
    maxMs = 5000,
    child: ChildProfile,
    voice: TtsVoice,
  ): Promise<string> {
    const said = await listen(maxMs);
    if (!said) return said;
    const { category, word } = detectBadWord(said);
    if (category !== "clean") {
      if (parentIdRef.current) {
        await logBadWord(child.id, parentIdRef.current, word, said);
      }
      const response = getBadWordResponse(category as WordCategory, child.age_range as AgeRange);
      await say(response, voice);
      return "";
    }
    return said;
  }

  async function askWithRetry(
    question: string,
    voice: TtsVoice,
    child: ChildProfile,
    maxMs = 5000,
    retries = 2,
  ): Promise<string> {
    await say(question, voice);
    for (let i = 0; i <= retries; i++) {
      const answer = await listenWithBadWordCheck(maxMs, child, voice);
      if (answer) return answer;
      if (i < retries) {
        const retry = getNoAnswerResponse(child.age_range as AgeRange, i + 1);
        await say(retry, voice);
      }
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
    const bad = /\b(male|malissimo|triste|stanco|stufo|arrabbiato|non bene|così così|non tanto)\b/.test(n);
    const good = /\b(bene|benissimo|ottimo|felice|contento|allegro|super|fantastico|bello)\b/.test(n);
    if (bad) return "bad";
    if (good) return "good";
    return "unknown";
  }

  async function buildStoryFromConversation(child: ChildProfile, voice: TtsVoice): Promise<{
    protagonist: string;
    setting: string;
    mode: StoryDraft["mode"];
  }> {
    const age = child.age_range as AgeRange;
    const gender = child.gender as Gender;

    const protagonistQ = getProtagonistQuestion(age, gender);
    const protagonistAnswer = await askWithRetry(protagonistQ, voice, child, 6000);
    const detectedGender = detectGenderFromAnswer(protagonistAnswer, gender);
    const protagonist = sanitizeTheme(protagonistAnswer) ||
      (detectedGender === "f" ? "una principessa coraggiosa" :
       detectedGender === "m" ? "un cavaliere avventuroso" :
       PROTAGONIST_FALLBACKS[Math.floor(Math.random() * PROTAGONIST_FALLBACKS.length)]);

    const settingAnswer = await askWithRetry(getSettingQuestion(age), voice, child, 6000);
    const setting = sanitizeTheme(settingAnswer) ||
      (age === "3-5" ? "un bosco incantato" :
       age === "6-8" ? "un regno lontano lontano" :
       "un mondo misterioso e affascinante");

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
      setting: draft.setting || (band.band === "notte" ? "un cielo morbido di nuvole d'argento" : "un mondo di sogni"),
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
    const age = child.age_range as AgeRange;
    const band = currentBand();

    // 1. Saluto e come stai
    setPhase("greeting");
    const mood = await askHowAreYou(child, voice);

    if (mood === "bad") {
      await say(getBadResponse(age), voice);
      await tellOne(child, voice, { mode: "divertente" });
    } else {
      if (mood === "good") await say(getWellResponse(age), voice);
      else await say(age === "3-5" ? "Ok! Iniziamo!" : "Perfetto, iniziamo!", voice);

      // 2. Costruisci storia dalla conversazione
      setPhase("asking");
      const storyParams = await buildStoryFromConversation(child, voice);
      await tellOne(child, voice, storyParams);
    }

    if (stopRef.current) return;

    // 3. Loop storie successive
    let count = 1;
    while (!stopRef.current && count < 5) {
      if (band.band === "notte") {
        await say(age === "3-5" ? "Sogni d'oro! Buonanotte." : "Sogni d'oro. Buonanotte!", voice);
        setPhase("done");
        setCaption("Buonanotte 🌙");
        return;
      }

      setPhase("asking");
      const continueQ = age === "3-5"
        ? "Ti è piaciuta? Vuoi un'altra storia?"
        : age === "6-8"
        ? "Ti è piaciuta la storia? Ne vuoi un'altra?"
        : "Com'è andata? Vuoi che ne creiamo un'altra?";

      const reply = await listenWithBadWordCheck(4500, child, voice);
      await say(continueQ, voice);
      const replyText = reply || await listenWithBadWordCheck(4500, child, voice);
      const n = replyText.toLowerCase();
      const yes = /\b(si|sì|certo|dai|ancora|altra|voglio|ancora)\b/.test(n);
      const no = /\b(no|basta|stop|fine|nanna|dormire|stanco)\b/.test(n);

      if (no || (!yes && !replyText)) {
        await say(age === "3-5" ? "Va bene! A presto!" : "Ok, a presto!", voice);
        setPhase("done");
        setCaption("A presto! 💛");
        return;
      }

      const newParams = await buildStoryFromConversation(child, voice);
      await tellOne(child, voice, newParams);
      count++;
    }

    if (count >= 5) {
      await say("Abbiamo ascoltato tante belle storie! Ora riposiamoci.", voice);
      setPhase("done");
      setCaption("Bravissimo! 🌟");
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
      setErr("Qualcosa non ha funzionato. Riprova!");
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
        <button onClick={exit} aria-label="Esci" className="grid size-10 place-items-center rounded-full bg-white/5">
          <X className="size-5" />
        </button>
        <p className="text-[10px] font-bold uppercase tracking-widest text-celeste/70">
          {phase === "listening" ? "Ti ascolto…" :
           phase === "thinking" ? "Sto pensando…" :
           phase === "telling" ? "Storia in corso" :
           phase === "done" ? "Finito!" :
           "Modalità Pupazzo"}
        </p>
        <span className="w-10" />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="relative">
          <div className={`absolute inset-0 -z-10 rounded-full blur-3xl transition-opacity duration-700 ${
            phase === "telling" ? "bg-giallo/40 animate-breathe opacity-90" :
            phase === "listening" ? "bg-celeste/50 animate-pulse opacity-80" :
            phase === "thinking" ? "bg-viola/40 animate-spin-slow opacity-70" :
            phase === "asking" ? "bg-rose-400/30 opacity-70" :
            "bg-celeste/30 opacity-50"
          }`} />
          <div className={`size-48 rounded-full transition-transform duration-700 ${
            phase === "telling" ? "scale-110 animate-breathe bg-gradient-to-br from-giallo/30 to-rose-400/20" :
            phase === "listening" ? "scale-105 animate-pulse bg-celeste/20" :
            "scale-100 bg-white/5"
          }`} />
        </div>

        <p className={`mt-10 max-w-md text-center text-sm font-medium transition-opacity ${dim ? "opacity-40" : "opacity-90"}`}>
          {caption}
        </p>

        {phase === "idle" && (
          <button
            onClick={start}
            className="mt-10 rounded-full bg-giallo px-8 py-4 font-display text-base font-bold text-primary-foreground shadow-[0_10px_40px_var(--glow)]"
          >
            Inizia a parlare
          </button>
        )}

        {phase === "error" && (
          <div className="mt-10 text-center space-y-4">
            <p className="text-sm text-rose-300">🌟 Un momento magico di pausa… riprova!</p>
            <button onClick={start} className="rounded-full bg-giallo px-6 py-3 font-bold text-primary-foreground">
              Riprova
            </button>
            <Link to="/famiglia" className="mt-2 block text-sm text-white/40">
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
        {phase === "listening" ? "Parla liberamente…" : "Il bambino parla con MilleStorie"}
      </footer>
    </div>
  );
}
