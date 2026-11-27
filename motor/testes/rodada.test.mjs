import assert from "node:assert/strict";
import test from "node:test";
import { carregarCatalogo } from "../catalogo/arquivo.mjs";
import { danoSemEfeitos, prepararMonstro } from "../regras/cartas.mjs";
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

test("ataque bloqueado consome o bônus de Foco", () => {
  const atacante = ficha("Krakon", 0, 1);
  const defensor = ficha("Owlzin", 0, 1);
  const rodada = jogo(atacante, defensor, [6, 4, 1]);
  turno(rodada, 4, 2);
  const antes = energias(rodada)[1];
  turno(rodada, 1, 3); // Repetir usa Defesa novamente.
  assert.equal(energias(rodada)[1], antes);
  turno(rodada, 3, 4); // Repetir usa Atacar, agora sem Foco.
  const dano = danoSemEfeitos(catalogo.monstros.get(atacante.monstroId), catalogo.monstros.get(defensor.monstroId), 4);
  assert.equal(energias(rodada)[1], antes - dano);
  rodada.conferirDados();
});

test("Desencaixe conserva Foco no primeiro ataque bloqueado e aplica Preso", () => {
  const atacante = ficha("Pinhisco", 0, 1);
  const defensor = ficha("Owlzin", 0, 1);
  const rodada = jogo(atacante, defensor, [6, 4, 2]);
  turno(rodada, 4, 3);
  turno(rodada, 1, 2);
  assert.ok(rodada.observar(0).jogadores[1].condicoes.includes(7));
  const antes = energias(rodada)[1];
  turno(rodada, 3, 4);
  const dano = danoSemEfeitos(catalogo.monstros.get(atacante.monstroId), catalogo.monstros.get(defensor.monstroId), 4, 0, 6);
  assert.equal(energias(rodada)[1], antes - dano);
  rodada.conferirDados();
});

test("Foco e Repetir acumulam os resultados integrais dos dados", () => {
  const atacante = ficha("Krakon", 0, 1);
  const defensor = ficha("Owlzin", 0, 1);
  const rodada = jogo(atacante, defensor, [3, 4, 2, 1]);
  turno(rodada, 4, 2);
  turno(rodada, 3, 3);
  const antes = energias(rodada)[1];
  turno(rodada, 1, 4);
  const dano = danoSemEfeitos(catalogo.monstros.get(atacante.monstroId), catalogo.monstros.get(defensor.monstroId), 2, 0, 7);
  assert.equal(energias(rodada)[1], antes - dano);
  rodada.conferirDados();
});

test("Redemoinho aplica Fissurado mesmo quando o rival bloqueia", () => {
  const rodada = jogo(ficha("Jaturru", 2), ficha("Krakuron", 0, 1), [4, 2, 1]);
  const antes = energias(rodada)[1];
  turno(rodada, 49, 2);
  assert.equal(energias(rodada)[1], antes);
  assert.ok(rodada.observar(0).jogadores[1].condicoes.includes(3));
  turno(rodada, 1, 4);
  assert.equal(energias(rodada)[1], antes - 12);
  rodada.conferirDados();
});

test("Muda de Casca remove Incendiar antes de recuperar energia", () => {
  const rodada = jogo(ficha("Casulã", 2), ficha("Krakuron", 1, 1), [4, 1, 1]);
  turno(rodada, 3, 1);
  turno(rodada, 2, 13);
  assert.ok(rodada.observar(0).jogadores[0].condicoes.includes(1));
  const antes = energias(rodada)[0];
  const eventos = turno(rodada, 9, 4);
  assert.equal(energias(rodada)[0], antes + 1);
  assert.equal(eventos.find(e => e.tipo === "cura").valor, 2);
  assert.deepEqual(rodada.observar(0).jogadores[0].condicoes, []);
  rodada.conferirDados();
});

