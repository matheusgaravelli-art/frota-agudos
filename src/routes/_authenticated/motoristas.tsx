import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMotoristas, type Motorista } from "@/lib/frota";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/motoristas")({
  component: MotoristasPage,
});

function MotoristasPage() {
  const qc = useQueryClient();
  const { data: motoristas = [], isLoading } = useQuery({
    queryKey: ["motoristas"],
    queryFn: listMotoristas,
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Motorista | null>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("motoristas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Motorista removido");
      qc.invalidateQueries({ queryKey: ["motoristas"] });
      qc.invalidateQueries({ queryKey: ["veiculos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Motoristas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {motoristas.length} cadastrado(s)
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Novo motorista
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : motoristas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum motorista cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {motoristas.map((m) => (
            <Card key={m.id}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold leading-tight truncate">{m.nome}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {m.contato || "Sem contato"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(m);
                      setOpen(true);
                    }}
                    className="flex-1 gap-1"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Excluir ${m.nome}?`)) deleteMut.mutate(m.id);
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

      <MotoristaDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function MotoristaDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Motorista | null;
}) {
  const qc = useQueryClient();
  const submit = useMutation({
    mutationFn: async (form: { nome: string; contato: string | null }) => {
      if (editing) {
        const { error } = await supabase.from("motoristas").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("motoristas").insert(form);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Motorista atualizado" : "Motorista cadastrado");
      qc.invalidateQueries({ queryKey: ["motoristas"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const contato = String(fd.get("contato") || "").trim();
    submit.mutate({
      nome: String(fd.get("nome") || "").trim(),
      contato: contato || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar motorista" : "Novo motorista"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id ?? "new"}>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" name="nome" required defaultValue={editing?.nome ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contato">Contato (telefone, e-mail)</Label>
            <Input id="contato" name="contato" defaultValue={editing?.contato ?? ""} />
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
