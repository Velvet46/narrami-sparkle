import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  voiceId: z.string().min(1).max(100),
  text: z.string().min(1).max(400).optional(),
});

const DEFAULT_SAMPLE =
  "Ciao! Sono il tuo amico narratore. Vuoi che ti racconti una storia magica?";

export const Route = createFileRoute("/api/elevenlabs/preview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response("ElevenLabs not configured", { status: 500 });
        }
        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return new Response("Invalid body", { status: 400 });
        }
        const text = body.text ?? DEFAULT_SAMPLE;
        const resp = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(body.voiceId)}/stream?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.8,
                style: 0.3,
                use_speaker_boost: true,
              },
            }),
          },
        );
        if (!resp.ok || !resp.body) {
          const t = await resp.text().catch(() => "");
          return new Response(`TTS error: ${resp.status} ${t}`, { status: 502 });
        }
        return new Response(resp.body, {
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
        });
      },
    },
  },
});