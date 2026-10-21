import { describe, expect, test } from "bun:test";
import { filtrarVeiculos, pertenceAba } from "./veiculos-listagem";
import type { StatusVeiculo } from "./frota";

const veiculos = [
  { id: "a", status: "ativo" as StatusVeiculo, departamento: "Saúde", placa: "AAA1234" },
  { id: "m", status: "manutencao" as StatusVeiculo, departamento: "Saúde", placa: "MMM1234" },
  { id: "d", status: "desativado" as StatusVeiculo, departamento: "Saúde", placa: "DDD1234" },
  { id: "e", status: "desativado" as StatusVeiculo, departamento: "Educação", placa: "EEE1234" },
];
const filtros = { aba: "veiculos" as const, status: "todos" as const, departamento: "todos", etiqueta: "todos", busca: "" };

describe("Separação dos veículos por aba", () => {
  test("Veículos lista e conta apenas Ativo e Em manutenção", () => {
    const lista = filtrarVeiculos(veiculos, filtros, []);
    expect(lista.map((v) => v.id)).toEqual(["a", "m"]);
    expect(lista.length).toBe(2);
  });
  test("Desativados lista e conta apenas Desativado", () => {
    const lista = filtrarVeiculos(veiculos, { ...filtros, aba: "desativados" }, []);
    expect(lista.map((v) => v.id)).toEqual(["e", "d"]);
    expect(lista.length).toBe(2);
  });
  test("departamento, etiqueta e busca funcionam juntos no contador", () => {
    const lista = filtrarVeiculos(veiculos, { ...filtros, aba: "desativados", departamento: "Saúde", etiqueta: "alugado", busca: "DDD" }, [{ veiculo_id: "d", etiqueta_id: "alugado" }]);
    expect(lista.map((v) => v.id)).toEqual(["d"]);
    expect(lista.length).toBe(1);
    expect(filtrarVeiculos(veiculos, { ...filtros, aba: "desativados", busca: "AAA" }, []).length).toBe(0);
  });
  test("limpar filtros restaura somente o total da aba", () => {
    expect(filtrarVeiculos(veiculos, { ...filtros, aba: "desativados" }, []).length).toBe(2);
    expect(filtrarVeiculos(veiculos, filtros, []).length).toBe(2);
  });
  test("desativar e reativar muda a aba sem modificar os demais dados", () => {
    const original = veiculos[0];
    if (!original) throw new Error("Registro de teste ausente");
    const desativado = { ...original, status: "desativado" as StatusVeiculo };
    expect(pertenceAba(desativado.status, "veiculos")).toBe(false);
    expect(pertenceAba(desativado.status, "desativados")).toBe(true);
    const reativado = { ...desativado, status: "ativo" as StatusVeiculo };
    expect(pertenceAba(reativado.status, "veiculos")).toBe(true);
    expect(pertenceAba(reativado.status, "desativados")).toBe(false);
    expect(reativado).toEqual(original);
  });
});