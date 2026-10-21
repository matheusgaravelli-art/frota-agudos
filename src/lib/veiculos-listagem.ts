import { ordenarVeiculos, SEM_DEPARTAMENTO, type StatusVeiculo } from "@/lib/frota";

export type AbaVeiculos = "veiculos" | "desativados";

export function pertenceAba(status: StatusVeiculo, aba: AbaVeiculos) {
  return aba === "desativados"
    ? status === "desativado"
    : status === "ativo" || status === "manutencao";
}

type Registro = {
  id: string;
  status: StatusVeiculo;
  codigo?: string | null;
  nome?: string | null;
  placa?: string;
  tipo?: string | null;
  cor?: string | null;
  departamento?: string | null;
  marca_modelo?: string | null;
};

export function filtrarVeiculos<T extends Registro>(
  veiculos: T[],
  filtros: {
    aba: AbaVeiculos;
    status: "todos" | StatusVeiculo;
    departamento: string;
    etiqueta: string;
    busca: string;
  },
  vinculos: { veiculo_id: string; etiqueta_id: string }[],
) {
  const q = filtros.busca.toLowerCase().trim();
  return ordenarVeiculos(veiculos.filter((v) => {
    if (!pertenceAba(v.status, filtros.aba)) return false;
    if (filtros.status !== "todos" && v.status !== filtros.status) return false;
    const dep = (v.departamento || "").trim();
    if (filtros.departamento === SEM_DEPARTAMENTO && dep) return false;
    if (filtros.departamento !== "todos" && filtros.departamento !== SEM_DEPARTAMENTO && dep !== filtros.departamento) return false;
    if (filtros.etiqueta !== "todos" && !vinculos.some((x) => x.veiculo_id === v.id && x.etiqueta_id === filtros.etiqueta)) return false;
    return !q || [v.codigo, v.nome, v.placa, v.tipo, v.cor, v.departamento, v.marca_modelo]
      .some((campo) => campo?.toLowerCase().includes(q));
  }));
}