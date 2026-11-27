import {
  ATAQUES, BLOQUEIOS, CURAS, efetiva, fraqueza, prepararMonstro, ITENS_COMBATE,
} from "../../motor/regras/cartas.mjs";

const TRILHA_PREFERIDA = { agressiva: "Montanha", defensiva: "Floresta", oportunista: "Riacho" };
const CONDICOES_ATIVAS = new Set([13, 24, 28, 33, 34, 35, 36, 37, 38]);

function valorMonstro(monstro, perfil) {
  const ofensiva = perfil === "agressiva" ? 1.3 : 0.9;
  const defesa = perfil === "defensiva" ? 1.3 : 0.9;
  return (monstro.energia - 24) * 0.16 + (monstro.ofensiva - 2) * ofensiva + (monstro.defesa - 2) * defesa
    + Number(Boolean(monstro.passiva)) * (perfil === "oportunista" ? 0.7 : 0.25);
}

function pontuarCombate(opcao, observacao, catalogo, perfil) {
  const duelo = observacao.duelo;
  const p = duelo.jogadores[duelo.lado];
  const q = duelo.jogadores[1 - duelo.lado];
  const atacante = catalogo.monstros.get(p.monstroId);
  const alvo = catalogo.monstros.get(q.monstroId);
  const habilidade = opcao.tipo === "item" ? ITENS_COMBATE.get(opcao.valor) : efetiva(opcao.valor, p.anterior, catalogo.habilidades);
  const efeitoRival = duelo.efeitoRevelado;
  const revelou = duelo.revelada !== null || duelo.itemRevelado !== null;
  const perdida = p.energiaMaxima - p.energia;
  const esperado = p.ofensiva - alvo.defesa + 3.5 + fraqueza(atacante, alvo);
  const esperadoDoRival = q.ofensiva - atacante.defesa + 3.5 + fraqueza(alvo, atacante);
  if (opcao.tipo === "item" && opcao.valor === 2) {
    return perdida / 3 - 2 + (perfil === "defensiva" ? 0.6 : 0) - Number(p.condicoes.includes(4));
  }
  if (opcao.tipo === "item" && opcao.valor === 3) {
    return 0.1 + Math.min(perdida, 4) * 0.40 + (revelou ? ATAQUES.has(efeitoRival) ? 2.5 : -3 : 0)
      - Number(p.condicoes.includes(7));
  }
  if (ATAQUES.has(habilidade)) {
    let peso = 2.1 + esperado * 0.23 + Number(perfil === "agressiva") * 0.65;
    if (esperado >= q.energia) peso += 1.3 + Number(habilidade === 5) * 0.7;
    if (revelou && BLOQUEIOS.has(efeitoRival)) peso -= [11, 24].includes(habilidade) ? 0.5 : 2.5;
    if (p.condicoes.includes(2)) peso -= 0.5;
    if (habilidade === 35 && !alvo.inatas.some(id => CURAS.has(id))) peso -= 0.25;
    if (CONDICOES_ATIVAS.has(habilidade) && perfil === "oportunista") peso += 0.7;
    return peso;
  }
  if (BLOQUEIOS.has(habilidade)) {
    let peso = 0.8 + esperadoDoRival * 0.18 + Number(perfil === "defensiva") * 0.65;
    if (revelou) peso += ATAQUES.has(efeitoRival) ? 2.6 : -2.8;
    if (p.energia <= esperadoDoRival) peso += 1.3;
    if (habilidade !== 2 && !p.condicoes.includes(7)) peso += 0.45;
    if (habilidade === 48 && revelou && !ATAQUES.has(efeitoRival)) peso += 3;
    return peso;
  }
  if (habilidade === 16) return revelou ? (ATAQUES.has(efeitoRival) ? 2.6 : -2) : 1.35;
  if (habilidade === 19) return revelou ? (BLOQUEIOS.has(efeitoRival) ? 2.3 : -2) : 0.8;
  if (habilidade === 20) return revelou ? (catalogo.habilidades.get(efeitoRival)?.classe === "monstro" ? 2.5 : -2) : 1.25;
  if (habilidade === 9 && p.condicoes.some(id => id !== 5)) return 3.1;
  if (CURAS.has(habilidade)) {
    return Math.min(perdida, 2) * (perfil === "defensiva" ? 1.2 : 0.9)
      - Number(p.condicoes.includes(4));
  }
  if (habilidade === 13) return q.condicoes.includes(1) ? -1 : perfil === "oportunista" ? 2.9 : 2;
  if (habilidade === 4) return q.energia > 6 ? 1.7 : 0.4;
  return -5;
}

