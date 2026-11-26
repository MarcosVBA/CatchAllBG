import { ATAQUES, BASE, BLOQUEIOS, CURAS, SALVA_VIDAS, SUPER_CURA, danoSemEfeitos, fraqueza } from "./cartas.mjs";

export function usarUmaVez(jogador, nome, contexto) {
  if (jogador.usos.has(nome)) return false;
  jogador.usos.add(nome);
  contexto.emitir("teste-de-efeito", { jogador: jogador.id, efeito: nome });
  return true;
}

function ativar(jogador, nome, contexto) {
  contexto.emitir("efeito-ativado", { jogador: jogador.id, efeito: nome });
}

export function aplicarCondicao(jogador, id, contexto) {
  if (jogador.energia <= 0 || jogador.condicoes.has(id)) return;
  const estado = id === 1 ? { testes: 3 } : { vence: contexto.turno + (id === 6 ? 1 : 2) };
  jogador.condicoes.set(id, estado);
  contexto.emitir("condicao-aplicada", { jogador: jogador.id, condicao: id });
}

export function consumirCondicao(jogador, id, contexto) {
  if (!jogador.condicoes.delete(id)) return false;
  contexto.emitir("condicao-removida", { jogador: jogador.id, condicao: id, motivo: "gatilho" });
  return true;
}

export function perderEnergia(jogador, valor, contexto, origem) {
  if (!valor) return;
  jogador.energia -= valor;
  contexto.emitir("dano", { jogador: jogador.id, valor, origem });
}

function recuperar(jogador, valor, contexto) {
  valor = Math.min(valor, jogador.monstro.energia - jogador.energia);
  if (valor <= 0) return 0;
  if (consumirCondicao(jogador, 4, contexto) && contexto.rolar(jogador, "Esporos") <= 3) {
    valor = Math.max(0, valor - 3);
    ativar(jogador, "Esporos", contexto);
  }
  if (valor) {
    jogador.energia += valor;
    contexto.emitir("cura", { jogador: jogador.id, valor });
  }
  return valor;
}

export function iniciarCondicoes(jogadores, contexto) {
  for (const jogador of jogadores) {
    const incendio = jogador.condicoes.get(1);
    if (!incendio) continue;
    if (contexto.rolar(jogador, "Incendiar") === 6) {
      consumirCondicao(jogador, 1, contexto);
    } else {
      perderEnergia(jogador, 1, contexto, "Incendiar");
      if (--incendio.testes === 0) consumirCondicao(jogador, 1, contexto);
    }
  }
}

export function encerrarEfeitos(jogador, contexto) {
  for (const [id, estado] of jogador.condicoes) {
    if (estado.vence <= contexto.turno) {
      jogador.condicoes.delete(id);
      contexto.emitir("condicao-removida", { jogador: jogador.id, condicao: id, motivo: "prazo" });
    }
  }
  if (jogador.protecao <= contexto.turno) jogador.protecao = 0;
}

export function efeitoDaRenovacao(jogador, rival, renovacoes, contexto) {
  if (renovacoes === 1 && jogador.monstro.passiva === "Eco de Margem" && jogador.energia < rival.energia) {
    aplicarCondicao(jogador, 5, contexto);
    ativar(jogador, "Eco de Margem", contexto);
  }
}

function bonusDaCarta(p, q, skill, rival, ambosAtacam) {
  switch (skill) {
    case 21: return Number(q.energia > p.energia);
    case 23: return Number(q.monstro.tipos.some(tipo => tipo === "Inseto" || tipo === "Grama"));
    case 25: return Number(q.energia * 2 <= q.monstro.energia);
    case 27: return Number(ambosAtacam);
    case 29: return Number(q.monstro.defesa > p.monstro.defesa);
    case 30: return Number(CURAS.has(rival.efeito));
    case 31: return Number(BASE.has(rival.carta));
    case 32: return Number(q.monstro.tipos.some(tipo => tipo === "Água" || tipo === "Voador"));
    case 34: return -1;
    default: return 0;
  }
}

