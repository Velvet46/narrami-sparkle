import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/walt")({
  component: WaltLogin,
});

const WALT_EMAIL = "advisor.impresa@gmail.com";
const WALT_PASSWORD = "Maremma_1979";

function WaltLogin() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (email !== WALT_EMAIL || password !== WALT_PASSWORD) {
      setError("Credenziali non valide.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      nav({ to: "/walt-dashboard" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0a1e] px-4">
      <form onSubmit={submit} className="w-full max-w-xs space-y-4">
        <p className="text-center text-xs text-white/20 uppercase tracking-widest">W</p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors disabled:opacity-50"
        >
          {loading ? "…" : "Entra"}
        </button>
      </form>
    </div>
  );
}