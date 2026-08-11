import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listDocumentos,
  listVeiculos,
  formatData,
  statusVencimento,
  diasAteVencimento,
  tipoDocLabel,
  type TipoDocumento,
  veiculoLabel,
} from "@/lib/frota";
import { Card, CardContent } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/avisos")({
  component: AvisosPage,
});

const STATUS = {
  vencido: { dot: "bg-destructive", label: "Vencido", badge: "bg-destructive/10 text-destructive border-destructive/30" },
  proximo: { dot: "bg-warning", label: "Atenção", badge: "bg-warning/15 text-warning-foreground border-warning/40" },
  ok: { dot: "bg-success", label: "OK", badge: "bg-success/10 text-success border-success/30" },
} as const;

function AvisosPage() {
  const documentos = useQuery({ queryKey: ["documentos"], queryFn: listDocumentos });
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });

  const veiculoMap = useMemo(() => {
    const m = new Map<string, string>();
    (veiculos.data ?? []).forEach((v) => m.set(v.id, `${veiculoLabel(v)} (${v.placa})`));
    return m;
  }, [veiculos.data]);

  const items = useMemo(() => {
    return (documentos.data ?? [])
      .map((d) => ({ ...d, _st: statusVencimento(d.vencimento), _dias: diasAteVencimento(d.vencimento) }))
      .sort((a, b) => a._dias - b._dias);
  }, [documentos.data]);

  const vencidos = items.filter((i) => i._st === "vencido");
  const atencao = items.filter((i) => i._st === "proximo");
  const ok = items.filter((i) => i._st === "ok");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6" /> Avisos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Próximas ações necessárias, ordenadas por urgência
        </p>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <Resumo label="Vencidos" total={vencidos.length} tone="alert" />
        <Resumo label="Atenção" total={atencao.length} tone="warning" />
        <Resumo label="Em dia" total={ok.length} tone="success" />
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum vencimento cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {items.map((i) => {
            const s = STATUS[i._st];
            return (
              <Link key={i.id} to="/vencimentos">
                <Card className="hover:bg-muted/50 transition-colors">
                  <CardContent className="py-4 flex items-center gap-3">
                    <span className={cn("h-3 w-3 rounded-full shrink-0", s.dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {tipoDocLabel[i.tipo as TipoDocumento] ?? i.tipo}
                        </span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", s.badge)}>
                          {s.label}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5 truncate">
                        {veiculoMap.get(i.veiculo_id) ?? "—"}
                        {i.observacao ? ` · ${i.observacao}` : ""}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold tabular-nums">{formatData(i.vencimento)}</div>
                      <div className={cn(
                        "text-xs",
                        i._st === "vencido" ? "text-destructive" : i._st === "proximo" ? "text-warning-foreground" : "text-muted-foreground",
                      )}>
                        {i._st === "vencido"
                          ? `${Math.abs(i._dias)} dia(s) atrás`
                          : `em ${i._dias} dia(s)`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Resumo({ label, total, tone }: { label: string; total: number; tone: "alert" | "warning" | "success" }) {
  const cls =
    tone === "alert" ? "text-destructive"
    : tone === "warning" ? "text-warning"
    : "text-success";
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className={cn("text-2xl md:text-3xl font-bold mt-1", cls)}>{total}</div>
      </CardContent>
    </Card>
  );
}
