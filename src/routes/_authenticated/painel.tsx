import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  listVeiculos, statusVeiculoLabel, statusVeiculoTone, veiculoTitulo,
  SEM_DEPARTAMENTO, SEM_DEPARTAMENTO_LABEL, type Veiculo,
} from "@/lib/frota";
import { pendenciaLabel, temPendencia, type Pendencia } from "@/components/veiculos-listagem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Wrench, CheckCircle2, PowerOff, ImageOff, Hash, Building2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [
    { title: "Painel da frota | Gestão de Frota" },
    { name: "description", content: "Totais de veículos por situação, por secretaria e pendências do cadastro." },
    { property: "og:title", content: "Painel da frota | Gestão de Frota" },
    { property: "og:description", content: "Acompanhe a situação dos veículos da frota." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PainelPage,
});

function pct(n: number, t: number) {
  return t ? Math.round((n / t) * 1000) / 10 : 0;
}

function PainelPage() {
  const navigate = useNavigate();
  const { data: lista = [] } = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });

  const total = lista.length;
  const ativos = lista.filter((v) => v.status === "ativo").length;
  const manut = lista.filter((v) => v.status === "manutencao").length;
  const desat = lista.filter((v) => v.status === "desativado").length;

  const emUso = lista.filter((v) => v.status !== "desativado");
  const porDep = new Map<string, number>();
  emUso.forEach((v) => {
    const d = (v.departamento ?? "").trim() || SEM_DEPARTAMENTO;
    porDep.set(d, (porDep.get(d) ?? 0) + 1);
  });
  const barras = [...porDep.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  const maxBarra = Math.max(1, ...barras.map((b) => b[1]));

  const pendencias: { p: Pendencia; icon: typeof ImageOff }[] = [
    { p: "foto", icon: ImageOff }, { p: "placa", icon: Hash },
    { p: "departamento", icon: Building2 }, { p: "patrimonio", icon: Tag },
  ];
  const comFoto = emUso.length - emUso.filter((v) => temPendencia(v, "foto")).length;

  const recentes = [...lista].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  const irVeiculos = (search: { dep?: string; pendencia?: string; abrir?: string }) =>
    navigate({ to: "/veiculos", search: { dep: "", pendencia: "", abrir: "", ...search } });

  const trechos = [
    { label: statusVeiculoLabel.ativo, n: ativos, cls: "bg-success" },
    { label: statusVeiculoLabel.manutencao, n: manut, cls: "bg-warning" },
    { label: statusVeiculoLabel.desativado, n: desat, cls: "bg-muted-foreground/50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground mt-1">Visão geral da frota</p>
      </div>

      {/* 1. Totais */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de veículos" value={total} icon={Truck} />
        <StatCard label="Ativos" value={ativos} icon={CheckCircle2} tone="success" />
        <StatCard label="Em manutenção" value={manut} icon={Wrench} tone="warning" />
        <StatCard label="Desativados" value={desat} icon={PowerOff} />
      </div>

      {/* 2. Por secretaria */}
      <Card>
        <CardHeader><CardTitle className="text-base">Veículos por secretaria</CardTitle>
          <p className="text-xs text-muted-foreground">Ativos e em manutenção. Clique numa barra para ver os veículos.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {barras.length === 0 && <p className="text-sm text-muted-foreground">Nenhum veículo em uso.</p>}
          {barras.map(([dep, n]) => {
            const sem = dep === SEM_DEPARTAMENTO;
            return (
              <button key={dep} type="button" onClick={() => irVeiculos({ dep })}
                className="group block w-full text-left rounded-md p-1 hover:bg-accent transition-colors">
                <div className="text-sm mb-1 truncate" title={sem ? SEM_DEPARTAMENTO_LABEL : dep}>
                  {sem ? SEM_DEPARTAMENTO_LABEL : dep}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                    <div className={cn("h-full rounded", sem ? "bg-warning" : "bg-primary")}
                      style={{ width: `${(n / maxBarra) * 100}%` }} />
                  </div>
                  <span className="w-10 text-right text-sm font-semibold tabular-nums">{n}</span>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* 3. Situação */}
      <Card>
        <CardHeader><CardTitle className="text-base">Situação da frota</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex h-6 w-full overflow-hidden rounded bg-muted">
            {trechos.map((t) => t.n > 0 && (
              <div key={t.label} className={t.cls} style={{ width: `${pct(t.n, total)}%` }} title={`${t.label}: ${t.n}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {trechos.map((t) => (
              <span key={t.label} className="flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-sm", t.cls)} />
                {t.label}: <strong>{pct(t.n, total).toLocaleString("pt-BR")}%</strong>
                <span className="text-muted-foreground">({t.n})</span>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. Pendências */}
      <Card>
        <CardHeader><CardTitle className="text-base">Pendências do cadastro</CardTitle>
          <p className="text-xs text-muted-foreground">Veículos ativos e em manutenção. Clique para ver a lista.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {pendencias.map(({ p, icon: Icon }) => (
              <button key={p} type="button" onClick={() => irVeiculos({ pendencia: p })}
                className="rounded-lg border bg-card p-4 text-left hover:bg-accent transition-colors">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  {pendenciaLabel[p]} <Icon className="h-4 w-4" />
                </div>
                <div className="mt-1 text-2xl font-bold tabular-nums">{emUso.filter((v) => temPendencia(v, p)).length}</div>
              </button>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Veículos com foto</span>
              <span className="font-medium">{comFoto} de {emUso.length}</span>
            </div>
            <div className="h-3 w-full rounded bg-muted overflow-hidden">
              <div className="h-full bg-success" style={{ width: `${pct(comFoto, emUso.length)}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Últimos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Últimos veículos cadastrados</CardTitle></CardHeader>
        <CardContent className="divide-y p-0">
          {recentes.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum veículo cadastrado.</p>}
          {recentes.map((v: Veiculo) => (
            <button key={v.id} type="button" onClick={() => irVeiculos({ abrir: v.id })}
              className="flex w-full flex-col gap-1 px-6 py-3 text-left hover:bg-accent transition-colors md:flex-row md:items-center md:gap-4">
              <span className="font-medium md:flex-1 truncate">{veiculoTitulo(v)}</span>
              <span className="text-sm text-muted-foreground md:w-24">{v.placa?.trim() || "Sem placa"}</span>
              <span className="text-sm text-muted-foreground md:w-64 truncate">{v.departamento?.trim() || SEM_DEPARTAMENTO_LABEL}</span>
              <span className={cn("w-fit rounded-full border px-2 py-0.5 text-xs", statusVeiculoTone[v.status])}>{statusVeiculoLabel[v.status]}</span>
              <span className="text-sm text-muted-foreground md:w-24 md:text-right">{new Date(v.created_at).toLocaleDateString("pt-BR")}</span>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone = "default" }: {
  label: string; value: number; icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "warning";
}) {
  const iconClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-muted-foreground";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={cn("h-5 w-5", iconClass)} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
