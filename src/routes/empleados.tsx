import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/AppLayout";
import { supabase } from "@/lib/supabase";
import { formatCLP } from "@/lib/format";

export const Route = createFileRoute("/empleados")({ component: EmpleadosRoute });

interface Empleado {
  id?: string;
  nombre: string;
  rut: string;
  area: string;
  cargo: string;
  turno: string; // HH:MM
  horas_extras_autorizadas: number;
  sueldo_base: number;
  correo: string;
  estado: "Activo" | "Inactivo";
}

const empty: Empleado = {
  nombre: "", rut: "", area: "", cargo: "", turno: "09:00",
  horas_extras_autorizadas: 0, sueldo_base: 0, correo: "", estado: "Activo",
};

function EmpleadosRoute() {
  return <AppLayout><Empleados /></AppLayout>;
}

function Empleados() {
  const [list, setList] = useState<Empleado[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Empleado>(empty);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("empleados").select("*").order("nombre");
    if (error) setError(error.message);
    setList((data as Empleado[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError(null);
    const payload = { ...editing,
      horas_extras_autorizadas: Number(editing.horas_extras_autorizadas) || 0,
      sueldo_base: Number(editing.sueldo_base) || 0,
    };
    const { error } = editing.id
      ? await supabase.from("empleados").update(payload).eq("id", editing.id)
      : await supabase.from("empleados").insert(payload);
    if (error) { setError(error.message); return; }
    setOpen(false); setEditing(empty); load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar empleado?")) return;
    const { error } = await supabase.from("empleados").delete().eq("id", id);
    if (error) alert(error.message);
    load();
  };

  return (
    <>
      <PageHeader
        title="Empleados"
        description="Gestiona la dotación de tu empresa"
        action={
          <button onClick={() => { setEditing(empty); setOpen(true); }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> Nuevo empleado
          </button>
        }
      />

      {error && <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-secondary-foreground">
            <tr>
              {["Nombre", "RUT", "Área", "Cargo", "Turno", "Sueldo", "Estado", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Cargando…</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Sin empleados aún</td></tr>
            ) : list.map(e => (
              <tr key={e.id} className="border-t border-border hover:bg-secondary/40">
                <td className="px-4 py-3 font-medium">{e.nombre}</td>
                <td className="px-4 py-3">{e.rut}</td>
                <td className="px-4 py-3">{e.area}</td>
                <td className="px-4 py-3">{e.cargo}</td>
                <td className="px-4 py-3">{e.turno}</td>
                <td className="px-4 py-3">{formatCLP(e.sueldo_base)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${e.estado === "Activo" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{e.estado}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setEditing(e); setOpen(true); }} className="p-1.5 rounded hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(e.id!)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl rounded-xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editing.id ? "Editar empleado" : "Nuevo empleado"}</h2>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nombre completo"><input className={inputCls} value={editing.nombre} onChange={(e) => setEditing({ ...editing, nombre: e.target.value })} /></Field>
              <Field label="RUT"><input className={inputCls} value={editing.rut} onChange={(e) => setEditing({ ...editing, rut: e.target.value })} placeholder="12.345.678-9" /></Field>
              <Field label="Área"><input className={inputCls} value={editing.area} onChange={(e) => setEditing({ ...editing, area: e.target.value })} /></Field>
              <Field label="Cargo"><input className={inputCls} value={editing.cargo} onChange={(e) => setEditing({ ...editing, cargo: e.target.value })} /></Field>
              <Field label="Turno (entrada)"><input type="time" className={inputCls} value={editing.turno} onChange={(e) => setEditing({ ...editing, turno: e.target.value })} /></Field>
              <Field label="Horas extras autorizadas"><input type="number" min={0} className={inputCls} value={editing.horas_extras_autorizadas} onChange={(e) => setEditing({ ...editing, horas_extras_autorizadas: Number(e.target.value) })} /></Field>
              <Field label="Sueldo base (CLP)"><input type="number" min={0} className={inputCls} value={editing.sueldo_base} onChange={(e) => setEditing({ ...editing, sueldo_base: Number(e.target.value) })} placeholder="550000" /></Field>
              <Field label="Correo"><input type="email" className={inputCls} value={editing.correo} onChange={(e) => setEditing({ ...editing, correo: e.target.value })} /></Field>
              <Field label="Estado">
                <select className={inputCls} value={editing.estado} onChange={(e) => setEditing({ ...editing, estado: e.target.value as any })}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">Cancelar</button>
              <button onClick={save} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
