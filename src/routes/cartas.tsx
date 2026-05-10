import { createFileRoute } from "@tanstack/react-router";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Empleado {
  id: string;
  nombre: string;
  rut: string;
  cargo: string;
  area: string;
  turno: string;
}

interface Carta {
  id: string;
  empleado_id: string;
  motivo: string;
  fecha: string;
  cantidad_atrasos: number;
  observaciones: string;
  estado: string;
  empleados?: Empleado;
  atraso_minutos?: number;
  turno_detalle?: string;
}

interface ConfigEmpresa {
  nombre: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  web: string;
}

const CONFIG_DEFAULT: ConfigEmpresa = {
  nombre: "Mi Empresa S.A.",
  ciudad: "Puerto Montt",
  direccion: "",
  telefono: "",
  web: "",
};

function generarPDF(carta: Carta, emp: Empleado, config: ConfigEmpresa) {
  const fecha = new Date(carta.fecha);
  const fechaStr = fecha.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
  const minutos = carta.atraso_minutos || 0;
  const horas = Math.floor(minutos / 60).toString().padStart(2, "0");
  const mins = (minutos % 60).toString().padStart(2, "0");
  const atrasoStr = `${horas}:${mins}`;
  const turno = carta.turno_detalle || emp.turno || "08:00 - 17:00";
  const contenido = `
<html><head><title>Carta de amonestación - ${emp.nombre}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:20px;line-height:1.55;color:#111;white-space:pre-wrap}</style>
</head><body>

Folio N° ${String(carta.id).slice(0, 8).toUpperCase()}

${config.ciudad}, ${fechaStr}.

Señor(a):
${emp.nombre}
RUT: ${emp.rut}
Presente

De su consideración:

Por medio de la presente, y en representación de su empleador ${config.nombre}, vengo en dejar constancia escrita de la Amonestación que se le efectúa en este acto en su calidad de ${emp.cargo}, por haberse presentado a trabajar con retraso y sin causa justificada para ello.

En particular nos referimos al hecho de que el día ${fechaStr} usted se presentó a trabajar con evidente demora y sin justificación para ello, toda vez que su turno de trabajo corresponde a ${turno}, registrando un retraso de a lo menos ${atrasoStr} horas en la ejecución de las labores para las cuales fue contratado.

En efecto, usted no dio previo aviso a su superior jerárquico de encontrarse retrasado ni dio las justificaciones pertinentes al caso una vez que llegó a trabajar, dejando de prestar oportunamente los servicios personales convenidos.

Es claro que los hechos relatados no se condicen con el apego estricto a las obligaciones señaladas en su contrato de trabajo, las cuales se vinculan directamente con las obligaciones del Reglamento Interno de Orden, Higiene y Seguridad, específicamente lo dispuesto en el Artículo 17.2 letra g) y ggg), que han sido evidentemente incumplidas.

Se efectúa la presente amonestación, con copia a la Inspección del Trabajo, instándolo a cumplir con la jornada laboral pactada en su contrato de trabajo, y para el caso de presentar alguna dificultad para hacerlo, justificarla ante su jefatura. Además, se le advierte que la empresa no tolerará nuevas situaciones de la misma naturaleza.

Solicitamos, en consecuencia, acuse recibo de la copia adjunta firmada.

Atentamente,



________________
pp. empleador
${config.nombre}

${config.direccion} ${config.telefono} ${config.web}

</body></html>`;
  const ventana = window.open("", "_blank");
  if (ventana) {
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 500);
  }
}

export const Route = createFileRoute("/cartas")({
  component: CartasPage,
});

function CartasPage() {
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [config] = useState<ConfigEmpresa>(CONFIG_DEFAULT);
  const [form, setForm] = useState({
    empleado_id: "",
    motivo: "Atraso en el ingreso",
    fecha: new Date().toISOString().slice(0, 10),
    cantidad_atrasos: 1,
    observaciones: "",
    atraso_minutos: 0,
    turno_detalle: "",
  });

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setLoading(true);
    const { data: emps } = await supabase.from("empleados").select("*").eq("estado", "Activo");
    setEmpleados((emps as Empleado[]) || []);
    const { data: c } = await supabase
      .from("cartas")
      .select("*, empleados(id, nombre, rut, cargo, area, turno)")
      .order("created_at", { ascending: false });
    setCartas((c as Carta[]) || []);
    setLoading(false);
  }

  async function guardarCarta() {
    if (!form.empleado_id) return alert("Selecciona un empleado");
    await supabase.from("cartas").insert({
      empleado_id: form.empleado_id,
      motivo: form.motivo,
      fecha: form.fecha,
      cantidad_atrasos: form.cantidad_atrasos,
      observaciones: form.observaciones,
      atraso_minutos: form.atraso_minutos,
      turno_detalle: form.turno_detalle,
      estado: "Emitida",
    });
    setShowForm(false);
    cargarDatos();
  }

  function toggleSeleccion(id: string) {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function generarSeleccionadas() {
    cartas.filter(c => seleccionados.includes(c.id)).forEach(carta => {
      const emp = carta.empleados;
      if (emp) generarPDF(carta, emp, config);
    });
  }

  const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 } as const;
  const labelStyle = { fontSize: 12, color: "#666" } as const;

  return (
    <AppLayout>
      <PageHeader title="Cartas de amonestación" description="Genera cartas individuales y masivas en PDF" />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setShowForm(true)} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
          + Nueva carta
        </button>
        {seleccionados.length > 0 && (
          <button onClick={generarSeleccionadas} style={{ background: "#3B6D11", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
            Descargar PDF seleccionadas ({seleccionados.length})
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 560 }}>
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Nueva carta de amonestación</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Empleado</label>
                <select value={form.empleado_id} onChange={e => setForm({ ...form, empleado_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Minutos de atraso</label>
                <input type="number" value={form.atraso_minutos} onChange={e => setForm({ ...form, atraso_minutos: parseInt(e.target.value) || 0 })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Turno (ej: 07:00 - 16:00)</label>
                <input type="text" value={form.turno_detalle} onChange={e => setForm({ ...form, turno_detalle: e.target.value })} placeholder="07:00 - 16:00" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Motivo</label>
              <input type="text" value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} style={inputStyle} />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Observaciones</label>
              <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} style={{ ...inputStyle, minHeight: 70, fontFamily: "inherit" }} />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarCarta} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Guardar carta</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e5e7eb", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Cargando...</div>
        ) : cartas.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Sin cartas registradas</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #e5e7eb" }}>
                {["", "EMPLEADO", "MOTIVO", "FECHA", "ESTADO", "ACCIONES"].map((h, i) => (
                  <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "#888", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cartas.map(carta => {
                const emp = carta.empleados;
                return (
                  <tr key={carta.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <input type="checkbox" checked={seleccionados.includes(carta.id)} onChange={() => toggleSeleccion(carta.id)} style={{ accentColor: "#185FA5" }} />
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{emp?.nombre || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{carta.motivo}</td>
                    <td style={{ padding: "10px 12px" }}>{carta.fecha}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: carta.estado === "Emitida" ? "#E6F1FB" : "#FAEEDA", color: carta.estado === "Emitida" ? "#185FA5" : "#854F0B", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>
                        {carta.estado}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {emp && (
                        <button onClick={() => generarPDF(carta, emp, config)} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                          Descargar PDF
                        </button>
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