function ataque(p, q, escolha, rival, ambosAtacam, ritmoAnterior, contexto) {
  const skill = escolha.efeito;
  if (!ATAQUES.has(skill)) return { total: 0, calculado: 0, sobrecarga: 0 };
  let sorte = p.treinador.sorte;
  function rolar(motivo, permiteSorte) {
    const dado = contexto.rolar(p, motivo);
    if (sorte && permiteSorte && contexto.querRerrolar(p, motivo, dado)) {
      sorte = false;
      return contexto.rolar(p, motivo, true);
    }
    return dado;
  }
  let bonus = p.foco;
  p.foco = 0;
  if (skill === 1 && p.monstro.passiva === "Primeiro Atacar" && usarUmaVez(p, "Primeiro Atacar", contexto)) {
    bonus++;
  }
  if (BLOQUEIOS.has(rival.efeito)) {
    let direto = Number(skill === 11 || skill === 24);
    if (skill === 1 && p.monstro.passiva === "Fio Cortante" && usarUmaVez(p, "Fio Cortante", contexto)
      && rolar("Fio Cortante", contexto.sorteEmCondicoes) >= 5) {
      direto += 3;
      ativar(p, "Fio Cortante", contexto);
    }
    return { total: direto, calculado: 0, sobrecarga: 0 };
  }
  bonus += bonusDaCarta(p, q, skill, rival, ambosAtacam);
  if (skill === 1 && p.monstro.passiva === "Atacar contra Psíquico" && q.monstro.tipos.includes("Psíquico")) bonus++;
  const dado = rolar("ataque", true);
  const calcular = extra => danoSemEfeitos(p.monstro, q.monstro, dado, contexto.pisoDano, bonus + extra);
  let bruto = calcular(0);
  if (ambosAtacam && ritmoAnterior && p.monstro.passiva === "Ritmo de Caça" && calcular(3) > 0
    && usarUmaVez(p, "Ritmo de Caça", contexto)) {
    bruto = calcular(3);
    ativar(p, "Ritmo de Caça", contexto);
  }
  let dano = bruto;
  let sobrecarga = 0;
  if (bruto > 0) {
    if (fraqueza(p.monstro, q.monstro) && q.monstro.passiva === "Refração"
      && usarUmaVez(q, "Refração", contexto) && contexto.rolar(q, "Refração") >= 4) {
      dano -= Math.min(2, bruto);
      ativar(q, "Refração", contexto);
    }
    if (consumirCondicao(p, 2, contexto) && rolar("Ofuscado", contexto.sorteEmCondicoes) <= 3) {
      dano -= 3;
      ativar(p, "Ofuscado", contexto);
    }
    if (consumirCondicao(q, 3, contexto) && contexto.rolar(q, "Fissurado") <= 3) {
      dano += 3;
      ativar(q, "Fissurado", contexto);
    }
    if (consumirCondicao(p, 5, contexto)) {
      const impulso = rolar("Sobrecarga", contexto.sorteEmCondicoes);
      if (impulso === 1) sobrecarga = 2;
      if (impulso >= 5) dano += 4;
      if (impulso === 1 || impulso >= 5) ativar(p, "Sobrecarga", contexto);
    }
    if (q.protecao) {
      dano -= 3;
      q.protecao = 0;
      ativar(q, "Casco de Arrasto", contexto);
    }
  }
  const calculado = Math.max(0, dano);
  return { total: calculado + (skill === 12 && ambosAtacam ? 1 : 0), calculado, sobrecarga };
}

function consumirItem(jogador, id, contexto) {
  jogador.itens.set(id, jogador.itens.get(id) - 1);
  contexto.emitir("item-consumido", { jogador: jogador.id, itemId: id });
}

function efeitoDeBloqueio(p, q, skill, contexto, pendentes) {
  if (skill === SALVA_VIDAS) consumirItem(p, 3, contexto);
  if (consumirCondicao(p, 7, contexto)) {
    if (skill !== 2) ativar(p, "Preso", contexto);
    return { dano: 0, cura: 0 };
  }
  if (skill === 28) p.foco++;
  if (skill === 33) pendentes.push([q, 2]);
  if (skill === 36) pendentes.push([p, 5]);
  return { dano: skill === 15 ? 2 : 0, cura: skill === SALVA_VIDAS ? 4 : skill === 22 ? 1 : 0 };
}

function habilidadeDeCura(p, skill, contexto) {
  if (skill === SUPER_CURA) {
    consumirItem(p, 2, contexto);
    return p.monstro.energia - p.energia;
  }
  if (skill === 26) return 2;
  if (skill !== 14) return 0;
  let dado = contexto.rolar(p, "Curar I");
  if (p.monstro.passiva === "Rerrolar cura" && contexto.querRerrolar(p, "Curar I", dado)) {
    dado = contexto.rolar(p, "Curar I", true);
  }
  return Math.ceil(dado / 2);
}

