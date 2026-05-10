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
  sueldo_base: number;
}

interface Liquidacion {
  id: string;
  empleado_id: string;
  periodo: string;
  sueldo_base: number;
  bono_horas_extras: number;
  otros_bonos: number;
  descuentos: number;
  total_neto: number;
  estado: string;
  empleados?: Empleado;
}

function calcularLiquidacion(base: number, he: number, bonos: number, desc: number) {
  const bruto = base + he + bonos;
  const afp = Math.round(bruto * 0.10);
  const salud = Math.round(bruto * 0.07);
  const totalDescuentos = afp + salud + desc;
  const neto = bruto - totalDescuentos;
  return { bruto, afp, salud, totalDescuentos, neto };
}

const fmtCLP = (n: number) => n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function generarPDFLiquidacion(liq: Liquidacion, emp: Empleado, config: { nombre: string; ciudad: string; rut: string }) {
  const { bruto, afp, salud, totalDescuentos, neto } = calcularLiquidacion(liq.sueldo_base, liq.bono_horas_extras, liq.otros_bonos, liq.descuentos);
  const row = (label: string, value: string, bold = false, neg = false) =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;${bold ? "font-weight:600;" : ""}">${label}</td>
     <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;${bold ? "font-weight:600;" : ""}${neg ? "color:#A32D2D;" : ""}">${value}</td></tr>`;

  const contenido = `
<html><head><title>Liquidación ${emp.nombre} - ${liq.periodo}</title>
<style>
body{font-family:Arial,sans-serif;max-width:760px;margin:30px auto;padding:20px;color:#111;font-size:13px}
h1{font-size:18px;margin:0 0 4px 0}h2{font-size:14px;margin:0 0 18px 0;color:#555;font-weight:500}
.info{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-bottom:18px;font-size:12px}
.info b{color:#444}
table{width:100%;border-collapse:collapse;margin-top:10px}
.firmas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:60px;text-align:center;font-size:12px}
.firmas div{border-top:1px solid #333;padding-top:6px}
.total{background:#E6F1FB}
</style></head><body>

<h1>${config.nombre}</h1>
<h2>Liquidación de Remuneraciones — ${liq.periodo}</h2>

<div class="info">
  <div><b>Trabajador:</b> ${emp.nombre}</div>
  <div><b>RUT:</b> ${emp.rut}</div>
  <div><b>Cargo:</b> ${emp.cargo}</div>
  <div><b>Área:</b> ${emp.area}</div>
  <div><b>Período:</b> ${liq.periodo}</div>
  <div><b>Estado:</b> ${liq.estado}</div>
</div>

<table>
  <thead><tr style="background:#f5f5f5"><th style="padding:8px 12px;text-align:left">Concepto</th><th style="padding:8px 12px;text-align:right">Monto</th></tr></thead>
  <tbody>
    ${row("Sueldo base", fmtCLP(liq.sueldo_base))}
    ${row("Bono horas extras", fmtCLP(liq.bono_horas_extras))}
    ${row("Otros bonos", fmtCLP(liq.otros_bonos))}
    ${row("Total haberes", fmtCLP(bruto), true)}
    ${row("AFP (10%)", "-" + fmtCLP(afp), false, true)}
    ${row("Salud (7%)", "-" + fmtCLP(salud), false, true)}
    ${row("Otros descuentos", "-" + fmtCLP(liq.descuentos), false, true)}
    ${row("Total descuentos", "-" + fmtCLP(totalDescuentos), true, true)}
    <tr class="total"><td style="padding:10px 12px;font-weight:700">TOTAL LÍQUIDO A PAGAR</td>
      <td style="padding:10px 12px;text-align:right;font-weight:700">${fmtCLP(neto)}</td></tr>
  </tbody>
</table>

<div class="firmas">
  <div>Firma Trabajador<br/><br/>${emp.nombre}<br/>RUT: ${emp.rut}</div>
  <div>Firma Empleador<br/><br/>${config.nombre}<br/>RUT: ${config.rut}</div>
</div>

</body></html>`;
  const ventana = window.open("", "_blank");
  if (ventana) {
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 500);
  }
}

export const Route = createFileRoute("/liquidaciones")({
  component: LiquidacionesPage,
});

