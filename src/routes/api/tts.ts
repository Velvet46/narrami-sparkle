import { createFileRoute } from "@tanstack/react-router";

const VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse", "marin", "cedar",
]);

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("AI non configurata", { status: 500 });
        }

        let body: { text?: string; voice?: string; instructions?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const text = (body.text ?? "").toString().trim();
        if (!text) return new Response("Missing text", { status: 400 });
        if (text.length > 4000) {
          return new Response("Text too long", { status: 400 });
        }
        const voice = body.voice && VOICES.has(body.voice) ? body.voice : "sage";

        try {
          const upstream = await fetch(
            "https://ai.gateway.lovable.dev/v1/audio/speech",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "openai/gpt-4o-mini-tts",
                input: text,
                voice,
                instructions:
                  body.instructions ??
                  "Narra in italiano con voce dolce, calda e magica, come una favola della buonanotte. Ritmo lento, pause espressive, tono rassicurante per bambini.",
                stream_format: "sse",
                response_format: "pcm",
              }),
              signal: request.signal,
            },
          );

          if (!upstream.ok || !upstream.body) {
            const t = await upstream.text().catch(() => "");
            return new Response(t || `TTS failed: ${upstream.status}`, {
              status: upstream.status,
            });
          }

          return new Response(upstream.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
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