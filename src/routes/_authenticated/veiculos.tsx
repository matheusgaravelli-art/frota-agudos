import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listVeiculos, type Veiculo } from "@/lib/frota";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/veiculos")({
  component: VeiculosPage,
});

function VeiculosPage() {
  const qc = useQueryClient();
  const { data: veiculos = [], isLoading } = useQuery({
    queryKey: ["veiculos"],
    queryFn: listVeiculos,
  });
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Veiculo | null>(null);

  const filtered = veiculos.filter((v) => {
    const q = busca.toLowerCase().trim();
    if (!q) return true;
    return (
      v.placa.toLowerCase().includes(q) ||
      v.nome.toLowerCase().includes(q) ||
      (v.motorista ?? "").toLowerCase().includes(q)
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por placa, nome ou motorista..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9 h-11"
        />
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
          {filtered.map((v) => (
            <Card key={v.id}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-lg leading-tight">{v.nome}</div>
                    <div className="text-sm font-mono text-muted-foreground uppercase">
                      {v.placa}
                    </div>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Motorista:</span>{" "}
                    {v.motorista || "—"}
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
          ))}
        </div>
      )}

      <VeiculoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
      />
    </div>
  );
}

function VeiculoDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Veiculo | null;
}) {
  const qc = useQueryClient();

  const submit = useMutation({
    mutationFn: async (form: {
      nome: string;
      placa: string;
      motorista: string;
      km_atual: number;
    }) => {
      if (editing) {
        const { error } = await supabase
          .from("veiculos")
          .update(form)
          .eq("id", editing.id);
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
    submit.mutate({
      nome: String(fd.get("nome") || "").trim(),
      placa: String(fd.get("placa") || "").trim().toUpperCase(),
      motorista: String(fd.get("motorista") || "").trim(),
      km_atual: Number(fd.get("km_atual") || 0),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar veículo" : "Novo veículo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id ?? "new"}>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome / Identificação</Label>
            <Input id="nome" name="nome" required defaultValue={editing?.nome ?? ""} />
          </div>
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
            <Label htmlFor="motorista">Motorista responsável</Label>
            <Input
              id="motorista"
              name="motorista"
              defaultValue={editing?.motorista ?? ""}
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
