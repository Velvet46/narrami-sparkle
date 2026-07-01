import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/millestorie-logo-orizzontale.png";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";

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
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/famiglia" },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").insert({
            id: data.user.id,
            email,
            full_name: fullName,
            city,
          });
        }
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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/famiglia",
        skipBrowserRedirect: true,
      },
    });
    if (error) { setError(error.message || "Errore Google"); return; }
    if (!data?.url) { setError("Errore Google"); return; }
    const popup = window.open(data.url, "google-oauth", "width=500,height=650,top=100,left=100,toolbar=no,menubar=no,location=no,status=no");
    if (!popup) { setError("Il browser ha bloccato il popup. Consenti i popup per questo sito."); return; }
    const checkClosed = setInterval(async () => {
      if (popup.closed) {
        clearInterval(checkClosed);
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) nav({ to: "/famiglia" });
      }
    }, 500);
  }

  return (
    <AppShell hideNav hideLogo>
      <div className="flex min-h-[80dvh] flex-col justify-center">
        <div className="mb-8 text-center">
          <img src={logo} alt="MilleStorie" className="mx-auto h-[88px] w-auto" />
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
          {mode === "signup" && (
            <>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome e cognome"
                className="glass w-full rounded-2xl px-4 py-3 text-base outline-none"
              />
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Città"
                className="glass w-full rounded-2xl px-4 py-3 text-base outline-none"
              />
            </>
          )}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@famiglia.it"
            className="glass w-full rounded-2xl px-4 py-3 text-base outline-none"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="glass w-full rounded-2xl px-4 py-3 pr-12 text-base outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-giallo py-3 text-base font-bold text-primary-foreground disabled:opacity-60"
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
