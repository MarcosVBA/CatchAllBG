import assert from "node:assert/strict";
import test from "node:test";
import { carregarCatalogo } from "../../motor/catalogo/arquivo.mjs";
import { gerador } from "../../simulacao/sorteio.mjs";
import { criarPartida } from "../partida/partida.mjs";
import { criarDuelo } from "../partida/duelo.mjs";
import { escolherIa } from "../partida/ia.mjs";
import { criarRodada } from "../../motor/regras/rodada.mjs";

const catalogo = await carregarCatalogo();

function executar(semente) {
  const partida = criarPartida({ catalogo, rng: gerador(semente) });
  const ia = gerador(932 + semente);
  const eventos = [];
  let decisoes = 0;
  while (partida.vez !== null) {
    assert.ok(++decisoes < 2500, "A partida precisa terminar sem travar.");
    const vez = partida.vez;
    const visao = partida.observar(vez);
    assert.ok(visao.opcoes.length);
    const acao = escolherIa(visao, catalogo, ia);
    assert.ok(visao.opcoes.some(opcao => opcao.id === acao));
    partida.agir(vez, acao);
    eventos.push(...partida.acontecimentos(eventos.at(-1)?.sequencia));
  }
  return { visao: partida.observar(), eventos };
}

test("quatro participantes atravessam os três ciclos e todos os itens aparecem nas amostras", () => {
  const itens = new Set();
  const tipos = new Set();
  for (const semente of [1, 2, 3, 4, 5, 912]) {
    const { visao, eventos } = executar(semente);
    assert.equal(visao.fase, "final");
    assert.ok(visao.campeao >= 0 && visao.campeao < 4);
    assert.equal(visao.participantes.length, 4);
    assert.equal(visao.participantes.reduce((soma, p) => soma + p.trofeus, 0), 6);
    for (const ciclo of [1, 2, 3]) {
      const duelos = visao.resultados.filter(resultado => resultado.ciclo === ciclo && !resultado.desempate);
      assert.equal(duelos.length, 2);
      assert.equal(new Set(duelos.flatMap(duelo => duelo.participantes)).size, 4);
    }
    for (const evento of eventos) {
      tipos.add(evento.tipo);
      if (evento.tipo === "item-consumido") itens.add(evento.itemId);
    }
  }
  assert.deepEqual([...itens].sort(), [1, 2, 3, 4, 5]);
  for (const tipo of ["captura", "fuga", "evolucao", "desempate-iniciado", "maos-renovadas", "partida-encerrada"]) {
    assert.ok(tipos.has(tipo), tipo);
  }
});

test("escolhas iniciais podem ter cópias próprias e opções privadas não vazam", () => {
  const p = criarPartida({ catalogo, rng: gerador(42) });
  assert.throws(() => p.agir((p.vez + 1) % 4, "treinador:1"), /Aguarde/);
  assert.throws(() => p.agir(p.vez, "treinador:999"), /não está disponível/);
  while (p.observar().fase === "treinador") p.agir(p.vez, "treinador:3");
  while (p.observar().fase === "inicial") p.agir(p.vez, "inicial:5");
  const v = p.observar();
  assert.equal(new Set(v.participantes.map(pessoa => pessoa.equipe[0].chave)).size, 4);
  assert.ok(v.participantes.every(pessoa => pessoa.equipe[0].monstroId === 5 && pessoa.treinadorId === 3));
  p.agir(p.vez, "trilha:Montanha");
  const espectador = p.observar((p.vez + 1) % 4);
  assert.equal(espectador.captura, null);
  assert.deepEqual(espectador.opcoes, []);
  assert.equal(espectador.participantes[p.vez].escala, undefined);
  assert.equal(espectador.participantes[p.vez].itens, undefined);
});

test("mesma semente e decisões geram o mesmo resultado e histórico", () => {
  assert.deepEqual(executar(5), executar(5));
});

test("nocaute simultâneo repete uma vez e a segunda ocorrência vai para o d6", () => {
  const monstros = new Map(catalogo.monstros);
  for (const id of [1, 3]) monstros.set(id, { ...monstros.get(id), energia: 1 });
  const dados = [6, 6, 6, 6, 2, 5];
  const eventos = [];
  const duelo = criarDuelo({
    catalogo: { ...catalogo, monstros }, participantes: [
      { id: 1, treinadorId: 1, equipe: [{ monstroId: 1, melhorias: 0 }] },
      { id: 3, treinadorId: 1, equipe: [{ monstroId: 3, melhorias: 0 }] },
    ], vitoriasNecessarias: 1, itensDe: () => [],
    rng: { inteiro() { assert.ok(dados.length); return dados.shift(); } },
    emitir: evento => eventos.push(evento),
  });
  for (let i = 0; i < 4; i++) duelo.jogar(duelo.vez(), "carta", 1);
  assert.equal(duelo.vencedor, 3);
  assert.equal(eventos.filter(evento => evento.tipo === "repetir-rodada").length, 1);
  assert.deepEqual(eventos.find(evento => evento.tipo === "dados-de-desempate").valores, [2, 5]);
  assert.equal(dados.length, 0);
});

function rodadaComItens(itens) {
  return criarRodada({ catalogo, d6: () => 4, combatentes: [
    { monstroId: 5, treinadorId: 1, itens },
    { monstroId: 1, treinadorId: 2 },
  ] });
}

test("Super Cura recupera energia e consome uma cópia sem gastar carta da mão", () => {
  const rodada = rodadaComItens([2, 2]);
  rodada.iniciarTurno();
  assert.throws(() => rodada.escolherItem(0, 2), /não pode ser usado/);
  rodada.escolherCarta(0, 1);
  rodada.escolherCarta(1, 1);
  rodada.iniciarTurno();
  const mao = rodada.observar(0).mao;
  assert.deepEqual(rodada.escolherItem(0, 2), []);
  assert.equal(rodada.observar(1).itemRevelado, null);
  const eventos = rodada.escolherCarta(1, 2);
  assert.equal(eventos.find(e => e.tipo === "item-consumido").itemId, 2);
  assert.equal(rodada.observar(0).jogadores[0].energia, 21);
  assert.deepEqual(rodada.observar(0).mao, mao);
});

test("Salva Vidas mantém a cópia sem ataque e bloqueia, cura e consome ao ser atacado", () => {
  const rodada = rodadaComItens([3]);
  rodada.iniciarTurno();
  rodada.escolherCarta(0, 3);
  rodada.escolherCarta(1, 1);
  const ferido = rodada.observar(0).jogadores[0].energia;
  rodada.iniciarTurno();
  rodada.escolherItem(0, 3);
  const semAtaque = rodada.escolherCarta(1, 2);
  assert.equal(semAtaque.some(e => e.tipo === "item-consumido"), false);
  rodada.iniciarTurno();
  assert.deepEqual(rodada.observar(0).itens, [3]);
  rodada.escolherItem(0, 3);
  const bloqueou = rodada.escolherCarta(1, 5);
  assert.ok(bloqueou.some(e => e.tipo === "bloqueio" && e.itemId === 3));
  assert.ok(bloqueou.some(e => e.tipo === "item-consumido" && e.itemId === 3));
  assert.equal(rodada.observar(0).jogadores[0].energia, Math.min(21, ferido + 4));
  assert.deepEqual(rodada.observar(0).itens, []);
});
