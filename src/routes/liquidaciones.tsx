import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";

export const Route = createFileRoute("/liquidaciones")({
  component: () => (
    <AppLayout>
      <PageHeader title="Liquidaciones" description="Próximamente en la siguiente fase" />
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
        Cálculo de sueldo base + bono de horas extras − AFP 10% − Salud 7%, con PDF descargable.
      </div>
    </AppLayout>
  ),
});
