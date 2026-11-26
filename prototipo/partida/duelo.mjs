import { criarRodada } from "../../motor/regras/rodada.mjs";
import { rerrolagemAutomatica } from "../../simulacao/estrategia.mjs";

export function criarDuelo({ catalogo, participantes, vitoriasNecessarias, rng, itensDe, emitir, limiteTurnos = 120 }) {
  const placar = [0, 0];
  const ids = participantes.map(p => p.id);
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
    placar[lado]++;
    publicar([{ tipo: "rodada-vencida", jogador: lado, placar: [...placar] }]);
    repetida = false;
    if (placar[lado] === vitoriasNecessarias) {
      vencedor = ids[lado];
    } else {
      indice++;
    }
  }

  function prepararRodada() {
    const combatentes = participantes.map(p => {
      const monstro = p.equipe[indice];
      return monstro && { monstroId: monstro.monstroId, melhorias: monstro.melhorias, treinadorId: p.treinadorId, itens: itensDe(p.id) };
    });
    if (!combatentes.every(Boolean)) {
      const lado = combatentes[0] ? 0 : combatentes[1] ? 1 : desempatar();
      vencedor = ids[lado];
      publicar([{ tipo: "equipe-esgotada", jogador: lado }]);
      return;
    }
    rodada = criarRodada({ catalogo, combatentes, d6: () => rng.inteiro(1, 6), rerrolar: rerrolagemAutomatica });
    const monstros = rodada.observar(0).jogadores.map(p => p.monstroId);
    publicar([{ tipo: "rodada-iniciada", monstros, repetida }]);
  }

  function avancar() {
    while (vencedor === null) {
      if (!rodada) prepararRodada();
      if (vencedor !== null) return;
      let visao = rodada.observar(0);
      if (visao.fase === "inicio" && visao.turno < limiteTurnos) {
        publicar(rodada.iniciarTurno());
        visao = rodada.observar(0);
      }
      if (visao.fase === "escolha") return;
      const resultado = visao.resultado;
      rodada = null;
      if (!resultado) {
        const [a, b] = visao.jogadores;
        const diferenca = a.energia * b.energiaMaxima - b.energia * a.energiaMaxima;
        publicar([{ tipo: "limite-da-rodada" }]);
        pontuar(diferenca ? Number(diferenca < 0) : desempatar());
      } else if (resultado.vencedor !== null) {
        pontuar(resultado.vencedor);
      } else if (!repetida) {
        repetida = true;
        publicar([{ tipo: "repetir-rodada" }]);
      } else {
        pontuar(desempatar());
      }
    }
  }

  function vez() {
    if (!rodada || vencedor !== null) return null;
    const lado = rodada.observar(0).podeEscolher ? 0 : 1;
    return ids[lado];
  }

  function observar(jogador) {
    const lado = ids.indexOf(jogador);
    if (!rodada) return null;
    if (lado === -1) return { participantes: [...ids], placar: [...placar], numeroRodada: indice + 1 };
    const visao = rodada.observar(lado);
    return { ...visao, participantes: [...ids], lado, placar: [...placar], numeroRodada: indice + 1, vitoriasNecessarias };
  }

  function jogar(jogador, tipo, id) {
    if (jogador !== vez()) throw new Error("Aguarde a vez de jogar.");
    const lado = ids.indexOf(jogador);
    publicar(tipo === "item" ? rodada.escolherItem(lado, id) : rodada.escolherCarta(lado, id));
    avancar();
  }

  avancar();
  return { vez, observar, jogar, get vencedor() { return vencedor; } };
}
