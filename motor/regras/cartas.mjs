export const ATAQUES = new Set([1, 5, 6, 7, 10, 11, 12, 21, 23, 24, 25, 27, 29, 30, 31, 32, 34, 35, 37, 38, 40, 42, 44, 45, 46, 47, 49, 50]);
export const SUPER_CURA = "item:2";
export const SALVA_VIDAS = "item:3";
export const BLOQUEIOS = new Set([2, 8, 15, 17, 22, 28, 33, 36, 43, 48, SALVA_VIDAS]);
export const CURAS = new Set([7, 9, 14, 17, 18, 22, 26, 39, 41, 43, SUPER_CURA, SALVA_VIDAS]);
export const BASE = new Set([1, 2, 3]);
export const HABILIDADES_IMPLEMENTADAS = new Set([...ATAQUES, ...BLOQUEIOS, ...CURAS, 3, 4, 13, 16, 19, 20].filter(Number.isInteger));
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
  const cartas = new Set();
  while (true) {
    if (visitados.has(monstro.id)) throw new Error("Ciclo na cadeia de evolução.");
    visitados.add(monstro.id);
    const indice = monstro.melhorias.findIndex(melhoria => melhoria.tipo === "evolucao");
    for (const carta of monstro.inatas) cartas.add(carta);
    const limite = indice >= 0 && evoluir ? Math.min(pontos, indice) : pontos;
    for (const melhoria of monstro.melhorias.slice(0, limite)) {
      if (melhoria.tipo === "habilidade") cartas.add(melhoria.id);
    }
    if (indice < 0 || pontos <= indice || !evoluir) {
      return { monstro, cartas: [...cartas] };
    }
    pontos -= indice + 1;
    monstro = catalogo.monstros.get(monstro.melhorias[indice].id);
  }
}
