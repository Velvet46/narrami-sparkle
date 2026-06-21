import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("AI non configurata", { status: 500 });

        const ct = request.headers.get("content-type") || "";
        if (!ct.startsWith("multipart/form-data")) {
          return new Response("Expected multipart/form-data", { status: 400 });
        }

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof Blob)) {
          return new Response("Missing file", { status: 400 });
        }
        if (file.size < 800) {
          return new Response(JSON.stringify({ text: "" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("language", "it");
        const ext = (file as File).name?.split(".").pop() || "webm";
        upstream.append("file", file, `recording.${ext}`);

        try {
          const res = await fetch(
            "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}` },
              body: upstream,
              signal: request.signal,
            },
          );
          if (!res.ok) {
            const t = await res.text().catch(() => "");
            return new Response(t || `STT failed: ${res.status}`, { status: res.status });
          }
          const data = await res.json();
          return new Response(JSON.stringify({ text: data.text ?? "" }), {
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          throw err;
        }
      },
    },
  },
});