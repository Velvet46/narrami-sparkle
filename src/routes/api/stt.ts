import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) return new Response("AI non configurata", { status: 500 });

        const ct = request.headers.get("content-type") || "";
        if (!ct.startsWith("multipart/form-data")) {
          return new Response("Expected multipart/form-data", { status: 400 });
        }

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof Blob)) return new Response("Missing file", { status: 400 });
        if (file.size < 800) {
          return new Response(JSON.stringify({ text: "" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const upstream = new FormData();
          const ext = (file as File).name?.split(".").pop() || "webm";
          upstream.append("file", file, `recording.${ext}`);
          upstream.append("model_id", "scribe_v1");
          upstream.append("language_code", "it");

          const res = await fetch(
            "https://api.elevenlabs.io/v1/speech-to-text",
            {
              method: "POST",
              headers: { "xi-api-key": apiKey },
              body: upstream,
              signal: request.signal,
            }
          );

          if (!res.ok) {
            const t = await res.text().catch(() => "");
            return new Response(t || `STT failed: ${res.status}`, { status: res.status });
          }

          const data = await res.json();
          const text = data.text ?? "";

          return new Response(JSON.stringify({ text: text.trim() }), {
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
