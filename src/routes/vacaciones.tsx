import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";

export const Route = createFileRoute("/vacaciones")({
  component: () => (
    <AppLayout>
      <PageHeader title="Vacaciones y permisos" description="Próximamente en la siguiente fase" />
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
        Solicita, aprueba o rechaza vacaciones y permisos por empleado.
      </div>
    </AppLayout>
  ),
});
