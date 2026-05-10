import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Clock, TrendingUp, FileWarning } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/")({ component: DashboardRoute });

function DashboardRoute() {
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({ empleados: 0, atrasos: 0, horasExtras: 0, cartas: 0 });

  useEffect(() => {
    (async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const iso = monthStart.toISOString().slice(0, 10);

      const [emp, atr, hex, car] = await Promise.all([
        supabase.from("empleados").select("id", { count: "exact", head: true }).eq("estado", "Activo"),
        supabase.from("asistencia").select("atraso_min").gte("fecha", iso).gt("atraso_min", 0),
        supabase.from("horas_extras").select("horas").gte("fecha", iso),
        supabase.from("cartas_amonestacion").select("id", { count: "exact", head: true }).gte("fecha", iso),
      ]);

      setStats({
        empleados: emp.count ?? 0,
        atrasos: atr.data?.length ?? 0,
        horasExtras: (hex.data ?? []).reduce((s, r: any) => s + Number(r.horas || 0), 0),
        cartas: car.count ?? 0,
      });
    })();
  }, []);

  const cards = [
    { label: "Empleados activos", value: formatNumber(stats.empleados), icon: Users, color: "text-primary" },
    { label: "Atrasos del mes", value: formatNumber(stats.atrasos), icon: Clock, color: "text-amber-600" },
    { label: "Horas extras del mes", value: formatNumber(stats.horasExtras), icon: TrendingUp, color: "text-emerald-600" },
    { label: "Cartas emitidas", value: formatNumber(stats.cartas), icon: FileWarning, color: "text-rose-600" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="Resumen general del mes" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <Icon className={`h-5 w-5 ${c.color}`} />
              </div>
              <div className="mt-3 text-3xl font-bold text-foreground">{c.value}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Bienvenido a Nexus Laboral</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Plataforma de gestión RRHH. Comienza creando empleados, registrando asistencia y revisando los KPIs aquí.
        </p>
      </div>
    </>
  );
}
