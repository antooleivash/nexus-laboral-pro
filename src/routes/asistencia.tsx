import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Upload, Plus } from "lucide-react";
import * as XLSX from "xlsx";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import { minutesBetween } from "@/lib/format";

export const Route = createFileRoute("/asistencia")({ component: AsistenciaRoute });

interface Empleado { id: string; nombre: string; rut: string; turno: string }
interface Registro {
  id?: string;
  empleado_id: string;
  fecha: string;
  hora_entrada: string;
  hora_salida: string | null;
  atraso_min: number;
  empleados?: { nombre: string; rut: string };
}

function AsistenciaRoute() { return <AppLayout><Asistencia /></AppLayout>; }

function Asistencia() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [form, setForm] = useState({ empleado_id: "", fecha: new Date().toISOString().slice(0, 10), hora_entrada: "09:00", hora_salida: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [{ data: emps }, { data: regs }] = await Promise.all([
      supabase.from("empleados").select("id, nombre, rut, turno").order("nombre"),
      supabase.from("asistencia").select("*, empleados(nombre, rut)").order("fecha", { ascending: false }).limit(100),
    ]);
    setEmpleados((emps as Empleado[]) ?? []);
    setRegistros((regs as Registro[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const register = async () => {
    setMsg(null);
    const emp = empleados.find(e => e.id === form.empleado_id);
    if (!emp) { setMsg("Selecciona un empleado"); return; }
    const atraso_min = minutesBetween(emp.turno, form.hora_entrada);
    const { error } = await supabase.from("asistencia").insert({
      empleado_id: emp.id, fecha: form.fecha,
      hora_entrada: form.hora_entrada,
      hora_salida: form.hora_salida || null,
      atraso_min,
    });
    if (error) setMsg(error.message); else { setMsg("Registro creado"); load(); }
  };

  const importExcel = async (file: File) => {
    setMsg(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    let inserted = 0, skipped = 0;
    for (const r of rows) {
      const rut = String(r["RUT"] ?? r["Rut"] ?? "").trim();
      const entrada = String(r["Hora entrada"] ?? r["Hora Entrada"] ?? "").trim();
      const salida = String(r["Hora salida"] ?? r["Hora Salida"] ?? "").trim();
      const fecha = (r["Fecha"] ? String(r["Fecha"]).slice(0, 10) : new Date().toISOString().slice(0, 10));
      const emp = empleados.find(e => e.rut.replace(/\./g, "") === rut.replace(/\./g, ""));
      if (!emp || !entrada) { skipped++; continue; }
      const atraso = minutesBetween(emp.turno, entrada.length === 5 ? entrada : entrada.slice(0, 5));
      const { error } = await supabase.from("asistencia").insert({
        empleado_id: emp.id, fecha, hora_entrada: entrada, hora_salida: salida || null, atraso_min: atraso,
      });
      if (error) skipped++; else inserted++;
    }
    setMsg(`Importados: ${inserted}. Omitidos: ${skipped}.`);
    load();
  };

  return (
    <>
      <PageHeader title="Asistencia" description="Registro y control de marcas" action={
        <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary">
          <Upload className="h-4 w-4" /> Importar Geovictoria (.xlsx)
        </button>
      } />
      <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importExcel(f); e.target.value = ""; }} />

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <h3 className="text-sm font-semibold mb-4">Registrar marca manual</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <label className="text-xs">
            <span className="block mb-1 font-medium">Empleado</span>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.empleado_id} onChange={(e) => setForm({ ...form, empleado_id: e.target.value })}>
              <option value="">—</option>
              {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </label>
          <label className="text-xs"><span className="block mb-1 font-medium">Fecha</span><input type="date" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></label>
          <label className="text-xs"><span className="block mb-1 font-medium">Entrada</span><input type="time" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.hora_entrada} onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })} /></label>
          <label className="text-xs"><span className="block mb-1 font-medium">Salida</span><input type="time" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.hora_salida} onChange={(e) => setForm({ ...form, hora_salida: e.target.value })} /></label>
          <button onClick={register} className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Registrar
          </button>
        </div>
        {msg && <div className="mt-3 text-sm text-muted-foreground">{msg}</div>}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>{["Fecha", "Empleado", "RUT", "Entrada", "Salida", "Atraso"].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {registros.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin registros</td></tr>
            ) : registros.map(r => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">{r.fecha}</td>
                <td className="px-4 py-3 font-medium">{r.empleados?.nombre ?? "—"}</td>
                <td className="px-4 py-3">{r.empleados?.rut ?? "—"}</td>
                <td className="px-4 py-3">{r.hora_entrada}</td>
                <td className="px-4 py-3">{r.hora_salida ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${r.atraso_min > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {r.atraso_min > 0 ? `${r.atraso_min} min` : "Puntual"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
