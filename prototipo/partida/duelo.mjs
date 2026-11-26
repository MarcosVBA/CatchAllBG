import { criarRodada } from "../../motor/regras/rodada.mjs";
import { rerrolagemAutomatica } from "../../simulacao/estrategia.mjs";

export function criarDuelo({ catalogo, participantes, vitoriasNecessarias, rng, itensDe, emitir, limiteTurnos = 120 }) {
  const placar = [0, 0];
  const ids = participantes.map(p => p.id);
  const disponiveis = participantes.map(p => [...p.equipe]);
  let escolhas = [null, null];
  let rodada;
  let indice = 0;
  let repetida = false;
  let vencedor = null;

  function publicar(eventos) {
    for (const evento of eventos) {
      const jogador = evento.jogador === undefined ? undefined : ids[evento.jogador];
      emitir({ ...evento, jogador, participantes: [...ids], numeroRodada: indice + 1 });
    }
  }

  function desempatar() {
    for (let i = 0; i < 30; i++) {
      const valores = ids.map(() => rng.inteiro(1, 6));
      publicar([{ tipo: "dados-de-desempate", valores }]);
      if (valores[0] !== valores[1]) return Number(valores[1] > valores[0]);
    }
    return rng.inteiro(0, 1);
  }

  function pontuar(lado) {
    for (const [i, monstro] of escolhas.entries()) {
      disponiveis[i] = disponiveis[i].filter(m => m.chave !== monstro.chave);
    }
    placar[lado]++;
    publicar([{ tipo: "rodada-vencida", jogador: lado, placar: [...placar] }]);
    repetida = false;
    if (placar[lado] === vitoriasNecessarias) {
      vencedor = ids[lado];
    } else {
      indice++;
    }
  }

  function prepararEscolha() {
    rodada = null;
    escolhas = [null, null];
    if (vencedor !== null || disponiveis.every(equipe => equipe.length)) return;
    const lado = disponiveis[0].length ? 0 : disponiveis[1].length ? 1 : desempatar();
    vencedor = ids[lado];
    publicar([{ tipo: "equipe-esgotada", jogador: lado }]);
  }

  function prepararRodada() {
    const combatentes = participantes.map((p, lado) => ({
      monstroId: escolhas[lado].monstroId, melhorias: escolhas[lado].melhorias,
      treinadorId: p.treinadorId, itens: itensDe(p.id),
    }));
    rodada = criarRodada({ catalogo, combatentes, d6: () => rng.inteiro(1, 6), rerrolar: rerrolagemAutomatica });
    const monstros = rodada.observar(0).jogadores.map(p => p.monstroId);
    publicar([{ tipo: "rodada-iniciada", monstros, repetida }]);
  }

  function avancar() {
    let visao = rodada.observar(0);
    if (visao.fase === "inicio" && visao.turno < limiteTurnos) {
      publicar(rodada.iniciarTurno());
      visao = rodada.observar(0);
    }
    if (visao.fase === "escolha") return;

    let ganhador = visao.resultado?.vencedor ?? null;
    if (!visao.resultado) {
      const [a, b] = visao.jogadores;
      const diferenca = a.energia * b.energiaMaxima - b.energia * a.energiaMaxima;
      publicar([{ tipo: "limite-da-rodada" }]);
      if (diferenca) ganhador = Number(diferenca < 0);
    }
    if (ganhador === null) {
      repetida = true;
      publicar([{ tipo: "repetir-rodada", motivo: visao.resultado?.tipo ?? "energia-igual" }]);
    } else {
      pontuar(ganhador);
    }
    prepararEscolha();
  }

  function vez() {
    if (vencedor !== null) return null;
    if (!rodada) return ids[escolhas.indexOf(null)];
    const lado = rodada.observar(0).podeEscolher ? 0 : 1;
    return ids[lado];
  }

  function observar(jogador) {
    if (vencedor !== null) return null;
    const lado = ids.indexOf(jogador);
    const resumo = { participantes: [...ids], placar: [...placar], numeroRodada: indice + 1, vitoriasNecessarias };
    if (lado === -1) return resumo;
    if (!rodada) return { ...resumo, lado, fase: "selecao", repetida,
      disponiveis: disponiveis.map(equipe => equipe.map(m => m.chave)) };
    return { ...rodada.observar(lado), ...resumo, lado };
  }

  function jogar(jogador, tipo, id) {
    if (vencedor !== null || jogador !== vez()) throw new Error("Aguarde a vez de jogar.");
    const lado = ids.indexOf(jogador);
    if (!rodada) {
      const monstro = tipo === "combatente" && disponiveis[lado].find(m => m.chave === id);
      if (!monstro) throw new Error("Esse monstro não está disponível para a rodada.");
      escolhas[lado] = monstro;
      if (escolhas.includes(null)) return;
      prepararRodada();
    } else {
      if (tipo !== "item" && tipo !== "carta") throw new Error("Escolha uma carta ou item.");
      publicar(tipo === "item" ? rodada.escolherItem(lado, id) : rodada.escolherCarta(lado, id));
    }
    avancar();
  }

  prepararEscolha();
  return { vez, observar, jogar, get vencedor() { return vencedor; } };
}
