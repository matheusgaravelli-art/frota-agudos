import { supabase } from "@/integrations/supabase/client";

export type StatusVeiculo = "ativo" | "manutencao" | "desativado";

export type Veiculo = {
  id: string;
  nome: string | null;
  codigo: string | null;
  tipo: string | null;
  cor: string | null;
  departamento: string | null;
  placa: string;
  marca_modelo: string | null;
  motorista: string | null;
  motorista_id: string | null;
  km_atual: number;
  status: StatusVeiculo;
  fotos: string[];
  duplicado: boolean;
  observacao: string | null;
  max_anexos: number;
  created_at: string;
  updated_at: string;
};

export type Etiqueta = {
  id: string;
  nome: string;
  cor: string;
  created_at: string;
  updated_at: string;
};

export type VeiculoEtiqueta = {
  veiculo_id: string;
  etiqueta_id: string;
};

/** Lista fixa de secretarias/departamentos do cadastro de veículos. */
export const DEPARTAMENTOS = [
  "Secretaria de Administração e Finanças",
  "Secretaria de Segurança Pública",
  "Secretaria de Saúde",
  "Secretaria de Educação e Cultura",
  "Secretaria de Serviços Urbanos e Mobilidade",
  "Secretaria de Obras e Infraestrutura",
  "Secretaria de Agricultura",
  "Secretaria de Planejamento Urbano e Meio Ambiente",
  "Secretaria de Esporte e Lazer",
  "Secretaria de Assistência Social e Cidadania",
  "Gabinete do Prefeito",
] as const;

export type Departamento = (typeof DEPARTAMENTOS)[number];

export function veiculoLabel(v: { codigo?: string | null; nome?: string | null; placa?: string }) {
  return v.codigo || v.nome || v.placa || "Veículo";
}

/** Título do card: Marca/Modelo (cai para ID ou placa quando não informado). */
export function veiculoTitulo(v: {
  marca_modelo?: string | null;
  codigo?: string | null;
  nome?: string | null;
  placa?: string;
}) {
  return v.marca_modelo?.trim() || veiculoLabel(v);
}

/** Ordena por Departamento (A→Z) e, dentro dele, por Marca/Modelo (A→Z). */
export function ordenarVeiculos<
  T extends { departamento?: string | null; marca_modelo?: string | null; placa?: string },
>(lista: T[]) {
  const col = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });
  return [...lista].sort((a, b) => {
    const depA = (a.departamento || "").trim();
    const depB = (b.departamento || "").trim();
    if (!depA !== !depB) return depA ? -1 : 1;
    const d = col.compare(depA, depB);
    if (d !== 0) return d;
    return col.compare(veiculoTitulo(a), veiculoTitulo(b));
  });
}


export type TipoCusto = "combustivel" | "manutencao" | "seguro" | "imprevisto" | "outros";

export type Custo = {
  id: string;
  veiculo_id: string;
  tipo: TipoCusto;
  valor: number;
  km: number | null;
  data: string;
  descricao: string | null;
  pendente: boolean;
  created_at: string;
};

export type TipoDocumento = "documento" | "seguro" | "revisao";

export type Documento = {
  id: string;
  veiculo_id: string;
  tipo: TipoDocumento;
  vencimento: string;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

export type Motorista = {
  id: string;
  nome: string;
  contato: string | null;
  departamento: string | null;
  cnh_path: string | null;
  created_at: string;
  updated_at: string;
};

export type Manutencao = {
  id: string;
  veiculo_id: string;
  peca_servico: string;
  data: string;
  oficina: string | null;
  observacoes: string | null;
  valor: number | null;
  custo_id: string | null;
  created_at: string;
  updated_at: string;
};

export const statusVeiculoLabel: Record<StatusVeiculo, string> = {
  ativo: "Ativo",
  manutencao: "Em manutenção",
  desativado: "Desativado",
};

export const statusVeiculoTone: Record<StatusVeiculo, string> = {
  ativo: "bg-success/10 text-success border-success/30",
  manutencao: "bg-warning/15 text-warning-foreground border-warning/40",
  desativado: "bg-muted text-muted-foreground border-border",
};

export const tipoCustoLabel: Record<TipoCusto, string> = {
  combustivel: "Combustível",
  manutencao: "Manutenção",
  seguro: "Seguro",
  imprevisto: "Imprevisto",
  outros: "Outros",
};

export const tipoDocLabel: Record<TipoDocumento, string> = {
  documento: "Documento",
  seguro: "Seguro",
  revisao: "Revisão",
};

export async function listVeiculos() {
  const { data, error } = await supabase.from("veiculos").select("*").order("nome");
  if (error) throw error;
  return data as Veiculo[];
}

export async function listCustos() {
  const { data, error } = await supabase.from("custos").select("*").order("data", { ascending: false });
  if (error) throw error;
  return data as Custo[];
}

export async function listDocumentos() {
  const { data, error } = await supabase.from("documentos").select("*").order("vencimento");
  if (error) throw error;
  return data as Documento[];
}

export async function listMotoristas() {
  const { data, error } = await supabase.from("motoristas").select("*").order("nome");
  if (error) throw error;
  return data as Motorista[];
}

export async function listManutencoes() {
  const { data, error } = await supabase.from("manutencoes").select("*").order("data", { ascending: false });
  if (error) throw error;
  return data as Manutencao[];
}

export async function listEtiquetas() {
  const { data, error } = await supabase.from("etiquetas").select("*").order("nome");
  if (error) throw error;
  return data as Etiqueta[];
}

export type Lembrete = {
  id: string;
  titulo: string;
  data: string;
  observacao: string | null;
  concluido: boolean;
  created_at: string;
  updated_at: string;
};

export async function listLembretes() {
  const { data, error } = await supabase.from("lembretes").select("*").order("data");
  if (error) throw error;
  return data as Lembrete[];
}

export async function listVeiculoEtiquetas() {
  const { data, error } = await supabase.from("veiculo_etiquetas").select("veiculo_id, etiqueta_id");
  if (error) throw error;
  return data as VeiculoEtiqueta[];
}

export function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function formatData(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function statusVencimento(vencimento: string): "vencido" | "proximo" | "ok" {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [y, m, d] = vencimento.split("-").map(Number);
  const venc = new Date(y, m - 1, d);
  const diff = Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "vencido";
  if (diff <= 30) return "proximo";
  return "ok";
}

export function diasAteVencimento(vencimento: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [y, m, d] = vencimento.split("-").map(Number);
  const venc = new Date(y, m - 1, d);
  return Math.ceil((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}
