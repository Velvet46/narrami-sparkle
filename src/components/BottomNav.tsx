import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Library, Wand2 } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/libreria", label: "Libreria", icon: Library },
  { to: "/crea", label: "Crea", icon: Wand2 },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Navigazione principale"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2"
    >
      <div className="glass-strong mx-4 flex w-full max-w-md items-center justify-around rounded-full px-3 py-2 shadow-soft">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className="group flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 transition-colors"
            >
              <span
                className={`flex size-9 items-center justify-center rounded-2xl transition-all ${
                  active
                    ? "bg-giallo text-primary-foreground shadow-[0_0_20px_var(--glow)]"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              >
                <Icon className="size-[18px]" />
              </span>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}