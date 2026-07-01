import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
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

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // FIX: prevenire doppio submit su mobile (touch + click)
  const submittingRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/famiglia" });
    });

    // FIX: ascolta cambio sessione (necessario dopo redirect OAuth mobile)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        nav({ to: "/famiglia" });
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [nav]);

  // Messaggi errore in italiano, mai tecnici
  function friendlyError(msg: string): string {
    if (msg.includes("Invalid login") || msg.includes("invalid_credentials"))
      return "Email o password non corretti. Riprova!";
    if (msg.includes("Email not confirmed"))
      return "Controlla la tua email e clicca sul link di conferma prima di accedere.";
    if (msg.includes("already registered") || msg.includes("already been registered"))
      return "Questa email è già registrata. Prova ad accedere!";
    if (msg.includes("Password should be"))
      return "La password deve essere di almeno 6 caratteri.";
    if (msg.includes("rate limit") || msg.includes("too many"))
      return "Troppi tentativi. Aspetta qualche minuto e riprova.";
    if (msg.includes("network") || msg.includes("fetch"))
      return "Problema di connessione. Controlla il WiFi e riprova!";
    return "Qualcosa non ha funzionato. Riprova tra un momento!";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    // FIX: guard doppio submit mobile
    if (submittingRef.current || loading) return;
    submittingRef.current = true;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth",
        });
        if (error) throw error;
        setSuccessMsg("Ti abbiamo inviato un'email per reimpostare la password. Controlla la casella!");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            emailRedirectTo: window.location.origin + "/famiglia",
            data: { full_name: fullName, city },
          },
        });
        if (error) throw error;

        // Salva profilo se utente creato
        if (data.user) {
          supabase.from("profiles").upsert({
            id: data.user.id,
            email: email.trim().toLowerCase(),
            full_name: fullName,
            city,
          }).then(() => {}).catch(() => {});
        }

        // FIX: su Supabase con email confirmation attiva,
        // dopo signUp NON c'è ancora sessione — mostra messaggio
        if (data.session) {
          // Email confirmation disattivata → sessione immediata
          nav({ to: "/famiglia" });
        } else {
          // Email confirmation attiva → avvisa l'utente
          setSuccessMsg("Account creato! Controlla la tua email e clicca sul link per confermare, poi torna qui ad accedere.");
          setMode("signin");
        }
        return;
      }

      // signin
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      nav({ to: "/famiglia" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore";
      setError(friendlyError(msg));
    } finally {
      setLoading(false);
      setTimeout(() => { submittingRef.current = false; }, 1000);
    }
  }

  async function loginGoogle() {
    setError(null);
    // FIX: su mobile i popup sono bloccati — usa sempre redirect
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/famiglia",
        // niente skipBrowserRedirect — redirect diretto, funziona su mobile
      },
    });
    if (error) setError(friendlyError(error.message));
  }

  const isSignin = mode === "signin";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  return (
    <AppShell hideNav hideLogo>
      <div className="flex min-h-[80dvh] flex-col justify-center">
        <div className="mb-8 text-center">
          <img src={logo} alt="MilleStorie" className="mx-auto h-[88px] w-auto" />
        </div>

        {/* Messaggio successo */}
        {successMsg && (
          <div className="mb-4 rounded-2xl bg-green-500/20 border border-green-400/30 px-4 py-3 text-sm text-green-300 text-center">
            {successMsg}
          </div>
        )}

        {/* Google — solo su signin/signup, non su forgot */}
        {!isForgot && (
          <>
            <button
              type="button"
              onClick={loginGoogle}
              className="glass-strong mb-4 flex w-full items-center justify-center gap-3 rounded-2xl py-3 text-sm font-semibold"
            >
              Continua con Google
            </button>

            <div className="my-2 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
              <div className="h-px flex-1 bg-white/10" /> oppure <div className="h-px flex-1 bg-white/10" />
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-3">
          {/* Titolo modalità */}
          {isForgot && (
            <p className="text-center text-sm text-muted-foreground mb-2">
              Inserisci la tua email e ti mandiamo un link per reimpostare la password.
            </p>
          )}

          {isSignup && (
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
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@famiglia.it"
            className="glass w-full rounded-2xl px-4 py-3 text-base outline-none"
          />

          {!isForgot && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete={isSignin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 6 caratteri)"
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
          )}

          {/* Link "Hai dimenticato la password?" */}
          {isSignin && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(null); setSuccessMsg(null); }}
                className="text-xs text-muted-foreground underline"
              >
                Hai dimenticato la password?
              </button>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-rose-500/10 border border-rose-400/20 px-3 py-2 text-xs text-rose-400 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-giallo py-3 text-base font-bold text-primary-foreground disabled:opacity-60 touch-manipulation active:scale-95 transition-transform"
          >
            {loading
              ? "Attendi…"
              : isSignin
                ? "Entra"
                : isSignup
                  ? "Crea account"
                  : "Invia email di recupero"}
          </button>
        </form>

        {/* Toggle signin/signup */}
        {!isForgot && (
          <button
            type="button"
            onClick={() => { setMode(isSignin ? "signup" : "signin"); setError(null); setSuccessMsg(null); }}
            className="mt-4 text-center text-xs text-muted-foreground underline"
          >
            {isSignin ? "Non hai un account? Registrati" : "Hai già un account? Entra"}
          </button>
        )}

        {/* Torna al login da forgot */}
        {isForgot && (
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(null); setSuccessMsg(null); }}
            className="mt-4 text-center text-xs text-muted-foreground underline"
          >
            ← Torna al login
          </button>
        )}

        <Link to="/" className="mt-8 text-center text-xs text-muted-foreground">
          ← Torna alla home
        </Link>
      </div>
    </AppShell>
  );
}