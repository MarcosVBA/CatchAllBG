import { ATAQUES, BLOQUEIOS, BLOQUEIOS_PARCIAIS, CURAS, efetiva } from "../motor/regras/cartas.mjs";

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
      if (BLOQUEIOS.has(revelada)) peso -= BLOQUEIOS_PARCIAIS.has(revelada) ? 0.7 : 2.1;
      if (CURAS.has(revelada) && [30, 52, 61].includes(efeito)) peso += 0.8;
      if (revelada === 13) peso += 0.5;
    } else if (efeito === 4 || efeito === 57) {
      peso = rival.energia >= 5 ? 1.55 : 0.5;
    } else if (efeito === 13) {
      peso = !rival.condicoes.includes(1) && rival.energia >= 4 ? 2.05 : -0.2;
    } else if (BLOQUEIOS.has(efeito)) {
      peso = 1.15 + Number(proprio.energia <= 6) * 0.65 + Number(efeito !== 2) * 0.45 + Number(defensiva) * 0.50;
      if (BLOQUEIOS_PARCIAIS.has(efeito)) peso -= 0.4;
      if ([15, 33, 48].includes(efeito) && !proprio.condicoes.includes(7)) {
        peso += houveRevelacao && ATAQUES.has(revelada) ? 0.6 : 0.2;
      }
      if (efeito === 16 && !proprio.condicoes.includes(7)) peso += 0.4;
      if (efeito === 20 && houveRevelacao && catalogo.habilidades.get(revelada)?.classe === "monstro") peso += 0.5;
      if (efeito === 54 && rival.condicoes.includes(5)) peso += 1;
      if (houveRevelacao) peso += ATAQUES.has(revelada) ? 2.9 : -2;
    } else if (efeito === 19) {
      peso = houveRevelacao ? (BLOQUEIOS.has(revelada) ? 2.3 : -2) : 0.8;
    } else if (efeito === 9) {
      peso = proprio.condicoes.some(id => id !== 5) ? 3.1 : Number(proprio.energia < proprio.energiaMaxima) * 0.8;
    } else if (CURAS.has(efeito)) {
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