export function resolverAcoes(jogadores, escolhas, contexto, ritmoAnterior) {
  const efeitos = escolhas.map(({ efeito }) => efeito);
  const ambosAtacam = efeitos.every(efeito => ATAQUES.has(efeito));
  const ordem = efeitos[1] === 5 && efeitos[0] !== 5 ? [1, 0] : [0, 1];
  const golpes = jogadores.map(() => ({ total: 0, calculado: 0, sobrecarga: 0 }));
  let cancelado = null;
  for (const i of ordem) {
    const rival = 1 - i;
    golpes[i] = ataque(jogadores[i], jogadores[rival], escolhas[i], escolhas[rival], ambosAtacam, ritmoAnterior, contexto);
    if (efeitos[i] === 5 && efeitos[rival] !== 5 && golpes[i].total >= jogadores[rival].energia) {
      cancelado = rival;
      contexto.emitir("acao-cancelada", { jogador: rival, motivo: "Ataque Rápido" });
      break;
    }
  }
  const danos = golpes.map(golpe => golpe.total);
  const diretos = golpes.map(golpe => golpe.sobrecarga);
  const curas = [0, 0];
  const pendentes = [];
  for (const [i, p] of jogadores.entries()) {
    if (i === cancelado) continue;
    const q = jogadores[1 - i];
    const skill = efeitos[i];
    const rival = efeitos[1 - i];
    const bloqueou = BLOQUEIOS.has(skill) && ATAQUES.has(rival) && 1 - i !== cancelado;
    if (bloqueou) {
      contexto.emitir("bloqueio", { jogador: i, carta: escolhas[i].carta, itemId: escolhas[i].itemId });
      const extra = efeitoDeBloqueio(p, q, skill, contexto, pendentes);
      danos[i] += extra.dano;
      curas[i] += extra.cura;
    }
    curas[i] += habilidadeDeCura(p, skill, contexto);
    if (skill === 4) p.foco += Math.ceil(contexto.rolar(p, "Foco") / 2);
    if (skill === 13) pendentes.push([q, 1]);
    const golpe = golpes[i].calculado;
    if (skill === 34 && golpe > 0) pendentes.push([q, 3]);
    if (skill === 35 && golpe > 0) pendentes.push([q, 4]);
    if (skill === 38 && golpe >= 2) pendentes.push([q, 7]);
    if (skill === 37 && golpe >= 3 && usarUmaVez(p, "Marca de Penumbra", contexto)) pendentes.push([q, 6]);

    const passiva = p.monstro.passiva;
    if (ambosAtacam && cancelado === null && passiva === "Curto-Circuito" && usarUmaVez(p, passiva, contexto)) {
      const sorte = contexto.rolar(p, passiva);
      if (sorte === 1) diretos[i] += 2;
      if (sorte >= 5) diretos[1 - i] += 4;
      if (sorte === 1 || sorte >= 5) ativar(p, passiva, contexto);
    }
    if (bloqueou && passiva === "Facho na Névoa" && usarUmaVez(p, passiva, contexto) && contexto.rolar(p, passiva) >= 5) {
      pendentes.push([q, 2]);
      ativar(p, passiva, contexto);
    }
    if (escolhas[1 - i].carta === 3 && passiva === "Faro de Trilha" && usarUmaVez(p, passiva, contexto)
      && contexto.rolar(p, passiva) >= 4) {
      pendentes.push([q, 6]);
      ativar(p, passiva, contexto);
    }
    if (ATAQUES.has(skill) && BLOQUEIOS.has(rival) && passiva === "Desencaixe" && usarUmaVez(p, passiva, contexto)) {
      pendentes.push([q, 7]);
      ativar(p, passiva, contexto);
    }
    if (skill === 1 && golpe > 0 && q.monstro.defesa > p.monstro.defesa && passiva === "Peso da Laje"
      && usarUmaVez(p, passiva, contexto)) {
      pendentes.push([q, 3]);
      ativar(p, passiva, contexto);
    }
    if (bloqueou && passiva === "Casco de Arrasto" && usarUmaVez(p, passiva, contexto)) {
      p.protecao = contexto.turno + 1;
    }
  }
  const recuperados = [0, 0];
  for (const [i, p] of jogadores.entries()) {
    if (curas[i] && p.energia < p.monstro.energia && p.monstro.passiva === "Primeira cura"
      && usarUmaVez(p, "Primeira cura", contexto)) curas[i]++;
    recuperados[i] = recuperar(p, curas[i], contexto);
    perderEnergia(p, danos[1 - i], contexto, "acao");
    perderEnergia(p, diretos[i], contexto, "dano direto");
    if (p.energia > 0 && p.energia * 2 <= p.monstro.energia && danos[1 - i] > 0 && ATAQUES.has(efeitos[1 - i])
      && p.monstro.passiva === "Rebrotar" && usarUmaVez(p, "Rebrotar", contexto) && contexto.rolar(p, "Rebrotar") >= 5) {
      ativar(p, "Rebrotar", contexto);
      recuperados[i] += recuperar(p, 4, contexto);
    }
  }
  for (const [i, p] of jogadores.entries()) {
    if (recuperados[1 - i] && p.energia > 0 && p.monstro.passiva === "Esporos de Retorno"
      && usarUmaVez(p, "Esporos de Retorno", contexto)) {
      pendentes.push([jogadores[1 - i], 4]);
      ativar(p, "Esporos de Retorno", contexto);
    }
  }
  for (const [alvo, id] of pendentes) aplicarCondicao(alvo, id, contexto);
  return ambosAtacam && cancelado === null;
}
