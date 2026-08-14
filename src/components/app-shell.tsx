import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Truck,
  Wallet,
  CalendarClock,
  Users,
  Wrench,
  Bell,
  FileText,
  Menu,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const nav = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/avisos", label: "Avisos", icon: Bell },
  { to: "/veiculos", label: "Veículos", icon: Truck },
  { to: "/motoristas", label: "Motoristas", icon: Users },
  { to: "/custos", label: "Custos", icon: Wallet },
  { to: "/manutencoes", label: "Manutenções", icon: Wrench },
  { to: "/vencimentos", label: "Vencimentos", icon: CalendarClock },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [compacta, setCompacta] = useState(false);
  const [q, setQ] = useState("");

  const submitBusca = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate({ to: "/busca", search: { q: term } });
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside
        className={cn(
          "hidden md:flex shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-screen transition-[width] duration-200",
          compacta ? "md:w-16" : "md:w-60 lg:w-64",
        )}
      >
        <SidebarInner
          pathname={pathname}
          onNavigate={() => {}}
          compacta={compacta}
          onToggleCompacta={() => setCompacta((c) => !c)}
        />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar text-sidebar-foreground flex flex-col">
            <SidebarInner pathname={pathname} onNavigate={() => setMobileOpen(false)} compacta={false} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center px-3 gap-2 sticky top-0 z-30">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <form onSubmit={submitBusca} className="flex-1 max-w-xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar veículo, motorista ou manutenção..."
              className="pl-9 h-10"
              aria-label="Busca global"
            />
          </form>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarInner({
  pathname,
  onNavigate,
  compacta,
  onToggleCompacta,
}: {
  pathname: string;
  onNavigate: () => void;
  compacta: boolean;
  onToggleCompacta?: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "h-16 flex items-center border-b border-sidebar-border",
          compacta ? "px-2 justify-center" : "px-5 justify-between gap-2",
        )}
      >
        {!compacta && (
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-base font-semibold truncate">Gestão de Frota</span>
            <span className="text-xs text-sidebar-foreground/60">Controle diário</span>
          </div>
        )}
        {onToggleCompacta && (
          <button
            type="button"
            onClick={onToggleCompacta}
            aria-label={compacta ? "Expandir menu" : "Recolher menu"}
            title={compacta ? "Expandir menu" : "Recolher menu"}
            className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {compacta ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>
      <nav className={cn("flex-1 space-y-1 overflow-y-auto", compacta ? "p-2" : "p-3")}>
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              title={item.label}
              className={cn(
                "flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
                compacta ? "justify-center px-0 py-3" : "px-3 py-2.5",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!compacta && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
