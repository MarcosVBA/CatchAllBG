import assert from "node:assert/strict";
import test from "node:test";
import { carregarCatalogo } from "../catalogo/arquivo.mjs";
import { prepararMonstro } from "../regras/cartas.mjs";
import { criarRodada } from "../regras/rodada.mjs";

const catalogo = await carregarCatalogo();
const id = nome => [...catalogo.monstros.values()].find(monstro => monstro.nome.toLowerCase() === nome.toLowerCase()).id;
const ficha = (nome, melhorias = 0, treinadorId = 3) => ({ monstroId: id(nome), melhorias, treinadorId });

function jogo(a, b, valores = [], opcoes = {}) {
  const dados = [...valores];
  const rodada = criarRodada({
    catalogo, combatentes: [a, b], ...opcoes,
    d6() {
      assert.ok(dados.length, "Rolagem inesperada");
      return dados.shift();
    },
  });
  return { ...rodada, conferirDados: () => assert.deepEqual(dados, []) };
}

function turno(rodada, a, b) {
  const abertura = rodada.iniciarTurno();
  const visao = rodada.observar(0);
  if (visao.resultado) return abertura;
  const cartas = [a, b];
  for (const jogador of visao.ordemDeEscolha ?? [0, 1]) {
    abertura.push(...rodada.escolherCarta(jogador, cartas[jogador]));
  }
  return abertura;
}

function energias(rodada) {
  return rodada.observar(0).jogadores.map(jogador => jogador.energia);
}

test("evolução consome os pontos da forma e a nova mão usa as cartas da evolução", () => {
  const flouly = id("Flouly");
  assert.deepEqual(prepararMonstro(catalogo, flouly, 2).cartas, [26, 27]);
  assert.equal(prepararMonstro(catalogo, flouly, 3).monstro.nome, "Flourosa");
  assert.deepEqual(prepararMonstro(catalogo, flouly, 3).cartas, [27]);
  assert.deepEqual(prepararMonstro(catalogo, flouly, 4).cartas, [27, 26]);
  assert.equal(prepararMonstro(catalogo, flouly, 3, false).monstro.id, flouly);
  const rodada = jogo(ficha("Flouly", 3), ficha("Owlzin"));
  assert.deepEqual(rodada.observar(0).mao, [1, 2, 3, 27]);
});

test("escolha comum fica oculta até a segunda carta e rejeita jogadas inválidas", () => {
  const rodada = jogo(ficha("Flouly"), ficha("Owlzin"));
  assert.throws(() => rodada.escolherCarta(0, 2), /não pode escolher/);
  rodada.iniciarTurno();
  assert.throws(() => rodada.escolherCarta(0, 13), /não está na mão/);
  assert.deepEqual(rodada.escolherCarta(0, 2), []);
  assert.equal(rodada.observar(1).revelada, null);
  assert.equal(rodada.observar(1).jogadores[0].anterior, null);
  assert.throws(() => rodada.escolherCarta(0, 1), /não pode escolher/);
  const eventos = rodada.escolherCarta(1, 1);
  assert.equal(eventos[0].tipo, "cartas-reveladas");
  assert.deepEqual(eventos[0].escolhas.map(escolha => escolha.carta), [2, 1]);
  assert.equal(eventos.some(evento => evento.tipo === "bloqueio"), true);
  assert.equal(rodada.observar(0).jogadores[0].anterior, 2);
});

test("Rastreado mostra só a carta do jogador rastreado antes da escolha adversária", () => {
  const rodada = jogo(ficha("Ninhombra", 1), ficha("Krakuron", 0, 1), [6, 4]);
  turno(rodada, 37, 4);
  rodada.iniciarTurno();
  assert.deepEqual(rodada.observar(0).ordemDeEscolha, [1, 0]);
  assert.throws(() => rodada.escolherCarta(0, 1), /não pode escolher/);
  assert.deepEqual(rodada.escolherCarta(1, 2), [{ tipo: "carta-revelada", turno: 2, jogador: 1, carta: 2 }]);
  assert.equal(rodada.observar(0).revelada, 2);
  rodada.escolherCarta(0, 1);
  assert.deepEqual(rodada.observar(0).jogadores[1].condicoes, []);
  rodada.conferirDados();
});

