import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { runDailySourceSearch } from "@/lib/admin-stories.functions";

export const Route = createFileRoute("/api/cron/daily-story")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Vercel Cron manda un header Authorization: Bearer <CRON_SECRET>
        // che va impostato come env var CRON_SECRET su Vercel.
        const authHeader = request.headers.get("authorization");
        const expected = process.env.CRON_SECRET;
        if (!expected || authHeader !== `Bearer ${expected}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !serviceKey) {
          return new Response("Supabase service role non configurato", { status: 500 });
        }

        const supabase = createClient(supabaseUrl, serviceKey);

        try {
          const result = await runDailySourceSearch(supabase);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ ok: false, error: err.message ?? "Errore sconosciuto" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
