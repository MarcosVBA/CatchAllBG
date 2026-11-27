import { BASE, ITENS_COMBATE, efetiva, prepararMonstro } from "./cartas.mjs";
import {
  consumirCondicao, efeitoDaRenovacao, encerrarEfeitos, iniciarCondicoes, resolverAcoes,
} from "./efeitos.mjs";

function combatente(catalogo, escolha, id) {
  const treinador = catalogo.treinadores.get(escolha.treinadorId);
  if (!treinador) throw new Error(`Treinador desconhecido: ${escolha.treinadorId}.`);
  const { monstro, cartas } = prepararMonstro(catalogo, escolha.monstroId, escolha.melhorias ?? 0, escolha.evoluir ?? true);
  const baralho = new Set([...BASE, ...treinador.cartas, ...cartas]);
  const itens = new Map();
  for (const id of escolha.itens ?? []) {
    if (ITENS_COMBATE.has(id) && catalogo.itens.has(id)) itens.set(id, (itens.get(id) ?? 0) + 1);
  }
  return {
    id, monstro, treinador, baralho, mao: new Set(baralho), energia: monstro.energia, itens,
    usos: new Set(), condicoes: new Map(), anterior: null, foco: 0, protecao: 0,
  };
}

export function criarRodada({
  catalogo, combatentes, d6, rerrolar = () => false, pisoDano = 0,
}) {
  if (!Array.isArray(combatentes) || combatentes.length !== 2 || typeof d6 !== "function" || typeof rerrolar !== "function") {
    throw new TypeError("A rodada exige dois combatentes e uma fonte de d6.");
  }
  if (pisoDano !== 0 && pisoDano !== 1) throw new RangeError("O piso de dano deve ser 0 ou 1.");
  const jogadores = combatentes.map((escolha, id) => combatente(catalogo, escolha, id));
  let fase = "inicio";
  let turno = 0;
  let renovacoes = 0;
  let resultado = null;
  let escolhas = [null, null];
  let rastreados = [false, false];
  let primeiro = null;
  let ataquesAnteriores = [false, false];
  let eventos = [];

  const contexto = {
    get turno() { return turno; },
    get bonusOfensiva() { return renovacoes; },
    pisoDano,
    emitir(tipo, dados = {}) { eventos.push({ tipo, turno, ...dados }); },
    rolar(p, motivo, repetida = false) {
      const detalhe = { jogador: p.id, motivo, repetida, turno };
      const valor = d6(detalhe);
      if (!Number.isInteger(valor) || valor < 1 || valor > 6) throw new RangeError("Um d6 precisa retornar um inteiro de 1 a 6.");
      contexto.emitir("rolagem", { ...detalhe, valor });
      return valor;
    },
    querRerrolar(p, motivo, valor) { return Boolean(rerrolar({ jogador: p.id, motivo, valor, turno })); },
  };

  function verificarNocaute() {
    const derrotados = jogadores.filter(p => p.energia <= 0).map(p => p.id);
    if (!derrotados.length) return false;
    resultado = { tipo: derrotados.length === 2 ? "nocaute-simultaneo" : "nocaute",
      vencedor: derrotados.length === 2 ? null : 1 - derrotados[0] };
    fase = "encerrada";
    for (const p of jogadores) {
      for (const condicao of p.condicoes.keys()) {
        contexto.emitir("condicao-removida", { jogador: p.id, condicao, motivo: "fim da rodada" });
      }
      p.condicoes.clear();
      p.protecao = 0;
    }
    contexto.emitir("fim-da-rodada", { resultado: { ...resultado } });
    return true;
  }

  function iniciarTurno() {
    if (fase !== "inicio") throw new Error("O turno não pode ser iniciado nesta fase.");
    eventos = [];
    turno++;
    contexto.emitir("inicio-do-turno");
    iniciarCondicoes(jogadores, contexto);
    if (!verificarNocaute()) {
      fase = "escolha";
      escolhas = [null, null];
      rastreados = jogadores.map(p => p.condicoes.has(6));
      primeiro = rastreados[0] === rastreados[1] ? null : rastreados.indexOf(true);
    }
    return eventos;
  }

  function idValido(id) {
    if (id !== 0 && id !== 1) throw new RangeError("O jogador deve ser 0 ou 1.");
  }

  function podeEscolher(id) {
    return fase === "escolha" && !escolhas[id] && (primeiro === null || id === primeiro || Boolean(escolhas[primeiro]));
  }

  function itensDisponiveis(jogador) {
    return [...jogador.itens].filter(([id, quantidade]) => quantidade > 0
      && (id !== 2 || jogador.energia < jogador.monstro.energia)).map(([id]) => id);
  }

  function observar(id) {
    idValido(id);
    const visiveis = jogadores.map(p => ({
      id: p.id, monstroId: p.monstro.id, treinadorId: p.treinador.id,
      energia: Math.max(0, p.energia), energiaMaxima: p.monstro.energia,
      ofensiva: p.monstro.ofensiva + renovacoes,
      condicoes: [...p.condicoes.keys()], anterior: p.anterior, tamanhoMao: p.mao.size,
    }));
    const visao = {
      fase, turno, renovacoes, jogadores: visiveis, podeEscolher: podeEscolher(id),
      ordemDeEscolha: fase === "escolha" && primeiro !== null ? [primeiro, 1 - primeiro] : null,
      revelada: fase === "escolha" && primeiro === 1 - id ? escolhas[primeiro]?.carta ?? null : null,
      itemRevelado: fase === "escolha" && primeiro === 1 - id ? escolhas[primeiro]?.itemId ?? null : null,
      efeitoRevelado: fase === "escolha" && primeiro === 1 - id ? escolhas[primeiro]?.efeito ?? null : null,
      resultado: resultado && { ...resultado },
    };
    visao.mao = [...jogadores[id].mao].sort((a, b) => a - b);
    visao.itens = itensDisponiveis(jogadores[id]);
    return visao;
  }

  function registrarEscolha(id, escolha) {
    eventos = [];
    escolhas[id] = escolha;
    if (id === primeiro) {
      contexto.emitir("carta-revelada", escolha.itemId
        ? { jogador: id, carta: null, itemId: escolha.itemId } : { jogador: id, carta: escolha.carta });
    }
    if (escolhas.some(escolha => escolha === null)) return eventos;

    contexto.emitir("cartas-reveladas", { escolhas: escolhas.map(escolha => ({ ...escolha })) });
    for (const [i, p] of jogadores.entries()) {
      p.mao.delete(escolhas[i].carta);
      p.anterior = escolhas[i].carta;
      if (rastreados[i]) consumirCondicao(p, 6, contexto);
    }
    if (primeiro !== null) contexto.emitir("efeito-ativado", { jogador: primeiro, efeito: "Rastreado" });
    ataquesAnteriores = resolverAcoes(jogadores, escolhas, contexto, ataquesAnteriores);
    if (verificarNocaute()) return eventos;

    for (const p of jogadores) encerrarEfeitos(p, contexto);
    if (jogadores.some(p => p.mao.size === 0)) {
      renovacoes++;
      for (const p of jogadores) p.mao = new Set(p.baralho);
      contexto.emitir("maos-renovadas", { renovacoes });
      for (const [i, p] of jogadores.entries()) efeitoDaRenovacao(p, jogadores[1 - i], renovacoes, contexto);
    }
    fase = "inicio";
    return eventos;
  }

  function validarEscolha(id) {
    idValido(id);
    if (!podeEscolher(id)) throw new Error("O jogador não pode escolher agora.");
    return jogadores[id];
  }

  function escolherCarta(id, carta) {
    const jogador = validarEscolha(id);
    if (!jogador.mao.has(carta)) throw new Error(`A carta ${carta} não está na mão do jogador.`);
    return registrarEscolha(id, { carta, efeito: efetiva(carta, jogador.anterior, catalogo.habilidades) });
  }

  function escolherItem(id, itemId) {
    const jogador = validarEscolha(id);
    if (!itensDisponiveis(jogador).includes(itemId)) throw new Error("O item não pode ser usado agora.");
    return registrarEscolha(id, { carta: null, itemId, efeito: ITENS_COMBATE.get(itemId) });
  }

  return { iniciarTurno, observar, escolherCarta, escolherItem };
}
