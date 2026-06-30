import type { ReactNode } from "react";

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
            <img src={logo} alt="MilleStorie" className="h-16 w-auto drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}