import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Mic, LogOut, Trash2, BookOpen } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { listChildren, deleteChild, type ChildProfile } from "@/lib/child-profiles.functions";

export const Route = createFileRoute("/_authenticated/famiglia")({
  head: () => ({ meta: [{ title: "Famiglia · MilleStorie" }] }),
  component: FamilyPage,
});

const ACTIVE_KEY = "millestorie:activeChildId";

function FamilyPage() {
  const nav = useNavigate();
  const [children, setChildren] = useState<ChildProfile[] | null>(null);
  const [active, setActive] = useState<string | null>(null);

  async function refresh() {
    const list = await listChildren();
    setChildren(list);
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (stored && list.some((c) => c.id === stored)) setActive(stored);
    else if (list[0]) {
      setActive(list[0].id);
      localStorage.setItem(ACTIVE_KEY, list[0].id);
    }
  }

  useEffect(() => { refresh(); }, []);

  function pick(id: string) {
    setActive(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }

  async function remove(id: string) {
    if (!confirm("Eliminare questo profilo?")) return;
    await deleteChild({ data: { id } });
    if (active === id) localStorage.removeItem(ACTIVE_KEY);
    refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/" });
  }

  return (
    <AppShell>
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-celeste">Famiglia</p>
          <h1 className="mt-1 font-display text-2xl font-bold">I tuoi bambini</h1>
        </div>
        <button onClick={signOut} aria-label="Esci" className="glass grid size-10 place-items-center rounded-full">
          <LogOut className="size-4" />
        </button>
      </header>

      {children === null ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Caricamento…</p>
      ) : children.length === 0 ? (
        <div className="glass-strong mt-8 rounded-3xl p-6 text-center">
          <p className="font-display text-lg font-bold">Aggiungi il primo bambino</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bastano pochi dati: nome, età e cosa ama. Le storie saranno cucite su misura.
          </p>
          <Link to="/bambino/nuovo" className="mt-4 inline-block rounded-full bg-giallo px-5 py-2.5 text-sm font-bold text-primary-foreground">
            <Plus className="mr-1 inline size-4" /> Aggiungi bambino
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {children.map((c) => (
              <li
                key={c.id}
                className={`glass flex items-center gap-3 rounded-3xl p-3 transition-colors ${
                  active === c.id ? "ring-2 ring-giallo" : ""
                }`}
              >
                <button onClick={() => pick(c.id)} className="flex flex-1 items-center gap-3 text-left">
                  <span className="grid size-12 place-items-center rounded-2xl bg-celeste/30 font-display text-xl font-bold">
                    {c.name[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display font-bold">{c.name}</p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {c.age_range} anni · voce {c.preferred_voice}
                    </p>
                  </div>
                </button>
                <button onClick={() => remove(c.id)} aria-label="Elimina" className="grid size-9 place-items-center rounded-full text-muted-foreground">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>

          <Link to="/bambino/nuovo" className="glass mt-4 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold">
            <Plus className="size-4" /> Aggiungi un altro bambino
          </Link>

          {active && (
            <div className="mt-8 space-y-3">
              <Link
                to="/parla"
                className="relative flex items-center justify-center gap-3 overflow-hidden rounded-3xl bg-[var(--gradient-sun)] py-5 font-display text-lg font-bold text-primary-foreground shadow-[0_10px_50px_var(--glow)]"
              >
                <Mic className="size-6" />
                Parla con MilleStorie
              </Link>
              <Link
                to="/crea"
                className="glass flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold"
              >
                <BookOpen className="size-4" /> Crea una storia a mano
              </Link>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}