test("quando ambos estão Rastreados, as escolhas voltam a ser simultâneas", () => {
  const rodada = jogo(ficha("Ninhombra", 1), ficha("Ninhombra", 1), [5, 5]);
  turno(rodada, 37, 37);
  rodada.iniciarTurno();
  assert.equal(rodada.observar(0).ordemDeEscolha, null);
  assert.deepEqual(rodada.escolherCarta(1, 2), []);
  assert.equal(rodada.observar(0).revelada, null);
  rodada.escolherCarta(0, 2);
  assert.ok(rodada.observar(0).jogadores.every(jogador => jogador.condicoes.length === 0));
  rodada.conferirDados();
});

test("Preso mantém o bloqueio de Bolha de Água e suprime o contra-ataque", () => {
  const rodada = jogo(ficha("Lamatim", 1), ficha("Owlzin", 2, 1), [4, 2]);
  turno(rodada, 38, 4);
  assert.ok(rodada.observar(0).jogadores[1].condicoes.includes(7));
  const antes = energias(rodada);
  const eventos = turno(rodada, 1, 15);
  assert.deepEqual(energias(rodada), antes);
  assert.ok(eventos.some(evento => evento.tipo === "efeito-ativado" && evento.efeito === "Preso"));
  assert.equal(rodada.observar(0).jogadores[1].condicoes.includes(7), false);
  rodada.conferirDados();
});

test("Ofuscado diminui dano com face baixa e é consumido no primeiro acerto", () => {
  const rodada = jogo(ficha("Cinzarisco", 2), ficha("Krakuron"), [5, 3]);
  turno(rodada, 33, 1);
  const antes = energias(rodada);
  turno(rodada, 3, 3);
  assert.equal(energias(rodada)[0], antes[0] - 3);
  assert.equal(rodada.observar(0).jogadores[1].condicoes.includes(2), false);
  rodada.conferirDados();
});

test("Fissurado continua ativo após bloqueio e acrescenta dano com face baixa", () => {
  const rodada = jogo(ficha("Cascalhote", 1), ficha("Owlzin", 1, 1), [5, 2, 4, 3, 5]);
  turno(rodada, 34, 4);
  turno(rodada, 1, 2);
  assert.ok(rodada.observar(0).jogadores[1].condicoes.includes(3));
  const antes = energias(rodada);
  const eventos = turno(rodada, 3, 14);
  assert.ok(eventos.some(evento => evento.tipo === "dano" && evento.jogador === 1 && evento.valor === 7));
  assert.equal(energias(rodada)[1], antes[1] + 3 - 7);
  rodada.conferirDados();
});

test("uma condição sem gatilho vence no fim do segundo turno seguinte", () => {
  const rodada = jogo(ficha("Cinzarisco", 2), ficha("Krakuron"));
  turno(rodada, 33, 1);
  turno(rodada, 2, 3);
  assert.ok(rodada.observar(0).jogadores[1].condicoes.includes(2));
  const eventos = turno(rodada, 3, 2);
  assert.ok(eventos.some(evento => evento.tipo === "condicao-removida" && evento.condicao === 2 && evento.motivo === "prazo"));
  rodada.conferirDados();
});

test("Esporos pune 3 e deixa a cura inteira com 4", () => {
  for (const resultado of [3, 4]) {
    const rodada = jogo(ficha("Vinhabril", 1), ficha("Owlsel", 0, 1), [4, 2, 6, resultado]);
    turno(rodada, 35, 4);
    const antes = energias(rodada)[1];
    turno(rodada, 2, 14);
    assert.equal(energias(rodada)[1], antes + (resultado === 4 ? 3 : 0));
    assert.equal(rodada.observar(0).jogadores[1].condicoes.includes(4), false);
    rodada.conferirDados();
  }
});

