import { readFile, writeFile } from "node:fs/promises";
import { carregarCatalogo } from "../../motor/catalogo/arquivo.mjs";
import { ATAQUES, fraqueza as bonusFraqueza } from "../../motor/regras/cartas.mjs";
import { criarRodada } from "../../motor/regras/rodada.mjs";
import { criarPartida } from "../../prototipo/partida/partida.mjs";
import { escolherIa } from "../../prototipo/partida/ia.mjs";
import { escolher, rerrolagemAutomatica } from "../../simulacao/estrategia.mjs";
import { gerador } from "../../simulacao/sorteio.mjs";

const catalogo = await carregarCatalogo();
const formas = [...catalogo.monstros.values()];
const treinadores = [...catalogo.treinadores.values()];
const duplas = treinadores.flatMap(a => treinadores.filter(b => a !== b).map(b => [a.id, b.id]));
const amostras = duplas.length * 3;
const semente = 47821;
const sementeVariacao = 612007;
const totalPartidas = 900;
const soma = valores => valores.reduce((a, b) => a + b, 0);
const media = valores => valores.length ? soma(valores) / valores.length : 0;
const resultado = () => ({ n: 0, v: 0, e: 0 });
const impacto = () => ({ n: 0, mudou: 0, trocou: 0 });
const numero = valor => valor.toLocaleString("pt-BR");

function contar(tabela, vencedor, lado) {
  tabela.n++;
  tabela.v += Number(vencedor === lado);
  tabela.e += Number(vencedor === null);
}

function comparar(tabela, antes, depois) {
  tabela.n++;
  tabela.mudou += Number(antes !== depois);
  tabela.trocou += Number(antes !== null && depois !== null && antes !== depois);
}

function estatisticas(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const n = ordenados.length;
  return { n, media: media(ordenados), p10: ordenados[Math.floor(n * .1)] ?? 0,
    mediana: (ordenados[Math.floor((n - 1) / 2)] + ordenados[Math.floor(n / 2)]) / 2 || 0,
    p90: ordenados[Math.floor(n * .9)] ?? 0 };
}

function ficha(monstro, treinadorId, amostra) {
  const origem = monstro.papel === "evolucao" ? catalogo.monstros.get(monstro.verso) : null;
  const indice = origem?.melhorias.findIndex(m => m.tipo === "evolucao" && m.id === monstro.id) ?? -1;
  return indice >= 0
    ? { monstroId: origem.id, treinadorId, melhorias: indice + 1 + amostra % 2 }
    : { monstroId: monstro.id, treinadorId, melhorias: 1 + amostra % 3, evoluir: false };
}

