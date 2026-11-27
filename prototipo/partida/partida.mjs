import { prepararMonstro } from "../../motor/regras/cartas.mjs";
import { amostrar } from "../../simulacao/sorteio.mjs";
import { criarDuelo } from "./duelo.mjs";

const NOMES = ["Você", "Brasa", "Muralha", "Faísca"];
const PERFIS = ["humano", "agressiva", "defensiva", "oportunista"];
const TRILHAS = ["Montanha", "Floresta", "Riacho"];
const opcao = (tipo, valor) => ({ id: `${tipo}:${valor}`, tipo, valor });

export function criarPartida({ catalogo, rng }) {
  const jogadores = NOMES.map((nome, id) => ({ id, nome, perfil: PERFIS[id],
    treinadorId: null, equipe: [], itens: [], trofeus: 0 }));
  const capturaveis = [...catalogo.monstros.values()].filter(m => m.papel === "capturavel");
  const montes = new Map(TRILHAS.map(trilha => {
    const ids = capturaveis.filter(m => m.trilha === trilha).map(m => m.id);
    return [trilha, amostrar(ids, ids.length, rng)];
  }));
  const itens = [...catalogo.itens.values()].flatMap(item => Array(item.quantidade).fill(item.id));
  const baralhoItens = amostrar(itens, itens.length, rng);
  const treinadoresDisponiveis = amostrar([...catalogo.treinadores.keys()], 6, rng);
  const historico = [];
  const resultados = [];
  let iniciativa = rng.inteiro(0, 3);
  let ordem = [];
  let cursor = 0;
  let fase;
  let vez;
  let ciclo = 1;
  let chaveMonstro = 0;
  let captura = null;
  let origemCapturaPendente = null;
  let depoisMelhoria;
  let pares = [];
  let duelo;
  let parAtual;
  let eliminatoria = [];
  let emDesempate = false;
  let campeao = null;

  function emitir(evento) {
    historico.push({ ...evento, ciclo, sequencia: (historico.at(-1)?.sequencia ?? 0) + 1 });
    if (historico.length > 2000) historico.shift();
    if (evento.tipo === "item-consumido") consumirItem(jogadores[evento.jogador], evento.itemId);
  }

  function consumirItem(jogador, itemId) {
    const indice = jogador.itens.indexOf(itemId);
    if (indice < 0) throw new Error("A partida não contém a cópia do item usado.");
    jogador.itens.splice(indice, 1);
  }

  function monstro(jogador, monstroId) {
    jogador.equipe.push({ chave: ++chaveMonstro, monstroId, melhorias: 0 });
  }

  function novaOrdem(novaFase, girar = true) {
    if (girar) iniciativa = (iniciativa + 3) % 4;
    ordem = Array.from({ length: 4 }, (_, i) => (iniciativa + i) % 4);
    cursor = 0;
    vez = ordem[0];
    fase = novaFase;
  }

  function proximo(novaFase, quandoAcabar) {
    cursor++;
    if (cursor === ordem.length) {
      quandoAcabar();
    } else {
      vez = ordem[cursor];
      fase = novaFase;
    }
  }

  function devolverOpcoes() {
    if (captura?.trilha) montes.get(captura.trilha).push(...captura.opcoes);
  }

  function mostrarTrilhas(origem) {
    captura = { origem, trilha: null, opcoes: [], tentativa: null };
    fase = "trilha";
    if (![...montes.values()].some(monte => monte.length)) {
      emitir({ tipo: "captura-sem-monstros", jogador: vez });
      captura = null;
      fase = "poscaptura";
    }
  }

  function comprarOpcoes() {
    const monte = montes.get(captura.trilha);
    while (captura.opcoes.length < 3 && monte.length) captura.opcoes.push(monte.shift());
    if (captura.opcoes.length) {
      fase = "captura";
    } else {
      const { origem } = captura;
      emitir({ tipo: "trilha-esgotada", jogador: vez, trilha: captura.trilha });
      mostrarTrilhas(origem);
    }
  }

  function concederMelhoria(jogador, motivo, aoConcluir) {
    vez = jogador;
    fase = "melhoria";
    depoisMelhoria = { motivo, aoConcluir };
  }

  function confirmarCaptura(valor) {
    const escolhido = captura.tentativa;
    captura.opcoes.splice(captura.opcoes.indexOf(escolhido), 1);
    if (valor <= 2) {
      emitir({ tipo: "fuga", jogador: vez, monstroId: escolhido, trilha: captura.trilha });
      captura.tentativa = null;
      comprarOpcoes();
      return;
    }
    monstro(jogadores[vez], escolhido);
    emitir({ tipo: "captura", jogador: vez, monstroId: escolhido, trilha: captura.trilha });
    const { origem } = captura;
    devolverOpcoes();
    captura = null;
    origemCapturaPendente = origem;
    if (jogadores[vez].equipe.length > 3) fase = "dispensar";
    else concluirCaptura();
  }

  function concluirCaptura() {
    const origem = origemCapturaPendente;
    origemCapturaPendente = null;
    concederMelhoria(vez, origem === "normal" ? "captura" : origem, () => {
      fase = origem === "normal" ? "recompensa" : "poscaptura";
    });
  }

  function rolarCaptura(rerrolagem = false) {
    const valor = rng.inteiro(1, 6);
    emitir({ tipo: "dado-captura", jogador: vez, monstroId: captura.tentativa, valor, rerrolagem });
    if (valor <= 2 && !rerrolagem && catalogo.treinadores.get(jogadores[vez].treinadorId).sorte) {
      captura.rolagem = valor;
      fase = "sorte-captura";
    } else {
      confirmarCaptura(valor);
    }
  }

  function distribuirPontos(jogador, entrada, quantidade, motivo) {
    const antes = prepararMonstro(catalogo, entrada.monstroId, entrada.melhorias);
    entrada.melhorias += quantidade;
    const depois = prepararMonstro(catalogo, entrada.monstroId, entrada.melhorias);
    emitir({ tipo: "melhoria", jogador: jogador.id, monstroId: depois.monstro.id, quantidade, motivo });
    if (antes.monstro.id !== depois.monstro.id) {
      emitir({ tipo: "evolucao", jogador: jogador.id, antes: antes.monstro.id, monstroId: depois.monstro.id });
    }
  }

  function iniciarCapturas() {
    novaOrdem("trilha");
    emitir({ tipo: "ciclo-iniciado", jogador: vez });
    mostrarTrilhas("normal");
  }

  function organizarDesafios() {
    pares = [];
    novaOrdem("desafio");
  }

  function livres() {
    return ordem.filter(id => !pares.some(par => par.includes(id)));
  }

  function roteiro(id) {
    const jogador = jogadores[id];
    return { id, treinadorId: jogador.treinadorId, equipe: jogador.equipe };
  }

  function terminarPartida(id) {
    campeao = id;
    fase = "final";
    vez = null;
    emitir({ tipo: "partida-encerrada", jogador: id });
  }

  function fimDoCiclo() {
    if (ciclo < 3) {
      ciclo++;
      iniciarCapturas();
      return;
    }
    const maximo = Math.max(...jogadores.map(p => p.trofeus));
    eliminatoria = ordem.filter(id => jogadores[id].trofeus === maximo);
    if (eliminatoria.length === 1) {
      terminarPartida(eliminatoria[0]);
      return;
    }
    emDesempate = true;
    emitir({ tipo: "desempate-iniciado", participantes: [...eliminatoria] });
    iniciarDuelo(eliminatoria.splice(0, 2));
  }

  function fecharDuelo() {
    const ganhador = duelo.vencedor;
    const resumo = { ganhador, participantes: [...parAtual], ciclo, desempate: emDesempate };
    resultados.push(resumo);
    duelo = null;
    emitir({ tipo: "duelo-encerrado", jogador: ganhador, participantes: resumo.participantes, desempate: emDesempate });
    if (emDesempate) {
      if (eliminatoria.length) iniciarDuelo([ganhador, eliminatoria.shift()]);
      else terminarPartida(ganhador);
      return;
    }
    jogadores[ganhador].trofeus++;
    concederMelhoria(ganhador, "duelo", () => {
      if (pares.length) iniciarDuelo(pares.shift());
      else fimDoCiclo();
    });
  }

  function iniciarDuelo(par) {
    parAtual = par;
    emitir({ tipo: "duelo-iniciado", participantes: [...par], desempate: emDesempate });
    duelo = criarDuelo({ catalogo, participantes: par.map(roteiro), rng,
      vitoriasNecessarias: ciclo === 1 && !emDesempate ? 1 : 2,
      emitir, itensDe: id => jogadores[id].itens });
    atualizarDuelo();
  }

  function atualizarDuelo() {
    if (duelo.vencedor !== null) {
      fecharDuelo();
      return;
    }
    vez = duelo.vez();
    fase = duelo.observar(vez).fase === "selecao" ? "selecionar-combatente" : "combate";
  }

  function opcoesDaVez() {
    if (vez === null) return [];
    const jogador = jogadores[vez];
    switch (fase) {
      case "treinador": return treinadoresDisponiveis.map(id => opcao("treinador", id));
      case "inicial": return [...catalogo.monstros.values()].filter(m => m.papel === "inicial").map(m => opcao("inicial", m.id));
      case "trilha": return TRILHAS.filter(trilha => montes.get(trilha).length).map(trilha => opcao("trilha", trilha));
      case "captura": return captura.opcoes.map(id => opcao("captura", id));
      case "sorte-captura": return [opcao("sorte", "rerrolar"), opcao("sorte", "aceitar")];
      case "dispensar": return jogador.equipe.map(m => opcao("dispensar", m.chave));
      case "melhoria": return jogador.equipe.map(m => opcao("melhoria", m.chave));
      case "recompensa": return [opcao("recompensa", "melhoria"), ...(baralhoItens.length ? [opcao("recompensa", "item")] : [])];
      case "poscaptura": {
        const podeCapturar = [...montes.values()].some(monte => monte.length);
        return [
          opcao("continuar", "ciclo"),
          ...[...new Set(jogador.itens)].filter(id => id === 5 || podeCapturar
            && (id === 4 || id === 1 && jogador.equipe.length > 1)).map(id => opcao("preparacao", id)),
        ];
      }
      case "alvo-item": return jogador.equipe.map(m => opcao("alvo-item", m.chave));
      case "desafio": return livres().filter(id => id !== vez).map(id => opcao("desafio", id));
      case "selecionar-combatente": {
        const visao = duelo.observar(vez);
        return visao.disponiveis[visao.lado].map(chave => opcao("combatente", chave));
      }
      case "combate": {
        const visao = duelo.observar(vez);
        return [...visao.mao.map(id => opcao("carta", id)), ...visao.itens.map(id => opcao("item", id))];
      }
      default: throw new Error(`Fase desconhecida: ${fase}.`);
    }
  }

  let itemPendente = null;

  function agir(id, acao) {
    if (id !== vez) throw new Error("Aguarde a vez desse jogador.");
    const escolhida = opcoesDaVez().find(o => o.id === acao);
    if (!escolhida) throw new Error("Essa ação não está disponível.");
    const { tipo, valor } = escolhida;
    const jogador = jogadores[id];
    const alvo = () => jogador.equipe.find(m => m.chave === valor);
    switch (tipo) {
      case "treinador":
        jogador.treinadorId = valor;
        treinadoresDisponiveis.splice(treinadoresDisponiveis.indexOf(valor), 1);
        emitir({ tipo: "treinador-escolhido", jogador: id, treinadorId: valor });
        proximo("treinador", () => novaOrdem("inicial"));
        break;
      case "inicial":
        monstro(jogador, valor);
        emitir({ tipo: "inicial-escolhido", jogador: id, monstroId: valor });
        proximo("inicial", iniciarCapturas);
        break;
      case "trilha":
        captura.trilha = valor;
        emitir({ tipo: "trilha-escolhida", jogador: id, trilha: valor });
        comprarOpcoes();
        break;
      case "captura":
        captura.tentativa = valor;
        rolarCaptura();
        break;
      case "sorte":
        if (valor === "rerrolar") rolarCaptura(true);
        else confirmarCaptura(captura.rolagem);
        break;
      case "dispensar": {
        const dispensado = alvo();
        const forma = prepararMonstro(catalogo, dispensado.monstroId, dispensado.melhorias).monstro;
        jogador.equipe.splice(jogador.equipe.indexOf(dispensado), 1);
        emitir({ tipo: "monstro-removido", jogador: id, monstroId: forma.id });
        concluirCaptura();
        break;
      }
      case "melhoria":
        distribuirPontos(jogador, alvo(), 1, depoisMelhoria.motivo);
        depoisMelhoria.aoConcluir();
        break;
      case "recompensa":
        if (valor === "melhoria") {
          concederMelhoria(id, "recompensa", () => { fase = "poscaptura"; });
        } else {
          const itemId = baralhoItens.pop();
          jogador.itens.push(itemId);
          emitir({ tipo: "item-comprado", jogador: id, itemId });
          fase = "poscaptura";
        }
        break;
      case "continuar":
        proximo("trilha", organizarDesafios);
        if (fase === "trilha") mostrarTrilhas("normal");
        break;
      case "preparacao":
        if (valor === 4) {
          emitir({ tipo: "item-consumido", jogador: id, itemId: 4 });
          mostrarTrilhas("mapa");
        } else {
          itemPendente = valor;
          fase = "alvo-item";
        }
        break;
      case "alvo-item": {
        const itemId = itemPendente;
        itemPendente = null;
        emitir({ tipo: "item-consumido", jogador: id, itemId });
        if (itemId === 1) {
          const trocado = alvo();
          jogador.equipe.splice(jogador.equipe.indexOf(trocado), 1);
          emitir({ tipo: "monstro-removido", jogador: id, monstroId: trocado.monstroId });
          mostrarTrilhas("armadilha");
        } else {
          distribuirPontos(jogador, alvo(), 2, "poção");
          fase = "poscaptura";
        }
        break;
      }
      case "desafio": {
        pares.push([id, valor]);
        emitir({ tipo: "desafio", jogador: id, rival: valor });
        const restantes = livres();
        if (restantes.length) {
          vez = restantes[0];
        } else {
          pares.sort((a, b) => Number(b.includes(0)) - Number(a.includes(0)));
          iniciarDuelo(pares.shift());
        }
        break;
      }
      case "combatente":
      case "carta":
      case "item":
        duelo.jogar(id, tipo, valor);
        atualizarDuelo();
        break;
    }
    return observar(id);
  }

  function observar(id = 0) {
    if (!jogadores[id]) throw new Error("Jogador desconhecido.");
    const participantes = jogadores.map(p => ({
      id: p.id, nome: p.nome, perfil: p.perfil, treinadorId: p.treinadorId, trofeus: p.trofeus,
      equipe: p.equipe.map(entrada => ({
        ...entrada, formaId: prepararMonstro(catalogo, entrada.monstroId, entrada.melhorias).monstro.id,
      })),
      quantidadeItens: p.itens.length, itens: id === p.id ? [...p.itens] : undefined,
    }));
    return {
      fase, vez, ciclo, campeao, emDesempate, participantes, duelo: duelo?.observar(id) ?? null,
      opcoes: id === vez ? opcoesDaVez() : [],
      trilhas: TRILHAS.map(trilha => ({ trilha, restantes: montes.get(trilha).length })),
      captura: id === vez && captura ? { ...captura, opcoes: [...captura.opcoes] } : null,
      itemPendente: id === vez ? itemPendente : null,
      motivoMelhoria: fase === "melhoria" ? depoisMelhoria.motivo : null,
      resultados: resultados.map(resultado => ({ ...resultado, participantes: [...resultado.participantes] })),
    };
  }

  novaOrdem("treinador", false);
  emitir({ tipo: "iniciativa", jogador: vez });
  return {
    observar, agir,
    get vez() { return vez; },
    acontecimentos(desde = 0) { return historico.filter(e => e.sequencia > desde).map(e => structuredClone(e)); },
  };
}
