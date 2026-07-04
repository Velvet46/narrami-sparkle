import { useRef, useState } from "react";
import { Mic, Volume2, Check, X, Loader2 } from "lucide-react";
import { startRecording } from "@/lib/voice-recorder";
import { streamStoryTTS, VOICE_OPTIONS, type TtsVoice } from "@/lib/tts-player";

type Status = "idle" | "testing" | "ok" | "error";

const MIC_ERROR_MESSAGES: Record<string, string> = {
  MIC_DENIED: "Permesso negato: abilita il microfono nelle impostazioni del browser per questo sito.",
  MIC_NOT_FOUND: "Nessun microfono trovato su questo dispositivo.",
  MIC_UNSUPPORTED: "Il tuo browser non supporta la registrazione audio.",
  MIC_UNAVAILABLE: "Il microfono non è disponibile al momento.",
};

interface MicSpeakerTestProps {
  variant?: "user" | "admin";
  testVoice?: TtsVoice;
}

export function MicSpeakerTest({ variant = "user", testVoice }: MicSpeakerTestProps) {
  const [micStatus, setMicStatus] = useState<Status>("idle");
  const [micError, setMicError] = useState<string | null>(null);
  const [audioStatus, setAudioStatus] = useState<Status>("idle");
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  async function handleTestMic() {
    setMicStatus("testing");
    setMicError(null);
    setPlaybackUrl(null);
    try {
      const handle = await startRecording();
      await new Promise((r) => setTimeout(r, 2000));
      const blob = await handle.stop();
      if (blob.size < 800) {
        setMicStatus("error");
        setMicError("Non ho sentito nulla: parla più vicino al microfono e riprova.");
        return;
      }
      const url = URL.createObjectURL(blob);
      setPlaybackUrl(url);
      setMicStatus("ok");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "MIC_UNAVAILABLE";
      setMicStatus("error");
      setMicError(MIC_ERROR_MESSAGES[message] ?? "Errore imprevisto con il microfono.");
    }
  }

  async function handleTestAudio() {
    setAudioStatus("testing");
    setAudioError(null);
    try {
      const voice = testVoice ?? VOICE_OPTIONS[0].id;
      const handle = streamStoryTTS({
        chunks: ["Ciao! Se senti questo messaggio, l'audio funziona correttamente."],
        voice,
        onEnded: () => setAudioStatus("ok"),
      });
      await handle.done;
    } catch {
      setAudioStatus("error");
      setAudioError("Non sono riuscito a riprodurre l'audio di prova.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {variant === "admin" ? "Test microfono e voci TTS" : "Testa microfono e audio"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {variant === "admin"
            ? "Verifica che registrazione vocale e sintesi vocale funzionino correttamente sul server."
            : "Prima di iniziare, verifica che il tuo telefono possa sentirti e farsi sentire."}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleTestMic}
          disabled={micStatus === "testing"}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground disabled:opacity-60"
        >
          {micStatus === "testing" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : micStatus === "ok" ? (
            <Check className="size-4 text-emerald-500" />
          ) : micStatus === "error" ? (
            <X className="size-4 text-rose-500" />
          ) : (
            <Mic className="size-4" />
          )}
          {micStatus === "testing" ? "Parla ora… (2s)" : "Testa microfono"}
        </button>

        <button
          onClick={handleTestAudio}
          disabled={audioStatus === "testing"}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground disabled:opacity-60"
        >
          {audioStatus === "testing" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : audioStatus === "ok" ? (
            <Check className="size-4 text-emerald-500" />
          ) : audioStatus === "error" ? (
            <X className="size-4 text-rose-500" />
          ) : (
            <Volume2 className="size-4" />
          )}
          {audioStatus === "testing" ? "In riproduzione…" : "Testa audio"}
        </button>
      </div>

      {micError && <p className="text-xs text-rose-500">{micError}</p>}
      {audioError && <p className="text-xs text-rose-500">{audioError}</p>}

      {playbackUrl && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Riascolta la tua registrazione:</p>
          <audio ref={audioElRef} src={playbackUrl} controls className="w-full h-9" />
        </div>
      )}
    </div>
  );
}
