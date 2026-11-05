import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { normalizarTipo } from "./tipos-veiculo";

describe("Conversão do Tipo", () => {
  test("textos claros viram uma das 7 opções", () => {
    assert.equal(normalizarTipo("carro de passeio"), "Carro");
    assert.equal(normalizarTipo("AUTOMOVEL"), "Carro");
    assert.equal(normalizarTipo("hatch"), "Carro");
    assert.equal(normalizarTipo("MICROONIBUS"), "Van/Micro Ônibus");
    assert.equal(normalizarTipo("VAN"), "Van/Micro Ônibus");
    assert.equal(normalizarTipo("ÔNIBUS"), "Ônibus");
    assert.equal(normalizarTipo("CAMINHAO"), "Caminhão");
    assert.equal(normalizarTipo("TRATOR DE RODAS"), "Máquina");
    assert.equal(normalizarTipo("RETROESCAVADEIRA JCB227805B4JCB"), "Máquina");
    assert.equal(normalizarTipo("SEMI REBOQUE"), "Carreta");
  });
  test("textos incertos ou vazios ficam em branco", () => {
    for (const t of ["CAMINHONETE", "CAMIONETA", "AMBULANCIA", "FURGÃO", "Ultilitario", "Sem tipo", "", null]) {
      assert.equal(normalizarTipo(t), null);
    }
  });
});
