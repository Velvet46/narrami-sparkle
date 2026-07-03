import { streamStoryTTS } from "./tts-player";

const KEY = "millestorie:puppet-connected";
const DEVICE_NAME_PREFIX = "MILLESTORIE-";

// Web Bluetooth GATT service UUID used by the puppet speaker.
// TODO: sostituire con l'UUID reale una volta confermato con il fornitore hardware.
const PUPPET_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb"; // placeholder

export type PuppetConnectionState = {
  connected: boolean;
  deviceName: string | null;
  verified: boolean; // true = confermato via API reale, false = auto-dichiarato dall'utente (iOS)
};

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

export function getStoredConnectionState(): PuppetConnectionState {
  if (typeof window === "undefined") {
    return { connected: false, deviceName: null, verified: false };
  }
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return { connected: false, deviceName: null, verified: false };
  try {
    return JSON.parse(raw);
  } catch {
    return { connected: false, deviceName: null, verified: false };
  }
}

function storeConnectionState(state: PuppetConnectionState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function isPuppetConnected(): boolean {
  return getStoredConnectionState().connected;
}

/** Connessione manuale/auto-dichiarata, usata su iOS dove Web Bluetooth non esiste. */
export function setPuppetConnectedManually(v: boolean) {
  storeConnectionState({
    connected: v,
    deviceName: v ? "Pupazzo (associato via Impostazioni)" : null,
    verified: false,
  });
}

/**
 * Cerca un pupazzo MilleStorie nelle vicinanze via Web Bluetooth, si connette
 * al suo GATT server e salva uno stato di connessione VERIFICATO.
 * Funziona solo dove esiste navigator.bluetooth (Chrome/Edge su Android/desktop).
 */
export async function scanAndConnectPuppet(): Promise<PuppetConnectionState> {
  if (!isWebBluetoothSupported()) {
    throw new Error("Web Bluetooth non supportato su questo browser/dispositivo.");
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: DEVICE_NAME_PREFIX }],
    optionalServices: [PUPPET_SERVICE_UUID],
  });

  const server = await device.gatt?.connect();
  const connected = !!server?.connected;

  const state: PuppetConnectionState = {
    connected,
    deviceName: device.name ?? null,
    verified: connected,
  };
  storeConnectionState(state);
  return state;
}

/**
 * Fallback: mostra il picker del browser con TUTTI i dispositivi Bluetooth
 * vicini (non solo quelli MilleStorie), per quando l'auto-detect non trova nulla.
 */
export async function scanAnyBluetoothDevice(): Promise<PuppetConnectionState> {
  if (!isWebBluetoothSupported()) {
    throw new Error("Web Bluetooth non supportato su questo browser/dispositivo.");
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
  });

  const server = await device.gatt?.connect();
  const connected = !!server?.connected;

  const state: PuppetConnectionState = {
    connected,
    deviceName: device.name ?? null,
    verified: connected,
  };
  storeConnectionState(state);
  return state;
}

export function disconnectPuppet() {
  storeConnectionState({ connected: false, deviceName: null, verified: false });
}

/**
 * Riproduce una breve frase TTS attraverso l'output audio di sistema.
 * Nota: l'audio esce sempre da qualunque output stia usando l'OS/browser in
 * quel momento — non viene instradato specificamente verso il dispositivo
 * connesso via GATT, perché playback audio e Web Bluetooth sono API separate.
 */
export async function playPuppetTestSound(): Promise<void> {
  return new Promise((resolve) => {
    const h = streamStoryTTS({
      chunks: [
        "Ciao! Sono il tuo pupazzo magico. Se mi senti bene, sono pronto a raccontarti tante storie!",
      ],
      voice: "sage",
      onEnded: () => resolve(),
    });
    h.done.finally(() => resolve());
  });
}

export function detectDevicePlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}
