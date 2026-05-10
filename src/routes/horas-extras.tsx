import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Empleado {
  id: string;
  nombre: string;
  rut: string;
  area: string;
  horas_extras_autorizadas: number;
}

interface HoraExtra {
  id: string;
  empleado_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  horas_trabajadas: number;
  horas_extra: number;
  jornada_normal: number;
  estado: string;
  empleados?: Empleado;
}

function calcularHoras(inicio: string, fin: string, jornada: number) {
  if (!inicio || !fin) return { hTrab: 0, hExtra: 0 };
  const [ih, im] = inicio.split(":").map(Number);
  const [fh, fm] = fin.split(":").map(Number);
  let mins = (fh * 60 + fm) - (ih * 60 + im);
  if (mins < 0) mins += 1440;
  const hTrab = parseFloat((mins / 60).toFixed(2));
  const hExtra = parseFloat(Math.max(0, hTrab - jornada).toFixed(2));
  return { hTrab, hExtra };
}

export const Route = createFileRoute("/horas-extras")({
  component: HorasExtrasPage,
});

function HorasExtrasPage() {
  const [registros, setRegistros] = useState<HoraExtra[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [form, setForm] = useState({
    empleado_id: "",
    fecha: new Date().toISOString().slice(0, 10),
    hora_inicio: "07:00",
    hora_fin: "17:00",
    jornada_normal: 9,
    estado: "Sin autorizar",
  });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setLoading(true);
    const { data: emps } = await supabase.from("empleados").select("*").eq("estado", "Activo");
    setEmpleados((emps as Empleado[]) || []);
    const { data: regs } = await supabase
      .from("horas_extras")
      .select("*, empleados(id, nombre, rut, area, horas_extras_autorizadas)")
      .order("fecha", { ascending: false });
    setRegistros((regs as HoraExtra[]) || []);
    setLoading(false);
  }

  async function guardarRegistro() {
    if (!form.empleado_id) return alert("Selecciona un empleado");
    const { hTrab, hExtra } = calcularHoras(form.hora_inicio, form.hora_fin, form.jornada_normal);
    await supabase.from("horas_extras").insert({
      empleado_id: form.empleado_id,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      horas_trabajadas: hTrab,
      horas_extra: hExtra,
      jornada_normal: form.jornada_normal,
      estado: form.estado,
    });
    setShowForm(false);
    cargarDatos();
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from("horas_extras").update({ estado }).eq("id", id);
    cargarDatos();
  }

  const calc = calcularHoras(form.hora_inicio, form.hora_fin, form.jornada_normal);
  const registrosFiltrados = registros.filter(r => !filtroEstado || r.estado === filtroEstado);
  const resumen = {
    autorizadas: registros.filter(r => r.estado === "Autorizado").reduce((a, r) => a + (r.horas_extra || 0), 0),
    sinAutorizar: registros.filter(r => r.estado === "Sin autorizar").reduce((a, r) => a + (r.horas_extra || 0), 0),
    rechazadas: registros.filter(r => r.estado === "Rechazado").reduce((a, r) => a + (r.horas_extra || 0), 0),
  };

  const colorEstado: Record<string, { bg: string; color: string }> = {
    "Autorizado": { bg: "#EAF3DE", color: "#3B6D11" },
    "Sin autorizar": { bg: "#FAEEDA", color: "#854F0B" },
    "Rechazado": { bg: "#FCEBEB", color: "#A32D2D" },
  };

  const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 } as const;
  const labelStyle = { fontSize: 12, color: "#666" } as const;

  return (
    <AppLayout>
      <PageHeader title="Horas extras" description="Registro y autorización de horas extras" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Autorizadas", value: resumen.autorizadas.toFixed(1) + " hrs", color: "#3B6D11" },
          { label: "Sin autorizar", value: resumen.sinAutorizar.toFixed(1) + " hrs", color: "#854F0B" },
          { label: "Rechazadas", value: resumen.rechazadas.toFixed(1) + " hrs", color: "#A32D2D" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fff", border: "0.5px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 24, fontWeight: 500, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 13, background: "#fff" }}>
          <option value="">Todos los estados</option>
          <option>Autorizado</option>
          <option>Sin autorizar</option>
          <option>Rechazado</option>
        </select>
        <button onClick={() => setShowForm(true)} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, marginLeft: "auto" }}>
          + Registrar horas extras
        </button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 580, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Registrar horas extras</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Empleado</label>
                <select value={form.empleado_id} onChange={e => setForm({ ...form, empleado_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {empleados.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} (máx. {e.horas_extras_autorizadas || 0} hrs)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Jornada normal (hrs)</label>
                <input type="number" value={form.jornada_normal} onChange={e => setForm({ ...form, jornada_normal: parseInt(e.target.value) || 9 })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Hora inicio</label>
                <input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Hora fin</label>
                <input type="time" value={form.hora_fin} onChange={e => setForm({ ...form, hora_fin: e.target.value })} style={inputStyle} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Estado</label>
                <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} style={inputStyle}>
                  <option>Sin autorizar</option>
                  <option>Autorizado</option>
                  <option>Rechazado</option>
                </select>
              </div>
            </div>

            <div style={{ background: "#E6F1FB", borderRadius: 8, padding: "12px 14px", marginTop: 14, fontSize: 13, color: "#185FA5", display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Horas trabajadas</span><strong>{calc.hTrab.toFixed(1)} hrs</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Horas extras calculadas</span><strong>{calc.hExtra.toFixed(1)} hrs</strong></div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarRegistro} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Guardar registro</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e5e7eb", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Cargando...</div>
        ) : registrosFiltrados.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Sin registros</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #e5e7eb" }}>
                {["EMPLEADO", "ÁREA", "FECHA", "INICIO", "FIN", "H. TRABAJADAS", "H. EXTRAS", "H. AUT. MÁX.", "ESTADO", "ACCIONES"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "#888", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map(r => {
                const emp = r.empleados;
                const limiteDiario = emp && emp.horas_extras_autorizadas ? emp.horas_extras_autorizadas / 22 : 0;
                const excede = limiteDiario > 0 && r.horas_extra > limiteDiario;
                const ce = colorEstado[r.estado] || { bg: "#F1EFE8", color: "#5F5E5A" };
                return (
                  <tr key={r.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{emp?.nombre || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#888" }}>{emp?.area || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{r.fecha}</td>
                    <td style={{ padding: "10px 12px" }}>{r.hora_inicio}</td>
                    <td style={{ padding: "10px 12px" }}>{r.hora_fin}</td>
                    <td style={{ padding: "10px 12px" }}>{r.horas_trabajadas?.toFixed(1)} hrs</td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>
                      {r.horas_extra?.toFixed(1)} hrs {excede && <span title="Excede límite autorizado">⚠️</span>}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#888" }}>{emp?.horas_extras_autorizadas || 0} hrs/mes</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: ce.bg, color: ce.color, padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>{r.estado}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {r.estado === "Sin autorizar" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => cambiarEstado(r.id, "Autorizado")} style={{ background: "#3B6D11", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Autorizar</button>
                          <button onClick={() => cambiarEstado(r.id, "Rechazado")} style={{ background: "#A32D2D", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Rechazar</button>
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
