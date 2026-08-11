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
  created_at: string;
  updated_at: string;
};

export function veiculoLabel(v: { codigo?: string | null; nome?: string | null; placa?: string }) {
  return v.codigo || v.nome || v.placa || "Veículo";
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
