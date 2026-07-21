import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  listVeiculos,
  listCustos,
  listDocumentos,
  formatBRL,
  formatData,
  statusVencimento,
  diasAteVencimento,
  statusVeiculoLabel,
  tipoDocLabel,
} from "@/lib/frota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Wallet, Gauge, AlertTriangle, Wrench, CheckCircle2, PowerOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/painel")({
  component: PainelPage,
});

function PainelPage() {
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

  const pendencias = (documentos.data ?? [])
    .map((d) => ({ ...d, _st: statusVencimento(d.vencimento), _d: diasAteVencimento(d.vencimento) }))
    .filter((d) => d._st !== "ok")
    .sort((a, b) => a._d - b._d);

  const veiculoNome = new Map<string, string>();
  lista.forEach((v) => veiculoNome.set(v.id, `${v.nome} (${v.placa})`));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da frota</p>
      </div>

      {/* Status da frota */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={String(totalVeiculos)} icon={Truck} />
        <StatCard label={statusVeiculoLabel.ativo} value={String(ativos)} icon={CheckCircle2} tone="success" />
        <StatCard label={statusVeiculoLabel.manutencao} value={String(emManutencao)} icon={Wrench} tone="warning" />
        <StatCard label={statusVeiculoLabel.desativado} value={String(desativados)} icon={PowerOff} tone="muted" />
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <StatCard label="Custo total do mês" value={formatBRL(custoMes)} icon={Wallet} />
        <StatCard label="Custo médio por KM" value={formatBRL(custoPorKm)} icon={Gauge} />
        <StatCard
          label="Pendências"
          value={String(pendencias.length)}
          icon={AlertTriangle}
          tone={pendencias.length > 0 ? "alert" : "muted"}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Pendências de vencimento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pendencias.length === 0 ? (
            <div className="px-6 pb-6 text-sm text-muted-foreground">
              Nenhuma pendência. Tudo em dia. ✅
            </div>
          ) : (
            <div className="divide-y">
              {pendencias.slice(0, 8).map((p) => (
                <Link
                  key={p.id}
                  to="/vencimentos"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full shrink-0",
                      p._st === "vencido" ? "bg-destructive" : "bg-warning",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {tipoDocLabel[p.tipo]} · {veiculoNome.get(p.veiculo_id) ?? "—"}
                    </div>
                    {p.observacao && (
                      <div className="text-xs text-muted-foreground truncate">{p.observacao}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">{formatData(p.vencimento)}</div>
                    <div
                      className={cn(
                        "text-xs",
                        p._st === "vencido" ? "text-destructive" : "text-warning-foreground",
                      )}
                    >
                      {p._st === "vencido" ? `${Math.abs(p._d)} dia(s) atrás` : `em ${p._d} dia(s)`}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
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
    tone === "alert"
      ? "text-destructive"
      : tone === "success"
        ? "text-success"
        : tone === "warning"
          ? "text-warning"
          : "text-muted-foreground";
  const valueClass = tone === "alert" ? "text-destructive" : "";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={cn("h-5 w-5", iconClass)} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl md:text-3xl font-bold tracking-tight", valueClass)}>{value}</div>
      </CardContent>
    </Card>
  );
}
