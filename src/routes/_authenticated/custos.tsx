import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listCustos,
  listVeiculos,
  formatBRL,
  formatData,
  tipoCustoLabel,
  type TipoCusto,
  veiculoLabel,
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/custos")({
  component: CustosPage,
});

function CustosPage() {
  const qc = useQueryClient();
  const veiculos = useQuery({ queryKey: ["veiculos"], queryFn: listVeiculos });
  const custos = useQuery({ queryKey: ["custos"], queryFn: listCustos });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtroVeiculo, setFiltroVeiculo] = useState<string>("todos");

  const veiculoMap = useMemo(() => {
    const m = new Map<string, string>();
    (veiculos.data ?? []).forEach((v) => m.set(v.id, `${veiculoLabel(v)} (${v.placa})`));
    return m;
  }, [veiculos.data]);

  const lista = (custos.data ?? []).filter((c) =>
    filtroVeiculo === "todos" ? true : c.veiculo_id === filtroVeiculo,
  );

  const now = new Date();
  const totalMes = lista
    .filter((c) => {
      const [y, m] = c.data.split("-").map(Number);
      return y === now.getFullYear() && m - 1 === now.getMonth();
    })
    .reduce((acc, c) => acc + Number(c.valor), 0);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Custo removido");
      qc.invalidateQueries({ queryKey: ["custos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Custos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total do mês: <span className="font-semibold text-foreground">{formatBRL(totalMes)}</span>
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setDialogOpen(true)}
          disabled={(veiculos.data ?? []).length === 0}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Novo custo
        </Button>
      </div>

      {(veiculos.data ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Cadastre um veículo antes de lançar custos.
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
                    {veiculoLabel(v)} ({v.placa})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {lista.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum custo lançado.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 divide-y">
                {lista.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 flex flex-wrap items-center gap-3 justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {tipoCustoLabel[c.tipo as TipoCusto] ?? c.tipo}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatData(c.data)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {veiculoMap.get(c.veiculo_id) ?? "—"}
                        {c.descricao ? ` · ${c.descricao}` : ""}
                        {c.km ? ` · ${c.km.toLocaleString("pt-BR")} km` : ""}
                      </div>
                    </div>
                    <div className="text-lg font-bold tabular-nums">
                      {formatBRL(Number(c.valor))}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Excluir este custo?")) deleteMut.mutate(c.id);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <CustoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        veiculos={veiculos.data ?? []}
      />
    </div>
  );
}

function CustoDialog({
  open,
  onOpenChange,
  veiculos,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  veiculos: { id: string; nome: string | null; codigo?: string | null; placa: string }[];
}) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<TipoCusto>("combustivel");
  const [veiculoId, setVeiculoId] = useState<string>("");

  const submit = useMutation({
    mutationFn: async (form: {
      veiculo_id: string;
      tipo: TipoCusto;
      valor: number;
      km: number;
      data: string;
      descricao: string;
    }) => {
      const { error } = await supabase.from("custos").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Custo lançado");
      qc.invalidateQueries({ queryKey: ["custos"] });
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast.error("Não foi possível salvar o custo", { description: e.message }),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const valor = Number(fd.get("valor"));
    const km = Number(fd.get("km"));
    const data = String(fd.get("data") || "");
    const descricao = String(fd.get("descricao") || "").trim();

    if (!veiculoId) {
      toast.error("Selecione o veículo antes de salvar.");
      return;
    }
    if (!data) {
      toast.error("Informe a data do custo.");
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Informe um valor válido (maior que zero).");
      return;
    }
    if (!Number.isFinite(km) || km < 0) {
      toast.error("Informe a quilometragem atual do veículo.");
      return;
    }

    submit.mutate({ veiculo_id: veiculoId, tipo, valor, km, data, descricao });
  };


  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setTipo("combustivel");
          setVeiculoId(veiculos[0]?.id ?? "");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lançar custo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Veículo</Label>
            <Select value={veiculoId} onValueChange={setVeiculoId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {veiculos.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {veiculoLabel(v)} ({v.placa})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoCusto)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="combustivel">Combustível</SelectItem>
                <SelectItem value="manutencao">Manutenção</SelectItem>
                <SelectItem value="seguro">Seguro</SelectItem>
                <SelectItem value="imprevisto">Imprevisto</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                name="valor"
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                name="data"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="km">KM do veículo</Label>
            <Input id="km" name="km" type="number" min="0" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Input id="descricao" name="descricao" />
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