function jogarRodada(combatentes, seed, opcoes = {}) {
  const ataque = gerador(seed + 101 + (opcoes.ataque ?? 0));
  const efeitos = gerador(seed + 211 + (opcoes.efeitos ?? 0));
  const cartas = [gerador(seed + 307 + (opcoes.cartas ?? 0)), gerador(seed + 401 + (opcoes.cartas ?? 0))];
  const dados = opcoes.catalogo ?? catalogo;
  const jogo = criarRodada({
    catalogo: dados, combatentes, rerrolar: rerrolagemAutomatica,
    d6: ({ motivo }) => motivo === "ataque" ? ataque.inteiro(opcoes.minimo ?? 1, opcoes.maximo ?? 6) : efeitos.inteiro(1, 6),
  });
  const detalhar = opcoes.detalhar;
  const energia = jogo.observar(0).jogadores.map(p => p.energia);
  const dano = [0, 0];
  const turnosComDano = new Set();
  function processar(eventos) {
    if (!detalhar) return;
    for (const e of eventos) {
      if (e.tipo === "dano") {
        const efetivo = Math.min(Math.max(0, energia[e.jogador]), e.valor);
        energia[e.jogador] -= e.valor;
        dano[1 - e.jogador] += efetivo;
        if (efetivo) turnosComDano.add(e.turno);
      }
      if (e.tipo === "cura") {
        energia[e.jogador] += e.valor;
        detalhar.cura += e.valor;
      }
      if (e.tipo === "cartas-reveladas") detalhar.ataquesRevelados += e.escolhas.filter(c => ATAQUES.has(c.efeito)).length;
      if (e.tipo === "bloqueio") {
        detalhar.bloqueios++;
        if (e.parcial) detalhar.bloqueiosParciais++;
      }
      if (e.tipo === "condicao-aplicada") detalhar.condicoes[e.condicao] = (detalhar.condicoes[e.condicao] ?? 0) + 1;
    }
  }
  let visao = jogo.observar(0);
  while (!visao.resultado && visao.turno < 80) {
    processar(jogo.iniciarTurno());
    visao = jogo.observar(0);
    if (visao.resultado) break;
    for (const lado of visao.ordemDeEscolha ?? [0, 1]) {
      const atual = jogo.observar(lado);
      const carta = opcoes.uniforme === lado
        ? atual.mao[cartas[lado].inteiro(0, atual.mao.length - 1)]
        : escolher(atual, lado, dados, cartas[lado], false);
      processar(jogo.escolherCarta(lado, carta));
    }
    visao = jogo.observar(0);
  }
  return { vencedor: visao.resultado?.vencedor ?? null, turno: visao.turno, dano,
    turnosComDano: turnosComDano.size, limite: !visao.resultado };
}

function testarFontes(combatentes, seed, base, destinos, intervalo) {
  const novo = 1000003;
  for (const [chave, valores] of Object.entries({
    todos: { ataque: novo, efeitos: novo },
    ataque: { ataque: novo },
    efeitos: { efeitos: novo },
    escolhas: { cartas: novo },
  })) comparar(destinos[chave], base, jogarRodada(combatentes, seed, { ...intervalo, ...valores }).vencedor);
}