function pontuar(escolha, visao, catalogo, p) {
  const { tipo, valor } = escolha;
  const perfil = p.perfil;
  const formas = p.equipe.map(m => catalogo.monstros.get(m.formaId));
  switch (tipo) {
    case "treinador":
      return valor === { agressiva: 2, defensiva: 3, oportunista: 1 }[perfil] ? 1.6 : 0.2;
    case "trilha":
      return Number(valor === TRILHA_PREFERIDA[perfil]) * 0.85 + visao.trilhas.find(t => t.trilha === valor).restantes * 0.055;
    case "inicial":
    case "captura": {
      const m = catalogo.monstros.get(valor);
      return valorMonstro(m, perfil) + m.tipos.filter(tipo => !formas.some(forma => forma.tipos.includes(tipo))).length * 0.5;
    }
    case "sorte": return valor === "rerrolar" ? 10 : -15;
    case "dispensar": {
      const m = p.equipe.find(m => m.chave === valor);
      return -valorMonstro(catalogo.monstros.get(m.formaId), perfil) - m.melhorias;
    }
    case "recompensa":
      return valor === "item" ? (perfil === "oportunista" ? 1.6 : 0.2) - p.itens.length * 0.5 : 1;
    case "continuar": return 0.5;
    case "preparacao": return valor === 5 ? 4 : valor === 4 ? 2.5 : perfil === "oportunista" ? 1.5 : 0.6;
    case "melhoria":
    case "alvo-item": {
      const m = p.equipe.find(m => m.chave === valor);
      const forma = catalogo.monstros.get(m.formaId);
      if (visao.itemPendente === 1) return -valorMonstro(forma, perfil) - m.melhorias;
      const atual = prepararMonstro(catalogo, m.monstroId, m.melhorias);
      const seguinte = prepararMonstro(catalogo, m.monstroId, m.melhorias + (visao.itemPendente === 5 ? 2 : 1));
      if (atual.monstro.id !== seguinte.monstro.id) return 6;
      if (atual.cartas.length === seguinte.cartas.length) return -4;
      return 1 + valorMonstro(forma, perfil) * 0.25;
    }
    case "combatente": {
      const m = p.equipe.find(m => m.chave === valor);
      const forma = catalogo.monstros.get(m.formaId);
      const { lado, participantes, disponiveis } = visao.duelo;
      const rival = 1 - lado;
      const candidatos = visao.participantes[participantes[rival]].equipe
        .filter(entrada => disponiveis[rival].includes(entrada.chave));
      const vantagem = candidatos.reduce((total, entrada) => {
        const alvo = catalogo.monstros.get(entrada.formaId);
        return total + fraqueza(forma, alvo) - fraqueza(alvo, forma);
      }, 0) / candidatos.length;
      return valorMonstro(forma, perfil) + m.melhorias * 0.2 + vantagem;
    }
    case "desafio": {
      const oponente = visao.participantes[valor];
      const revisitados = visao.resultados.filter(r => r.participantes.includes(p.id) && r.participantes.includes(valor)).length;
      const rivais = oponente.equipe.map(m => catalogo.monstros.get(m.formaId));
      const vantagens = formas.flatMap(m => rivais.map(n => (fraqueza(m, n) - fraqueza(n, m)) / 2));
      const media = vantagens.reduce((soma, v) => soma + v, 0) / Math.max(1, vantagens.length);
      return media * 2 - oponente.trofeus * 0.2 - revisitados * 0.75;
    }
    case "carta":
    case "item": return pontuarCombate(escolha, visao, catalogo, perfil);
    default: return 0;
  }
}

export function escolherIa(visao, catalogo, rng) {
  const jogador = visao.participantes[visao.vez];
  if (!jogador || !visao.opcoes.length) throw new Error("Não há uma ação legal para a IA.");
  const notas = visao.opcoes.map(opcao => pontuar(opcao, visao, catalogo, jogador));
  const melhor = Math.max(...notas);
  const pesos = notas.map(nota => Math.exp((nota - melhor) / 0.68));
  const total = pesos.reduce((soma, peso) => soma + peso, 0);
  let sorteio = rng.uniforme() * total;
  for (const [i, peso] of pesos.entries()) {
    sorteio -= peso;
    if (sorteio < 0) return visao.opcoes[i].id;
  }
  return visao.opcoes.at(-1).id;
}

export function avancarIas(partida, catalogo, rng, limite = 20) {
  for (let passo = 0; passo < limite && partida.vez !== 0 && partida.vez !== null; passo++) {
    const id = partida.vez;
    partida.agir(id, escolherIa(partida.observar(id), catalogo, rng));
  }
}
