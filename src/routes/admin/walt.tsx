import { createFileRoute } from "@tanstack/react-router";
import { WaltDashboard } from "@/components/walt/walt-dashboard";

export const Route = createFileRoute("/admin/walt")({
  component: WaltDashboard,
  errorComponent: () => (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-xl font-semibold">Accesso negato</h1>
      <p className="text-sm text-muted-foreground">Questa pagina è riservata agli amministratori.</p>
    </div>
  ),
});
