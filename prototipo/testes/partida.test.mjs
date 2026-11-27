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
    for (const participante of visao.participantes) {
      assert.ok(participante.equipe.length <= (visao.fase === "dispensar" && participante.id === vez ? 4 : 3));
    }
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
  for (const semente of [1, 2, 3, 4, 5, 6, 7, 8, 912]) {
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

test("captura com equipe cheia permite dispensar qualquer monstro antes da melhoria", () => {
  for (const dispensarNovo of [false, true]) {
    const partida = criarPartida({ catalogo, rng: gerador(42) });
    const ia = gerador(974);
    let passos = 0;
    while (partida.observar().fase !== "dispensar") {
      assert.ok(partida.vez !== null && ++passos < 2500);
      const vez = partida.vez;
      const visao = partida.observar(vez);
      partida.agir(vez, escolherIa(visao, catalogo, ia));
    }
    const vez = partida.vez;
    const visao = partida.observar(vez);
    const equipe = visao.participantes[vez].equipe;
    assert.equal(equipe.length, 4);
    assert.deepEqual(visao.opcoes.map(o => o.valor), equipe.map(m => m.chave));
    const removido = equipe[dispensarNovo ? 3 : 0];
    partida.agir(vez, `dispensar:${removido.chave}`);
    const depois = partida.observar(vez);
    assert.equal(depois.fase, "melhoria");
    assert.equal(depois.participantes[vez].equipe.length, 3);
    assert.ok(!depois.participantes[vez].equipe.some(m => m.chave === removido.chave));
    assert.equal(partida.acontecimentos().at(-1).tipo, "monstro-removido");
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
  assert.equal(espectador.participantes[p.vez].itens, undefined);
});

test("mesma semente e decisões geram o mesmo resultado e histórico", () => {
  assert.deepEqual(executar(5), executar(5));
});

function dueloParaTeste({ catalogoDeTeste = catalogo, limiteTurnos, vitoriasNecessarias = 2 } = {}) {
  const eventos = [];
  const duelo = criarDuelo({
    catalogo: catalogoDeTeste,
    participantes: [
      { id: 1, treinadorId: 1, equipe: [
        { chave: 11, monstroId: 1, melhorias: 0 },
        { chave: 12, monstroId: 3, melhorias: 0 },
        { chave: 13, monstroId: 1, melhorias: 0 },
      ] },
      { id: 3, treinadorId: 1, equipe: [
        { chave: 31, monstroId: 3, melhorias: 0 },
        { chave: 32, monstroId: 1, melhorias: 0 },
        { chave: 33, monstroId: 3, melhorias: 0 },
      ] },
    ], vitoriasNecessarias, itensDe: () => [], limiteTurnos,
    rng: { inteiro: () => 6 }, emitir: evento => eventos.push(evento),
  });
  return { duelo, eventos };
}

test("a primeira escolha de combatente fica em segredo até a segunda", () => {
  const { duelo, eventos } = dueloParaTeste();
  const antes = [1, 3, 0].map(id => duelo.observar(id));
  assert.throws(() => duelo.jogar(3, "combatente", 31), /Aguarde/);
  assert.throws(() => duelo.jogar(1, "combatente", 31), /não está disponível/);
  duelo.jogar(1, "combatente", 12);
  assert.equal(duelo.vez(), 3);
  assert.deepEqual([1, 3, 0].map(id => duelo.observar(id)), antes);
  assert.deepEqual(eventos, []);
  duelo.jogar(3, "combatente", 32);
  assert.deepEqual(eventos[0].monstros, [3, 1]);
  assert.deepEqual(duelo.observar(3).jogadores.map(m => m.monstroId), [3, 1]);
});

test("empates consecutivos permitem trocar e uma vitória retira as duas cópias escolhidas", () => {
  const monstros = new Map(catalogo.monstros);
  for (const id of [1, 3]) monstros.set(id, { ...monstros.get(id), energia: 1 });
  const { duelo, eventos } = dueloParaTeste({ catalogoDeTeste: { ...catalogo, monstros } });
  const disponiveis = duelo.observar(1).disponiveis;

  for (const [esquerda, direita] of [[11, 31], [12, 32]]) {
    duelo.jogar(1, "combatente", esquerda);
    duelo.jogar(3, "combatente", direita);
    duelo.jogar(1, "carta", 1);
    duelo.jogar(3, "carta", 1);
    const escolha = duelo.observar(1);
    assert.equal(escolha.fase, "selecao");
    assert.equal(escolha.numeroRodada, 1);
    assert.equal(escolha.repetida, true);
    assert.deepEqual(escolha.placar, [0, 0]);
    assert.deepEqual(escolha.disponiveis, disponiveis);
  }
  assert.deepEqual(eventos.filter(e => e.tipo === "rodada-iniciada").map(e => e.monstros), [[1, 3], [3, 1]]);
  assert.equal(eventos.filter(e => e.tipo === "repetir-rodada").length, 2);
  assert.ok(!eventos.some(e => e.tipo === "dados-de-desempate"));

  duelo.jogar(1, "combatente", 11);
  duelo.jogar(3, "combatente", 32);
  duelo.jogar(1, "carta", 1);
  duelo.jogar(3, "carta", 3);
  const escolha = duelo.observar(3);
  assert.equal(escolha.numeroRodada, 2);
  assert.equal(escolha.repetida, false);
  assert.deepEqual(escolha.placar, [1, 0]);
  assert.deepEqual(escolha.disponiveis, [[12, 13], [31, 33]]);
  assert.throws(() => duelo.jogar(1, "combatente", 11), /não está disponível/);
  duelo.jogar(1, "combatente", 13);
  assert.throws(() => duelo.jogar(3, "combatente", 32), /não está disponível/);
  duelo.jogar(3, "combatente", 33);
  duelo.jogar(1, "carta", 1);
  duelo.jogar(3, "carta", 3);
  assert.equal(duelo.vencedor, 1);
  const seguinte = dueloParaTeste().duelo;
  assert.deepEqual(seguinte.observar(1).disponiveis, disponiveis);
});

test("o limite de turnos reabre a escolha com proporções iguais e pontua com proporções diferentes", () => {
  const { duelo, eventos } = dueloParaTeste({ limiteTurnos: 1 });
  duelo.jogar(1, "combatente", 11);
  duelo.jogar(3, "combatente", 31);
  duelo.jogar(1, "carta", 2);
  duelo.jogar(3, "carta", 2);
  assert.equal(eventos.at(-1).motivo, "energia-igual");
  assert.deepEqual(duelo.observar(1).disponiveis, [[11, 12, 13], [31, 32, 33]]);
  duelo.jogar(1, "combatente", 12);
  duelo.jogar(3, "combatente", 32);
  duelo.jogar(1, "carta", 1);
  duelo.jogar(3, "carta", 3);
  assert.deepEqual(duelo.observar(1).placar, [1, 0]);
  assert.deepEqual(duelo.observar(1).disponiveis, [[11, 13], [31, 33]]);
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
  const { energia, energiaMaxima } = rodada.observar(0).jogadores[0];
  assert.equal(energia, energiaMaxima);
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
  const { energia, energiaMaxima } = rodada.observar(0).jogadores[0];
  assert.equal(energia, Math.min(energiaMaxima, ferido + 4));
  assert.deepEqual(rodada.observar(0).itens, []);
});
