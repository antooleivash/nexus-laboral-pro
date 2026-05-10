import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, AlertCircle, Info, FileWarning } from "lucide-react";

export const Route = createFileRoute("/inteligencia")({ component: InteligenciaPage });

type Severidad = "critical" | "warning" | "info";
interface Alerta {
  id: string;
  empleado_id: string;
  empleado_nombre: string;
  severidad: Severidad;
  titulo: string;
  descripcion: string;
  motivoCarta?: string;
  atrasoMinutos?: number;
}

interface Empleado {
  id: string;
  nombre: string;
  rut: string;
  turno?: string;
  sueldo_base?: number;
  horas_extras_autorizadas?: number;
}

function InteligenciaPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { analizar(); }, []);

  async function analizar() {
    setLoading(true);
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
    const hace30 = new Date(hoy.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const hace3meses = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1).toISOString().slice(0, 10);

    const [{ data: emps }, { data: asis }, { data: hrs }, { data: vac }] = await Promise.all([
      supabase.from("empleados").select("id, nombre, rut, turno, sueldo_base, horas_extras_autorizadas").eq("estado", "Activo"),
      supabase.from("asistencia").select("*").gte("fecha", hace3meses),
      supabase.from("horas_extras").select("*").gte("fecha", inicioMes),
      supabase.from("vacaciones_permisos").select("*").gte("fecha_inicio", hace3meses),
    ]);

    const empleados = (emps as Empleado[]) || [];
    const asistencia = (asis as any[]) || [];
    const horasExtras = (hrs as any[]) || [];
    const vacaciones = (vac as any[]) || [];
    const out: Alerta[] = [];

    for (const emp of empleados) {
      // 1. Lunes ausentes este mes
      const lunesAusentes = asistencia.filter(r =>
        r.empleado_id === emp.id &&
        r.fecha >= inicioMes &&
        new Date(r.fecha + "T12:00:00").getDay() === 1 &&
        (r.estado === "Ausente" || (!r.hora_entrada && !r.hora_salida))
      ).length;
      if (lunesAusentes >= 2) {
        out.push({
          id: `lunes-${emp.id}`, empleado_id: emp.id, empleado_nombre: emp.nombre,
          severidad: "critical",
          titulo: "Posible causal de despido",
          descripcion: `${emp.nombre} acumula ${lunesAusentes} lunes ausentes este mes`,
          motivoCarta: `Inasistencias reiteradas los días lunes (${lunesAusentes} ausencias)`,
        });
      }

      // 2. Atrasos en 30 días
      const atrasos = asistencia.filter(r =>
        r.empleado_id === emp.id &&
        r.fecha >= hace30 &&
        (r.atraso_min || 0) > 0
      );
      if (atrasos.length >= 3) {
        const totalMin = atrasos.reduce((s, r) => s + (r.atraso_min || 0), 0);
        out.push({
          id: `atrasos-${emp.id}`, empleado_id: emp.id, empleado_nombre: emp.nombre,
          severidad: "warning",
          titulo: "Atraso reiterado",
          descripcion: `${emp.nombre} registra ${atrasos.length} atrasos en los últimos 30 días`,
          motivoCarta: "Atrasos reiterados en el ingreso a la jornada laboral",
          atrasoMinutos: totalMin,
        });
      }

      // 3. Horas extras sobre límite autorizado (mensual)
      const hrsEmp = horasExtras.filter(h => h.empleado_id === emp.id);
      const totalExtra = hrsEmp.reduce((s, h) => s + (h.horas_extra || 0), 0);
      const limite = emp.horas_extras_autorizadas || 0;
      if (limite > 0 && totalExtra > limite) {
        out.push({
          id: `hext-${emp.id}`, empleado_id: emp.id, empleado_nombre: emp.nombre,
          severidad: "warning",
          titulo: "Exceso horas extras",
          descripcion: `${emp.nombre} superó su límite autorizado (${totalExtra.toFixed(1)} hrs / ${limite} hrs)`,
        });
      }

      // 4. Marcaje incompleto: días con entrada pero sin salida
      const incompletos = asistencia.filter(r =>
        r.empleado_id === emp.id &&
        r.fecha >= hace30 &&
        r.hora_entrada && !r.hora_salida
      ).length;
      if (incompletos >= 1) {
        out.push({
          id: `marca-${emp.id}`, empleado_id: emp.id, empleado_nombre: emp.nombre,
          severidad: "info",
          titulo: "Marcaje incompleto",
          descripcion: `${emp.nombre} tiene ${incompletos} día${incompletos > 1 ? "s" : ""} sin registro de salida`,
        });
      }

      // 5. Licencias médicas en 3 meses
      const licencias = vacaciones.filter(v =>
        v.empleado_id === emp.id &&
        (v.tipo === "Licencia médica" || v.tipo === "Licencia" || v.tipo?.toLowerCase().includes("licencia"))
      ).length;
      if (licencias >= 2) {
        out.push({
          id: `lic-${emp.id}`, empleado_id: emp.id, empleado_nombre: emp.nombre,
          severidad: "info",
          titulo: "Licencias repetitivas",
          descripcion: `${emp.nombre} acumula ${licencias} licencias en los últimos 3 meses`,
        });
      }

      // 6. Riesgo multa DT: horas extras > 10% sueldo base
      const sueldo = emp.sueldo_base || 0;
      if (sueldo > 0 && totalExtra > 0) {
        const valorHora = sueldo / 180;
        const montoExtra = totalExtra * valorHora * 1.5;
        if (montoExtra > sueldo * 0.1) {
          out.push({
            id: `dt-${emp.id}`, empleado_id: emp.id, empleado_nombre: emp.nombre,
            severidad: "critical",
            titulo: "Riesgo multa DT",
            descripcion: `Horas extras de ${emp.nombre} podrían superar límite legal (${totalExtra.toFixed(1)} hrs este mes)`,
          });
        }
      }
    }

    // Ordenar: critical > warning > info
    const orden = { critical: 0, warning: 1, info: 2 };
    out.sort((a, b) => orden[a.severidad] - orden[b.severidad]);
    setAlertas(out);
    setLoading(false);
  }

  function generarCarta(a: Alerta) {
    sessionStorage.setItem("prefill_carta", JSON.stringify({
      empleado_id: a.empleado_id,
      motivo: a.motivoCarta || a.titulo,
      observaciones: a.descripcion,
      atraso_minutos: a.atrasoMinutos || 0,
    }));
    navigate({ to: "/cartas" });
  }

  const criticas = alertas.filter(a => a.severidad === "critical").length;
  const warnings = alertas.filter(a => a.severidad === "warning").length;
  const enRiesgo = new Set(alertas.filter(a => a.severidad === "critical").map(a => a.empleado_id)).size;

  const colores: Record<Severidad, { border: string; bg: string; text: string; icon: any }> = {
    critical: { border: "#DC2626", bg: "#FEF2F2", text: "#991B1B", icon: AlertCircle },
    warning: { border: "#D97706", bg: "#FFFBEB", text: "#92400E", icon: AlertTriangle },
    info: { border: "#2563EB", bg: "#EFF6FF", text: "#1E40AF", icon: Info },
  };

  return (
    <AppLayout>
      <PageHeader title="Inteligencia Laboral" description="Alertas automáticas basadas en datos de asistencia" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "0.5px solid #e5e7eb" }}>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Alertas críticas</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: "#DC2626", marginTop: 4 }}>{criticas}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "0.5px solid #e5e7eb" }}>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Advertencias</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: "#D97706", marginTop: 4 }}>{warnings}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "0.5px solid #e5e7eb" }}>
          <div style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>Trabajadores en riesgo de despido</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: "#111", marginTop: 4 }}>{enRiesgo}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Analizando datos...</div>
      ) : alertas.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", color: "#888", border: "0.5px solid #e5e7eb" }}>
          ✓ Sin alertas detectadas. Todo en orden.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alertas.map(a => {
            const c = colores[a.severidad];
            const Icon = c.icon;
            return (
              <div key={a.id} style={{ background: "#fff", borderRadius: 10, borderLeft: `4px solid ${c.border}`, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
                <div style={{ background: c.bg, color: c.text, borderRadius: 8, padding: 8, display: "flex" }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{a.titulo}</div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{a.descripcion}</div>
                </div>
                <button onClick={() => generarCarta(a)} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                  <FileWarning size={13} /> Generar carta
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
