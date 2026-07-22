import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listDocumentos,
  listVeiculos,
  formatData,
  statusVencimento,
  diasAteVencimento,
  tipoDocLabel,
  type Documento,
  type TipoDocumento,
} from "@/lib/frota";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/vencimentos")({
  component: VencimentosPage,
});

const STATUS_STYLES = {
  vencido: {
    dot: "bg-destructive",
    label: "Vencido",
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    cal: "bg-destructive text-destructive-foreground",
  },
  proximo: {
    dot: "bg-warning",
    label: "Atenção",
    badge: "bg-warning/15 text-warning-foreground border-warning/40",
    cal: "bg-warning text-warning-foreground",
  },
  ok: {
    dot: "bg-success",
    label: "OK",
    badge: "bg-success/10 text-success border-success/30",
    cal: "bg-success text-success-foreground",
  },
} as const;

function VencimentosPage() {
  const qc = useQueryClient();
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });
  const documentos = useQuery({ queryKey: ["documentos"], queryFn: listDocumentos });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Documento | null>(null);

  const veiculoMap = useMemo(() => {
    const m = new Map<string, string>();
    (veiculos.data ?? []).forEach((v) => m.set(v.id, `${v.nome} (${v.placa})`));
    return m;
  }, [veiculos.data]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vencimento removido");
      qc.invalidateQueries({ queryKey: ["documentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (d: Documento) => {
    setEditing(d);
    setDialogOpen(true);
  };

  const lista = documentos.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Vencimentos</h1>
          <p className="text-sm text-muted-foreground mt-1">Documento, seguro e revisão</p>
        </div>
        <Button
          size="lg"
          onClick={openNew}
          disabled={(veiculos.data ?? []).length === 0}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Novo vencimento
        </Button>
      </div>

      {(veiculos.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Cadastre um veículo antes de registrar vencimentos.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="lista">
          <TabsList>
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
          <TabsContent value="lista" className="mt-4">
            {lista.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum vencimento registrado.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {lista.map((d) => {
                  const status = statusVencimento(d.vencimento);
                  const dias = diasAteVencimento(d.vencimento);
                  const styles = STATUS_STYLES[status];
                  return (
                    <Card key={d.id}>
                      <CardContent className="pt-5 pb-5 flex flex-wrap items-center gap-4">
                        <div className={cn("h-3 w-3 rounded-full shrink-0", styles.dot)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">
                              {tipoDocLabel[d.tipo as TipoDocumento] ?? d.tipo}
                            </span>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full border font-medium",
                                styles.badge,
                              )}
                            >
                              {styles.label}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {veiculoMap.get(d.veiculo_id) ?? "—"}
                            {d.observacao ? ` · ${d.observacao}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold tabular-nums">
                            {formatData(d.vencimento)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {status === "vencido"
                              ? `${Math.abs(dias)} dia(s) atrás`
                              : status === "proximo"
                                ? `em ${dias} dia(s)`
                                : `em ${dias} dias`}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Excluir este vencimento?")) deleteMut.mutate(d.id);
                            }}
                            className="text-destructive hover:text-destructive"
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
          </TabsContent>
          <TabsContent value="agenda" className="mt-4">
            <CalendarView
              documentos={lista}
              veiculoMap={veiculoMap}
              onEdit={openEdit}
            />
          </TabsContent>
        </Tabs>
      )}

      <VencimentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        veiculos={veiculos.data ?? []}
      />
    </div>
  );
}

function CalendarView({
  documentos,
  veiculoMap,
  onEdit,
}: {
  documentos: Documento[];
  veiculoMap: Map<string, string>;
  onEdit: (d: Documento) => void;
}) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());

  const porDia = useMemo(() => {
    const map = new Map<string, Documento[]>();
    documentos.forEach((d) => {
      const arr = map.get(d.vencimento) ?? [];
      arr.push(d);
      map.set(d.vencimento, arr);
    });
    return map;
  }, [documentos]);

  const primeiroDia = new Date(ano, mes, 1);
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const offset = primeiroDia.getDay(); // 0 = domingo

  const cells: Array<{ dateISO: string; dia: number } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= totalDias; d++) {
    const iso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ dateISO: iso, dia: d });
  }

  const nomeMes = new Date(ano, mes, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const goPrev = () => {
    if (mes === 0) {
      setMes(11);
      setAno(ano - 1);
    } else setMes(mes - 1);
  };
  const goNext = () => {
    if (mes === 11) {
      setMes(0);
      setAno(ano + 1);
    } else setMes(mes + 1);
  };

  const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={goPrev} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold capitalize">{nomeMes}</div>
          <Button variant="outline" size="icon" onClick={goNext} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground font-medium">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c) return <div key={i} />;
            const items = porDia.get(c.dateISO) ?? [];
            const isHoje = c.dateISO === hojeISO;
            return (
              <div
                key={i}
                className={cn(
                  "min-h-[68px] rounded-md border p-1 text-xs flex flex-col gap-0.5",
                  isHoje ? "border-primary" : "border-border",
                )}
              >
                <div
                  className={cn(
                    "text-[11px] font-semibold px-1",
                    isHoje ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {c.dia}
                </div>
                {items.slice(0, 2).map((d) => {
                  const st = statusVencimento(d.vencimento);
                  return (
                    <button
                      key={d.id}
                      onClick={() => onEdit(d)}
                      className={cn(
                        "text-[10px] leading-tight rounded px-1 py-0.5 truncate text-left",
                        STATUS_STYLES[st].cal,
                      )}
                      title={`${tipoDocLabel[d.tipo as TipoDocumento] ?? d.tipo} · ${veiculoMap.get(d.veiculo_id) ?? ""}`}
                    >
                      {tipoDocLabel[d.tipo as TipoDocumento] ?? d.tipo}
                    </button>
                  );
                })}
                {items.length > 2 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{items.length - 2}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> OK
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-warning" /> Atenção (≤ 30 dias)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Vencido
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function VencimentoDialog({
  open,
  onOpenChange,
  editing,
  veiculos,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Documento | null;
  veiculos: { id: string; nome: string; placa: string }[];
}) {
  const qc = useQueryClient();
  const initialTipo: TipoDocumento =
    editing?.tipo === "seguro" || editing?.tipo === "revisao" ? editing.tipo : "documento";
  const [tipo, setTipo] = useState<TipoDocumento>(initialTipo);
  const [veiculoId, setVeiculoId] = useState<string>(editing?.veiculo_id ?? "");

  const submit = useMutation({
    mutationFn: async (form: {
      veiculo_id: string;
      tipo: TipoDocumento;
      vencimento: string;
      observacao: string;
    }) => {
      if (editing) {
        const { error } = await supabase
          .from("documentos")
          .update(form)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("documentos").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Vencimento atualizado" : "Vencimento registrado");
      qc.invalidateQueries({ queryKey: ["documentos"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast.error("Não foi possível salvar o vencimento", { description: e.message }),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const vencimento = String(fd.get("vencimento") || "");
    if (!veiculoId) {
      toast.error("Selecione o veículo antes de salvar.");
      return;
    }
    if (!vencimento) {
      toast.error("Informe a data de vencimento.");
      return;
    }
    submit.mutate({
      veiculo_id: veiculoId,
      tipo,
      vencimento,
      observacao: String(fd.get("observacao") || "").trim(),
    });
  };


  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setTipo(initialTipo);
          setVeiculoId(editing?.veiculo_id ?? veiculos[0]?.id ?? "");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar vencimento" : "Novo vencimento"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id ?? "new"}>
          <div className="space-y-2">
            <Label>Veículo</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {veiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome} ({v.placa})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDocumento)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="documento">Documento</SelectItem>
                <SelectItem value="seguro">Seguro</SelectItem>
                <SelectItem value="revisao">Revisão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="vencimento">Data de vencimento</Label>
            <Input
              id="vencimento"
              name="vencimento"
              type="date"
              required
              defaultValue={editing?.vencimento ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (ex.: CRLV, ANTT, IPVA)</Label>
            <Input
              id="observacao"
              name="observacao"
              placeholder="Detalhe o documento aqui"
              defaultValue={editing?.observacao ?? ""}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submit.isPending || !veiculoId}>
              {submit.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
