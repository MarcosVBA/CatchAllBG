export function gerador(semente) {
  let estado = semente >>> 0;
  function uniforme() {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let z = estado;
    z = Math.imul(z ^ z >>> 15, z | 1);
    z ^= z + Math.imul(z ^ z >>> 7, z | 61);
    return ((z ^ z >>> 14) >>> 0) / 0x100000000;
  }
  return {
    uniforme,
    inteiro: (min, max) => min + Math.floor(uniforme() * (max - min + 1)),
  };
}

export function amostrar(lista, quantidade, rng) {
  if (quantidade > lista.length) throw new RangeError("O catálogo tem poucas cartas para este cenário.");
  const resultado = [...lista];
  for (let i = 0; i < quantidade; i++) {
    const j = rng.inteiro(i, resultado.length - 1);
    [resultado[i], resultado[j]] = [resultado[j], resultado[i]];
  }
  return resultado.slice(0, quantidade);
}
