import { useState } from "react";
import { Bluetooth, Check, Loader2, Volume2, X } from "lucide-react";

import {
  detectDevicePlatform,
  disconnectPuppet,
  getStoredConnectionState,
  isWebBluetoothSupported,
  playPuppetTestSound,
  scanAndConnectPuppet,
  scanAnyBluetoothDevice,
  setPuppetConnectedManually,
} from "@/lib/puppet";

export function PuppetConnect({ onClose }: { onClose: () => void }) {
  const platform = detectDevicePlatform();
  const canAutoScan = isWebBluetoothSupported();

  const [testing, setTesting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState(getStoredConnectionState());

  async function handleAutoScan() {
    setError(null);
    setScanning(true);
    try {
      const next = await scanAndConnectPuppet();
      setState(next);
    } catch (err) {
      // Nessun dispositivo MILLESTORIE- trovato o utente ha annullato: fallback
      try {
        const next = await scanAnyBluetoothDevice();
        setState(next);
      } catch {
        setError(
          "Nessun dispositivo Bluetooth trovato o selezione annullata. Riprova.",
        );
      }
    } finally {
      setScanning(false);
    }
  }

  function handleManualConfirm() {
    setPuppetConnectedManually(true);
    setState(getStoredConnectionState());
    setTimeout(onClose, 600);
  }

  function handleDisconnect() {
    disconnectPuppet();
    setState(getStoredConnectionState());
  }

  async function test() {
    setTesting(true);
    try {
      await playPuppetTestSound();
    } finally {
      setTesting(false);
    }
  }

  const iosSteps = [
    "Accendi il pupazzo (interruttore sotto la base).",
    "Apri Impostazioni › Bluetooth sul tuo iPhone/iPad.",
    "Tocca il dispositivo che inizia con 'MILLESTORIE-'.",
    "Torna qui e premi 'Ho associato il pupazzo'.",
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

        {state.connected && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-verde/20 px-4 py-3 text-sm">
            <Check className="size-4 shrink-0 text-verde" />
            <span className="flex-1">
              {state.deviceName ?? "Pupazzo"} collegato
              {state.verified ? "" : " (non verificato)"}
            </span>
            <button onClick={handleDisconnect} className="text-xs font-bold text-muted-foreground underline">
              Scollega
            </button>
          </div>
        )}

        {canAutoScan ? (
          <>
            <p className="mt-5 text-sm text-foreground/90">
              Accendi il pupazzo, poi premi qui sotto: cercheremo automaticamente
              il tuo dispositivo <span className="font-bold">MILLESTORIE-</span>.
            </p>
            <button
              onClick={handleAutoScan}
              disabled={scanning}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-giallo py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {scanning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Ricerca in corso…
                </>
              ) : (
                <>
                  <Bluetooth className="size-4" />
                  Cerca il pupazzo
                </>
              )}
            </button>
            {error && (
              <p className="mt-2 text-center text-xs text-destructive">{error}</p>
            )}
          </>
        ) : (
          <>
            <ol className="mt-5 space-y-3">
              {iosSteps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-giallo text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90">{s}</span>
                </li>
              ))}
            </ol>
            <button
              onClick={handleManualConfirm}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-giallo py-3 text-sm font-bold text-primary-foreground"
            >
              <Check className="size-4" />
              Ho associato il pupazzo
            </button>
          </>
        )}

        <button
          onClick={test}
          disabled={testing}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-celeste/30 py-3 text-sm font-bold disabled:opacity-60"
        >
          <Volume2 className="size-4" />
          {testing ? "Suono in corso…" : "Prova il suono"}
        </button>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Il pupazzo è una piccola cassa Bluetooth. Quando è collegata, la voce delle storie esce da lì invece che dal telefono.
        </p>
      </div>
    </div>
  );
}