function LiquidacionesPage() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const config = { nombre: "Mi Empresa S.A.", ciudad: "Puerto Montt", rut: "76.000.000-0" };
  const [form, setForm] = useState({
    empleado_id: "",
    periodo: new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" }),
    sueldo_base: 0,
    bono_horas_extras: 0,
    otros_bonos: 0,
    descuentos: 0,
  });
  const calc = calcularLiquidacion(form.sueldo_base, form.bono_horas_extras, form.otros_bonos, form.descuentos);

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    setLoading(true);
    const { data: emps } = await supabase.from("empleados").select("*").eq("estado", "Activo");
    setEmpleados((emps as Empleado[]) || []);
    const { data: liqs } = await supabase
      .from("liquidaciones")
      .select("*, empleados(id, nombre, rut, cargo, area, sueldo_base)")
      .order("created_at", { ascending: false });
    setLiquidaciones((liqs as Liquidacion[]) || []);
    setLoading(false);
  }

  function autocompletarSueldo(empId: string) {
    const emp = empleados.find(e => e.id === empId);
    if (emp) setForm(f => ({ ...f, empleado_id: empId, sueldo_base: emp.sueldo_base || 0 }));
  }

  async function guardarLiquidacion() {
    if (!form.empleado_id) return alert("Selecciona un empleado");
    const { neto } = calcularLiquidacion(form.sueldo_base, form.bono_horas_extras, form.otros_bonos, form.descuentos);
    await supabase.from("liquidaciones").insert({ ...form, total_neto: neto, estado: "Emitida" });
    setShowForm(false);
    cargarDatos();
  }

  const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 } as const;
  const labelStyle = { fontSize: 12, color: "#666" } as const;

  const camposMonto: { label: string; key: "sueldo_base" | "bono_horas_extras" | "otros_bonos" | "descuentos" }[] = [
    { label: "Sueldo base ($)", key: "sueldo_base" },
    { label: "Bono horas extras ($)", key: "bono_horas_extras" },
    { label: "Otros bonos ($)", key: "otros_bonos" },
    { label: "Descuentos adicionales ($)", key: "descuentos" },
  ];

  return (
    <AppLayout>
      <PageHeader title="Liquidaciones" description="Cálculo de sueldo, bonos y descuentos por empleado" />

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setShowForm(true)} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
          + Nueva liquidación
        </button>
      </div>

      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 600, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: 16, fontSize: 15 }}>Nueva liquidación</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Empleado</label>
                <select value={form.empleado_id} onChange={e => autocompletarSueldo(e.target.value)} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Período</label>
                <input type="text" value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} style={inputStyle} />
              </div>
              {camposMonto.map(({ label, key }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input type="number" value={form[key]} onChange={e => setForm({ ...form, [key]: parseInt(e.target.value) || 0 })} style={inputStyle} />
                </div>
              ))}
            </div>

            <div style={{ background: "#E6F1FB", borderRadius: 8, padding: "12px 14px", marginTop: 14, fontSize: 13, color: "#185FA5", display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Total bruto</span><strong>{fmtCLP(calc.bruto)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>AFP 10% + Salud 7%</span><strong>-{fmtCLP(calc.afp + calc.salud)}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #c8def2", paddingTop: 6, marginTop: 4 }}><span>Total líquido</span><strong>{fmtCLP(calc.neto)}</strong></div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", fontSize: 13 }}>Cancelar</button>
              <button onClick={guardarLiquidacion} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Guardar liquidación</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #e5e7eb", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Cargando...</div>
        ) : liquidaciones.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Sin liquidaciones registradas</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #e5e7eb" }}>
                {["EMPLEADO", "ÁREA", "PERÍODO", "SUELDO BASE", "H. EXTRAS", "DESCUENTOS", "TOTAL NETO", "ESTADO", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: "#888", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liquidaciones.map(liq => {
                const emp = liq.empleados;
                const { neto } = calcularLiquidacion(liq.sueldo_base, liq.bono_horas_extras, liq.otros_bonos, liq.descuentos);
                return (
                  <tr key={liq.id} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 500 }}>{emp?.nombre || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#888" }}>{emp?.area || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>{liq.periodo}</td>
                    <td style={{ padding: "10px 12px" }}>{fmtCLP(liq.sueldo_base)}</td>
                    <td style={{ padding: "10px 12px" }}>{fmtCLP(liq.bono_horas_extras)}</td>
                    <td style={{ padding: "10px 12px", color: "#A32D2D" }}>-{fmtCLP(liq.descuentos)}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{fmtCLP(neto)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: "#E6F1FB", color: "#185FA5", padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 500 }}>{liq.estado}</span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {emp && (
                        <button onClick={() => generarPDFLiquidacion(liq, emp, config)} style={{ background: "#185FA5", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
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
