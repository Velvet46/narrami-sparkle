import { useMemo } from "react";
interface Star {
  top: string;
  left: string;
  size: number;
  delay: string;
  duration: string;
}
export function StarsBackground({ density = 40 }: { density?: number }) {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: density }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const r = (n: number) => ((seed * (n + 1)) % 1000) / 1000;
      return {
        top: `${Math.floor(r(1) * 100)}%`,
        left: `${Math.floor(r(2) * 100)}%`,
        size: 1 + Math.floor(r(3) * 3),
        delay: `${(r(4) * 4).toFixed(2)}s`,
        duration: `${(2 + r(5) * 3).toFixed(2)}s`,
      };
    });
  }, [density]);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Desktop background image */}
      <div className="absolute inset-0 hidden md:block">
        <img
          src="/bg-desktop.jpg"
          alt=""
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-[#0d0a1e]/60" />
      </div>
      {/* Aurora blobs — solo mobile */}
      <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-viola/30 blur-[120px] md:hidden" />
      <div className="absolute top-1/3 -right-24 size-[24rem] rounded-full bg-celeste/20 blur-[120px] md:hidden" />
      <div className="absolute -bottom-32 left-1/4 size-[26rem] rounded-full bg-giallo/10 blur-[140px] md:hidden" />
      {/* Stars */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute animate-twinkle rounded-full bg-white"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
            boxShadow: "0 0 6px rgba(255,255,255,0.7)",
          }}
        />
      ))}
    </div>
  );
}
