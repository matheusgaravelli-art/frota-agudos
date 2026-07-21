import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listManutencoes,
  listVeiculos,
  formatBRL,
  formatData,
  type Manutencao,
} from "@/lib/frota";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/manutencoes")({
  component: ManutencoesPage,
});

function ManutencoesPage() {
  const qc = useQueryClient();
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });
  const manutencoes = useQuery({ queryKey: ["manutencoes"], queryFn: listManutencoes });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Manutencao | null>(null);
  const [filtroVeiculo, setFiltroVeiculo] = useState<string>("todos");
  const [lancarCusto, setLancarCusto] = useState(true);

  const veiculoMap = useMemo(() => {
    const m = new Map<string, string>();
    (veiculos.data ?? []).forEach((v) => m.set(v.id, `${v.nome} (${v.placa})`));
    return m;
  }, [veiculos.data]);

  const lista = (manutencoes.data ?? []).filter((m) =>
    filtroVeiculo === "todos" ? true : m.veiculo_id === filtroVeiculo,
  );

  // Agrupar por veículo (cronológico dentro de cada grupo)
  const grupos = useMemo(() => {
    const g = new Map<string, Manutencao[]>();
    lista.forEach((m) => {
      const arr = g.get(m.veiculo_id) ?? [];
      arr.push(m);
      g.set(m.veiculo_id, arr);
    });
    return Array.from(g.entries());
  }, [lista]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manutencoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Manutenção removida");
      qc.invalidateQueries({ queryKey: ["manutencoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manutenções</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico por veículo</p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setEditing(null);
            setLancarCusto(true);
            setDialogOpen(true);
          }}
          disabled={(veiculos.data ?? []).length === 0}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Nova manutenção
        </Button>
      </div>

      {(veiculos.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Cadastre um veículo antes de registrar manutenções.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="max-w-xs">
            <Select value={filtroVeiculo} onValueChange={setFiltroVeiculo}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os veículos</SelectItem>
                {(veiculos.data ?? []).map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome} ({v.placa})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lista.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma manutenção registrada.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {grupos.map(([vid, items]) => (
                <div key={vid}>
                  <div className="text-sm font-semibold text-muted-foreground mb-2 px-1">
                    {veiculoMap.get(vid) ?? "—"}
                  </div>
                  <Card>
                    <CardContent className="p-0 divide-y">
                      {items.map((m) => (
                        <div key={m.id} className="p-4 flex flex-wrap items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-warning/15 flex items-center justify-center shrink-0">
                            <Wrench className="h-4 w-4 text-warning" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <span className="font-semibold">{m.peca_servico}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatData(m.data)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {m.oficina ? `Oficina: ${m.oficina}` : "Oficina não informada"}
                              {m.observacoes ? ` · ${m.observacoes}` : ""}
                            </div>
                          </div>
                          {m.valor != null && (
                            <div className="text-base font-bold tabular-nums">
                              {formatBRL(Number(m.valor))}
                            </div>
                          )}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditing(m);
                                setLancarCusto(false);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Excluir esta manutenção?"))
                                  deleteMut.mutate(m.id);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ManutencaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        veiculos={veiculos.data ?? []}
        lancarCustoDefault={lancarCusto}
      />
    </div>
  );
}

function ManutencaoDialog({
  open,
  onOpenChange,
  editing,
  veiculos,
  lancarCustoDefault,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Manutencao | null;
  veiculos: { id: string; nome: string; placa: string }[];
  lancarCustoDefault: boolean;
}) {
  const qc = useQueryClient();
  const [veiculoId, setVeiculoId] = useState<string>(editing?.veiculo_id ?? "");
  const [lancarCusto, setLancarCusto] = useState(lancarCustoDefault);

  const submit = useMutation({
    mutationFn: async (form: {
      veiculo_id: string;
      peca_servico: string;
      data: string;
      oficina: string | null;
      observacoes: string | null;
      valor: number | null;
      km: number | null;
    }) => {
      let custo_id: string | null = editing?.custo_id ?? null;

      // Se marcado, cria lançamento vinculado em Custos
      if (!editing && form.valor != null && lancarCusto) {
        const { data: c, error: e1 } = await supabase
          .from("custos")
          .insert({
            veiculo_id: form.veiculo_id,
            tipo: "manutencao",
            valor: form.valor,
            km: form.km,
            data: form.data,
            descricao: form.peca_servico,
          })
          .select("id")
          .single();
        if (e1) throw e1;
        custo_id = c.id;
      }

      const payload = {
        veiculo_id: form.veiculo_id,
        peca_servico: form.peca_servico,
        data: form.data,
        oficina: form.oficina,
        observacoes: form.observacoes,
        valor: form.valor,
        custo_id,
      };

      if (editing) {
        const { error } = await supabase
          .from("manutencoes")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("manutencoes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Manutenção atualizada" : "Manutenção registrada");
      qc.invalidateQueries({ queryKey: ["manutencoes"] });
      qc.invalidateQueries({ queryKey: ["custos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const valorStr = String(fd.get("valor") || "");
    const kmStr = String(fd.get("km") || "");
    submit.mutate({
      veiculo_id: veiculoId,
      peca_servico: String(fd.get("peca_servico") || "").trim(),
      data: String(fd.get("data")),
      oficina: String(fd.get("oficina") || "").trim() || null,
      observacoes: String(fd.get("observacoes") || "").trim() || null,
      valor: valorStr ? Number(valorStr) : null,
      km: kmStr ? Number(kmStr) : null,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setVeiculoId(editing?.veiculo_id ?? veiculos[0]?.id ?? "");
          setLancarCusto(lancarCustoDefault);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar manutenção" : "Nova manutenção"}</DialogTitle>
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
            <Label htmlFor="peca_servico">Peça / Serviço realizado</Label>
            <Input
              id="peca_servico"
              name="peca_servico"
              required
              placeholder="Ex.: Troca de óleo, pastilha de freio..."
              defaultValue={editing?.peca_servico ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                name="data"
                type="date"
                required
                defaultValue={editing?.data ?? new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Custo (R$) — opcional</Label>
              <Input
                id="valor"
                name="valor"
                type="number"
                step="0.01"
                min="0"
                defaultValue={editing?.valor ?? ""}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="oficina">Oficina responsável</Label>
            <Input id="oficina" name="oficina" defaultValue={editing?.oficina ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              defaultValue={editing?.observacoes ?? ""}
            />
          </div>
          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="km">KM do veículo (para custo vinculado)</Label>
              <Input id="km" name="km" type="number" min="0" />
              <label className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
                <input
                  type="checkbox"
                  checked={lancarCusto}
                  onChange={(e) => setLancarCusto(e.target.checked)}
                  className="h-4 w-4"
                />
                Lançar automaticamente em Custos (categoria Manutenção)
              </label>
            </div>
          )}
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
