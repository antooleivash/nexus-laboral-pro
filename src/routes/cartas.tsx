import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";

export const Route = createFileRoute("/cartas")({
  component: () => (
    <AppLayout>
      <PageHeader title="Cartas de amonestación" description="Próximamente en la siguiente fase" />
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
        Genera cartas individuales y masivas en formato PDF para empleados con atrasos.
      </div>
    </AppLayout>
  ),
});
