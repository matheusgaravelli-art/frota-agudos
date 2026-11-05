export const TIPOS_VEICULO = [
  "Carro", "Caminhão", "Van/Micro Ônibus", "Ônibus", "Moto", "Carreta", "Máquina",
] as const;
export type TipoVeiculo = (typeof TIPOS_VEICULO)[number];

/** Valor do seletor para "Sem tipo" (gravado como campo vazio). */
export const SEM_TIPO = "sem";
export const SEM_TIPO_LABEL = "Sem tipo";

function limpar(t: string) {
  return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9/ ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Converte texto livre para uma das 7 opções; retorna null quando não há certeza. */
export function normalizarTipo(texto?: string | null): TipoVeiculo | null {
  const t = limpar(texto ?? "");
  if (!t) return null;
  const exato = TIPOS_VEICULO.find((o) => limpar(o) === t);
  if (exato) return exato;
  if (/\bmicro/.test(t) || /^van\b/.test(t) || t === "van") return "Van/Micro Ônibus";
  if (/\bonibus\b/.test(t)) return "Ônibus";
  if (/\b(caminhao|caminhoes)\b/.test(t)) return "Caminhão";
  if (/\b(moto|motocicleta|motoneta)\b/.test(t)) return "Moto";
  if (/\b(carreta|reboque|semi reboque|semirreboque)\b/.test(t)) return "Carreta";
  if (/\b(trator|retroescavadeira|retro|escavadeira|motoniveladora|pa carregadeira|rolo compactador|maquina)\b/.test(t)) return "Máquina";
  if (/\b(carro|automovel|carro de passeio|sedan|seda|hatch)\b/.test(t)) return "Carro";
  return null;
}
