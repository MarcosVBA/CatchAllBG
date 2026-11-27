export const FASES = {
  treinador: ["Preparação", "Escolha seu treinador", "Seis treinadores são sorteados. Cada jogador escolhe um disponível."],
  inicial: ["Preparação", "Escolha seu monstro inicial", "O inicial acompanha você desde a primeira captura."],
  trilha: ["Captura", "Escolha uma trilha", "Você verá até três monstros do monte escolhido."],
  captura: ["Captura", "Tente capturar um monstro", "O resultado precisa ser 3 ou mais no d6. Com 1 ou 2, o monstro foge."],
  "sorte-captura": ["Captura", "Use a Sorte de Gustavo", "Você pode rerrolar uma vez e ficar com o novo resultado."],
  dispensar: ["Equipe", "Escolha um monstro para deixar ir", "Sua equipe pode ter até três monstros. Você também pode deixar o recém-capturado ir."],
  melhoria: ["Equipe", "Distribua um ponto de melhoria", "As melhorias liberam habilidades e evoluções na ordem da carta."],
  recompensa: ["Equipe", "Escolha sua recompensa", "Pegue um ponto de melhoria extra ou compre um item do baralho."],
  poscaptura: ["Equipe", "Prepare sua equipe", "Use um item de preparação disponível ou conclua sua vez."],
  "alvo-item": ["Equipe", "Escolha o monstro do item", "O efeito será aplicado ao monstro escolhido."],
  desafio: ["Desafio", "Escolha um rival disponível", "Cada jogador participa de um duelo por ciclo."],
  "selecionar-combatente": ["Duelo", "Escolha seu combatente", "Os dois monstros são revelados juntos. Após um empate, ambos podem escolher de novo."],
  combate: ["Duelo", "Escolha sua jogada", "O rival escolhe a própria ação. As duas são reveladas antes da resolução."],
};

export function nomeJogada(catalogo, escolha) {
  return escolha.itemId ? catalogo.itens.get(escolha.itemId)?.nome : catalogo.habilidades.get(escolha.carta)?.nome;
}

export function descrever(evento, visao, catalogo) {
  const nome = id => visao.participantes[id]?.nome ?? "";
  const p = nome(evento.jogador);
  const m = catalogo.monstros.get(evento.monstroId)?.nome;
  const item = catalogo.itens.get(evento.itemId)?.nome;
  const lados = evento.participantes;
  switch (evento.tipo) {
    case "iniciativa": return `${p} começa a preparação.`;
    case "ciclo-iniciado": return `Ciclo ${evento.ciclo}. ${p} escolhe a primeira trilha.`;
    case "dado-captura": return `${p} tirou ${evento.valor} ${evento.rerrolagem ? "na rerrolagem de" : "ao tentar capturar"} ${m}.`;
    case "fuga": return `${m} fugiu da trilha ${evento.trilha}.`;
    case "trilha-esgotada": return `A trilha ${evento.trilha} esgotou. ${p} pode escolher outra.`;
    case "captura-sem-monstros": return "As três trilhas estão esgotadas.";
    case "captura": return `${p} capturou ${m} na trilha ${evento.trilha}.`;
    case "melhoria": return `${p} aplicou ${evento.quantidade} ponto${evento.quantidade > 1 ? "s" : ""} a ${m}.`;
    case "evolucao": return `${catalogo.monstros.get(evento.antes).nome} evoluiu para ${m}.`;
    case "item-comprado": return evento.jogador === 0 ? `Você comprou ${item}.` : `${p} comprou um item.`;
    case "item-consumido": return `${p} usou ${item}.`;
    case "monstro-removido": return `${m} saiu da equipe de ${p}.`;
    case "duelo-iniciado": return `${nome(lados[0])} × ${nome(lados[1])}${evento.desempate ? " no desempate" : ""}.`;
    case "rodada-iniciada": return `Rodada ${evento.numeroRodada}${evento.repetida ? " (repetição)" : ""}. ${evento.monstros.map(id => catalogo.monstros.get(id).nome).join(" × ")}.`;
    case "cartas-reveladas": return evento.escolhas.map((acao, i) => `${nome(lados[i])} · ${nomeJogada(catalogo, acao)}`).join(" × ");
    case "rolagem": return `${p} rolou ${evento.valor} · ${evento.motivo}${evento.repetida ? " (rerrolagem)" : ""}.`;
    case "dano": return `${p} perdeu ${evento.valor} de energia.`;
    case "cura": return `${p} recuperou ${evento.valor} de energia.`;
    case "bloqueio": return `${p} bloqueou ${evento.parcial ? "parte do ataque" : "o ataque"}.`;
    case "condicao-aplicada": return `${catalogo.condicoes.get(evento.condicao).nome} foi aplicada em ${p}.`;
    case "condicao-removida": return `${catalogo.condicoes.get(evento.condicao).nome} saiu de ${p}.`;
    case "efeito-ativado": return `${p} ativou ${evento.efeito}.`;
    case "acao-cancelada": return `Ataque Rápido cancelou a ação de ${p}.`;
    case "maos-renovadas": return `As duas mãos foram renovadas. Ambos têm +${evento.bonusOfensiva} de ofensiva nesta rodada.`;
    case "rodada-vencida": return `${p} venceu a rodada (${evento.placar.join(" × ")}).`;
    case "repetir-rodada": return evento.motivo === "energia-igual"
      ? "Empate por proporção de energia igual. Escolham os combatentes novamente."
      : "Nocaute simultâneo. Escolham os combatentes novamente.";
    case "dados-de-desempate": return `Desempate no d6. ${nome(lados[0])} ${evento.valores[0]} × ${nome(lados[1])} ${evento.valores[1]}.`;
    case "limite-da-rodada": return "A rodada atingiu o limite de turnos. Compare a proporção de energia restante.";
    case "equipe-esgotada": return `${p} venceu por falta de combatente rival.`;
    case "duelo-encerrado": return `${p} venceu o duelo${evento.desempate ? " de desempate" : " e ganhou um troféu"}.`;
    case "desempate-iniciado": return `Desempate entre ${lados.map(nome).join(", ")}.`;
    case "partida-encerrada": return `${p} venceu a partida.`;
    default: return null;
  }
}
