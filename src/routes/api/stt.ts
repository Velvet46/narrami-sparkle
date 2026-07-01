import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GEMINI_API_KEY;
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
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          const mimeType = file.type || "audio/webm";

          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: base64,
                      }
                    },
                    {
                      text: "Trascrivi esattamente quello che viene detto in questo audio in italiano. Rispondi solo con il testo trascritto, senza spiegazioni."
                    }
                  ]
                }]
              }),
              signal: request.signal,
            }
          );

          if (!res.ok) {
            const t = await res.text().catch(() => "");
            return new Response(t || `STT failed: ${res.status}`, { status: res.status });
          }

          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

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
