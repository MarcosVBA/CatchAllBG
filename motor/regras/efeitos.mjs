import { ATAQUES, BASE, BLOQUEIOS, BLOQUEIOS_PARCIAIS, CURAS, SALVA_VIDAS, SUPER_CURA, danoSemEfeitos, fraqueza } from "./cartas.mjs";

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

function removerCondicaoNegativaMaisAntiga(jogador, contexto) {
  const condicao = [...jogador.condicoes.keys()].find(id => id !== 5);
  if (condicao !== undefined) consumirCondicao(jogador, condicao, contexto);
}

export function perderEnergia(jogador, valor, contexto, origem) {
  if (!valor) return;
  jogador.energia -= valor;
  contexto.emitir("dano", { jogador: jogador.id, valor, origem });
}

function recuperar(jogador, valor, contexto, podeAtivarEsporos = true) {
  valor = Math.min(valor, jogador.monstro.energia - jogador.energia);
  if (valor <= 0) return 0;
  if (podeAtivarEsporos && consumirCondicao(jogador, 4, contexto) && contexto.rolar(jogador, "Esporos") <= 3) {
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

function bonusDaCarta(p, q, skill, rival, ambosAtacam, contexto) {
  switch (skill) {
    case 6: return rival.efeito === 4 ? 5 : 0;
    case 10: return ambosAtacam && contexto.habilidades.get(rival.efeito)?.classe === "monstro" ? 3 : 0;
    case 21: return Number(q.energia > p.energia);
    case 23: return q.monstro.tipos.some(tipo => tipo === "Inseto" || tipo === "Grama") ? 2 : 0;
    case 25: return q.energia * 2 <= q.monstro.energia ? 3 : 0;
    case 27: case 60: return Number(ambosAtacam);
    case 29: return q.monstro.defesa > p.monstro.defesa ? 2 : 0;
    case 30: return rival.carta !== null && CURAS.has(rival.efeito) ? 4 : 0;
    case 31: return BASE.has(rival.carta) ? 2 : 0;
    case 61: return rival.carta !== null && CURAS.has(rival.efeito) ? 4 : 1;
    case 62: return BASE.has(rival.carta) ? 3 : 0;
    case 32: return q.monstro.tipos.some(tipo => tipo === "Água" || tipo === "Voador") ? 2 : 0;
    case 34: return -1;
    case 40: return p.energia * 2 <= p.monstro.energia ? 3 : 0;
    case 42: return Number(p.monstro.defesa >= q.monstro.defesa);
    case 44: return q.condicoes.size > 0 ? 3 : 0;
    case 45: return Number(q.energia <= p.energia);
    case 46: return p.condicoes.has(5) ? 4 : 0;
    case 47: return q.monstro.tipos.length > 1 ? 3 : 1;
    case 50: return p.mao.size === 0 ? 3 : 0;
    case 52: return CURAS.has(rival.efeito) ? 3 : 0;
    case 53: return q.monstro.defesa >= 4 ? 2 : 0;
    case 55: return ambosAtacam ? 1 : -1;
    default: return 0;
  }
}

function ataque(p, q, escolha, rival, ambosAtacam, rivalAtacouAntes, contexto) {
  const skill = escolha.efeito;
  if (!ATAQUES.has(skill)) return { total: 0, calculado: 0, sobrecarga: 0 };
  const rolar = motivo => contexto.rolar(p, motivo);
  const foco = p.foco;
  let bonus = foco;
  p.foco = 0;
  const bloqueado = BLOQUEIOS.has(rival.efeito);
  const parcial = BLOQUEIOS_PARCIAIS.has(rival.efeito);
  const persistente = p.monstro.passiva === "Primeiro Atacar Persistente";
  const primeiroAtacar = skill === 1 && (p.monstro.passiva === "Primeiro Atacar" || persistente && !bloqueado)
    && usarUmaVez(p, "Primeiro Atacar", contexto);
  let direto = 0;
  if (bloqueado) {
    if (p.monstro.passiva === "Desencaixe" && !p.usos.has("Desencaixe")) {
      p.foco = foco;
    }
    direto = skill === 11 || skill === 24 ? 2 : 0;
    if (skill === 1 && p.monstro.passiva === "Fio Cortante" && usarUmaVez(p, "Fio Cortante", contexto)
      && rolar("Fio Cortante") >= 3) {
      direto += 7;
      ativar(p, "Fio Cortante", contexto);
    }
    if (!parcial) return { total: direto, calculado: 0, sobrecarga: 0 };
  }
  if (primeiroAtacar && !bloqueado) {
    bonus += persistente ? 6 : 3;
    ativar(p, "Primeiro Atacar", contexto);
  }
  bonus += bonusDaCarta(p, q, skill, rival, ambosAtacam, contexto);
  if (!bloqueado && p.monstro.passiva === "Mergulho Oportuno" && CURAS.has(rival.efeito)
    && usarUmaVez(p, "Mergulho Oportuno", contexto)) {
    bonus += 5;
    ativar(p, "Mergulho Oportuno", contexto);
  }
  if (!bloqueado && skill === 1 && p.monstro.passiva === "Atacar contra Psíquico" && q.monstro.tipos.includes("Psíquico")
    && usarUmaVez(p, "Atacar contra Psíquico", contexto)) {
    bonus += 7;
    ativar(p, "Atacar contra Psíquico", contexto);
  }
  const dado = rolar("ataque");
  const calcular = extra => danoSemEfeitos(p.monstro, q.monstro, dado, contexto.pisoDano, contexto.bonusOfensiva + bonus + extra);
  let bruto = calcular(0);
  if (ambosAtacam && rivalAtacouAntes && p.monstro.passiva === "Ritmo de Caça" && calcular(6) > 0
    && usarUmaVez(p, "Ritmo de Caça", contexto)) {
    bruto = calcular(6);
    ativar(p, "Ritmo de Caça", contexto);
  }
  let dano = bruto;
  let sobrecarga = 0;
  if (bruto > 0) {
    if (fraqueza(p.monstro, q.monstro) && q.monstro.passiva === "Refração"
      && usarUmaVez(q, "Refração", contexto)) {
      dano -= Math.min(5, bruto);
      ativar(q, "Refração", contexto);
    }
    if (consumirCondicao(p, 2, contexto) && rolar("Ofuscado") <= 3) {
      dano -= 4;
      ativar(p, "Ofuscado", contexto);
    }
    if (consumirCondicao(q, 3, contexto) && contexto.rolar(q, "Fissurado") <= 3) {
      dano += 4;
      ativar(q, "Fissurado", contexto);
    }
    if (consumirCondicao(p, 5, contexto)) {
      const impulso = rolar("Sobrecarga");
      if (impulso === 1) sobrecarga = 2;
      if (impulso >= 5) dano += 5;
      if (impulso === 1 || impulso >= 5) ativar(p, "Sobrecarga", contexto);
    }
    if (q.protecao) {
      dano -= 5;
      q.protecao = 0;
      ativar(q, "Casco de Arrasto", contexto);
    }
  }
  dano = Math.max(0, dano);
  const calculado = parcial ? dano - Math.floor(dano / 2) : dano;
  return { total: calculado + direto + (skill === 12 && ambosAtacam ? 1 : 0), calculado, sobrecarga };
}

function consumirItem(jogador, id, contexto) {
  jogador.itens.set(id, jogador.itens.get(id) - 1);
  contexto.emitir("item-consumido", { jogador: jogador.id, itemId: id });
}

function efeitoDeBloqueio(p, q, skill, rival, contexto, pendentes) {
  if (skill === SALVA_VIDAS) consumirItem(p, 3, contexto);
  if (skill !== SALVA_VIDAS && consumirCondicao(p, 7, contexto)) {
    if (skill !== 2) ativar(p, "Preso", contexto);
    return { dano: 0, cura: 0 };
  }
  if (skill === 28) p.foco += 2;
  if (skill === 16) {
    pendentes.push([q, 2]);
    return { dano: 2, cura: 0 };
  }
  if (skill === 20 && contexto.habilidades.get(rival)?.classe === "monstro") pendentes.push([q, 6]);
  if (skill === 33) {
    pendentes.push([q, 2]);
    return { dano: 3, cura: 0 };
  }
  if (skill === 36) pendentes.push([p, 5]);
  if (skill === 48) p.foco += 2;
  if (skill === 8) return { dano: contexto.habilidades.get(rival)?.classe === "monstro" ? 3 : 0, cura: 0 };
  if (skill === 17) return { dano: 0, cura: fraqueza(q.monstro, p.monstro) ? 3 : 0 };
  if (skill === 51) {
    removerCondicaoNegativaMaisAntiga(p, contexto);
    return { dano: 0, cura: 2 };
  }
  if (skill === 54) return { dano: consumirCondicao(q, 5, contexto) ? 5 : 0, cura: 0 };
  if (skill === 56) return { dano: 0, cura: 1 };
  return { dano: skill === 15 ? 4 : 0, cura: skill === SALVA_VIDAS ? 4 : skill === 22 ? 2 : skill === 43 ? 3 : 0 };
}

function habilidadeDeCura(p, q, skill, contexto) {
  if (skill === SUPER_CURA) {
    consumirItem(p, 2, contexto);
    return p.monstro.energia - p.energia;
  }
  if (skill === 9) return 2;
  if (skill === 26) return 3;
  if (skill === 18) return p.energia < q.energia ? 3 : 2;
  if (skill === 41) return 5;
  if (skill === 59) return 4;
  if (skill !== 14 && skill !== 39) return 0;
  const motivo = skill === 14 ? "Curar I" : "Maré Restauradora";
  let dado = contexto.rolar(p, motivo);
  if ((p.treinador.sorte || p.monstro.passiva === "Rerrolar cura") && contexto.querRerrolar(p, motivo, dado)) {
    dado = contexto.rolar(p, motivo, true);
  }
  return skill === 14 ? (dado >= 5 ? 3 : 2) : 1 + Math.ceil(dado / 2);
}

export function resolverAcoes(jogadores, escolhas, contexto, ataquesAnteriores) {
  const efeitos = escolhas.map(({ efeito }) => efeito);
  const ambosAtacam = efeitos.every(efeito => ATAQUES.has(efeito));
  const rapido = efeitos.map(efeito => [5, 10, 21, 23, 25, 32].includes(efeito));
  const ordem = rapido[1] && !rapido[0] ? [1, 0] : [0, 1];
  const golpes = jogadores.map(() => ({ total: 0, calculado: 0, sobrecarga: 0 }));
  let cancelado = null;
  for (const i of ordem) {
    const rival = 1 - i;
    golpes[i] = ataque(jogadores[i], jogadores[rival], escolhas[i], escolhas[rival], ambosAtacam, ataquesAnteriores[rival], contexto);
    if (rapido[i] && !rapido[rival] && golpes[i].total >= jogadores[rival].energia) {
      cancelado = rival;
      contexto.emitir("acao-cancelada", { jogador: rival, motivo: "Ataque Rápido" });
      break;
    }
  }
  const danos = golpes.map(golpe => golpe.total);
  const diretos = golpes.map(golpe => golpe.sobrecarga);
  const curas = [0, 0];
  const curasDeItens = [0, 0];
  const pendentes = [];
  for (const [i, p] of jogadores.entries()) {
    if (i === cancelado) continue;
    const q = jogadores[1 - i];
    const skill = efeitos[i];
    const rival = efeitos[1 - i];
    const bloqueou = BLOQUEIOS.has(skill) && ATAQUES.has(rival) && 1 - i !== cancelado;
    if (bloqueou) {
      contexto.emitir("bloqueio", { jogador: i, carta: escolhas[i].carta, itemId: escolhas[i].itemId, parcial: BLOQUEIOS_PARCIAIS.has(skill) });
      const extra = efeitoDeBloqueio(p, q, skill, rival, contexto, pendentes);
      danos[i] += extra.dano;
      (escolhas[i].itemId ? curasDeItens : curas)[i] += extra.cura;
    }
    if (skill === 9) removerCondicaoNegativaMaisAntiga(p, contexto);
    (escolhas[i].itemId ? curasDeItens : curas)[i] += habilidadeDeCura(p, q, skill, contexto);
    if (skill === 4) {
      let dado = contexto.rolar(p, "Foco");
      if (p.treinador.sorte && contexto.querRerrolar(p, "Foco", dado)) dado = contexto.rolar(p, "Foco", true);
      p.foco += dado;
    }
    if (skill === 57) p.foco += 4;
    if (skill === 13) pendentes.push([q, 1]);
    const golpe = golpes[i].calculado;
    if ((skill === 7 || skill === 60) && golpe >= 3 || skill === 63 && golpe >= 2) curas[i] += 2;
    if (skill === 19 && BLOQUEIOS.has(rival)) pendentes.push([q, 7]);
    if (skill === 20 && !bloqueou && contexto.habilidades.get(rival)?.classe === "monstro") pendentes.push([q, 6]);
    if (skill === 48 && !bloqueou) p.foco += 2;
    if (skill === 49 && BLOQUEIOS.has(rival)) pendentes.push([q, 3]);
    if (skill === 34 && golpe > 0) pendentes.push([q, 3]);
    if (skill === 53 && golpe >= 3) pendentes.push([q, 3]);
    if (skill === 58 && golpe > 0) pendentes.push([q, 2]);
    if (skill === 35 && golpe > 0) pendentes.push([q, 4]);
    if (skill === 38 && golpe >= 2) pendentes.push([q, 7]);
    if (skill === 37 && golpe >= 1) pendentes.push([q, 6]);

    const passiva = p.monstro.passiva;
    if (ambosAtacam && cancelado === null && passiva === "Curto-Circuito" && usarUmaVez(p, passiva, contexto)) {
      const sorte = contexto.rolar(p, passiva);
      if (sorte === 1) diretos[i] += 2;
      if (sorte >= 3) diretos[1 - i] += 6;
      if (sorte === 1 || sorte >= 3) ativar(p, passiva, contexto);
    }
    if (bloqueou && passiva === "Facho na Névoa" && usarUmaVez(p, passiva, contexto)) {
      pendentes.push([q, 2]);
      curas[i] += 3;
      ativar(p, passiva, contexto);
    }
    if (escolhas[1 - i].carta === 3 && passiva === "Faro de Trilha" && usarUmaVez(p, passiva, contexto)) {
      pendentes.push([q, 6]);
      p.foco += 3;
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
      p.protecao = contexto.turno + 2;
      ativar(p, passiva, contexto);
    }
    if (bloqueou && passiva === "Cascalho em Órbita" && usarUmaVez(p, passiva, contexto)) {
      p.foco += 2;
      ativar(p, passiva, contexto);
    }
    if (bloqueou && passiva === "Bolha Errante" && usarUmaVez(p, passiva, contexto)) {
      pendentes.push([q, 6]);
      ativar(p, passiva, contexto);
    }
    if (ambosAtacam && cancelado === null && passiva === "Corrente de Retorno" && usarUmaVez(p, passiva, contexto)) {
      pendentes.push([p, 5]);
      ativar(p, passiva, contexto);
    }
  }
  const recuperados = [0, 0];
  for (const [i, p] of jogadores.entries()) {
    if (curas[i] && p.energia < p.monstro.energia && p.monstro.passiva === "Primeira cura"
      && usarUmaVez(p, "Primeira cura", contexto)) curas[i]++;
    if (curas[i] && escolhas[i].carta !== null && p.energia < p.monstro.energia && p.monstro.passiva === "Jardim de Retorno"
      && usarUmaVez(p, "Jardim de Retorno", contexto)) {
      curas[i] += 2;
      ativar(p, "Jardim de Retorno", contexto);
    }
    recuperados[i] = recuperar(p, curasDeItens[i], contexto, false) + recuperar(p, curas[i], contexto);
    perderEnergia(p, danos[1 - i], contexto, "acao");
    perderEnergia(p, diretos[i], contexto, "dano direto");
    if (p.energia > 0 && p.energia * 2 <= p.monstro.energia && danos[1 - i] > 0 && ATAQUES.has(efeitos[1 - i])
      && p.monstro.passiva === "Rebrotar" && usarUmaVez(p, "Rebrotar", contexto) && contexto.rolar(p, "Rebrotar") >= 3) {
      ativar(p, "Rebrotar", contexto);
      recuperados[i] += recuperar(p, 6, contexto);
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
  return efeitos.map((efeito, i) => i !== cancelado && ATAQUES.has(efeito));
}
