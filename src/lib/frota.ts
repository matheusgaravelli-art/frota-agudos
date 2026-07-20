import { supabase } from "@/integrations/supabase/client";

export type Veiculo = {
  id: string;
  nome: string;
  placa: string;
  motorista: string | null;
  km_atual: number;
  created_at: string;
  updated_at: string;
};

export type Custo = {
  id: string;
  veiculo_id: string;
  tipo: "combustivel" | "manutencao" | "outros";
  valor: number;
  km: number | null;
  data: string;
  descricao: string | null;
  created_at: string;
};

export type Documento = {
  id: string;
  veiculo_id: string;
  tipo: "licenciamento" | "seguro" | "revisao";
  vencimento: string;
  observacao: string | null;
  created_at: string;
  updated_at: string;
};

export const tipoCustoLabel: Record<Custo["tipo"], string> = {
  combustivel: "Combustível",
  manutencao: "Manutenção",
  outros: "Outros",
};

export const tipoDocLabel: Record<Documento["tipo"], string> = {
  licenciamento: "Licenciamento",
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