test("Sobrecarga diferencia o risco da face 1 e o bônus da face 5", () => {
  for (const resultado of [1, 5]) {
    const rodada = jogo(ficha("Estalume", 2), ficha("Owlsel"), [4, resultado, 2]);
    turno(rodada, 36, 1);
    const antes = energias(rodada);
    turno(rodada, 1, 14);
    assert.deepEqual(energias(rodada), [antes[0] - (resultado === 1 ? 2 : 0),
      antes[1] - (resultado === 5 ? 10 : 6)]);
    rodada.conferirDados();
  }
});

test("Incendiar roda no início do turno, dura três testes e atravessa renovação", () => {
  const rodada = jogo(ficha("Krakuron", 1), ficha("Owlzin"), [1, 2, 3]);
  const antes = energias(rodada);
  turno(rodada, 13, 2);
  turno(rodada, 2, 3);
  const eventos = turno(rodada, 3, 1);
  assert.ok(eventos.some(evento => evento.tipo === "maos-renovadas"));
  assert.ok(rodada.observar(0).jogadores[1].condicoes.includes(1));
  turno(rodada, 2, 2);
  assert.equal(energias(rodada)[1], antes[1] - 3);
  assert.deepEqual(rodada.observar(0).jogadores[1].condicoes, []);
  rodada.conferirDados();
});

test("renovação repõe ambas as mãos e preserva o gasto de Fio Cortante", () => {
  const rodada = jogo(ficha("Pipavent"), ficha("Owlzin", 1, 2), [6]);
  const antes = energias(rodada);
  turno(rodada, 1, 2);
  assert.equal(energias(rodada)[1], antes[1] - 3);
  turno(rodada, 2, 1);
  turno(rodada, 3, 3);
  assert.equal(rodada.observar(0).renovacoes, 1);
  assert.deepEqual(rodada.observar(0).mao, [1, 2, 3]);
  assert.deepEqual(rodada.observar(1).mao, [1, 2, 3, 5, 14]);
  turno(rodada, 1, 2);
  assert.equal(energias(rodada)[1], antes[1] - 3);
  rodada.conferirDados();
});

function baixaEnergia(...nomes) {
  const monstros = new Map(catalogo.monstros);
  for (const nome of nomes) {
    const monstroId = id(nome);
    monstros.set(monstroId, { ...monstros.get(monstroId), energia: 3 });
  }
  return { ...catalogo, monstros };
}

test("Ataque Rápido letal cancela a ação adversária antes de outra rolagem", () => {
  const rodada = jogo(ficha("Flouly"), ficha("Krakuron", 0, 2), [6], { catalogo: baixaEnergia("Flouly") });
  const eventos = turno(rodada, 1, 5);
  assert.equal(eventos.find(evento => evento.tipo === "acao-cancelada").jogador, 0);
  assert.deepEqual(rodada.observar(0).resultado, { tipo: "nocaute", vencedor: 1 });
  rodada.conferirDados();
});

test("nocaute simultâneo é exposto ao chamador sem decidir vencedor", () => {
  const rodada = jogo(ficha("Flouly"), ficha("Owlzin"), [6, 6], { catalogo: baixaEnergia("Flouly", "Owlzin") });
  turno(rodada, 1, 1);
  assert.deepEqual(rodada.observar(0).resultado, { tipo: "nocaute-simultaneo", vencedor: null });
  assert.throws(() => rodada.iniciarTurno(), /não pode ser iniciado/);
  rodada.conferirDados();
});

test("Gustavo gasta no máximo uma rerrolagem por ataque, mesmo com Sobrecarga", () => {
  const rodada = jogo(ficha("Estalume", 2), ficha("Owlsel"), [3, 4, 1, 2], {
    sorteEmCondicoes: true, rerrolar: ({ jogador }) => jogador === 0,
  });
  turno(rodada, 36, 1);
  const antes = energias(rodada)[0];
  const eventos = turno(rodada, 1, 14);
  assert.equal(eventos.filter(evento => evento.jogador === 0 && evento.repetida).length, 1);
  assert.equal(energias(rodada)[0], antes - 2);
  rodada.conferirDados();
});
