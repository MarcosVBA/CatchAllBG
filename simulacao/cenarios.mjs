import { danoSemEfeitos } from "../motor/regras/cartas.mjs";
import { criarRodada } from "../motor/regras/rodada.mjs";
import { escolher, rerrolagemAutomatica } from "./estrategia.mjs";
import { amostrar, gerador } from "./sorteio.mjs";

function arredondar(valor) {
  return Math.round(valor * 1000) / 1000;
}

function somar(tabela, chave) {
  tabela[chave] = (tabela[chave] ?? 0) + 1;
}

function estatisticas(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const n = valores.length;
  return {
    media: arredondar(valores.reduce((soma, valor) => soma + valor, 0) / n),
    mediana: (ordenados[Math.floor((n - 1) / 2)] + ordenados[Math.floor(n / 2)]) / 2,
    faixaCentral80: [ordenados[Math.floor(n * 0.1)], ordenados[Math.floor(n * 0.9)]],
  };
}

function rodada(catalogo, combatentes, rng, opcoes, ocorrencias) {
  const jogo = criarRodada({
    catalogo, combatentes, d6: () => rng.inteiro(1, 6), rerrolar: rerrolagemAutomatica,
    pisoDano: opcoes.pisoDano,
  });
  function contar(eventos) {
    if (!ocorrencias) return;
    for (const evento of eventos) {
      if (evento.tipo === "efeito-ativado" || evento.tipo === "teste-de-efeito") {
        somar(ocorrencias, evento.tipo === "teste-de-efeito" ? `${evento.efeito} (testes)` : evento.efeito);
      } else if (evento.tipo === "condicao-aplicada") {
        somar(ocorrencias, `Condição ${evento.condicao} (aplicações)`);
      }
    }
  }
  let visao = jogo.observar(0);
  while (!visao.resultado && visao.turno < opcoes.limite) {
    contar(jogo.iniciarTurno());
    visao = jogo.observar(0);
    if (visao.resultado) break;
    for (const jogador of visao.ordemDeEscolha ?? [0, 1]) {
      const agora = jogo.observar(jogador);
      const carta = escolher(agora, jogador, catalogo, rng, opcoes.defensivo);
      contar(jogo.escolherCarta(jogador, carta));
    }
    visao = jogo.observar(0);
  }
  return { turno: visao.turno, renovacoes: visao.renovacoes,
    resultado: visao.resultado ?? { tipo: "limite", vencedor: null } };
}

function conferirOpcoes({ amostras, semente, limite, pisoDano }) {
  if (!Number.isSafeInteger(amostras) || amostras < 1 || !Number.isSafeInteger(limite) || limite < 1
    || !Number.isSafeInteger(semente) || semente < 0 || semente > 0xFFFFFFFF
    || (pisoDano !== 0 && pisoDano !== 1)) throw new RangeError("Parâmetros de simulação inválidos.");
}

function turnoResumo(rodadas) {
  const n = rodadas.length;
  return {
    rodadas: n,
    turnos: estatisticas(rodadas.map(resultado => resultado.turno)),
    fracaoComDuasRenovacoes: arredondar(rodadas.filter(resultado => resultado.renovacoes >= 2).length / n),
    nocautesSimultaneos: rodadas.filter(rodada => rodada.resultado.tipo === "nocaute-simultaneo").length,
    limiteAtingido: rodadas.filter(rodada => rodada.resultado.tipo === "limite").length,
  };
}

function ataquesPossiveis(a, b, piso) {
  let nocautes = 0;
  for (let dado = 1; dado <= 6; dado++) {
    if (danoSemEfeitos(a, b, dado, piso) >= b.energia) nocautes++;
  }
  return nocautes;
}