test("Abrigo de Felpa remove Incendiar e cura ao bloquear", () => {
  const rodada = jogo(ficha("Mofurim", 1), ficha("Krakuron", 1, 2), [4, 1]);
  turno(rodada, 3, 5);
  turno(rodada, 2, 13);
  const antes = energias(rodada)[0];
  const eventos = turno(rodada, 51, 1);
  assert.ok(eventos.some(e => e.tipo === "bloqueio"));
  assert.ok(eventos.some(e => e.tipo === "cura" && e.valor === 2));
  assert.equal(energias(rodada)[0], antes + 1);
  assert.deepEqual(rodada.observar(0).jogadores[0].condicoes, []);
  rodada.conferirDados();
});

test("Raízes de Aterramento dissipa Sobrecarga e causa dano direto no bloqueio", () => {
  const rodada = jogo(ficha("Vesperaiz", 2), ficha("Estalume", 2));
  turno(rodada, 1, 36);
  assert.ok(rodada.observar(0).jogadores[1].condicoes.includes(5));
  const antes = energias(rodada);
  turno(rodada, 54, 1);
  assert.deepEqual(energias(rodada), [antes[0], antes[1] - 5]);
  assert.deepEqual(rodada.observar(0).jogadores[1].condicoes, []);
  rodada.conferirDados();
});

test("Segunda Onda recebe o bônus ao esgotar a mão", () => {
  const atacante = ficha("Pedrelho", 2);
  const defensor = ficha("Krakon", 4, 1);
  const rodada = jogo(atacante, defensor, [1, 4, 6, 4]);
  turno(rodada, 2, 4);
  turno(rodada, 3, 1);
  turno(rodada, 1, 2);
  turno(rodada, 30, 13);
  const antes = energias(rodada)[1];
  turno(rodada, 50, 3);
  const ataque = prepararMonstro(catalogo, atacante.monstroId, atacante.melhorias).monstro;
  const alvo = prepararMonstro(catalogo, defensor.monstroId, defensor.melhorias).monstro;
  assert.equal(energias(rodada)[1], antes - danoSemEfeitos(ataque, alvo, 4, 0, 3));
  rodada.conferirDados();
});

test("renovar as duas mãos acumula uma ficha por turno e aumenta o dano dos dois monstros", () => {
  const combatente = ficha("Owlzin");
  const fichaBase = catalogo.monstros.get(combatente.monstroId);
  const rodada = jogo(combatente, combatente, [4, 4, 4, 4, 4, 4]);
  for (const fichas of [0, 1, 2]) {
    assert.deepEqual(rodada.observar(0).jogadores.map(p => p.ofensiva), Array(2).fill(fichaBase.ofensiva + fichas));
    turno(rodada, 2, 2);
    turno(rodada, 3, 3);
    const antes = energias(rodada);
    const eventos = turno(rodada, 1, 1);
    const dano = danoSemEfeitos(fichaBase, fichaBase, 4, 0, fichas);
    assert.deepEqual(energias(rodada), antes.map(energia => energia - dano));
    assert.deepEqual(eventos.filter(e => e.tipo === "maos-renovadas").map(e => e.renovacoes), [fichas + 1]);
  }
  rodada.conferirDados();
  const seguinte = jogo(combatente, combatente);
  assert.equal(seguinte.observar(0).renovacoes, 0);
  assert.equal(seguinte.observar(0).jogadores[0].ofensiva, fichaBase.ofensiva);
});

test("evolução conserva as habilidades anteriores e combina as da nova forma", () => {
  const flouly = id("Flouly");
  assert.deepEqual(prepararMonstro(catalogo, flouly, 2).cartas, [26, 27]);
  assert.equal(prepararMonstro(catalogo, flouly, 3).monstro.nome, "Flourosa");
  assert.deepEqual(prepararMonstro(catalogo, flouly, 3).cartas, [26, 27, 40]);
  assert.deepEqual(prepararMonstro(catalogo, flouly, 4).cartas, [26, 27, 40, 41]);
  assert.equal(prepararMonstro(catalogo, flouly, 3, false).monstro.id, flouly);
  const rodada = jogo(ficha("Flouly", 3), ficha("Owlzin"));
  assert.deepEqual(rodada.observar(0).mao, [1, 2, 3, 26, 27, 40]);
  assert.deepEqual(prepararMonstro(catalogo, id("Krakon"), 3).cartas, [11, 12]);
  assert.deepEqual(prepararMonstro(catalogo, id("Krakon"), 4).cartas, [11, 12, 13]);
});

