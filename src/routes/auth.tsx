import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entra · MilleStorie" },
      { name: "description", content: "Accedi per creare i profili dei tuoi bambini." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/famiglia" });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/famiglia" },
        });
        if (error) throw error;
        nav({ to: "/famiglia" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/famiglia" });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/famiglia",
    });
    if (result.error) setError(result.error.message || "Errore Google");
    if (!result.redirected && !result.error) nav({ to: "/famiglia" });
  }

  return (
    <AppShell hideNav>
      <div className="flex min-h-[80dvh] flex-col justify-center">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-giallo text-primary-foreground shadow-[0_0_30px_var(--glow)]">
            <Sparkles className="size-7" />
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold">MilleStorie</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Bentornato genitore" : "Crea il tuo account famiglia"}
          </p>
        </div>

        <button
          type="button"
          onClick={google}
          className="glass-strong mb-4 flex w-full items-center justify-center gap-3 rounded-2xl py-3 text-sm font-semibold"
        >
          Continua con Google
        </button>

        <div className="my-2 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <div className="h-px flex-1 bg-white/10" /> oppure <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@famiglia.it"
            className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none"
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-giallo py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Attendi…" : mode === "signin" ? "Entra" : "Crea account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-center text-xs text-muted-foreground underline"
        >
          {mode === "signin" ? "Non hai un account? Registrati" : "Hai già un account? Entra"}
        </button>

        <Link to="/" className="mt-8 text-center text-xs text-muted-foreground">
          ← Torna alla home
        </Link>
      </div>
    </AppShell>
  );
}