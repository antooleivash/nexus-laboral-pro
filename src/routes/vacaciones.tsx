import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Empleado {
  id: string;
  nombre: string;
  rut: string;
  area: string;
}

interface Solicitud {
  id: string;
  empleado_id: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  motivo: string;
  estado: string;
  created_at: string;
  empleados?: Empleado;
}

export const Route = createFileRoute("/vacaciones")({
  component: VacacionesPage,
});

function VacacionesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [form, setForm] = useState({
    empleado_id: "",
    tipo: "Vacaciones",
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: new Date().toISOString().slice(0, 10),
    motivo: "",
  });

  useEffect(() => { cargarDatos(); }, []);

  useEffect(() => {
    if (form.fecha_inicio && form.fecha_fin) {
      const inicio = new Date(form.fecha_inicio);
      const fin = new Date(form.fecha_fin);
      const diff = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
  }, [form.fecha_inicio, form.fecha_fin]);

  async function cargarDatos() {
    setLoading(true);
    const { data: emps } = await supabase.from("empleados").select("*").eq("estado", "Activo");
    setEmpleados(emps || []);

    const { data: sols } = await supabase
      .from("vacaciones_permisos")
      .select("*, empleados(id, nombre, rut, area)")
      .order("created_at", { ascending: false });
    setSolicitudes((sols as Solicitud[]) || []);
    setLoading(false);
  }

  function calcularDias() {
    const inicio = new Date(form.fecha_inicio);
    const fin = new Date(form.fecha_fin);
    return Math.max(1, Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  async function guardarSolicitud() {
    if (!form.empleado_id) return alert("Selecciona un empleado");
    const dias = calcularDias();
    await supabase.from("vacaciones_permisos").insert({
      ...form,
      dias,
      estado: "Pendiente",
    });
    setShowForm(false);
    cargarDatos();
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from("vacaciones_permisos").update({ estado }).eq("id", id);
    cargarDatos();
  }

  const solicitudesFiltradas = solicitudes.filter(s =>
    (!filtroEstado || s.estado === filtroEstado) &&
    (!filtroTipo || s.tipo === filtroTipo)
  );

  const resumen = {
    pendientes: solicitudes.filter(s => s.estado === "Pendiente").length,
    aprobadas: solicitudes.filter(s => s.estado === "Aprobado").length,
    rechazadas: solicitudes.filter(s => s.estado === "Rechazado").length,
    diasTotales: solicitudes.filter(s => s.estado === "Aprobado").reduce((a, s) => a + s.dias, 0),
  };

  const colorEstado: Record<string, { bg: string; color: string }> = {
    Pendiente: { bg: "#FAEEDA", color: "#854F0B" },
    Aprobado: { bg: "#EAF3DE", color: "#3B6D11" },
    Rechazado: { bg: "#FCEBEB", color: "#A32D2D" },
  };

  const colorTipo: Record<string, { bg: string; color: string }> = {
    Vacaciones: { bg: "#E6F1FB", color: "#185FA5" },
    "Permiso con goce": { bg: "#E1F5EE", color: "#0F6E56" },
    "Permiso sin goce": { bg: "#F1EFE8", color: "#5F5E5A" },
    "Licencia médica": { bg: "#FCEBEB", color: "#A32D2D" },
  };

  return (
    <AppLayout>
      <PageHeader title="Vacaciones y permisos" description="Gestiona solicitudes de vacaciones y permisos del personal" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Pendientes", value: resumen.pendientes, color: "#854F0B", bg: "#FAEEDA" },
          { label: "Aprobadas", value: resumen.aprobadas, color: "#3B6D11", bg: "#EAF3DE" },
          { label: "Rechazadas", value: resumen.rechazadas, color: "#A32D2D", bg: "#FCEBEB" },
          { label: "Días aprobados", value: resumen.diasTotales, color: "#185FA5", bg: "#E6F1FB" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 500 }}>{k.value}</div>
            <div style={{ marginTop: 4 }}>
              <span style={{ background: k.bg, color: k.color, padding: "2px 9px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
                {k.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13, background: "#fff" }}>
          <option value="">Todos los tipos</option>
          <option>Vacaciones</option>
          <option>Permiso con goce</option>
          <option>Permiso sin goce</option>
          <option>Licencia médica</option>
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          style={{ padding: "7px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13, background: "#fff" }}>
          <option value="">Todos los estados</option>
          <option>Pendiente</option>
          <option>Aprobado</option>
          <option>Rechazado</option>
        </select>
        <button onClick={() => setShowForm(true)} style={{
          background: "#185FA5", color: "#fff", border: "none",
          padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, marginLeft: "auto",
        }}>
          + Nueva solicitud
        </button>
      </div>

      {showForm && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 520 }}>
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Nueva solicitud</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#666" }}>Empleado</label>
                <select value={form.empleado_id} onChange={e => setForm({ ...form, empleado_id: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }}>
                  <option value="">Seleccionar...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#666" }}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }}>
                  <option>Vacaciones</option>
                  <option>Permiso con goce</option>
                  <option>Permiso sin goce</option>
                  <option>Licencia médica</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#666" }}>Fecha inicio</label>
                <input type="date" value={form.fecha_inicio}
                  onChange={e => setForm({ ...form, fecha_inicio: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#666" }}>Fecha fin</label>
                <input type="date" value={form.fecha_fin}
                  onChange={e => setForm({ ...form, fecha_fin: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, color: "#666" }}>Motivo</label>
              <textarea value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })}
                placeholder="Descripción del permiso o motivo..."
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13, minHeight: 70, fontFamily: "inherit" }} />
            </div>
            <div style={{ background: "#E6F1FB", borderRadius: 8, padding: "10px 14px", marginTop: 12, fontSize: 13, color: "#185FA5" }}>
              Total días: <strong>{calcularDias()} día(s)</strong>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowForm(false)}
                style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", fontSize: 13 }}>
                Cancelar
              </button>
              <button onClick={guardarSolicitud}
                style={{ background: "#185FA5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                Guardar solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e5e7eb", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Cargando...</div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Sin solicitudes registradas</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #e5e7eb" }}>
                {["EMPLEADO", "ÁREA", "TIPO", "DESDE", "HASTA", "DÍAS", "MOTIVO", "ESTADO", "ACCIONES"].map(h => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "#888", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.map(s => {
                const emp = s.empleados;
                const ce = colorEstado[s.estado] || { bg: "#F1EFE8", color: "#5F5E5A" };
                const ct = colorTipo[s.tipo] || { bg: "#F1EFE8", color: "#5F5E5A" };
                return (
                  <tr key={s.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{emp?.nombre || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#888" }}>{emp?.area || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: ct.bg, color: ct.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
                        {s.tipo}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{s.fecha_inicio}</td>
                    <td style={{ padding: "10px 12px" }}>{s.fecha_fin}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{s.dias}</td>
                    <td style={{ padding: "10px 12px", color: "#888", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.motivo || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: ce.bg, color: ce.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
                        {s.estado}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {s.estado === "Pendiente" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => cambiarEstado(s.id, "Aprobado")}
                            style={{ background: "#3B6D11", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
                            Aprobar
                          </button>
                          <button onClick={() => cambiarEstado(s.id, "Rechazado")}
                            style={{ background: "#A32D2D", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
                            Rechazar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}