test("Ritmo de Caça ativa após o segundo ataque seguido do rival mesmo se Coroâmbar bloqueou o primeiro", () => {
  const rodada = jogo(ficha("Sardâmbar", 3), ficha("Owlzin"), [4, 4]);
  const antes = energias(rodada)[1];
  turno(rodada, 2, 1);
  const eventos = turno(rodada, 1, 3);
  assert.ok(eventos.some(e => e.tipo === "efeito-ativado" && e.efeito === "Ritmo de Caça"));
  assert.equal(energias(rodada)[1], antes - 11);
  rodada.conferirDados();
});

test("toda habilidade da evolução acrescenta uma carta à coleção herdada", () => {
  for (const origem of catalogo.monstros.values()) {
    const indice = origem.melhorias.findIndex(m => m.tipo === "evolucao");
    if (indice < 0) continue;
    const anterior = prepararMonstro(catalogo, origem.id, indice);
    const evoluido = prepararMonstro(catalogo, origem.id, indice + 1);
    const novaForma = evoluido.monstro;
    const cartas = new Set(anterior.cartas);
    for (const habilidade of [...novaForma.inatas, ...novaForma.melhorias.filter(m => m.tipo === "habilidade").map(m => m.id)]) {
      assert.ok(!cartas.has(habilidade), `${novaForma.nome}: habilidade ${habilidade} repetida`);
      cartas.add(habilidade);
    }
  }
});

test("novas evoluções herdam habilidades e ativam suas passivas", () => {
  const casos = [
    ["Pumicão", "Cascalho em Órbita", 2, 1, []],
    ["Agulhio", "Mergulho Oportuno", 1, 39, [4, 2]],
    ["Borbulim", "Bolha Errante", 2, 1, []],
    ["Voltilim", "Corrente de Retorno", 1, 1, [4, 4]],
  ];
  for (const [nome, passiva, escolha, rival, dados] of casos) {
    const rodada = jogo(ficha(nome, 3, 1), ficha("Owlsel", 0, 1), dados);
    const preparado = prepararMonstro(catalogo, id(nome), 3);
    assert.equal(preparado.monstro.passiva, passiva);
    const eventos = turno(rodada, escolha, rival);
    assert.ok(eventos.some(e => e.tipo === "efeito-ativado" && e.efeito === passiva), passiva);
    if (passiva === "Bolha Errante") assert.ok(rodada.observar(0).jogadores[1].condicoes.includes(6));
    if (passiva === "Corrente de Retorno") assert.ok(rodada.observar(0).jogadores[0].condicoes.includes(5));
    rodada.conferirDados();
  }
  const rodada = jogo(ficha("Brotozelo", 3, 1), ficha("Krakon", 0, 1), [6]);
  turno(rodada, 3, 1);
  const ferido = energias(rodada)[0];
  const eventos = turno(rodada, 26, 2);
  assert.equal(energias(rodada)[0], ferido + 4);
  assert.ok(eventos.some(e => e.tipo === "efeito-ativado" && e.efeito === "Jardim de Retorno"));
  rodada.conferirDados();
});

test("novas habilidades de cura e bloqueio recuperam os valores descritos", () => {
  for (const [nome, pontos, habilidade, dados, cura] of [
    ["Owlzin", 3, 39, [6, 6], 4],
    ["Flouly", 4, 41, [6], 3],
    ["Cascalhote", 2, 22, [6], 2],
    ["Sardâmbar", 3, 43, [6], 3],
  ]) {
    const rodada = jogo(ficha(nome, pontos, 1), ficha("Owlzin", 0, 1), dados);
    turno(rodada, 3, 1);
    const ferido = energias(rodada)[0];
    turno(rodada, habilidade, [22, 43].includes(habilidade) ? 3 : 2);
    assert.equal(energias(rodada)[0], ferido + cura, nome);
    rodada.conferirDados();
  }
});

