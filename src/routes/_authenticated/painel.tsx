import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listVeiculos, listCustos, listDocumentos, formatBRL, statusVencimento } from "@/lib/frota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Wallet, Gauge, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/painel")({
  component: PainelPage,
});

function PainelPage() {
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });
  const custos = useQuery({ queryKey: ["custos"], queryFn: listCustos });
  const documentos = useQuery({ queryKey: ["documentos"], queryFn: listDocumentos });

  const totalVeiculos = veiculos.data?.length ?? 0;

  const now = new Date();
  const mesAtual = now.getMonth();
  const anoAtual = now.getFullYear();

  const custoMes = (custos.data ?? [])
    .filter((c) => {
      const [y, m] = c.data.split("-").map(Number);
      return y === anoAtual && m - 1 === mesAtual;
    })
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const totalKm = (veiculos.data ?? []).reduce((acc, v) => acc + (v.km_atual || 0), 0);
  const totalCustoTudo = (custos.data ?? []).reduce((acc, c) => acc + Number(c.valor), 0);
  const custoPorKm = totalKm > 0 ? totalCustoTudo / totalKm : 0;

  const veiculosComPendencia = new Set(
    (documentos.data ?? [])
      .filter((d) => statusVencimento(d.vencimento) !== "ok")
      .map((d) => d.veiculo_id),
  ).size;

  const cards = [
    {
      label: "Veículos cadastrados",
      value: String(totalVeiculos),
      icon: Truck,
      tone: "default" as const,
    },
    {
      label: "Custo total do mês",
      value: formatBRL(custoMes),
      icon: Wallet,
      tone: "default" as const,
    },
    {
      label: "Custo médio por KM",
      value: formatBRL(custoPorKm),
      icon: Gauge,
      tone: "default" as const,
    },
    {
      label: "Veículos com pendência",
      value: String(veiculosComPendencia),
      icon: AlertTriangle,
      tone: veiculosComPendencia > 0 ? ("alert" as const) : ("default" as const),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da frota</p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
                <Icon
                  className={
                    c.tone === "alert"
                      ? "h-5 w-5 text-destructive"
                      : "h-5 w-5 text-muted-foreground"
                  }
                />
              </CardHeader>
              <CardContent>
                <div
                  className={
                    "text-3xl font-bold tracking-tight " +
                    (c.tone === "alert" ? "text-destructive" : "")
                  }
                >
                  {c.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {veiculosComPendencia > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">
                {veiculosComPendencia}{" "}
                {veiculosComPendencia === 1 ? "veículo tem" : "veículos têm"} documentos
                próximos do vencimento ou vencidos.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Confira em Vencimentos para regularizar.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
