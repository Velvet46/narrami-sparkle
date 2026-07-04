import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Banner "Scarica l'app" con indicazione di compatibilità iOS + Android.
 * - Su Android/Chrome: mostra un vero pulsante di installazione
 * - Su iOS/Safari: mostra le istruzioni manuali (Apple non permette l'installazione automatica)
 * - Su desktop o se già installata: il banner si nasconde
 */
export function DownloadAppBanner() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSSteps, setShowIOSSteps] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const ua = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(ua))

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleAndroidInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
  }

  if (isInstalled) return null

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col items-center gap-4 text-center">
        <h3 className="text-lg font-semibold text-foreground">
          Scarica l'app di MilleStorie
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Installa l'app sul telefono per un accesso rapido, a schermo intero,
          anche offline. Compatibile con iOS e Android.
        </p>

        {/* Badge di compatibilità piattaforme */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
            <AppleGlyph />
            iOS
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">
            <AndroidGlyph />
            Android
          </span>
        </div>

        {/* Azione: Android mostra pulsante nativo, iOS mostra istruzioni */}
        {!isIOS && installPrompt && (
          <button
            onClick={handleAndroidInstall}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <DownloadGlyph />
            Installa l'app
          </button>
        )}

        {isIOS && (
          <div className="w-full">
            <button
              onClick={() => setShowIOSSteps((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <DownloadGlyph />
              Come installare su iPhone
            </button>
            {showIOSSteps && (
              <ol className="mt-4 list-decimal list-inside text-left text-sm text-muted-foreground space-y-1 max-w-xs mx-auto">
                <li>
                  Tocca l'icona <strong>Condividi</strong> in basso su Safari
                </li>
                <li>
                  Scorri e scegli <strong>"Aggiungi a schermata Home"</strong>
                </li>
                <li>
                  Conferma toccando <strong>"Aggiungi"</strong> in alto a destra
                </li>
              </ol>
            )}
          </div>
        )}

        {!isIOS && !installPrompt && (
          <p className="text-xs text-muted-foreground">
            Apri questa pagina da Chrome su Android per installare l'app.
          </p>
        )}
      </div>
    </div>
  )
}

// -- Icone semplici in SVG inline (nessun logo di marca, solo simboli generici) --

function AppleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.462 2.096-1.14 2.85-.744.822-1.968 1.446-2.994 1.446-.132 0-.264-.024-.354-.036-.018-.114-.036-.264-.036-.42 0-1.14.51-2.238 1.176-2.94.732-.78 1.998-1.35 3.006-1.386.018.144.042.324.042.486zm3.858 16.68c-.6 1.38-.888 1.998-1.662 3.222-1.086 1.71-2.616 3.834-4.512 3.852-1.686.018-2.118-1.098-4.404-1.086-2.286.012-2.76 1.104-4.446 1.086-1.896-.018-3.348-1.938-4.434-3.648-3.042-4.782-3.36-10.392-1.482-13.374 1.332-2.118 3.438-3.36 5.418-3.36 2.016 0 3.282 1.11 4.95 1.11 1.62 0 2.604-1.112 4.95-1.112 1.764 0 3.63.96 4.962 2.616-4.362 2.394-3.654 8.622.66 10.694z" />
    </svg>
  )
}

function AndroidGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85 1.23 12.95 1 12 1c-.96 0-1.86.23-2.66.63L7.87.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z" />
    </svg>
  )
}

function DownloadGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}