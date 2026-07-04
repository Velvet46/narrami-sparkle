import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MicSpeakerTest } from "@/components/MicSpeakerTest";

export const Route = createFileRoute("/test-audio")({
  head: () => ({
    meta: [{ title: "Test microfono e audio — MilleStorie" }],
  }),
  component: TestAudioPage,
});

function TestAudioPage() {
  return (
    <AppShell hideLogo>
      <header className="pt-2">
        <h1 className="text-2xl font-bold text-foreground">Test microfono e audio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verifica che il tuo dispositivo possa registrare e riprodurre correttamente prima di iniziare.
        </p>
      </header>
      <section className="mt-6">
        <MicSpeakerTest variant="user" />
      </section>
    </AppShell>
  );
}
