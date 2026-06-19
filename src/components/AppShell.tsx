import type { ReactNode } from "react";

import { BottomNav } from "./BottomNav";
import { StarsBackground } from "./StarsBackground";

export function AppShell({ children, hideNav = false }: { children: ReactNode; hideNav?: boolean }) {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden">
      <StarsBackground />
      <main className="relative z-10 mx-auto w-full max-w-md px-5 pt-6 pb-32">
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}