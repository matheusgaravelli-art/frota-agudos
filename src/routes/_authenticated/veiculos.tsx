import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEPARTAMENTOS,
  listVeiculos,
  listCustos,
  listEtiquetas,
  listVeiculoEtiquetas,
  type Etiqueta,
  ordenarVeiculos,
  statusVeiculoLabel,
  statusVeiculoTone,
  veiculoLabel,
  veiculoTitulo,
  type Veiculo,
  type StatusVeiculo,
} from "@/lib/frota";
import {
  MAX_FOTOS,
  ANEXO_ACCEPT,
  getFotoUrls,
  removeFoto,
  uploadFoto,
  isPdf,
} from "@/lib/veiculo-fotos";
import { AnexoViewer, type AnexoAberto } from "@/components/anexo-viewer";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  FileText,
  Tag,
  AlertCircle,
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
  const etiquetasQ = useQuery({ queryKey: ["etiquetas"], queryFn: listEtiquetas });
  const vinculosQ = useQuery({ queryKey: ["veiculo_etiquetas"], queryFn: listVeiculoEtiquetas });
  const custosQ = useQuery({ queryKey: ["custos"], queryFn: listCustos });
  const etiquetas = etiquetasQ.data ?? [];
  const vinculos = vinculosQ.data ?? [];
  const pendentesPorVeiculo = new Map<string, number>();
  (custosQ.data ?? [])
    .filter((c) => c.pendente)
    .forEach((c) => pendentesPorVeiculo.set(c.veiculo_id, (pendentesPorVeiculo.get(c.veiculo_id) ?? 0) + 1));

  const [etiquetasOpen, setEtiquetasOpen] = useState(false);
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
          <Button size="lg" variant="outline" onClick={() => setEtiquetasOpen(true)} className="gap-2">
            <Tag className="h-4 w-4" /> Etiquetas
          </Button>
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
              etiquetas={etiquetas.filter((e) =>
                vinculos.some((x) => x.veiculo_id === v.id && x.etiqueta_id === e.id),
              )}
              custosPendentes={pendentesPorVeiculo.get(v.id) ?? 0}
              onEditar={() => openEdit(v)}
              onExcluir={() => {
                if (confirm(`Excluir ${veiculoTitulo(v)} (${v.placa})?`)) deleteMut.mutate(v.id);
              }}
              onLimparMarca={() => limparMarca.mutate(v.id)}
            />
          ))}
        </div>
      )}

      <VeiculoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        veiculos={veiculos}
        etiquetas={etiquetas}
      />
      <ImportarDialog open={importOpen} onOpenChange={setImportOpen} />
      <EtiquetasDialog open={etiquetasOpen} onOpenChange={setEtiquetasOpen} etiquetas={etiquetas} />
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
  etiquetas,
  custosPendentes,
  onEditar,
  onExcluir,
  onLimparMarca,
}: {
  veiculo: Veiculo;
  etiquetas: Etiqueta[];
  custosPendentes: number;
  onEditar: () => void;
  onExcluir: () => void;
  onLimparMarca: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [anexoAberto, setAnexoAberto] = useState<AnexoAberto>(null);
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
            {etiquetas.length > 0 && (
              <span className="flex items-center gap-0.5 mr-0.5">
                {etiquetas.map((e) => (
                  <span
                    key={e.id}
                    title={e.nome}
                    aria-label={`Etiqueta ${e.nome}`}
                    className="h-2.5 w-2.5 rounded-full border border-border"
                    style={{ backgroundColor: e.cor }}
                  />
                ))}
              </span>
            )}
            {custosPendentes > 0 && (
              <span
                title={`${custosPendentes} custo(s) pendente(s)`}
                aria-label={`${custosPendentes} custo pendente`}
                className="text-warning"
              >
                <AlertCircle className="h-4 w-4" />
              </span>
            )}
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
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAnexoAberto({ url: urls[i], path: p })}
                      className="block w-full rounded-md border overflow-hidden"
                      title="Ver em tamanho ampliado"
                    >
                      {isPdf(p) ? (
                        <span className="flex h-28 w-full items-center justify-center gap-2 bg-muted text-xs font-medium">
                          <FileText className="h-4 w-4" /> Ver PDF
                        </span>
                      ) : (
                        <img
                          src={urls[i]}
                          alt={`Anexo do veículo ${titulo}`}
                          loading="lazy"
                          className="w-full h-28 object-cover"
                        />
                      )}
                    </button>
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
              {v.observacao && (
                <div>
                  <span className="text-muted-foreground">Observação:</span> {v.observacao}
                </div>
              )}
              {etiquetas.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {etiquetas.map((e) => (
                    <span
                      key={e.id}
                      className="text-xs px-2 py-0.5 rounded-full border flex items-center gap-1"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: e.cor }}
                      />
                      {e.nome}
                    </span>
                  ))}
                </div>
              )}
              {custosPendentes > 0 && (
                <div className="text-warning-foreground text-xs pt-1">
                  {custosPendentes} custo(s) pendente(s) de pagamento
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
        <AnexoViewer anexo={anexoAberto} onClose={() => setAnexoAberto(null)} />
      </CardContent>
    </Card>
  );
}