test("novos ataques aplicam bônus apenas quando suas condições são atendidas", () => {
  for (const [habilidade, defesa, bonus] of [[6, 3, 5], [40, 3, 0], [42, 3, 1], [42, 5, 0], [44, 3, 0], [45, 3, 1]]) {
    const monstros = new Map(catalogo.monstros);
    const atacante = monstros.get(id("Krakon"));
    const defensor = monstros.get(id("Owlzin"));
    monstros.set(atacante.id, { ...atacante, inatas: [habilidade], defesa: 3 });
    monstros.set(defensor.id, { ...defensor, defesa, energia: 24 });
    const rodada = jogo(ficha("Krakon", 0, 1), ficha("Owlzin", 0, 1), [4, 1], { catalogo: { ...catalogo, monstros } });
    const antes = energias(rodada)[1];
    turno(rodada, habilidade, 4);
    const esperado = danoSemEfeitos(monstros.get(atacante.id), monstros.get(defensor.id), 4, 0, bonus);
    assert.equal(energias(rodada)[1], antes - esperado, `habilidade ${habilidade}`);
    rodada.conferirDados();
  }
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
  assert.equal(energias(rodada)[0], antes[0] - 4);
  assert.equal(rodada.observar(0).jogadores[1].condicoes.includes(2), false);
  rodada.conferirDados();
});

