export const ATAQUES = new Set([1, 5, 11, 12, 21, 23, 24, 25, 27, 29, 30, 31, 32, 34, 35, 37, 38]);
export const SUPER_CURA = "item:2";
export const SALVA_VIDAS = "item:3";
export const BLOQUEIOS = new Set([2, 15, 22, 28, 33, 36, SALVA_VIDAS]);
export const CURAS = new Set([14, 22, 26, SUPER_CURA, SALVA_VIDAS]);
export const BASE = new Set([1, 2, 3]);
export const HABILIDADES_IMPLEMENTADAS = new Set([...ATAQUES, ...BLOQUEIOS, ...CURAS, 3, 4, 13].filter(Number.isInteger));
export const ITENS_COMBATE = new Map([[2, SUPER_CURA], [3, SALVA_VIDAS]]);
export const CONDICOES_IMPLEMENTADAS = new Set([1, 2, 3, 4, 5, 6, 7]);

export function efetiva(carta, anterior, habilidades) {
  if (carta !== 3) return carta;
  const classe = habilidades.get(anterior)?.classe;
  const repetivel = (classe === "base" && anterior !== 3) || classe === "treinador";
  return repetivel ? anterior : null;
}

export function fraqueza(atacante, alvo) {
  return atacante.tipos.some(tipo => alvo.fraquezas.includes(tipo)) ? 2 : 0;
}

export function danoSemEfeitos(atacante, alvo, dado, piso = 0, bonus = 0) {
  return Math.max(piso, atacante.ofensiva - alvo.defesa + dado + fraqueza(atacante, alvo) + bonus);
}

export function prepararMonstro(catalogo, id, pontos, evoluir = true) {
  if (!Number.isSafeInteger(pontos) || pontos < 0) {
    throw new RangeError("Melhorias precisam ser um inteiro não negativo.");
  }
  let monstro = catalogo.monstros.get(id);
  if (!monstro) throw new Error(`Monstro desconhecido: ${id}.`);
  const visitados = new Set();
  while (true) {
    if (visitados.has(monstro.id)) throw new Error("Ciclo na cadeia de evolução.");
    visitados.add(monstro.id);
    const indice = monstro.melhorias.findIndex(melhoria => melhoria.tipo === "evolucao");
    if (indice < 0 || pontos <= indice || !evoluir) {
      const desbloqueadas = monstro.melhorias.slice(0, pontos)
        .filter(melhoria => melhoria.tipo === "habilidade").map(melhoria => melhoria.id);
      return { monstro, cartas: [...new Set([...monstro.inatas, ...desbloqueadas])] };
    }
    pontos -= indice + 1;
    monstro = catalogo.monstros.get(monstro.melhorias[indice].id);
  }
}
