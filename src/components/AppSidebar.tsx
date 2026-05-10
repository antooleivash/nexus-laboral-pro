import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Clock,
  FileWarning,
  TrendingUp,
  Wallet,
  CalendarDays,
  Brain,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/empleados", label: "Empleados", icon: Users },
  { to: "/asistencia", label: "Asistencia", icon: Clock },
  { to: "/cartas", label: "Cartas amonestación", icon: FileWarning },
  { to: "/horas-extras", label: "Horas extras", icon: TrendingUp },
  { to: "/liquidaciones", label: "Liquidaciones", icon: Wallet },
  { to: "/vacaciones", label: "Vacaciones", icon: CalendarDays },
  { to: "/inteligencia", label: "Inteligencia Laboral", icon: Brain },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, role, signOut } = useAuth();

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="text-lg font-bold tracking-tight">Nexus Laboral</div>
        <div className="text-xs text-sidebar-foreground/60">Gestión RRHH</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((it) => {
          const active = path === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4 space-y-2">
        <div className="text-xs">
          <div className="font-medium truncate">{user?.email}</div>
          <div className="text-sidebar-foreground/60 capitalize">{role ?? "—"}</div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
