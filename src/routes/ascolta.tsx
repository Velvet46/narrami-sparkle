import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  Gauge,
  Heart,
  Moon,
  Pause,
  Play,
  Rewind,
  FastForward,
  Share2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { AppShell } from "@/components/AppShell";
import { StoryCover } from "@/components/StoryCover";
import { getCurrentStory, getLibrary, toggleFavorite } from "@/lib/story-store";
import { MODE_META, type Story } from "@/lib/types";
import { chunkForTTS, streamStoryTTS, VOICE_OPTIONS, type StreamHandle, type TtsVoice } from "@/lib/tts-player";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/ascolta")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Stai ascoltando · MilleStorie" },
      { name: "description", content: "Player audio della tua fiaba magica." },
    ],
  }),
  component: PlayerPage,
});

function PlayerPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [story, setStory] = useState<Story | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [showText, setShowText] = useState(false);
  const [voice, setVoice] = useState<TtsVoice>(() => {
    if (typeof window === "undefined") return "sage";
    return (window.localStorage.getItem("millestorie:voice") as TtsVoice) || "sage";
  });
  const [chunkIdx, setChunkIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const handleRef = useRef<StreamHandle | null>(null);

  const chunks = useMemo(() => (story ? chunkForTTS(story.content) : []), [story]);

  useEffect(() => {
    const lib = getLibrary();
    const found = id ? lib.find((s) => s.id === id) : getCurrentStory();
    if (!found) {
      navigate({ to: "/" });
      return;
    }
    setStory(found);
    setFavorite(!!found.favorite);
  }, [id, navigate]);

  const totalSeconds = useMemo(() => (story ? story.duration * 60 : 1), [story]);

  // Elapsed tick while playing
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setElapsed((e) => {
        const next = e + speed;
        if (next >= totalSeconds) {
          return totalSeconds;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isPlaying, speed, totalSeconds]);

  // Sleep timer countdown
  useEffect(() => {
    if (sleepTimer == null) return;
    if (sleepTimer <= 0) {
      stopAudio();
      setSleepTimer(null);
      return;
    }
    const t = setTimeout(() => setSleepTimer((s) => (s == null ? null : s - 1)), 60_000);
    return () => clearTimeout(t);
  }, [sleepTimer]);

  useEffect(() => {
    return () => { handleRef.current?.stop(); };
  }, []);

  useEffect(() => {
    handleRef.current?.setRate(speed);
  }, [speed]);

  function stopAudio() {
    handleRef.current?.stop();
    handleRef.current = null;
    setIsPlaying(false);
  }

  function startAudio(fromIdx = chunkIdx) {
    if (!chunks.length) return;
    handleRef.current?.stop();
    setLoading(true);
    setIsPlaying(true);
    const slice = chunks.slice(fromIdx);
    const handle = streamStoryTTS({
      chunks: slice,
      voice,
      rate: speed,
      onChunkStart: (i) => {
        setLoading(false);
        setChunkIdx(fromIdx + i);
      },
      onEnded: () => {
        setIsPlaying(false);
        setChunkIdx(0);
        setElapsed(totalSeconds);
      },
    });
    handleRef.current = handle;
  }

  function togglePlay() {
    if (isPlaying) {
      stopAudio();
    } else {
      startAudio();
    }
  }

  function changeVoice(v: TtsVoice) {
    setVoice(v);
    if (typeof window !== "undefined") window.localStorage.setItem("millestorie:voice", v);
    if (isPlaying) {
      stopAudio();
      setTimeout(() => startAudio(chunkIdx), 50);
    }
  }

  if (!story) {
    return (
      <AppShell hideNav>
        <div className="flex min-h-[60dvh] items-center justify-center text-muted-foreground">
          Caricamento…
        </div>
      </AppShell>
    );
  }

  const progress = (elapsed / totalSeconds) * 100;
  const mode = MODE_META[story.mode];

  return (
    <AppShell hideNav>
      <header className="flex items-center justify-between">
        <Link to="/" className="glass grid size-10 place-items-center rounded-full" aria-label="Chiudi">
          <ChevronDown className="size-5" />
        </Link>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Stai ascoltando
          </p>
          <p className="text-xs font-semibold text-celeste">
            {mode.emoji} {mode.label}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const updated = toggleFavorite(story.id);
            const found = updated.find((s) => s.id === story.id);
            setFavorite(!!found?.favorite);
          }}
          aria-label="Preferito"
          className={`glass grid size-10 place-items-center rounded-full transition-colors ${
            favorite ? "text-rose-400" : "text-foreground"
          }`}
        >
          <Heart className={`size-5 ${favorite ? "fill-current" : ""}`} />
        </button>
      </header>

      {/* Cover */}
      <div className="relative mx-auto mt-10 w-full max-w-[320px]">
        <div className="absolute inset-0 -z-10 scale-90 rounded-full bg-celeste/30 blur-3xl" />
        <div
          className={`relative aspect-square overflow-hidden rounded-[40px] border border-white/10 shadow-soft transition-transform ${
            isPlaying ? "animate-breathe" : ""
          }`}
        >
          <StoryCover coverKey={story.coverKey} className="size-full" priority alt={story.title} />
        </div>
      </div>

      <div className="mt-10 text-center">
        <h1 className="text-balance font-display text-2xl font-bold leading-tight">{story.title}</h1>
        <p className="mt-1 text-sm text-celeste/80">{story.subtitle}</p>
      </div>

      {/* Progress */}
      <div className="mt-8">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-celeste to-giallo transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-bold tracking-widest text-muted-foreground">
          <span>{formatTime(elapsed)}</span>
          <span>{formatTime(totalSeconds)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-center gap-10">
        <button
          type="button"
        onClick={() => {
          const ni = Math.max(0, chunkIdx - 1);
          setChunkIdx(ni);
          setElapsed((e) => Math.max(0, e - 15));
          if (isPlaying) startAudio(ni);
        }}
          className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Paragrafo precedente"
        >
          <Rewind className="size-7" />
        </button>
        <button
          type="button"
        onClick={togglePlay}
          aria-label={isPlaying ? "Pausa" : "Riproduci"}
          className="grid size-20 place-items-center rounded-full bg-giallo text-primary-foreground shadow-[0_10px_50px_var(--glow)] transition-transform active:scale-95"
        >
        {loading ? (
          <span className="size-6 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground" />
        ) : isPlaying ? (
          <Pause className="size-8 fill-current" />
        ) : (
          <Play className="size-8 fill-current pl-1" />
        )}
        </button>
        <button
          type="button"
        onClick={() => {
          const ni = Math.min(chunks.length - 1, chunkIdx + 1);
          setChunkIdx(ni);
          setElapsed((e) => Math.min(totalSeconds, e + 15));
          if (isPlaying) startAudio(ni);
        }}
          className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Paragrafo successivo"
        >
          <FastForward className="size-7" />
        </button>
      </div>

      {/* Secondary controls */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        <SecondaryPill
          icon={<Moon className="size-4" />}
          label={sleepTimer != null ? `${sleepTimer} min` : "Timer"}
          onClick={() => {
            const opts = [null, 5, 10, 15, 30] as const;
            const idx = opts.indexOf(sleepTimer as (typeof opts)[number]);
            setSleepTimer(opts[(idx + 1) % opts.length] ?? null);
          }}
          active={sleepTimer != null}
        />
        <SecondaryPill
          icon={<Gauge className="size-4" />}
          label={`${speed.toFixed(1)}x`}
          onClick={() => {
            const opts = [0.8, 1, 1.2, 1.5];
            const idx = opts.indexOf(speed);
            setSpeed(opts[(idx + 1) % opts.length]);
          }}
        />
        <SecondaryPill
          icon={<Share2 className="size-4" />}
          label="Testo"
          onClick={() => setShowText((v) => !v)}
          active={showText}
        />
      </div>

      {/* Voice picker */}
      <div className="mt-6">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Voce del narratore
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {VOICE_OPTIONS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => changeVoice(v.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                voice === v.id
                  ? "border-giallo/60 bg-giallo/20 text-foreground"
                  : "border-white/10 bg-white/5 text-muted-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Story text */}
      {showText && (
        <article className="glass-strong mt-6 max-h-[50dvh] overflow-y-auto rounded-3xl p-5 text-sm leading-relaxed text-foreground/90">
          {story.content.split(/\n\n+/).map((para, i) => (
            <p key={i} className="mb-3 last:mb-0">{para}</p>
          ))}
        </article>
      )}

      <div className="h-16" />
    </AppShell>
  );
}

function SecondaryPill({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
        active
          ? "border-giallo/50 bg-giallo/15 text-foreground"
          : "border-white/10 bg-white/5 text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}