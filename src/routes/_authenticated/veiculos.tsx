import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listVeiculos,
  listMotoristas,
  statusVeiculoLabel,
  statusVeiculoTone,
  type Veiculo,
  type StatusVeiculo,
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
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/veiculos")({
  component: VeiculosPage,
});

function VeiculosPage() {
  const qc = useQueryClient();
  const { data: veiculos = [], isLoading } = useQuery({
    queryKey: ["veiculos"],
    queryFn: listVeiculos,
  });
  const { data: motoristas = [] } = useQuery({
    queryKey: ["motoristas"],
    queryFn: listMotoristas,
  });
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusVeiculo>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Veiculo | null>(null);

  const motoristaMap = useMemo(() => {
    const m = new Map<string, string>();
    motoristas.forEach((mo) => m.set(mo.id, mo.nome));
    return m;
  }, [motoristas]);

  const filtered = veiculos.filter((v) => {
    if (filtroStatus !== "todos" && v.status !== filtroStatus) return false;
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    const nomeMot = v.motorista_id ? motoristaMap.get(v.motorista_id) ?? "" : v.motorista ?? "";
    return (
      v.placa.toLowerCase().includes(q) ||
      v.nome.toLowerCase().includes(q) ||
      (v.marca_modelo ?? "").toLowerCase().includes(q) ||
      nomeMot.toLowerCase().includes(q)
    );
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("veiculos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Veículo removido");
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      qc.invalidateQueries({ queryKey: ["custos"] });
      qc.invalidateQueries({ queryKey: ["documentos"] });
      qc.invalidateQueries({ queryKey: ["manutencoes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (v: Veiculo) => {
    setEditing(v);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Veículos</h1>
          <p className="text-sm text-muted-foreground mt-1">{veiculos.length} cadastrado(s)</p>
        </div>
        <Button size="lg" onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> Novo veículo
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, nome, marca ou motorista..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}>
          <SelectTrigger className="h-11 w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="manutencao">Em manutenção</SelectItem>
            <SelectItem value="desativado">Desativado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {veiculos.length === 0
              ? "Nenhum veículo cadastrado ainda."
              : "Nenhum resultado para essa busca."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => {
            const st = (v.status ?? "ativo") as StatusVeiculo;
            const motoristaNome = v.motorista_id
              ? motoristaMap.get(v.motorista_id) ?? "—"
              : v.motorista || "—";
            return (
              <Card key={v.id}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-lg leading-tight truncate">{v.nome}</div>
                      <div className="text-sm font-mono text-muted-foreground uppercase">
                        {v.placa}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full border font-medium shrink-0",
                        statusVeiculoTone[st],
                      )}
                    >
                      {statusVeiculoLabel[st]}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    {v.marca_modelo && (
                      <div>
                        <span className="text-muted-foreground">Marca/Modelo:</span>{" "}
                        {v.marca_modelo}
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">Motorista:</span> {motoristaNome}
                    </div>
                    <div>
                      <span className="text-muted-foreground">KM atual:</span>{" "}
                      {v.km_atual.toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(v)}
                      className="flex-1 gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Excluir ${v.nome} (${v.placa})?`)) {
                          deleteMut.mutate(v.id);
                        }
                      }}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <VeiculoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        motoristas={motoristas}
      />
    </div>
  );
}

function VeiculoDialog({
  open,
  onOpenChange,
  editing,
  motoristas,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Veiculo | null;
  motoristas: { id: string; nome: string }[];
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusVeiculo>(editing?.status ?? "ativo");
  const [motoristaId, setMotoristaId] = useState<string>(editing?.motorista_id ?? "sem");

  const submit = useMutation({
    mutationFn: async (form: {
      nome: string;
      placa: string;
      marca_modelo: string | null;
      motorista_id: string | null;
      km_atual: number;
      status: StatusVeiculo;
    }) => {
      if (editing) {
        const { error } = await supabase.from("veiculos").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("veiculos").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Veículo atualizado" : "Veículo cadastrado");
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const marca = String(fd.get("marca_modelo") || "").trim();
    submit.mutate({
      nome: String(fd.get("nome") || "").trim(),
      placa: String(fd.get("placa") || "").trim().toUpperCase(),
      marca_modelo: marca || null,
      motorista_id: motoristaId === "sem" ? null : motoristaId,
      km_atual: Number(fd.get("km_atual") || 0),
      status,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setStatus(editing?.status ?? "ativo");
          setMotoristaId(editing?.motorista_id ?? "sem");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar veículo" : "Novo veículo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id ?? "new"}>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome / Identificação</Label>
            <Input id="nome" name="nome" required defaultValue={editing?.nome ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="placa">Placa</Label>
              <Input
                id="placa"
                name="placa"
                required
                defaultValue={editing?.placa ?? ""}
                className="uppercase font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="km_atual">KM atual</Label>
              <Input
                id="km_atual"
                name="km_atual"
                type="number"
                min={0}
                required
                defaultValue={editing?.km_atual ?? 0}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="marca_modelo">Marca / Modelo</Label>
            <Input
              id="marca_modelo"
              name="marca_modelo"
              placeholder="Ex.: Fiat Strada, VW Gol..."
              defaultValue={editing?.marca_modelo ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Motorista responsável</Label>
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sem">Sem motorista</SelectItem>
                {motoristas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {motoristas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Cadastre motoristas na aba "Motoristas" para vincular.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusVeiculo)}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="manutencao">Em manutenção</SelectItem>
                <SelectItem value="desativado">Desativado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
