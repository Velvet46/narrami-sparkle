import { createFileRoute } from "@tanstack/react-router";

const VOICE_MAP: Record<string, string> = {
  sage: "it-IT-Standard-A",
  shimmer: "it-IT-Standard-B",
  coral: "it-IT-Standard-C",
  ballad: "it-IT-Standard-D",
  alloy: "it-IT-Standard-E",
  echo: "it-IT-Wavenet-A",
  verse: "it-IT-Wavenet-B",
  marin: "it-IT-Wavenet-C",
  cedar: "it-IT-Wavenet-D",
  ash: "it-IT-Neural2-A",
};

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return new Response("AI non configurata", { status: 500 });

        let body: { text?: string; voice?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const text = (body.text ?? "").toString().trim();
        if (!text) return new Response("Missing text", { status: 400 });
        if (text.length > 4000) return new Response("Text too long", { status: 400 });

        const voiceName = VOICE_MAP[body.voice ?? "sage"] ?? "it-IT-Standard-A";

        try {
          const res = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                input: { text },
                voice: { languageCode: "it-IT", name: voiceName },
                audioConfig: { audioEncoding: "MP3", speakingRate: 0.95, pitch: 0 },
              }),
              signal: request.signal,
            }
          );

          if (!res.ok) {
            const t = await res.text().catch(() => "");
            return new Response(t || `TTS failed: ${res.status}`, { status: res.status });
          }

          const data = await res.json();
          const audioContent = data.audioContent;
          if (!audioContent) return new Response("No audio", { status: 500 });

          const binary = atob(audioContent);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

          return new Response(bytes, {
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-cache",
            },
          });
        } catch (err) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw err;
        }
      },
    },
  },
});
