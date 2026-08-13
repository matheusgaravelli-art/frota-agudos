import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listVeiculos,
  ordenarVeiculos,
  statusVeiculoLabel,
  statusVeiculoTone,
  veiculoLabel,
  veiculoTitulo,
  type Veiculo,
  type StatusVeiculo,
} from "@/lib/frota";
import { MAX_FOTOS, getFotoUrls, removeFoto, uploadFoto } from "@/lib/veiculo-fotos";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Camera,
  X,
  ChevronDown,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/veiculos")({
  component: VeiculosPage,
  head: () => ({
    meta: [
      { title: "Veículos da frota | Gestão de Frota" },
      {
        name: "description",
        content:
          "Cadastro de veículos da frota com tipo, cor, departamento, placa, status e fotos do veículo.",
      },
      { property: "og:title", content: "Veículos da frota | Gestão de Frota" },
      {
        property: "og:description",
        content: "Cadastre e organize os veículos da frota com fotos e importação por planilha.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const STATUS_MAP: Record<string, StatusVeiculo> = {
  ativo: "ativo",
  "em manutencao": "manutencao",
  "em manutenção": "manutencao",
  manutencao: "manutencao",
  manutenção: "manutencao",
  desativado: "desativado",
  inativo: "desativado",
};

function VeiculosPage() {
  const qc = useQueryClient();
  const { data: veiculos = [], isLoading } = useQuery({
    queryKey: ["veiculos"],
    queryFn: listVeiculos,
  });
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | StatusVeiculo>("todos");
  const [filtroDep, setFiltroDep] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Veiculo | null>(null);

  const departamentos = Array.from(
    new Set(veiculos.map((v) => (v.departamento || "").trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

  const filtered = ordenarVeiculos(
    veiculos.filter((v) => {
      if (filtroStatus !== "todos" && v.status !== filtroStatus) return false;
      if (filtroDep === "sem" && (v.departamento || "").trim()) return false;
      if (filtroDep !== "todos" && filtroDep !== "sem" && (v.departamento || "").trim() !== filtroDep)
        return false;
      const q = busca.toLowerCase().trim();
      if (!q) return true;
      return [v.codigo, v.nome, v.placa, v.tipo, v.cor, v.departamento, v.marca_modelo]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(q));
    }),
  );

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

  const limparMarca = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("veiculos").update({ duplicado: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marcação de duplicidade removida");
      qc.invalidateQueries({ queryKey: ["veiculos"] });
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

  const marcados = veiculos.filter((v) => v.duplicado).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Veículos</h1>
          <p className="text-sm text-muted-foreground mt-1">{veiculos.length} cadastrado(s)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" /> Importar planilha
          </Button>
          <Button size="lg" onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo veículo
          </Button>
        </div>
      </div>

      {marcados > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <strong>{marcados}</strong> veículo(s) marcado(s) com <strong>*</strong> por placa repetida
          na última planilha adicionada. Abra cada um, confira os dados e retire a marcação.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca/modelo, placa, tipo, cor ou departamento..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Select value={filtroDep} onValueChange={setFiltroDep}>
          <SelectTrigger className="h-11 w-full sm:w-[230px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os departamentos</SelectItem>
            {departamentos.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
            <SelectItem value="sem">Sem departamento</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filtroStatus}
          onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}
        >
          <SelectTrigger className="h-11 w-full sm:w-[190px]">
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-start">
          {filtered.map((v) => (
            <VeiculoCard
              key={v.id}
              veiculo={v}
              onEditar={() => openEdit(v)}
              onExcluir={() => {
                if (confirm(`Excluir ${veiculoTitulo(v)} (${v.placa})?`)) deleteMut.mutate(v.id);
              }}
              onLimparMarca={() => limparMarca.mutate(v.id)}
            />
          ))}
        </div>
      )}

      <VeiculoDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
      <ImportarDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

/** Tamanho da fonte do título conforme o comprimento, para nunca cortar o nome. */
function tituloClasse(titulo: string) {
  if (titulo.length <= 18) return "text-lg";
  if (titulo.length <= 28) return "text-base";
  if (titulo.length <= 40) return "text-sm";
  return "text-xs";
}

function VeiculoCard({
  veiculo: v,
  onEditar,
  onExcluir,
  onLimparMarca,
}: {
  veiculo: Veiculo;
  onEditar: () => void;
  onExcluir: () => void;
  onLimparMarca: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const st = (v.status ?? "ativo") as StatusVeiculo;
  const titulo = veiculoTitulo(v);
  const fotos = v.fotos ?? [];

  useEffect(() => {
    if (!aberto || fotos.length === 0) return;
    let ativo = true;
    getFotoUrls(fotos)
      .then((u) => ativo && setUrls(u))
      .catch(() => ativo && setUrls([]));
    return () => {
      ativo = false;
    };
  }, [aberto, v.id, fotos.length]);

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          className="w-full text-left flex items-start justify-between gap-2"
        >
          <div className="min-w-0">
            <div className={cn("font-semibold leading-snug break-words", tituloClasse(titulo))}>
              {v.duplicado && (
                <span className="text-destructive mr-1" title="Placa repetida na importação">
                  *
                </span>
              )}
              {titulo}
            </div>
            <div className="text-sm font-mono text-muted-foreground uppercase mt-0.5">{v.placa}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium",
                statusVeiculoTone[st],
              )}
            >
              {statusVeiculoLabel[st]}
            </span>
            <ChevronDown
              className={cn("h-4 w-4 text-muted-foreground transition-transform", aberto && "rotate-180")}
            />
          </div>
        </button>

        {aberto && (
          <div className="space-y-3 border-t pt-3">
            {fotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {fotos.map((p, i) =>
                  urls[i] ? (
                    <img
                      key={p}
                      src={urls[i]}
                      alt={`Foto do veículo ${titulo}`}
                      loading="lazy"
                      className="w-full h-28 object-cover rounded-md border"
                    />
                  ) : (
                    <div key={p} className="w-full h-28 rounded-md border bg-muted" />
                  ),
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" /> Nenhuma foto anexada
              </div>
            )}

            <div className="text-sm space-y-1">
              {v.tipo && (
                <div>
                  <span className="text-muted-foreground">Tipo:</span> {v.tipo}
                </div>
              )}
              {v.cor && (
                <div>
                  <span className="text-muted-foreground">Cor:</span> {v.cor}
                </div>
              )}
              {v.departamento && (
                <div>
                  <span className="text-muted-foreground">Departamento:</span> {v.departamento}
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-1">
                ID Veículo: {v.codigo || v.nome || "—"}
              </div>
            </div>

            {v.duplicado && (
              <Button variant="outline" size="sm" onClick={onLimparMarca} className="h-9 w-full">
                Retirar marcação de duplicidade
              </Button>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onEditar} className="flex-1 gap-1 h-10">
                <Pencil className="h-3.5 w-3.5" /> Editar / fotos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExcluir}
                aria-label="Excluir veículo"
                className="gap-1 h-10 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
  const [status, setStatus] = useState<StatusVeiculo>(editing?.status ?? "ativo");
  const [fotos, setFotos] = useState<string[]>(editing?.fotos ?? []);
  const [urls, setUrls] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStatus(editing?.status ?? "ativo");
    setFotos(editing?.fotos ?? []);
  }, [open, editing]);

  useEffect(() => {
    let ativo = true;
    getFotoUrls(fotos)
      .then((u) => ativo && setUrls(u))
      .catch(() => ativo && setUrls([]));
    return () => {
      ativo = false;
    };
  }, [fotos]);

  const salvarFotos = async (novas: string[]) => {
    setFotos(novas);
    if (editing) {
      const { error } = await supabase
        .from("veiculos")
        .update({ fotos: novas })
        .eq("id", editing.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["veiculos"] });
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!editing) {
      toast.error("Salve o veículo primeiro para anexar as fotos.");
      return;
    }
    const espaco = MAX_FOTOS - fotos.length;
    if (espaco <= 0) {
      toast.error(`Você pode anexar no máximo ${MAX_FOTOS} fotos por veículo.`);
      return;
    }
    setEnviando(true);
    try {
      const escolhidas = Array.from(files).slice(0, espaco);
      const paths: string[] = [];
      for (const f of escolhidas) {
        paths.push(await uploadFoto(editing.id, f));
      }
      await salvarFotos([...fotos, ...paths]);
      toast.success("Foto adicionada");
    } catch (e) {
      toast.error(`Não foi possível enviar a foto: ${(e as Error).message}`);
    } finally {
      setEnviando(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galeriaRef.current) galeriaRef.current.value = "";
    }
  };

  const excluirFoto = async (path: string) => {
    try {
      await removeFoto(path);
      await salvarFotos(fotos.filter((p) => p !== path));
      toast.success("Foto removida");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const submit = useMutation({
    mutationFn: async (form: {
      codigo: string;
      tipo: string | null;
      cor: string | null;
      marca_modelo: string | null;
      departamento: string | null;
      placa: string;
      status: StatusVeiculo;
    }) => {
      if (editing) {
        const { error } = await supabase.from("veiculos").update(form).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("veiculos").insert({ ...form, fotos: [] });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Veículo atualizado" : "Veículo cadastrado");
      qc.invalidateQueries({ queryKey: ["veiculos"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(`Não foi possível salvar: ${e.message}`),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const codigo = String(fd.get("codigo") || "").trim();
    const placa = String(fd.get("placa") || "")
      .trim()
      .toUpperCase();
    if (!codigo) {
      toast.error("Informe o ID do veículo.");
      return;
    }
    if (!placa) {
      toast.error("Informe a placa do veículo.");
      return;
    }
    const texto = (k: string) => {
      const v = String(fd.get(k) || "").trim();
      return v || null;
    };
    submit.mutate({
      codigo,
      placa,
      tipo: texto("tipo"),
      cor: texto("cor"),
      marca_modelo: texto("marca_modelo"),
      departamento: texto("departamento"),
      status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Veículo" : "Novo veículo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" key={editing?.id ?? "new"}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="codigo">ID Veículo</Label>
              <Input
                id="codigo"
                name="codigo"
                required
                className="h-11"
                defaultValue={editing?.codigo ?? editing?.nome ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="placa">Placa</Label>
              <Input
                id="placa"
                name="placa"
                required
                defaultValue={editing?.placa ?? ""}
                className="uppercase font-mono h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input
                id="tipo"
                name="tipo"
                placeholder="Ex.: Carro, Caminhão, Ônibus..."
                className="h-11"
                defaultValue={editing?.tipo ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cor">Cor</Label>
              <Input id="cor" name="cor" className="h-11" defaultValue={editing?.cor ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marca_modelo">Marca / Modelo</Label>
              <Input
                id="marca_modelo"
                name="marca_modelo"
                placeholder="Ex.: Fiat Strada"
                className="h-11"
                defaultValue={editing?.marca_modelo ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departamento">Dep. (secretaria responsável)</Label>
              <Input
                id="departamento"
                name="departamento"
                className="h-11"
                defaultValue={editing?.departamento ?? ""}
              />
            </div>
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

          <div className="space-y-2 border-t pt-4">
            <Label>
              Fotos do veículo ({fotos.length}/{MAX_FOTOS})
            </Label>
            {!editing ? (
              <p className="text-xs text-muted-foreground">
                Salve o veículo para poder anexar as fotos.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {fotos.map((path, i) => (
                    <div key={path} className="relative rounded-md overflow-hidden border">
                      {urls[i] ? (
                        <img
                          src={urls[i]}
                          alt={`Foto ${i + 1} do veículo ${veiculoLabel(editing)}`}
                          className="w-full h-32 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-32 bg-muted" />
                      )}
                      <button
                        type="button"
                        onClick={() => excluirFoto(path)}
                        aria-label="Remover foto"
                        className="absolute top-1 right-1 rounded-full bg-background/90 border p-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {fotos.length < MAX_FOTOS && (
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={cameraRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                    <input
                      ref={galeriaRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 h-11 flex-1"
                      disabled={enviando}
                      onClick={() => cameraRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" /> Tirar foto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2 h-11 flex-1"
                      disabled={enviando}
                      onClick={() => galeriaRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4" /> Escolher arquivo
                    </Button>
                  </div>
                )}
                {enviando && <p className="text-xs text-muted-foreground">Enviando foto...</p>}
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
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

function ImportarDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [processando, setProcessando] = useState(false);
  const [modo, setModo] = useState<"substituir" | "adicionar">("adicionar");
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (row: Record<string, unknown>, chaves: string[]) => {
    for (const k of Object.keys(row)) {
      const norm = k
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      if (chaves.includes(norm)) {
        const v = row[k];
        if (v === null || v === undefined) return "";
        return String(v).trim();
      }
    }
    return "";
  };

  const importar = async (file: File) => {
    setProcessando(true);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      const registros = rows
        .map((r) => {
          const codigo = pick(r, ["idveiculo", "id", "codigo", "veiculo"]);
          const placa = pick(r, ["placa"]).toUpperCase();
          const statusTxt = pick(r, ["status"]).toLowerCase();
          return {
            codigo: codigo || null,
            nome: codigo || null,
            tipo: pick(r, ["tipo"]) || null,
            cor: pick(r, ["cor"]) || null,
            marca_modelo: pick(r, ["marcamodelo", "marca", "modelo"]) || null,
            departamento: pick(r, ["dep", "departamento", "secretaria"]) || null,
            placa,
            status: STATUS_MAP[statusTxt] ?? "ativo",
            fotos: [] as string[],
          };
        })
        .filter((r) => r.codigo || r.placa);

      if (registros.length === 0) {
        toast.error(
          "Nenhuma linha válida encontrada. Verifique se a planilha tem as colunas: ID Veículo, Tipo, Cor, Dep., Placa, Status.",
        );
        return;
      }

      if (modo === "substituir") {
        const { error: delErr } = await supabase.from("veiculos").delete().not("id", "is", null);
        if (delErr) throw delErr;

        for (let i = 0; i < registros.length; i += 200) {
          const { error } = await supabase.from("veiculos").insert(registros.slice(i, i + 200));
          if (error) throw error;
        }
        qc.invalidateQueries({ queryKey: ["veiculos"] });
        toast.success(`${registros.length} veículo(s) importado(s), substituindo a lista anterior.`);
        onOpenChange(false);
        return;
      }

      // Apenas adicionar: não cria registro repetido, apenas marca o existente com "*"
      const { data: existentes, error: exErr } = await supabase
        .from("veiculos")
        .select("id, placa");
      if (exErr) throw exErr;

      const mapaPlacas = new Map<string, string>();
      (existentes ?? []).forEach((e) => {
        if (e.placa) mapaPlacas.set(String(e.placa).toUpperCase().trim(), e.id);
      });

      const novos: typeof registros = [];
      const idsDuplicados = new Set<string>();
      const placasNovas = new Set<string>();

      for (const r of registros) {
        const placa = r.placa.trim();
        const jaExiste = placa ? mapaPlacas.get(placa) : undefined;
        if (jaExiste) {
          idsDuplicados.add(jaExiste);
          continue;
        }
        if (placa && placasNovas.has(placa)) continue;
        if (placa) placasNovas.add(placa);
        novos.push(r);
      }

      for (let i = 0; i < novos.length; i += 200) {
        const lote = novos.slice(i, i + 200);
        if (lote.length === 0) continue;
        const { error } = await supabase.from("veiculos").insert(lote);
        if (error) throw error;
      }

      if (idsDuplicados.size > 0) {
        const { error } = await supabase
          .from("veiculos")
          .update({ duplicado: true })
          .in("id", Array.from(idsDuplicados));
        if (error) throw error;
      }

      qc.invalidateQueries({ queryKey: ["veiculos"] });
      toast.success(
        `${novos.length} veículo(s) adicionado(s).` +
          (idsDuplicados.size > 0
            ? ` ${idsDuplicados.size} placa(s) já cadastrada(s) foram marcadas com * para você conferir.`
            : ""),
      );
      onOpenChange(false);
    } catch (e) {
      toast.error(`Não foi possível importar: ${(e as Error).message}`);
    } finally {
      setProcessando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar veículos por planilha</DialogTitle>
          <DialogDescription>
            A planilha (Excel ou CSV) deve ter as colunas: ID Veículo, Tipo, Cor, Marca/Modelo,
            Dep., Placa, Status. Cada linha vira um veículo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>O que fazer com os dados atuais?</Label>
            <button
              type="button"
              onClick={() => setModo("substituir")}
              className={cn(
                "w-full text-left rounded-md border p-3 text-sm transition-colors",
                modo === "substituir" ? "border-primary bg-accent" : "hover:bg-accent/50",
              )}
            >
              <span className="font-medium">1. Substituir todos os dados</span>
              <span className="block text-muted-foreground mt-1">
                Apaga os veículos cadastrados e usa somente os da nova planilha. Custos,
                manutenções e vencimentos ligados a eles também são apagados.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setModo("adicionar")}
              className={cn(
                "w-full text-left rounded-md border p-3 text-sm transition-colors",
                modo === "adicionar" ? "border-primary bg-accent" : "hover:bg-accent/50",
              )}
            >
              <span className="font-medium">2. Apenas adicionar os novos</span>
              <span className="block text-muted-foreground mt-1">
                Mantém tudo que já existe. Se a placa já estiver cadastrada, nenhum registro novo é
                criado — o veículo existente recebe um <strong>*</strong> para você conferir e
                corrigir.
              </span>
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importar(f);
            }}
          />
          <Button
            type="button"
            className="w-full h-12 gap-2"
            disabled={processando}
            onClick={() => {
              if (
                modo === "substituir" &&
                !confirm("Isso apaga todos os veículos já cadastrados. Deseja continuar?")
              )
                return;
              fileRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4" />
            {processando
              ? "Importando..."
              : modo === "substituir"
                ? "Escolher planilha e substituir tudo"
                : "Escolher planilha e adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
