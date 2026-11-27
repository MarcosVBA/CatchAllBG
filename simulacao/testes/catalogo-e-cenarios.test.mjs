import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { carregarCatalogo } from "../../motor/catalogo/arquivo.mjs";
import { tabelaCsv } from "../../motor/catalogo/csv.mjs";
import { lerCatalogo, TABELAS } from "../../motor/catalogo/index.mjs";
import { simularDuracao, simularPares } from "../cenarios.mjs";

test("CSV lê BOM, CRLF, vírgulas, quebras e aspas dentro de campos", () => {
  assert.deepEqual(tabelaCsv('\uFEFFid,texto\r\n1,"uma, ""duas""\r\ntrês"\r\n'), [
    { id: "1", texto: 'uma, "duas"\r\ntrês' },
  ]);
  assert.throws(() => tabelaCsv('id,texto\r\n1,"aberto'), /fechamento/);
  assert.throws(() => tabelaCsv("id,texto\r\n1"), /Número de campos/);
});

test("catálogo atual resolve vínculos e rejeita melhoria inexistente", async () => {
  const catalogo = await carregarCatalogo();
  assert.equal(catalogo.monstros.size, 59);
  assert.deepEqual([...catalogo.habilidades.keys()], Array.from({ length: 54 }, (_, i) => i + 1));
  assert.equal(catalogo.condicoes.size, 7);
  assert.equal(catalogo.treinadores.size, 3);
  assert.equal([...catalogo.itens.values()].reduce((soma, item) => soma + item.quantidade, 0), 11);
  const textos = Object.fromEntries(await Promise.all(TABELAS.map(async tabela => [
    tabela, await readFile(new URL(`../../cartas/${tabela}.csv`, import.meta.url), "utf8"),
  ])));
  textos.monstros = textos.monstros.replace("habilidade:11", "habilidade:999");
  assert.throws(() => lerCatalogo(textos), /Habilidade 999 inválida/);
});

test("duração usa o motor reproduzivelmente com a mesma semente", async () => {
  const catalogo = await carregarCatalogo();
  const opcoes = { amostras: 8, semente: 123 };
  const primeira = simularDuracao(catalogo, opcoes);
  assert.deepEqual(simularDuracao(catalogo, opcoes), primeira);
  assert.deepEqual(Object.keys(primeira.ciclos[0].rodadasPorDuelo), ["1"]);
  assert.equal(primeira.ciclos.length, 3);
});

test("cenário por pares cobre todos os pares sem confrontar um monstro consigo mesmo", async () => {
  const catalogo = await carregarCatalogo();
  const resultados = simularPares(catalogo, { amostras: 1, semente: 777 });
  assert.equal(resultados.pares, 1711);
  assert.equal(resultados.rodadas, 1711);
  assert.ok(resultados.porMonstro.every(monstro => monstro.rodadas === 58));
  assert.equal(resultados.ataqueBasico.nocauteAcimaDe50PorCento, 0);
});
