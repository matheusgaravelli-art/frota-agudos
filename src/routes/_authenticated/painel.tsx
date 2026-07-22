import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  listVeiculos,
  listCustos,
  listDocumentos,
  formatBRL,
  statusVeiculoLabel,
} from "@/lib/frota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Wallet, Gauge, Wrench, CheckCircle2, PowerOff, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { VencimentosCalendar } from "@/components/vencimentos-calendar";

export const Route = createFileRoute("/_authenticated/painel")({
  component: PainelPage,
});

function PainelPage() {
  const navigate = useNavigate();
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });
  const custos = useQuery({ queryKey: ["custos"], queryFn: listCustos });
  const documentos = useQuery({ queryKey: ["documentos"], queryFn: listDocumentos });

  const lista = veiculos.data ?? [];
  const totalVeiculos = lista.length;
  const ativos = lista.filter((v) => v.status === "ativo").length;
  const emManutencao = lista.filter((v) => v.status === "manutencao").length;
  const desativados = lista.filter((v) => v.status === "desativado").length;

  const now = new Date();
  const custoMes = (custos.data ?? [])
    .filter((c) => {
      const [y, m] = c.data.split("-").map(Number);
      return y === now.getFullYear() && m - 1 === now.getMonth();
    })
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const totalKm = lista.reduce((acc, v) => acc + (v.km_atual || 0), 0);
  const totalCustoTudo = (custos.data ?? []).reduce((acc, c) => acc + Number(c.valor), 0);
  const custoPorKm = totalKm > 0 ? totalCustoTudo / totalKm : 0;

  const veiculoMap = useMemo(() => {
    const m = new Map<string, string>();
    lista.forEach((v) => m.set(v.id, `${v.nome} (${v.placa})`));
    return m;
  }, [lista]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da frota</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={String(totalVeiculos)} icon={Truck} />
        <StatCard label={statusVeiculoLabel.ativo} value={String(ativos)} icon={CheckCircle2} tone="success" />
        <StatCard label={statusVeiculoLabel.manutencao} value={String(emManutencao)} icon={Wrench} tone="warning" />
        <StatCard label={statusVeiculoLabel.desativado} value={String(desativados)} icon={PowerOff} tone="muted" />
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <StatCard label="Custo total do mês" value={formatBRL(custoMes)} icon={Wallet} />
        <StatCard label="Custo médio por KM" value={formatBRL(custoPorKm)} icon={Gauge} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            Agenda de vencimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VencimentosCalendar
            documentos={documentos.data ?? []}
            veiculoMap={veiculoMap}
            onSelect={() => navigate({ to: "/vencimentos" })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "alert" | "success" | "warning" | "muted";
}) {
  const iconClass =
    tone === "alert" ? "text-destructive"
    : tone === "success" ? "text-success"
    : tone === "warning" ? "text-warning"
    : "text-muted-foreground";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={cn("h-5 w-5", iconClass)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl md:text-3xl font-bold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}