test("Fissurado continua ativo após bloqueio e acrescenta dano com face baixa", () => {
  const rodada = jogo(ficha("Cascalhote", 1), ficha("Owlzin", 2, 1), [5, 2, 4, 3, 5]);
  turno(rodada, 34, 4);
  turno(rodada, 1, 2);
  assert.ok(rodada.observar(0).jogadores[1].condicoes.includes(3));
  const antes = energias(rodada);
  const eventos = turno(rodada, 3, 14);
  assert.ok(eventos.some(evento => evento.tipo === "dano" && evento.jogador === 1 && evento.valor === 9));
  assert.equal(energias(rodada)[1], antes[1] + 3 - 9);
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
    const rodada = jogo(ficha("Vinhabril", 1), ficha("Owlzin", 3, 1), [4, 2, 6, resultado]);
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
    const rodada = jogo(ficha("Estalume", 2), ficha("Owlzin", 3), [4, resultado, 2]);
    turno(rodada, 36, 1);
    const antes = energias(rodada);
    turno(rodada, 1, 14);
    assert.deepEqual(energias(rodada), [antes[0] - (resultado === 1 ? 2 : 0),
      antes[1] - (resultado === 5 ? 10 : 5)]);
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
  const rodada = jogo(ficha("Pipavent"), ficha("Owlzin", 1, 2), [3]);
  const antes = energias(rodada);
  turno(rodada, 1, 2);
  assert.equal(energias(rodada)[1], antes[1] - 7);
  turno(rodada, 2, 1);
  turno(rodada, 3, 3);
  assert.equal(rodada.observar(0).renovacoes, 1);
  assert.deepEqual(rodada.observar(0).mao, [1, 2, 3]);
  assert.deepEqual(rodada.observar(1).mao, [1, 2, 3, 5, 15]);
  turno(rodada, 1, 2);
  assert.equal(energias(rodada)[1], antes[1] - 7);
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

test("Proteção Compartilhada cura 1 ao bloquear, inclusive via Repetir", () => {
  const rodada = jogo(ficha("Owlzin", 0, 5), ficha("Krakon", 0, 2), [4, 4]);
  turno(rodada, 1, 5);
  const ferido = energias(rodada)[0];
  turno(rodada, 56, 2);
  assert.equal(energias(rodada)[0], ferido);
  const eventos = turno(rodada, 3, 1);
  assert.ok(eventos.some(e => e.tipo === "bloqueio" && e.jogador === 0));
  assert.equal(energias(rodada)[0], ferido + 1);
  rodada.conferirDados();
});

test("Plano de Campo adiciona 4 ao próximo ataque e Primeiros Cuidados cura 4", () => {
  const atacante = ficha("Krakon", 0, 6);
  const alvo = ficha("Owlzin", 0, 8);
  const rodada = jogo(atacante, alvo, [4]);
  turno(rodada, 57, 2);
  const antes = energias(rodada)[1];
  turno(rodada, 1, 59);
  const dano = danoSemEfeitos(catalogo.monstros.get(atacante.monstroId), catalogo.monstros.get(alvo.monstroId), 4, 0, 4);
  assert.equal(energias(rodada)[1], antes - dano);
  turno(rodada, 2, 3);
  assert.equal(energias(rodada)[1], antes - dano + 4);
  rodada.conferirDados();
});

test("habilidades de treinador não ativam os bônus contra habilidades de monstro", () => {
  const rodada = jogo(ficha("Grotufo", 0, 1), ficha("Krakon", 0, 4), [4]);
  const antes = energias(rodada)[0];
  const eventos = turno(rodada, 3, 55);
  assert.ok(eventos.some(e => e.tipo === "dano" && e.jogador === 0));
  assert.ok(energias(rodada)[0] < antes);
  rodada.conferirDados();
  const bloqueio = jogo(ficha("Penaferro", 1), ficha("Krakon", 0, 4), []);
  const vida = energias(bloqueio)[1];
  turno(bloqueio, 8, 55);
  assert.equal(energias(bloqueio)[1], vida);
  bloqueio.conferirDados();
});

test("Rasante letal cancela ataque normal, e dois ataques rápidos são simultâneos", () => {
  const catalogoBaixaEnergia = baixaEnergia("Agulhio", "Grotufo");
  const rapido = jogo(ficha("Agulhio", 1), ficha("Grotufo", 2), [6], { catalogo: catalogoBaixaEnergia });
  const eventos = turno(rapido, 23, 1);
  assert.ok(eventos.some(e => e.tipo === "acao-cancelada" && e.jogador === 1));
  rapido.conferirDados();
  const ambos = jogo(ficha("Agulhio", 1), ficha("Agulhio", 1), [6, 6], { catalogo: catalogoBaixaEnergia });
  const simultaneo = turno(ambos, 23, 23);
  assert.ok(!simultaneo.some(e => e.tipo === "acao-cancelada"));
  assert.equal(ambos.observar(0).resultado.tipo, "nocaute-simultaneo");
  ambos.conferirDados();
});

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

test("Gustavo não rerrola ataque nem condição de Sobrecarga", () => {
  const rodada = jogo(ficha("Estalume", 2), ficha("Owlzin", 3), [3, 1, 2], {
    rerrolar: ({ jogador }) => jogador === 0,
  });
  turno(rodada, 36, 1);
  const antes = energias(rodada)[0];
  const eventos = turno(rodada, 1, 14);
  assert.equal(eventos.filter(evento => evento.jogador === 0 && evento.repetida).length, 0);
  assert.equal(energias(rodada)[0], antes - 2);
  rodada.conferirDados();
});

test("Gustavo pode rerrolar o dado de uma habilidade de cura", () => {
  const rodada = jogo(ficha("Owlzin", 2, 3), ficha("Krakon", 0, 1), [4, 1, 6], {
    rerrolar: ({ jogador, motivo }) => jogador === 0 && motivo === "Curar I",
  });
  turno(rodada, 3, 1);
  const antes = energias(rodada)[0];
  const eventos = turno(rodada, 14, 2);
  assert.equal(energias(rodada)[0], antes + 3);
  assert.equal(eventos.filter(e => e.tipo === "rolagem" && e.repetida).length, 1);
  rodada.conferirDados();
});
