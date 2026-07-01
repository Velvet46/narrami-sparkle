import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { StarsBackground } from "./StarsBackground";
import logo from "@/assets/millestorie-logo-orizzontale.png";

export function AppShell({
  children,
  hideNav = false,
  hideLogo = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
  hideLogo?: boolean;
}) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden">
      <StarsBackground />
      <main className="relative z-10 mx-auto w-full max-w-md px-5 pt-4 pb-32">
        {!hideLogo && (
          <div className="mb-2 flex justify-center">
            <Link to="/"><img src={logo} alt="MilleStorie" className="h-16 w-auto drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]" /></Link>
          </div>
        )}
        {children}
      </main>

      {!hideNav && <BottomNav />}

      <footer className="hidden md:block relative z-10 border-t border-white/5 px-5 py-8 text-center text-[10px] text-muted-foreground/60 leading-relaxed">
        <p className="font-semibold text-muted-foreground/80">Integra srl · P.IVA 12495920964</p>
        <p className="mt-1">Ripa di Porta Ticinese 39 · Milano 20143 · <a href="mailto:info@millestorie.me" className="hover:text-white/60 transition-colors">info@millestorie.me</a></p>
        <p className="mt-1">Integra srl – Tutti i diritti sono riservati 2026 · <a href="https://www.iubenda.com/privacy-policy/47149969" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60 transition-colors">Privacy Policy</a> · <a href="https://www.iubenda.com/privacy-policy/47149969/cookie-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60 transition-colors">Cookie Policy</a></p>
      </footer>

      <Link to="/walt" className="fixed bottom-2 right-2 z-50 size-5 rounded-full opacity-10 hover:opacity-30 transition-opacity" aria-label="Walt">
        <span className="block size-full rounded-full bg-white/20" />
      </Link>
    </div>
  );
}