function simularPares() {
  const matriz = [];
  const dadosFormas = formas.map(({ id, nome, papel }) => ({ id, nome, papel, ...resultado(), dano: 0, turnos: 0 }));
  const dadosTreinadores = treinadores.map(({ id, nome }) => ({ id, nome, ...resultado(),
    rivais: Object.fromEntries(treinadores.filter(t => t.id !== id).map(t => [t.id, resultado()])) }));
  const porTreinador = new Map(dadosTreinadores.map(t => [t.id, t]));
  const dano = { dano: 0, cura: 0, ataquesRevelados: 0, bloqueios: 0, bloqueiosParciais: 0, condicoes: {} };
  const impactos = { todos: impacto(), ataque: impacto(), efeitos: impacto(), escolhas: impacto() };
  const variacao = { todos: impacto(), ataque: impacto(), efeitos: impacto(), escolhas: impacto(), estreito: impacto() };
  const contraUniforme = resultado();
  const fraquezas = { n: 0, atual: 0, sem: 0 };
  const semFraquezas = { ...catalogo, monstros: new Map(formas.map(m => [m.id, { ...m, fraquezas: [] }])) };
  const turnos = [], danos = [];
  let simultaneos = 0, limites = 0, turnosComDano = 0;
  for (const [i, a] of formas.entries()) for (let j = i + 1; j < formas.length; j++) {
    const b = formas[j];
    const vantagem = bonusFraqueza(a, b) - bonusFraqueza(b, a);
    const favorecido = vantagem > 0 ? 0 : 1;
    const par = resultado(), tPar = [], dPar = [];
    for (let t = 0; t < amostras; t++) {
      const ids = duplas[t % duplas.length];
      // Varia melhorias independentemente dos treinadores.
      const nivel = Math.floor(t / duplas.length);
      const combatentes = [ficha(a, ids[0], nivel), ficha(b, ids[1], nivel)];
      const deslocamento = 317 * a.id + 2879 * b.id + 131 * t;
      const seed = semente + deslocamento;
      const atual = jogarRodada(combatentes, seed, { detalhar: dano });
      contar(par, atual.vencedor, 0);
      for (const [lado, indice] of [i, j].entries()) {
        const m = dadosFormas[indice], tr = porTreinador.get(ids[lado]);
        contar(m, atual.vencedor, lado);
        m.dano += atual.dano[lado];
        m.turnos += atual.turno;
        contar(tr, atual.vencedor, lado);
        contar(tr.rivais[ids[1 - lado]], atual.vencedor, lado);
      }
      limites += Number(atual.limite);
      simultaneos += Number(atual.vencedor === null && !atual.limite);
      turnosComDano += atual.turnosComDano;
      turnos.push(atual.turno); tPar.push(atual.turno);
      const totalDano = soma(atual.dano);
      danos.push(totalDano); dPar.push(totalDano);
      dano.dano += totalDano;
      if (t % 10 < 3) {
        testarFontes(combatentes, seed, atual.vencedor, impactos);
        const uniforme = (i + j + Math.floor(t / 10)) % 2;
        contar(contraUniforme, jogarRodada(combatentes, seed, { uniforme }).vencedor, 1 - uniforme);
      }
      if (vantagem && t % 30 === 0) {
        const sem = jogarRodada(combatentes, seed, { catalogo: semFraquezas }).vencedor;
        const pontos = vencedor => vencedor === null ? .5 : Number(vencedor === favorecido);
        fraquezas.n++;
        fraquezas.atual += pontos(atual.vencedor);
        fraquezas.sem += pontos(sem);
      }
      if (t < 12) {
        const sv = sementeVariacao + deslocamento;
        const base = jogarRodada(combatentes, sv).vencedor;
        testarFontes(combatentes, sv, base, variacao);
        const intervalo = { minimo: 2, maximo: 5 };
        comparar(variacao.estreito, jogarRodada(combatentes, sv, intervalo).vencedor,
          jogarRodada(combatentes, sv, { ...intervalo, ataque: 1000003, efeitos: 1000003 }).vencedor);
      }
    }
    matriz.push([i, j, par.v, par.n - par.v - par.e, par.e, +media(tPar).toFixed(2), +media(dPar).toFixed(2)]);
  }
  return { pares: { semente, amostras, matriz, formas: dadosFormas, treinadores: dadosTreinadores, dano, turnosComDano,
    limites, simultaneos, acimaDe24Turnos: turnos.filter(t => t > 24).length,
    turnos: estatisticas(turnos), danoRodadas: estatisticas(danos), impacto: impactos, contraUniforme },
    fraqueza: fraquezas, variacao };
}

function jogarPartida(seed, alteracao, registrar) {
  const combate = gerador(seed + 101 + (alteracao === "dadosCombate" ? 1000003 : 0));
  const captura = gerador(seed + 211 + (alteracao === "sorteCapturaESetup" ? 1000003 : 0));
  const ia = gerador(seed + 307 + (alteracao === "escolhasIa" ? 1000003 : 0));
  let emDuelo = false;
  const rng = { inteiro: (a, b) => (emDuelo ? combate : captura).inteiro(a, b) };
  const partida = criarPartida({ catalogo, rng });
  let cursor = 0, turnos = 0, turnosDuelo = 0;
  const duelos = [];
  for (let passo = 0; partida.vez !== null; passo++) {
    if (passo === 10000) throw new Error(`Partida não terminou: semente ${seed}`);
    const id = partida.vez;
    const visao = partida.observar(id);
    let escolha = visao;
    if (id === 0) {
      const participantes = [...visao.participantes];
      participantes[0] = { ...participantes[0], perfil: "equilibrada" };
      escolha = { ...visao, participantes };
    }
    emDuelo = visao.fase === "combate" || visao.fase === "selecionar-combatente";
    partida.agir(id, escolherIa(escolha, catalogo, ia));
    if (registrar) for (const e of partida.acontecimentos(cursor)) {
      cursor = e.sequencia;
      if (e.tipo === "inicio-do-turno") { turnos++; turnosDuelo++; }
      if (e.tipo === "duelo-encerrado") {
        duelos.push([e.desempate ? 3 : e.ciclo - 1, turnosDuelo]);
        turnosDuelo = 0;
      }
    }
  }
  const final = partida.observar();
  return { campeao: final.campeao, treinadores: final.participantes.map(p => p.treinadorId), turnos, duelos };
}