function VeiculoDialog({
  open,
  onOpenChange,
  editing,
  veiculos,
  etiquetas,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Veiculo | null;
  veiculos: Veiculo[];
  etiquetas: Etiqueta[];
}) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<StatusVeiculo>(editing?.status ?? "ativo");
  const [departamento, setDepartamento] = useState<string>(
    DEPARTAMENTOS.find((d) => d === (editing?.departamento ?? "")) ?? "",
  );
  const [fotos, setFotos] = useState<string[]>(editing?.fotos ?? []);
  const [limite, setLimite] = useState<number>(editing?.max_anexos ?? MAX_FOTOS);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [anexoAberto, setAnexoAberto] = useState<AnexoAberto>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setStatus(editing?.status ?? "ativo");
    setFotos(editing?.fotos ?? []);
    setLimite(editing?.max_anexos ?? MAX_FOTOS);
    if (editing) {
      supabase
        .from("veiculo_etiquetas")
        .select("etiqueta_id")
        .eq("veiculo_id", editing.id)
        .then(({ data }) => setSelecionadas((data ?? []).map((d) => d.etiqueta_id)));
    } else {
      setSelecionadas([]);
    }
  }, [open, editing]);

  const liberarEspaco = async () => {
    const novo = limite + 1;
    setLimite(novo);
    if (editing) {
      const { error } = await supabase
        .from("veiculos")
        .update({ max_anexos: novo })
        .eq("id", editing.id);
      if (error) {
        toast.error(`Não foi possível liberar o espaço: ${error.message}`);
        return;
      }
      qc.invalidateQueries({ queryKey: ["veiculos"] });
    }
    toast.success("Mais um espaço de anexo liberado");
  };

  const alternarEtiqueta = async (etiquetaId: string) => {
    if (!editing) {
      toast.error("Salve o veículo primeiro para aplicar etiquetas.");
      return;
    }
    const jaTem = selecionadas.includes(etiquetaId);
    const { error } = jaTem
      ? await supabase
          .from("veiculo_etiquetas")
          .delete()
          .eq("veiculo_id", editing.id)
          .eq("etiqueta_id", etiquetaId)
      : await supabase
          .from("veiculo_etiquetas")
          .insert({ veiculo_id: editing.id, etiqueta_id: etiquetaId });
    if (error) {
      toast.error(`Não foi possível atualizar a etiqueta: ${error.message}`);
      return;
    }
    setSelecionadas((s) => (jaTem ? s.filter((x) => x !== etiquetaId) : [...s, etiquetaId]));
    qc.invalidateQueries({ queryKey: ["veiculo_etiquetas"] });
  };

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
    const espaco = limite - fotos.length;
    if (espaco <= 0) {
      toast.error(
        `Limite de ${limite} anexo(s) atingido. Use "Adicionar mais espaço de foto" para liberar outro.`,
      );
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
      observacao: string | null;
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
    const repetida = veiculos.find(
      (v) => (v.placa || "").trim().toUpperCase() === placa && v.id !== editing?.id,
    );
    if (repetida) {
      toast.error("Placa já cadastrada no sistema", {
        description: `A placa ${placa} pertence ao veículo ${veiculoTitulo(repetida)} (ID ${repetida.codigo || repetida.nome || "—"}). Corrija a placa para continuar.`,
      });
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
      departamento: departamento || null,
      observacao: texto("observacao"),
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
              <Label>Dep. (secretaria responsável)</Label>
              <Select value={departamento} onValueChange={setDepartamento}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione a secretaria" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTAMENTOS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              name="observacao"
              rows={3}
              placeholder="Anote aqui qualquer informação extra sobre o veículo"
              defaultValue={editing?.observacao ?? ""}
            />
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label>Etiquetas</Label>
            {etiquetas.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma etiqueta criada ainda. Use o botão "Etiquetas" na lista de veículos.
              </p>
            ) : !editing ? (
              <p className="text-xs text-muted-foreground">
                Salve o veículo para aplicar etiquetas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {etiquetas.map((e) => {
                  const ativa = selecionadas.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => alternarEtiqueta(e.id)}
                      className={cn(
                        "text-sm px-3 py-1.5 rounded-full border flex items-center gap-2",
                        ativa ? "bg-accent border-foreground/30" : "text-muted-foreground",
                      )}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.cor }} />
                      {e.nome}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t pt-4">
            <Label>
              Anexos do veículo — fotos ou PDF ({fotos.length}/{limite})
            </Label>
            {!editing ? (
              <p className="text-xs text-muted-foreground">
                Salve o veículo para poder anexar as fotos ou PDFs.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {fotos.map((path, i) => (
                    <div key={path} className="relative rounded-md overflow-hidden border">
                      {urls[i] ? (
                        <button
                          type="button"
                          onClick={() => setAnexoAberto({ url: urls[i], path })}
                          className="block w-full"
                          title="Ver em tamanho ampliado"
                        >
                          {isPdf(path) ? (
                            <span className="flex h-32 w-full items-center justify-center gap-2 bg-muted text-xs font-medium">
                              <FileText className="h-4 w-4" /> Ver PDF
                            </span>
                          ) : (
                            <img
                              src={urls[i]}
                              alt={`Anexo ${i + 1} do veículo ${veiculoLabel(editing)}`}
                              className="w-full h-32 object-cover"
                              loading="lazy"
                            />
                          )}
                        </button>
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
                {fotos.length < limite && (
                  <div className="flex flex-wrap gap-2">
                    <input
                      ref={cameraRef}
                      type="file"
                      accept={ANEXO_ACCEPT}
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                    <input
                      ref={galeriaRef}
                      type="file"
                      accept={ANEXO_ACCEPT}
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
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-2 h-10 w-full"
                  onClick={liberarEspaco}
                >
                  <Plus className="h-4 w-4" /> Adicionar mais espaço de foto
                </Button>
                {enviando && <p className="text-xs text-muted-foreground">Enviando anexo...</p>}
                <AnexoViewer anexo={anexoAberto} onClose={() => setAnexoAberto(null)} />
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

function EtiquetasDialog({
  open,
  onOpenChange,
  etiquetas,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  etiquetas: Etiqueta[];
}) {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#2563eb");

  const criar = useMutation({
    mutationFn: async () => {
      const n = nome.trim();
      if (!n) throw new Error("Informe o nome da etiqueta.");
      const { error } = await supabase.from("etiquetas").insert({ nome: n, cor });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etiqueta criada");
      setNome("");
      qc.invalidateQueries({ queryKey: ["etiquetas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("etiquetas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Etiqueta excluída");
      qc.invalidateQueries({ queryKey: ["etiquetas"] });
      qc.invalidateQueries({ queryKey: ["veiculo_etiquetas"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etiquetas</DialogTitle>
          <DialogDescription>
            Crie etiquetas com nome e cor. Depois aplique nos veículos ao abrir o cadastro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="etiqueta-nome">Nome</Label>
              <Input
                id="etiqueta-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Precisa revisão"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="etiqueta-cor">Cor</Label>
              <Input
                id="etiqueta-cor"
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="h-11 w-16 p-1"
              />
            </div>
            <Button
              type="button"
              onClick={() => criar.mutate()}
              disabled={criar.isPending}
              className="h-11 gap-1"
            >
              <Plus className="h-4 w-4" /> Criar
            </Button>
          </div>

          {etiquetas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma etiqueta criada ainda.</p>
          ) : (
            <div className="divide-y border rounded-md">
              {etiquetas.map((e) => (
                <div key={e.id} className="flex items-center gap-3 p-3">
                  <span
                    className="h-3.5 w-3.5 rounded-full border"
                    style={{ backgroundColor: e.cor }}
                  />
                  <span className="flex-1 text-sm">{e.nome}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Excluir etiqueta ${e.nome}`}
                    onClick={() => excluir.mutate(e.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
