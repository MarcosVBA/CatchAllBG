// Aceita somente artes finais do catálogo, sem caminhos externos ou candidatas.
export function urlDaImagem(caminho) {
  if (typeof caminho !== "string" || !/^(?:monstros|habilidades|condicoes|treinadores|itens)\/\d+\.png$/.test(caminho)) return null;
  return new URL(`../../imagens/${caminho}`, import.meta.url).href;
}

export function arteDaCarta(carta, classe = "") {
  const url = urlDaImagem(carta?.imagem);
  return url ? `<img class="arte-carta ${classe}" src="${url}" alt="" hidden>` : "";
}

export function revelarArteCarregada(evento) {
  if (evento.target?.classList?.contains("arte-carta")) evento.target.hidden = false;
}
