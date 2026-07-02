import { createFileRoute } from "@tanstack/react-router";

const VOICE_MAP: Record<string, string> = {
  shimmer: "EXAVITQu4vr4xnSDxMaL", // Sarah — calda e rassicurante
  verse:   "XrExE9yKIg1WjnnlVkGX", // Matilda — dolce e professionale
};

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
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

        const voiceId = VOICE_MAP[body.voice ?? "shimmer"] ?? VOICE_MAP.shimmer;

        try {
          const res = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
            {
              method: "POST",
              headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
              },
              body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                  stability: 0.6,
                  similarity_boost: 0.80,
                  style: 0.2,
                  use_speaker_boost: true,
                },
              }),
              signal: request.signal,
            }
          );

          if (!res.ok || !res.body) {
            const t = await res.text().catch(() => "");
            return new Response(t || `TTS failed: ${res.status}`, { status: res.status });
          }

          return new Response(res.body, {
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
