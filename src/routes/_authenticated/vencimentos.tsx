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
import { Plus, Pencil, Trash2 } from "lucide-react";
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
  },
  proximo: {
    dot: "bg-warning",
    label: "Vence em breve",
    badge: "bg-warning/15 text-warning-foreground border-warning/40",
  },
  ok: {
    dot: "bg-success",
    label: "Em dia",
    badge: "bg-success/10 text-success border-success/30",
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
          <p className="text-sm text-muted-foreground mt-1">
            Licenciamento, seguro e revisão
          </p>
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
      ) : lista.length === 0 ? (
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
                      <span className="font-semibold">{tipoDocLabel[d.tipo]}</span>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(d)}
                    >
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

      <VencimentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        veiculos={veiculos.data ?? []}
      />
    </div>
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
  const [tipo, setTipo] = useState<Documento["tipo"]>(editing?.tipo ?? "licenciamento");
  const [veiculoId, setVeiculoId] = useState<string>(editing?.veiculo_id ?? "");

  const submit = useMutation({
    mutationFn: async (form: {
      veiculo_id: string;
      tipo: Documento["tipo"];
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
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    submit.mutate({
      veiculo_id: veiculoId,
      tipo,
      vencimento: String(fd.get("vencimento")),
      observacao: String(fd.get("observacao") || "").trim(),
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setTipo(editing?.tipo ?? "licenciamento");
          setVeiculoId(editing?.veiculo_id ?? veiculos[0]?.id ?? "");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar vencimento" : "Novo vencimento"}
          </DialogTitle>
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
            <Select value={tipo} onValueChange={(v) => setTipo(v as Documento["tipo"])}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="licenciamento">Licenciamento</SelectItem>
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
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Input
              id="observacao"
              name="observacao"
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