function simularPartidas() {
  const impactos = { dadosCombate: impacto(), sorteCapturaESetup: impacto(), escolhasIa: impacto() };
  const porTreinador = Object.fromEntries(treinadores.map(t => [t.id, { n: 0, campeoes: 0 }]));
  const turnos = [], ciclos = [[], [], [], []];
  for (let i = 0; i < totalPartidas; i++) {
    const seed = semente + i * 7919;
    const base = jogarPartida(seed, null, true);
    turnos.push(base.turnos);
    for (const [ciclo, duracao] of base.duelos) ciclos[ciclo].push(duracao);
    for (const id of base.treinadores) porTreinador[id].n++;
    porTreinador[base.treinadores[base.campeao]].campeoes++;
    for (const [chave, dados] of Object.entries(impactos)) comparar(dados, base.campeao, jogarPartida(seed, chave, false).campeao);
  }
  return { semente, n: totalPartidas, partidaTurnos: estatisticas(turnos), porTreinador, impacto: impactos,
    ciclos: ciclos.map(valores => ({ duelos: estatisticas(valores) })) };
}

const { pares, fraqueza, variacao } = simularPares();
console.log(`${numero(pares.turnos.n)} rodadas-base concluídas. Simulando partidas completas.`);
const partidas = simularPartidas();
const condicoes = Object.fromEntries([...catalogo.condicoes.values()].map(c => [c.id, c.nome]));
const painel = new URL("./dashboard-balanceamento.html", import.meta.url);
const figura = new URL("./variacao-dos-combates.html", import.meta.url);
const dados = JSON.stringify({ geradoEm: new Date().toISOString(), pares, partidas, fraqueza, condicoes }).replaceAll("<", "\\u003c");
const html = await readFile(painel, "utf8");
const atualizado = html.replace(/(<script type="application\/json" id="ca-dados">)[^\n]*(<\/script>)/, (_, abre, fecha) => abre + dados + fecha);
if (atualizado === html && !html.includes(dados)) throw new Error("Dados do painel não encontrados.");
await writeFile(painel, atualizado);
const largura = Math.max(20, Math.ceil(Math.max(...Object.values(variacao).map(v => 100 * v.trocou / v.n)) / 5) * 5);
let indice = 0;
const valores = Object.values(variacao).map(v => 100 * v.trocou / v.n);
const figuraHtml = (await readFile(figura, "utf8"))
  .replace(/\d[\d.]* comparações por cenário · semente \d+/, `${numero(variacao.todos.n)} comparações por cenário · semente ${sementeVariacao}`)
  .replace(/\d+(?:[.,]\d+)?%<\/span><\/div>\s*<div class="trilho" aria-hidden="true"><span class="barra" style="--percentual:[\d.]+"/g, () => {
    const v = valores[indice++];
    return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</span></div>
    <div class="trilho" aria-hidden="true"><span class="barra" style="--percentual:${v.toFixed(2)}"`;
  })
  .replace(/var\(--percentual\) \* [\d.]+%/, `var(--percentual) * ${100 / largura}%`)
  .replace(/(<div class="eixo text-small" aria-hidden="true">).*?(<\/div>)/, (_, abre, fecha) =>
    abre + Array.from({ length: 5 }, (_, i) => `<span>${numero(largura * i / 4)}%</span>`).join("") + fecha);
if (indice !== valores.length) throw new Error("Barras da figura não encontradas.");
await writeFile(figura, figuraHtml);
console.log(JSON.stringify({ rodadas: pares.turnos, limites: pares.limites, partidas: partidas.partidaTurnos, variacao, fraqueza }, null, 2));
