import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  listVeiculos,
  statusVeiculoLabel,
  type StatusVeiculo,
  veiculoLabel,
} from "@/lib/frota";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Truck } from "lucide-react";

const search = z.object({ q: z.string().optional().default("") });

export const Route = createFileRoute("/_authenticated/busca")({
  head: () => ({ meta: [
    { title: "Busca de veículos | Gestão de Frota" },
    { name: "description", content: "Busque veículos da frota por marca, placa ou patrimônio." },
    { property: "og:title", content: "Busca de veículos | Gestão de Frota" },
    { property: "og:description", content: "Encontre os veículos cadastrados na frota." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  validateSearch: search,
  component: BuscaPage,
});

function BuscaPage() {
  const { q } = Route.useSearch();
  const term = q.trim().toLowerCase();

  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });
  const veicMatch = useMemo(() => {
    if (!term) return [];
    return (veiculos.data ?? []).filter(
      (v) =>
        (v.nome ?? "").toLowerCase().includes(term) ||
        (v.codigo ?? "").toLowerCase().includes(term) ||
        (v.placa ?? "").toLowerCase().includes(term) ||
        (v.marca_modelo ?? "").toLowerCase().includes(term),
    );
  }, [veiculos.data, term]);

  const total = veicMatch.length;

  return (motoristas.data ?? []).filter(
      (m) => m.nome.toLowerCase().includes(term) || (m.contato ?? "").toLowerCase().includes(term),
    );
  }, [motoristas.data, term]);

  const veiculoMap = useMemo(() => {
    const m = new Map<string, string>();
    (veiculos.data ?? []).forEach((v) => m.set(v.id, `${veiculoLabel(v)} (${v.placa})`));
    return m;
  }, [veiculos.data]);

  const manutMatch = useMemo(() => {
    if (!term) return [];
    return (manutencoes.data ?? []).filter(
      (m) =>
        m.peca_servico.toLowerCase().includes(term) ||
        (m.oficina ?? "").toLowerCase().includes(term) ||
        (m.observacoes ?? "").toLowerCase().includes(term) ||
        (veiculoMap.get(m.veiculo_id) ?? "").toLowerCase().includes(term),
    );
  }, [manutencoes.data, term, veiculoMap]);

  const total = veicMatch.length + motMatch.length + manutMatch.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Search className="h-6 w-6" /> Busca
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {term ? <>Resultados para <span className="font-semibold text-foreground">"{q}"</span> — {total} encontrado(s)</> : "Digite algo na busca do topo"}
        </p>
      </div>

      {term && total === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nada encontrado.</CardContent></Card>
      )}

      {veicMatch.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Veículos ({veicMatch.length})</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {veicMatch.map((v) => (
              <Link key={v.id} to="/veiculos" className="flex items-center justify-between py-2.5 hover:bg-muted/50 rounded-md px-2 -mx-2">
                <div className="min-w-0">
                  <div className="font-medium truncate">{veiculoLabel(v)} <span className="font-mono text-xs text-muted-foreground">{v.placa}</span></div>
                  <div className="text-xs text-muted-foreground truncate">{v.marca_modelo ?? "—"}</div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{statusVeiculoLabel[(v.status ?? "ativo") as StatusVeiculo]}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
