import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listDocumentos,
  listVeiculos,
  listLembretes,
  formatData,
  statusVencimento,
  diasAteVencimento,
  tipoDocLabel,
  type TipoDocumento,
  veiculoLabel,
} from "@/lib/frota";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bell, BellPlus, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos e lembretes da frota" },
      {
        name: "description",
        content:
          "Vencimentos de documentos, seguros e revisões da frota mais lembretes personalizados, ordenados por urgência.",
      },
      { property: "og:title", content: "Avisos e lembretes da frota" },
      {
        property: "og:description",
        content: "Acompanhe vencimentos e crie lembretes personalizados com data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AvisosPage,
});

const STATUS = {
  vencido: { dot: "bg-destructive", label: "Vencido", badge: "bg-destructive/10 text-destructive border-destructive/30" },
  proximo: { dot: "bg-warning", label: "Atenção", badge: "bg-warning/15 text-warning-foreground border-warning/40" },
  ok: { dot: "bg-success", label: "OK", badge: "bg-success/10 text-success border-success/30" },
} as const;

function AvisosPage() {
  const qc = useQueryClient();
  const documentos = useQuery({ queryKey: ["documentos"], queryFn: listDocumentos });
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });
  const lembretes = useQuery({ queryKey: ["lembretes"], queryFn: listLembretes });

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

  const pendentes = useMemo(
    () =>
      (lembretes.data ?? [])
        .filter((l) => !l.concluido)
        .map((l) => ({ ...l, _st: statusVencimento(l.data), _dias: diasAteVencimento(l.data) }))
        .sort((a, b) => a._dias - b._dias),
    [lembretes.data],
  );

  const concluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lembretes").update({ concluido: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lembrete concluído");
      qc.invalidateQueries({ queryKey: ["lembretes"] });
    },
    onError: (e: Error) => toast.error(`Não foi possível concluir: ${e.message}`),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lembretes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lembrete excluído");
      qc.invalidateQueries({ queryKey: ["lembretes"] });
    },
    onError: (e: Error) => toast.error(`Não foi possível excluir: ${e.message}`),
  });

  const vencidos = items.filter((i) => i._st === "vencido");
  const atencao = items.filter((i) => i._st === "proximo");
  const ok = items.filter((i) => i._st === "ok");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6" /> Avisos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Próximas ações necessárias, ordenadas por urgência
          </p>
        </div>
        <NovoLembreteDialog />
      </div>

      <div className="grid gap-3 grid-cols-3">
        <Resumo label="Vencidos" total={vencidos.length} tone="alert" />
        <Resumo label="Atenção" total={atencao.length} tone="warning" />
        <Resumo label="Em dia" total={ok.length} tone="success" />
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Meus lembretes</h2>
        {pendentes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Nenhum lembrete criado. Use o botão "Novo lembrete" para adicionar.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {pendentes.map((l) => {
              const s = STATUS[l._st];
              return (
                <Card key={l.id}>
                  <CardContent className="py-4 flex items-center gap-3">
                    <span className={cn("h-3 w-3 rounded-full shrink-0", s.dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{l.titulo}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", s.badge)}>
                          {s.label}
                        </span>
                      </div>
                      {l.observacao && (
                        <div className="text-sm text-muted-foreground mt-0.5">{l.observacao}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold tabular-nums">{formatData(l.data)}</div>
                      <div className="text-xs text-muted-foreground">
                        {l._dias < 0 ? `${Math.abs(l._dias)} dia(s) atrás` : `em ${l._dias} dia(s)`}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Concluir lembrete"
                        onClick={() => concluir.mutate(l.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir lembrete"
                        onClick={() => excluir.mutate(l.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Vencimentos</h2>
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
      </section>
    </div>
  );
}

function NovoLembreteDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [observacao, setObservacao] = useState("");

  const criar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("lembretes")
        .insert({ titulo: titulo.trim(), data, observacao: observacao.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lembrete criado");
      qc.invalidateQueries({ queryKey: ["lembretes"] });
      setTitulo("");
      setData("");
      setObservacao("");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(`Não foi possível criar o lembrete: ${e.message}`),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11">
          <BellPlus className="h-4 w-4 mr-2" /> Novo lembrete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lembrete</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!titulo.trim()) {
              toast.error("Escreva o que precisa ser lembrado.");
              return;
            }
            if (!data) {
              toast.error("Informe a data do lembrete.");
              return;
            }
            criar.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="lembrete-titulo">Lembrete</Label>
            <Input
              id="lembrete-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Levar van da Saúde para lavagem"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lembrete-data">Data</Label>
            <Input
              id="lembrete-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lembrete-obs">Observação (opcional)</Label>
            <Textarea
              id="lembrete-obs"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Detalhes adicionais"
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={criar.isPending}>
            {criar.isPending ? "Salvando..." : "Salvar lembrete"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
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
