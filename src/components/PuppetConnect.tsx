import { useState } from "react";
import { Bluetooth, Check, Volume2, X } from "lucide-react";

import {
  detectDevicePlatform,
  isPuppetConnected,
  playPuppetTestSound,
  setPuppetConnected,
} from "@/lib/puppet";

export function PuppetConnect({ onClose }: { onClose: () => void }) {
  const platform = detectDevicePlatform();
  const [testing, setTesting] = useState(false);
  const [confirmed, setConfirmed] = useState(isPuppetConnected());

  async function test() {
    setTesting(true);
    try {
      await playPuppetTestSound();
    } finally {
      setTesting(false);
    }
  }

  function confirm() {
    setPuppetConnected(true);
    setConfirmed(true);
    setTimeout(onClose, 600);
  }

  const steps =
    platform === "ios"
      ? [
          "Accendi il pupazzo (interruttore sotto la base).",
          "Apri Impostazioni › Bluetooth sul tuo iPhone/iPad.",
          "Tocca 'MilleStorie Puppet' nell'elenco dispositivi.",
          "Torna qui e premi 'Prova il suono'.",
        ]
      : platform === "android"
        ? [
            "Accendi il pupazzo (interruttore sotto la base).",
            "Apri Impostazioni › Dispositivi connessi › Bluetooth.",
            "Associa 'MilleStorie Puppet'.",
            "Torna qui e premi 'Prova il suono'.",
          ]
        : [
            "Accendi il pupazzo.",
            "Apri le impostazioni Bluetooth del sistema.",
            "Associa 'MilleStorie Puppet' come dispositivo audio predefinito.",
            "Premi 'Prova il suono' qui sotto.",
          ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="glass-strong w-full max-w-md rounded-3xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-celeste/30">
              <Bluetooth className="size-5 text-celeste" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">Collega Puppet</h2>
              <p className="text-xs text-muted-foreground">Manda la voce del pupazzo</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="grid size-8 place-items-center rounded-full text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>

        <ol className="mt-5 space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-giallo text-[11px] font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span className="text-foreground/90">{s}</span>
            </li>
          ))}
        </ol>

        <div className="mt-6 space-y-2">
          <button
            onClick={test}
            disabled={testing}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-celeste/30 py-3 text-sm font-bold disabled:opacity-60"
          >
            <Volume2 className="size-4" />
            {testing ? "Suono in corso…" : "Prova il suono"}
          </button>
          <button
            onClick={confirm}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-giallo py-3 text-sm font-bold text-primary-foreground"
          >
            <Check className="size-4" />
            {confirmed ? "Puppet collegato!" : "Si sente dal pupazzo"}
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Il pupazzo è una piccola cassa Bluetooth. Quando è collegata, la voce delle storie esce da lì invece che dal telefono.
        </p>
      </div>
    </div>
  );
}