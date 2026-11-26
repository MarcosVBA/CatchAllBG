import { ATAQUES, BLOQUEIOS, CURAS, efetiva } from "../motor/regras/cartas.mjs";

export function escolher(visao, jogador, catalogo, rng, defensiva) {
  const proprio = visao.jogadores[jogador];
  const rival = visao.jogadores[1 - jogador];
  const revelada = visao.efeitoRevelado;
  const houveRevelacao = visao.revelada !== null;
  let melhor = null;
  let maior = -Infinity;
  for (const carta of visao.mao) {
    const efeito = efetiva(carta, proprio.anterior, catalogo.habilidades);
    let peso = -1;
    if (ATAQUES.has(efeito)) {
      peso = 2.15 + Number(rival.energia <= 6) * 0.9 + Number(efeito !== 1) * 0.25;
      if ([35, 37, 38].includes(efeito)) peso -= 0.10;
      if (proprio.condicoes.includes(2)) peso -= 0.40;
      if (BLOQUEIOS.has(revelada)) peso -= 2.1;
      if (CURAS.has(revelada) && efeito === 30) peso += 0.8;
      if (revelada === 13) peso += 0.5;
    } else if (efeito === 4) {
      peso = rival.energia >= 5 ? 1.55 : 0.5;
    } else if (efeito === 13) {
      peso = !rival.condicoes.includes(1) && rival.energia >= 4 ? 2.05 : -0.2;
    } else if (BLOQUEIOS.has(efeito)) {
      peso = 1.15 + Number(proprio.energia <= 6) * 0.65 + Number(efeito !== 2) * 0.45 + Number(defensiva) * 0.50;
      if (houveRevelacao) peso += ATAQUES.has(revelada) ? 2.9 : -2;
    } else if (efeito === 14 || efeito === 26) {
      peso = 0.90 * Math.min(proprio.energiaMaxima - proprio.energia, 2) - Number(proprio.condicoes.includes(4)) * 0.65;
    }
    const pontuacao = peso + (rng.uniforme() * 2.5 - 1.25);
    if (pontuacao > maior) {
      melhor = carta;
      maior = pontuacao;
    }
  }
  return melhor;
}

export function rerrolagemAutomatica({ motivo, valor }) {
  const maximo = ["Sobrecarga", "Fio Cortante"].includes(motivo) ? 4 : 3;
  return valor <= maximo;
}
