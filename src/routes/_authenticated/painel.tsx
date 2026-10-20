import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listVeiculos, statusVeiculoLabel } from "@/lib/frota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Wrench, CheckCircle2, PowerOff } from "lucide-react";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [
    { title: "Painel da frota | Gestão de Frota" },
    { name: "description", content: "Totais de veículos por situação: ativos, em manutenção e desativados." },
    { property: "og:title", content: "Painel da frota | Gestão de Frota" },
    { property: "og:description", content: "Acompanhe a situação dos veículos da frota." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PainelPage,
});

function PainelPage() {
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });

  const lista = veiculos.data ?? [];
  const totalVeiculos = lista.length;
  const ativos = lista.filter((v) => v.status === "ativo").length;
  const emManutencao = lista.filter((v) => v.status === "manutencao").length;
  const desativados = lista.filter((v) => v.status === "desativado").length;

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
