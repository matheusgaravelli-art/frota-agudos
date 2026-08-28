import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listMotoristas, type Motorista } from "@/lib/frota";
import {
  ANEXO_ACCEPT,
  getFotoUrl,
  isPdf,
  removeFoto,
  uploadFoto,
} from "@/lib/veiculo-fotos";
import { AnexoViewer, type AnexoAberto } from "@/components/anexo-viewer";
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
import { Plus, Pencil, Trash2, UserRound, FileText, X, Building2 } from "lucide-react";
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
  const [anexo, setAnexo] = useState<AnexoAberto>(null);

  const deleteMut = useMutation({
    mutationFn: async (m: Motorista) => {
      const { error } = await supabase.from("motoristas").delete().eq("id", m.id);
      if (error) throw error;
      if (m.cnh_path) await removeFoto(m.cnh_path).catch(() => undefined);
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
                    {m.departamento && (
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 shrink-0" /> {m.departamento}
                      </div>
                    )}
                  </div>
                </div>

                {m.cnh_path && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2"
                    onClick={async () => {
                      try {
                        const url = await getFotoUrl(m.cnh_path!);
                        setAnexo({ url, path: m.cnh_path! });
                      } catch {
                        toast.error("Não foi possível abrir o documento");
                      }
                    }}
                  >
                    <FileText className="h-3.5 w-3.5" /> Ver CNH
                  </Button>
                )}

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
                      if (confirm(`Excluir ${m.nome}?`)) deleteMut.mutate(m);
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
      <AnexoViewer anexo={anexo} onClose={() => setAnexo(null)} />
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [cnhPath, setCnhPath] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setArquivo(null);
      setCnhPath(editing?.cnh_path ?? null);
    }
  }, [open, editing]);

  const submit = useMutation({
    mutationFn: async (form: {
      nome: string;
      contato: string | null;
      departamento: string | null;
    }) => {
      let path = cnhPath;
      if (arquivo) {
        path = await uploadFoto(editing?.id ?? "motoristas", arquivo);
        if (editing?.cnh_path && editing.cnh_path !== path) {
          await removeFoto(editing.cnh_path).catch(() => undefined);
        }
      }
      const payload = { ...form, cnh_path: path };
      if (editing) {
        const { error } = await supabase
          .from("motoristas")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("motoristas").insert(payload);
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
    const nome = String(fd.get("nome") || "").trim();
    if (!nome) {
      toast.error("Informe o nome do motorista");
      return;
    }
    const contato = String(fd.get("contato") || "").trim();
    const departamento = String(fd.get("departamento") || "").trim();
    submit.mutate({
      nome,
      contato: contato || null,
      departamento: departamento || null,
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
            <Label htmlFor="contato">Telefone / Contato</Label>
            <Input
              id="contato"
              name="contato"
              inputMode="tel"
              placeholder="(00) 00000-0000"
              defaultValue={editing?.contato ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departamento">Departamento</Label>
            <Input
              id="departamento"
              name="departamento"
              placeholder="Ex: Secretaria de Obras"
              defaultValue={editing?.departamento ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label>Documento (CNH) — foto ou PDF</Label>
            <input
              ref={fileRef}
              type="file"
              accept={ANEXO_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setArquivo(f);
                e.target.value = "";
              }}
            />
            {arquivo ? (
              <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{arquivo.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setArquivo(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : cnhPath ? (
              <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">
                  {isPdf(cnhPath) ? "Documento em PDF anexado" : "Imagem anexada"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCnhPath(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              onClick={() => fileRef.current?.click()}
            >
              {arquivo || cnhPath ? "Trocar documento" : "Anexar documento"}
            </Button>
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
