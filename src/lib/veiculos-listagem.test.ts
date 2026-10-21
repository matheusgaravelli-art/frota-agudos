import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
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
    assert.deepEqual(lista.map((v) => v.id), ["a", "m"]);
    assert.equal(lista.length, 2);
  });
  test("Desativados lista e conta apenas Desativado", () => {
    const lista = filtrarVeiculos(veiculos, { ...filtros, aba: "desativados" }, []);
    assert.deepEqual(lista.map((v) => v.id), ["e", "d"]);
    assert.equal(lista.length, 2);
  });
  test("departamento, etiqueta e busca funcionam juntos no contador", () => {
    const lista = filtrarVeiculos(veiculos, { ...filtros, aba: "desativados", departamento: "Saúde", etiqueta: "alugado", busca: "DDD" }, [{ veiculo_id: "d", etiqueta_id: "alugado" }]);
    assert.deepEqual(lista.map((v) => v.id), ["d"]);
    assert.equal(lista.length, 1);
    assert.equal(filtrarVeiculos(veiculos, { ...filtros, aba: "desativados", busca: "AAA" }, []).length, 0);
  });
  test("limpar filtros restaura somente o total da aba", () => {
    assert.equal(filtrarVeiculos(veiculos, { ...filtros, aba: "desativados" }, []).length, 2);
    assert.equal(filtrarVeiculos(veiculos, filtros, []).length, 2);
  });
  test("desativar e reativar muda a aba sem modificar os demais dados", () => {
    const original = veiculos[0];
    if (!original) throw new Error("Registro de teste ausente");
    const desativado = { ...original, status: "desativado" as StatusVeiculo };
    assert.equal(pertenceAba(desativado.status, "veiculos"), false);
    assert.equal(pertenceAba(desativado.status, "desativados"), true);
    const reativado = { ...desativado, status: "ativo" as StatusVeiculo };
    assert.equal(pertenceAba(reativado.status, "veiculos"), true);
    assert.equal(pertenceAba(reativado.status, "desativados"), false);
    assert.deepEqual(reativado, original);
  });
});