export function simularPares(catalogo, {
  amostras = 30, semente = 53131, limite = 80, pisoDano = 0, defensivo = false,
} = {}) {
  const opcoes = { amostras, semente, limite, pisoDano, defensivo };
  conferirOpcoes(opcoes);
  const monstros = [...catalogo.monstros.values()];
  if (monstros.length < 2) throw new Error("O cenário por pares exige pelo menos dois monstros.");
  const treinadores = [...catalogo.treinadores.keys()];
  const porMonstro = new Map(monstros.map(monstro => [monstro.id, { pontos: 0, rodadas: 0 }]));
  const rodadas = [];
  const ocorrencias = Object.create(null);
  const ataqueBasico = { nocautePossivel: 0, nocauteAcimaDe50PorCento: 0 };
  let pares = 0;
  for (const [i, a] of monstros.entries()) {
    for (const b of monstros.slice(i + 1)) {
      pares++;
      for (const [origem, alvo] of [[a, b], [b, a]]) {
        const nocautes = ataquesPossiveis(origem, alvo, pisoDano);
        if (nocautes) ataqueBasico.nocautePossivel++;
        if (nocautes > 3) ataqueBasico.nocauteAcimaDe50PorCento++;
      }
      for (let t = 0; t < amostras; t++) {
        const rng = gerador(semente + 317 * a.id + 2879 * b.id + 131 * t);
        const dupla = amostrar(treinadores, 2, rng);
        const combatentes = [a, b].map((monstro, j) => {
          const anterior = monstro.papel === "evolucao" ? catalogo.monstros.get(monstro.verso) : null;
          const indice = anterior?.melhorias.findIndex(m => m.tipo === "evolucao" && m.id === monstro.id) ?? -1;
          return indice >= 0
            ? { monstroId: anterior.id, treinadorId: dupla[j], melhorias: indice + 1 + t % 2 }
            : { monstroId: monstro.id, treinadorId: dupla[j], evoluir: false, melhorias: t % 3 + 1 };
        });
        const resultado = rodada(catalogo, combatentes, rng, opcoes, ocorrencias);
        rodadas.push(resultado);
        for (const [j, monstro] of [a, b].entries()) {
          const acumulado = porMonstro.get(monstro.id);
          acumulado.rodadas++;
          acumulado.pontos += resultado.resultado.vencedor === null ? 0.5 : Number(resultado.resultado.vencedor === j);
        }
      }
    }
  }
  return {
    pares, opcoes, ...turnoResumo(rodadas), ataqueBasico, ocorrencias,
    porMonstro: monstros.map(({ id, nome }) => {
      const { pontos, rodadas } = porMonstro.get(id);
      return { id, nome, rodadas, pontuacaoMedia: arredondar(pontos / rodadas) };
    }),
  };
}

function times(catalogo, ciclo, rng, bonusMelhoria) {
  const monstros = [...catalogo.monstros.values()];
  const iniciais = amostrar(monstros.filter(m => m.papel === "inicial"), 2, rng);
  const capturas = amostrar(monstros.filter(m => m.papel === "capturavel"), ciclo * 2, rng);
  const treinadores = amostrar([...catalogo.treinadores.keys()], 2, rng);
  return iniciais.map((inicial, i) => {
    const time = [inicial, ...capturas.filter((_, j) => j % 2 === i)].map(({ id }) => ({
      monstroId: id, treinadorId: treinadores[i], melhorias: 0,
    }));
    for (let etapa = 0; etapa < ciclo; etapa++) {
      if (etapa === 2) time.splice(rng.inteiro(0, 3), 1);
      const ultimo = Math.min(etapa + 1, 2);
      time[rng.inteiro(0, ultimo)].melhorias++;
      if (bonusMelhoria) time[rng.inteiro(0, ultimo)].melhorias++;
    }
    return amostrar(time, time.length, rng);
  });
}

export function simularDuracao(catalogo, {
  amostras = 6000, semente = 47821, limite = 60, pisoDano = 0, defensivo = false,
  empate = "sorteio", bonusMelhoria = false,
} = {}) {
  const opcoes = { amostras, semente, limite, pisoDano, defensivo, empate, bonusMelhoria };
  conferirOpcoes(opcoes);
  if (!["sorteio", "repetir"].includes(empate)) throw new RangeError("Desempate de simulação inválido.");
  const ciclos = [];
  for (const ciclo of [1, 2, 3]) {
    const rng = gerador(semente + ciclo);
    const rodadas = [];
    const duelos = [];
    const tamanhos = {};
    let inconclusivos = 0;
    for (let amostra = 0; amostra < amostras; amostra++) {
      const [a, b] = times(catalogo, ciclo, rng, bonusMelhoria);
      let turnos = 0;
      let disputadas = 0;
      const pontos = [0, 0];
      const limiteDeConfrontos = ciclo === 1 ? 1 : 3;
      for (let i = 0; i < limiteDeConfrontos; i++) {
        let resultado;
        let repeticoes = 0;
        do {
          resultado = rodada(catalogo, [a[i], b[i]], rng, opcoes);
          rodadas.push(resultado);
          turnos += resultado.turno;
          disputadas++;
        } while (empate === "repetir" && resultado.resultado.tipo === "nocaute-simultaneo" && ++repeticoes < 10);
        if (repeticoes === 10) break;
        const vencedor = resultado.resultado.vencedor ?? rng.inteiro(0, 1);
        if (++pontos[vencedor] === (ciclo === 1 ? 1 : 2)) break;
      }
      if (Math.max(...pontos) < (ciclo === 1 ? 1 : 2)) inconclusivos++;
      somar(tamanhos, disputadas);
      duelos.push(turnos);
    }
    ciclos.push({ ciclo, ...turnoResumo(rodadas), duracaoDosDuelos: estatisticas(duelos),
      rodadasPorDuelo: tamanhos, duelosInconclusivos: inconclusivos });
  }
  return { opcoes, ciclos };
}
