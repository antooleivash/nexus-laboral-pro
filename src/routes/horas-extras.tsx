import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";

export const Route = createFileRoute("/horas-extras")({
  component: () => (
    <AppLayout>
      <PageHeader title="Horas extras" description="Próximamente en la siguiente fase" />
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
        Calcula horas extras vs límite autorizado, autoriza o rechaza por registro.
      </div>
    </AppLayout>
  ),
});
