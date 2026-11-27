import { lerCatalogo, TABELAS } from "../../motor/catalogo/index.mjs";
import { efetiva, prepararMonstro } from "../../motor/regras/cartas.mjs";
import { gerador } from "../../simulacao/sorteio.mjs";
import { avancarIas } from "../partida/ia.mjs";
import { criarPartida } from "../partida/partida.mjs";
import { FASES, descrever, nomeJogada } from "./textos.mjs";

const $ = id => document.getElementById(id);
const html = valor => String(valor ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);
const PERFIL = ["Humano", "Agressiva", "Defensiva", "Oportunista"];
const SIMBOLO = ["●", "▲", "◆", "✦"];
const TIPO = { Fogo: "▲", Grama: "✿", Água: "●", Rocha: "◆", Inseto: "✦", Normal: "▪",
  Noturno: "◐", Psíquico: "◉", Voador: "◈", Fada: "✶", Raio: "ϟ" };
const SIMBOLO_TRILHA = { Montanha: "▲", Floresta: "✿", Riacho: "≈" };

let catalogo;
let partida;
let rngIa;
let semente;
let novosEventos = [];
let versao = 0;
let ultimoAnuncio = "";
let abaHistorico = "duelo";
let emDueloHumano = false;
let animando = false;

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

async function apresentarEventos(antes, eventos, token) {
  const relevantes = eventos.filter(e => e.tipo === "dado-captura" && e.jogador === 0
    || e.participantes?.includes(0) && ["cartas-reveladas", "rolagem", "dano", "cura", "bloqueio", "fim-da-rodada"].includes(e.tipo));
  if (!relevantes.length) return;
  animando = true;
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duelo = antes.duelo;
  const participantes = duelo?.jogadores && duelo.participantes;
  const energia = participantes ? Object.fromEntries(duelo.jogadores.map((j, i) =>
    [participantes[i], { atual: j.energia, maxima: j.energiaMaxima, nome: catalogo.monstros.get(j.monstroId).nome }])) : {};
  const palco = document.createElement("section");
  palco.className = "sequencia-combate";
  palco.setAttribute("aria-label", "Resolução das ações");
  palco.innerHTML = `<div class="sequencia-cabecalho"><span>Resolução</span><button type="button" class="botao-secundario" data-pular>Pular animação</button></div>
    <div class="sequencia-lutadores"></div><div class="sequencia-evento" role="status" aria-live="polite"></div>`;
  $("area-jogo").append(palco);
  const lutadores = palco.querySelector(".sequencia-lutadores");
  for (const [id, e] of Object.entries(energia)) {
    lutadores.insertAdjacentHTML("beforeend", `<div class="sequencia-lutador" data-jogador="${id}">
      <strong>${html(e.nome)}</strong><span class="sequencia-energia">${e.atual} / ${e.maxima}</span>
      <div class="sequencia-trilho"><span style="width:${100 * e.atual / e.maxima}%"></span></div></div>`);
  }
  let pular = false;
  palco.querySelector("[data-pular]").addEventListener("click", () => { pular = true; });
  const eventoEl = palco.querySelector(".sequencia-evento");
  try {
    for (const e of relevantes) {
      if (token !== versao || pular) break;
      const mensagem = descrever(e, antes, catalogo);
      if (e.tipo === "rolagem" || e.tipo === "dado-captura") {
        eventoEl.innerHTML = `<span class="dado-animado" aria-hidden="true">⚄</span><span>Rolando o dado…</span>`;
        await esperar(reduzido ? 80 : 700);
        if (token !== versao || pular) break;
        eventoEl.querySelector(".dado-animado").textContent = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][e.valor - 1];
        eventoEl.querySelector(".dado-animado").classList.add("dado-revelado");
        eventoEl.querySelector("span:last-child").textContent = mensagem;
      } else if (e.tipo === "fim-da-rodada") {
        const derrotados = Object.entries(energia).filter(([, valor]) => valor.atual <= 0);
        for (const [id] of derrotados) lutadores.querySelector(`[data-jogador="${id}"]`)?.classList.add("nocauteado");
        eventoEl.innerHTML = derrotados.length ? '<strong class="ko">NOCAUTE!</strong>' : "";
      } else {
        eventoEl.textContent = mensagem ?? "";
        if ((e.tipo === "dano" || e.tipo === "cura") && energia[e.jogador]) {
          const alvo = energia[e.jogador];
          alvo.atual = Math.max(0, Math.min(alvo.maxima, alvo.atual + (e.tipo === "cura" ? e.valor : -e.valor)));
          const card = lutadores.querySelector(`[data-jogador="${e.jogador}"]`);
          card.querySelector(".sequencia-energia").textContent = `${alvo.atual} / ${alvo.maxima}`;
          card.querySelector(".sequencia-trilho span").style.width = `${100 * alvo.atual / alvo.maxima}%`;
          card.classList.remove("recebeu-dano", "recebeu-cura");
          void card.offsetWidth;
          card.classList.add(e.tipo === "dano" ? "recebeu-dano" : "recebeu-cura");
        }
      }
      await esperar(reduzido ? 80 : e.tipo === "fim-da-rodada" ? 1300 : 650);
    }
  } finally {
    palco.remove();
    if (token === versao) animando = false;
  }
}

async function executarAcao(acao, token) {
  const antes = partida.observar();
  const ultimo = partida.acontecimentos().at(-1)?.sequencia ?? 0;
  acao();
  const eventos = partida.acontecimentos(ultimo);
  await apresentarEventos(antes, eventos, token);
  if (token !== versao || !partida) return false;
  render();
  return true;
}

function avisar(mensagem) {
  $("aviso").hidden = !mensagem;
  $("aviso").textContent = mensagem ?? "";
}

function tipos(monstro) {
  return monstro.tipos.map(t => `<span class="tipo tipo-${html(t)}"><span aria-hidden="true">${TIPO[t] ?? "•"}</span> ${html(t)}</span>`).join(" ");
}

function atributos(m) {
  return `<span class="atributos"><span><b>${m.energia}</b> ENE</span><span><b>${m.ofensiva}</b> OFE</span><span><b>${m.defesa}</b> DEF</span></span>`;
}

function resumoMonstro(m) {
  return `<span class="tipos">${tipos(m)}</span>${atributos(m)}
    <span class="fraqueza">Fraqueza · ${html(m.fraquezas.join(", "))}</span>`;
}

function opcaoDoJogador(opcao, titulo, corpo, classe = "") {
  return `<button type="button" class="carta ${classe}" data-acao="${html(opcao.id)}">
    <span class="carta-nome">${html(titulo)}</span>${corpo}</button>`;
}

function cartaMonstro(opcao, m, equipe) {
  const pontos = equipe ? `<span class="carta-texto">Melhorias aplicadas · ${equipe.melhorias}</span>` : "";
  const passos = m.melhorias.map(
    e => e.tipo === "evolucao" ? `Evolui para ${catalogo.monstros.get(e.id).nome}` : catalogo.habilidades.get(e.id).nome,
  );
  return opcaoDoJogador(opcao, m.nome, `${resumoMonstro(m)}${pontos}
    ${passos.length ? `<span class="carta-texto">Melhorias desta forma · ${html(passos.join(" · "))}</span>` : ""}
    ${m.descricaoPassiva ? `<span class="carta-texto">${html(m.descricaoPassiva)}</span>` : ""}`, "carta-monstro");
}

function escolhas(visao) {
  const p = visao.participantes[0];
  return visao.opcoes.map(opcao => {
    const { tipo, valor } = opcao;
    if (tipo === "treinador") {
      const treinador = catalogo.treinadores.get(valor);
      const efeito = treinador.cartas.map(id => catalogo.habilidades.get(id).efeito).join(" ");
      const beneficio = treinador.sorte ? "Sorte" : treinador.cartas.map(id => catalogo.habilidades.get(id).nome).join(", ");
      return opcaoDoJogador(opcao, treinador.nome, `<span class="destaque">${html(beneficio)}</span>
        <span class="carta-texto">${html(treinador.sorte ? "Uma rerrolagem por captura ou dado de habilidade; não vale para ataques." : efeito)}</span>`);
    }
    if (tipo === "inicial" || tipo === "captura") return cartaMonstro(opcao, catalogo.monstros.get(valor));
    if (["melhoria", "alvo-item", "combatente", "dispensar"].includes(tipo)) {
      const m = p.equipe.find(m => m.chave === valor);
      return cartaMonstro(opcao, catalogo.monstros.get(m.formaId), m);
    }
    if (tipo === "trilha") {
      const { restantes } = visao.trilhas.find(t => t.trilha === valor);
      const tiposDaTrilha = [...new Set([...catalogo.monstros.values()].filter(m => m.trilha === valor).flatMap(m => m.tipos))];
      return opcaoDoJogador(opcao, valor, `<span aria-hidden="true" class="terreno">${SIMBOLO_TRILHA[valor]}</span>
        <span class="carta-texto">${html(tiposDaTrilha.join(" · "))}</span><span class="destaque">${restantes} cartas</span>`, "carta-trilha");
    }
    if (tipo === "carta") {
      const h = catalogo.habilidades.get(valor);
      const condicao = h.condicao ? catalogo.condicoes.get(h.condicao) : null;
      const anterior = efetiva(valor, visao.duelo.jogadores[visao.duelo.lado].anterior, catalogo.habilidades);
      const efeito = valor !== 3 ? h.efeito : anterior
        ? `Repete ${catalogo.habilidades.get(anterior).nome}.` : "Sem ação válida para repetir neste turno.";
      return opcaoDoJogador(opcao, h.nome, `<span class="classe">${html(h.classe)}</span><span class="carta-texto">${html(efeito)}</span>
        ${condicao ? `<span class="carta-condicao"><strong>${html(condicao.nome)}</strong> ${html(condicao.descricao)}</span>` : ""}`, "carta-habilidade");
    }
    if (tipo === "item" || tipo === "preparacao") {
      const item = catalogo.itens.get(valor);
      return opcaoDoJogador(opcao, item.nome, `<span class="classe">Item · uso único</span><span class="carta-texto">${html(item.efeito)}</span>`, "carta-item");
    }
    if (tipo === "desafio") {
      const rival = visao.participantes[valor];
      return opcaoDoJogador(opcao, rival.nome, `<span class="destaque">${rival.trofeus} troféu(s)</span>
        <span class="carta-texto">${html(rival.equipe.map(m => catalogo.monstros.get(m.formaId).nome).join(", "))}</span>`);
    }
    const rotulos = {
      "recompensa:melhoria": ["Ponto extra", "Aplique mais uma melhoria a um monstro da equipe."],
      "recompensa:item": ["Comprar um item", "Pegue a próxima carta do baralho de itens."],
      "continuar:ciclo": ["Concluir minha vez", "Avance para a vez do próximo jogador."],
      "sorte:rerrolar": ["Rerrolar d6", "O novo resultado vale para esta captura."],
      "sorte:aceitar": ["Aceitar a fuga", "Descarte essa opção e tente outro monstro."],
    };
    const [titulo, descricao] = rotulos[opcao.id];
    return opcaoDoJogador(opcao, titulo, `<span class="carta-texto">${html(descricao)}</span>`);
  }).join("");
}

function renderPlacar(visao) {
  $("placar").innerHTML = visao.participantes.map((p, i) => {
    const treinador = catalogo.treinadores.get(p.treinadorId);
    const atual = visao.vez === p.id;
    return `<article class="assento assento-${i} ${atual ? "na-vez" : ""}">
      <span class="assento-icone" aria-hidden="true">${SIMBOLO[i]}</span>
      <div><h2>${p.nome}</h2><p>${PERFIL[i]}${treinador ? ` · ${html(treinador.nome)}` : ""}</p></div>
      <div class="trofeus" aria-label="${p.trofeus} troféu(s)"><b>${p.trofeus}</b><span>troféus</span></div>
    </article>`;
  }).join("");
}

function renderEquipe(visao) {
  const p = visao.participantes[0];
  const equipe = p.equipe.map(m => {
    const forma = catalogo.monstros.get(m.formaId);
    const disponiveis = prepararMonstro(catalogo, m.monstroId, m.melhorias).cartas;
    return `<li><details><summary><strong>${html(forma.nome)}</strong>
      <span class="classe">${m.melhorias} melhoria(s)</span></summary>
      <div class="detalhe-monstro">${resumoMonstro(forma)}
        ${forma.descricaoPassiva ? `<p>${html(forma.descricaoPassiva)}</p>` : ""}
        ${disponiveis.length ? `<p>Habilidades · ${html(disponiveis.map(id => catalogo.habilidades.get(id).nome).join(", "))}</p>` : ""}
      </div></details></li>`;
  }).join("");
  const inventario = [...new Set(p.itens)].map(id =>
    `<li><strong>${html(catalogo.itens.get(id).nome)}</strong> ×${p.itens.filter(item => item === id).length}</li>`).join("");
  $("equipe").innerHTML = `<h2>Sua equipe</h2>${equipe ? `<ul class="lista-equipe">${equipe}</ul>` : "<p>Nenhum monstro escolhido.</p>"}
    <h3>Inventário</h3>${inventario ? `<ul class="lista-itens">${inventario}</ul>` : "<p>Nenhum item.</p>"}`;
}

function combatente(p, e, seuLado) {
  const m = catalogo.monstros.get(e.monstroId);
  const fraquezas = html(m.fraquezas.join(", "));
  const condicoes = e.condicoes.map(id => {
    const c = catalogo.condicoes.get(id);
    return `<span class="condicao" title="${html(c.descricao)}">${html(c.nome)}</span>`;
  }).join("");
  return `<article class="combatente ${seuLado ? "meu-combatente" : "rival-combatente"}">
    <span class="rotulo">${p.nome}</span><h3>${html(m.nome)}</h3><div class="tipos">${tipos(m)}</div>
    <div class="energia-texto"><span>Energia</span> <b>${e.energia} / ${e.energiaMaxima}</b></div>
    <progress max="${e.energiaMaxima}" value="${e.energia}" aria-label="Energia de ${html(m.nome)}"></progress>
    <p class="combatente-meta">Ofensiva ${e.ofensiva} · Defesa ${m.defesa} · Mão ${e.tamanhoMao}</p>
    <p class="fraqueza">Fraqueza · ${fraquezas}</p>
    ${condicoes ? `<div class="condicoes" aria-label="Condições">${condicoes}</div>` : ""}
    ${m.descricaoPassiva ? `<details class="passiva"><summary>Passiva</summary><p>${html(m.descricaoPassiva)}</p></details>` : ""}
  </article>`;
}

function resumoDoTurnoAnterior(visao, duelo) {
  if (duelo.turno < 2) return "";
  const revelacao = novosEventos.findLast(evento => evento.tipo === "cartas-reveladas"
    && evento.ciclo === visao.ciclo && evento.numeroRodada === duelo.numeroRodada
    && evento.turno === duelo.turno - 1 && evento.participantes?.every((id, i) => id === duelo.participantes[i]));
  if (!revelacao) return "";
  const dados = novosEventos.filter(evento => evento.tipo === "rolagem" && evento.sequencia > revelacao.sequencia
    && evento.turno === revelacao.turno && evento.numeroRodada === revelacao.numeroRodada
    && evento.participantes?.every((id, i) => id === duelo.participantes[i]));
  const rolagens = dados.length ? `<span>Dados · ${html(dados.map(d => `${visao.participantes[d.jogador].nome} ${d.valor}`).join(" · "))}</span>` : "";
  return `<div class="jogadas-recentes"><b>Turno anterior</b><span>${html(descrever(revelacao, visao, catalogo))}</span>${rolagens}</div>`;
}

function cartasUsadasPeloRival(lado) {
  const inicioDaMao = novosEventos.findLastIndex(evento =>
    evento.tipo === "rodada-iniciada" || evento.tipo === "maos-renovadas");
  const cartas = novosEventos.slice(inicioDaMao + 1)
    .filter(evento => evento.tipo === "cartas-reveladas" && evento.escolhas[lado].carta !== null)
    .map(evento => nomeJogada(catalogo, evento.escolhas[lado]));
  return `<section class="cartas-usadas" aria-labelledby="titulo-cartas-usadas">
    <h3 id="titulo-cartas-usadas">Cartas usadas pelo rival</h3>
    ${cartas.length ? `<ul>${cartas.map(nome => `<li>${html(nome)}</li>`).join("")}</ul>`
      : "<p>Nenhuma carta usada nesta mão.</p>"}
  </section>`;
}

function arenaDeCombate(visao) {
  const d = visao.duelo;
  if (d?.lado === undefined) return "";
  const seu = d.lado;
  const outro = 1 - seu;
  const rival = visao.participantes[d.participantes[outro]];
  const etapa = d.fase === "selecao" ? (d.repetida ? "Nova escolha após empate" : "Escolha de combatentes") : `Turno ${d.turno}`;
  const meta = `<div class="duelo-meta"><b>Rodada ${d.numeroRodada} · ${etapa}</b>
    <span>Placar ${d.placar[seu]}–${d.placar[outro]} · ${d.vitoriasNecessarias === 1 ? "Uma vitória" : "Melhor de três"}</span></div>`;
  if (d.fase === "selecao") {
    const candidatos = rival.equipe.filter(m => d.disponiveis[outro].includes(m.chave)).map(m => {
      const forma = catalogo.monstros.get(m.formaId);
      return `<li><strong>${html(forma.nome)}</strong><span class="tipos">${tipos(forma)}</span>
        <span class="fraqueza">Fraqueza · ${html(forma.fraquezas.join(", "))}</span></li>`;
    });
    return `${meta}<section class="combatente rival-combatente candidatos-rivais" aria-labelledby="titulo-candidatos-rivais">
      <h3 id="titulo-candidatos-rivais">Combatentes disponíveis de ${html(rival.nome)}</h3>
      <ul class="lista-equipe">${candidatos.join("")}</ul>
    </section>`;
  }
  const ordem = d.ordemDeEscolha;
  const revelada = d.itemRevelado ? catalogo.itens.get(d.itemRevelado)?.nome : catalogo.habilidades.get(d.revelada)?.nome;
  const aviso = revelada ? `Rastreado · o rival revelou ${revelada}.`
    : ordem?.[0] === seu && d.podeEscolher ? "Rastreado · você revela antes do rival." : "";
  const fichas = d.renovacoes ? `<p class="aviso-turno">Fichas da rodada: ${d.renovacoes} · +${d.renovacoes} de ofensiva para ambos</p>` : "";
  return `${meta}${fichas}
    <div class="combatentes">
      ${combatente(visao.participantes[d.participantes[seu]], d.jogadores[seu], true)}
      ${combatente(rival, d.jogadores[outro], false)}
    </div>${resumoDoTurnoAnterior(visao, d)}${cartasUsadasPeloRival(outro)}
    ${aviso ? `<p class="aviso-turno">${html(aviso)}</p>` : ""}`;
}

function renderHistorico(visao) {
  const emDuelo = evento => evento.participantes?.includes(0);
  const eventos = novosEventos.filter(abaHistorico === "duelo" ? emDuelo
    : evento => !evento.participantes || ["duelo-encerrado", "desempate-iniciado"].includes(evento.tipo))
    .map(e => ({ texto: descrever(e, visao, catalogo), turno: e.turno,
      destaque: ["rodada-iniciada", "repetir-rodada", "cartas-reveladas", "duelo-encerrado", "evolucao"].includes(e.tipo) }))
    .filter(e => e.texto).slice(-18).reverse();
  $("historico").innerHTML = `<h2>Histórico</h2>
    <div class="abas-historico" aria-label="Filtro do histórico">
      <button type="button" data-historico="duelo" aria-pressed="${abaHistorico === "duelo"}">Seu duelo</button>
      <button type="button" data-historico="partida" aria-pressed="${abaHistorico === "partida"}">Partida</button>
    </div>${eventos.length ? `<ol class="eventos">${eventos.map(e => `<li class="${e.destaque ? "evento-forte" : ""}">
      ${e.turno ? `<span class="turno-log" title="Turno ${e.turno}">${e.turno}</span>` : ""}<span>${html(e.texto)}</span></li>`).join("")}</ol>`
      : "<p>As ações aparecerão aqui.</p>"}`;
}

function render() {
  const v = partida.observar();
  const combateVisivel = v.duelo?.lado !== undefined;
  if (combateVisivel !== emDueloHumano) {
    emDueloHumano = combateVisivel;
    abaHistorico = combateVisivel ? "duelo" : "partida";
  }
  novosEventos.push(...partida.acontecimentos(novosEventos.at(-1)?.sequencia ?? 0));
  if (novosEventos.length > 1000) novosEventos = novosEventos.slice(-1000);
  renderPlacar(v);
  renderEquipe(v);
  renderHistorico(v);
  const rotulo = v.emDesempate ? "Desempate" : `Ciclo ${v.ciclo} de 3`;
  const cabecalho = `<div class="etapa"><span>${rotulo}</span><span>Semente ${semente}</span></div>`;
  let titulo, detalhe, corpo = "";
  if (v.fase === "final") {
    titulo = v.campeao === 0 ? "Você venceu!" : `${v.participantes[v.campeao].nome} venceu a partida`;
    detalhe = "Placar final";
    corpo = `<ol class="classificacao">${[...v.participantes]
      .sort((a, b) => b.trofeus - a.trofeus || Number(b.id === v.campeao) - Number(a.id === v.campeao))
      .map(p => `<li><strong>${p.nome}${p.id === v.campeao ? " · Campeão" : ""}</strong><span>${p.trofeus} troféu(s)</span></li>`).join("")}</ol>
      <button class="botao-primario" type="button" data-acao="nova">Jogar novamente</button>`;
  } else if (v.vez === 0) {
    const fase = FASES[v.fase];
    [, titulo, detalhe] = fase;
    if (v.fase === "sorte-captura") detalhe = `Você tirou ${v.captura.rolagem}. ${detalhe}`;
    if (v.fase === "melhoria" && v.motivoMelhoria === "duelo") detalhe = `Você ganhou o duelo. ${detalhe}`;
    corpo = `<div class="escolhas">${escolhas(v)}</div>`;
  } else {
    titulo = `${v.participantes[v.vez].nome} está jogando`;
    detalhe = FASES[v.fase]?.[0] ?? "";
  }
  $("area-jogo").innerHTML = `${cabecalho}<div class="arena-titulo"><h2 tabindex="-1" id="titulo-fase">${html(titulo)}</h2>
    <p>${html(detalhe)}</p></div>${arenaDeCombate(v)}${corpo}`;
  const anuncio = v.vez === 0 || v.fase === "final" ? titulo : "";
  if (anuncio !== ultimoAnuncio) {
    $("fase-anunciada").textContent = anuncio;
    ultimoAnuncio = anuncio;
  }
}

function moverIas(token) {
  if (token !== versao || !partida || partida.vez === 0 || partida.vez === null) return;
  requestAnimationFrame(async () => {
    if (token !== versao) return;
    try {
      const visao = partida.observar();
      const limite = visao.duelo?.lado !== undefined ? 1 : 24;
      if (!await executarAcao(() => avancarIas(partida, catalogo, rngIa, limite), token)) return;
      if (partida.vez === 0 || partida.vez === null) $("titulo-fase")?.focus({ preventScroll: true });
      else moverIas(token);
    } catch (erro) {
      avisar(`A partida foi interrompida. ${erro.message}`);
    }
  });
}

function voltarAoInicio() {
  versao++;
  animando = false;
  partida = null;
  $("partida").hidden = true;
  $("entrada").hidden = false;
  $("nova-partida").hidden = true;
  avisar("");
  $("comecar").focus();
}

$("configuracao").addEventListener("submit", evento => {
  evento.preventDefault();
  if (!catalogo) return;
  const campo = $("semente").value.trim();
  semente = campo ? Number(campo) : crypto.getRandomValues(new Uint32Array(1))[0];
  if (!Number.isSafeInteger(semente) || semente < 0 || semente > 0xFFFFFFFF) {
    avisar("A semente deve estar entre 0 e 4294967295.");
    return;
  }
  try {
    versao++;
    partida = criarPartida({ catalogo, rng: gerador(semente) });
    rngIa = gerador(semente ^ 0x6A09E667);
    novosEventos = [];
    abaHistorico = "partida";
    emDueloHumano = false;
    $("entrada").hidden = true;
    $("partida").hidden = false;
    $("nova-partida").hidden = false;
    avisar("");
    render();
    moverIas(versao);
  } catch (erro) {
    avisar(erro.message);
  }
});

$("area-jogo").addEventListener("click", async evento => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao || !partida) return;
  if (botao.dataset.acao === "nova") {
    voltarAoInicio();
    return;
  }
  if (animando || partida.vez !== 0) return;
  try {
    const token = versao;
    if (!await executarAcao(() => partida.agir(0, botao.dataset.acao), token)) return;
    avisar("");
    if (partida.vez === 0 || partida.vez === null) $("titulo-fase")?.focus({ preventScroll: true });
    moverIas(versao);
  } catch (erro) {
    avisar(erro.message);
  }
});

$("historico").addEventListener("click", evento => {
  const botao = evento.target.closest("button[data-historico]");
  if (!botao || !partida) return;
  abaHistorico = botao.dataset.historico;
  renderHistorico(partida.observar());
  $("historico").querySelector(`[data-historico="${abaHistorico}"]`).focus();
});
$("nova-partida").addEventListener("click", voltarAoInicio);
$("abrir-regras").addEventListener("click", () => $("regras").showModal());

try {
  const textos = await Promise.all(TABELAS.map(async nome => {
    const resposta = await fetch(new URL(`../../cartas/${nome}.csv`, import.meta.url));
    if (!resposta.ok) throw new Error(`Não foi possível carregar ${nome}.csv.`);
    return [nome, await resposta.text()];
  }));
  catalogo = lerCatalogo(Object.fromEntries(textos));
  $("comecar").disabled = false;
  $("carregamento").hidden = true;
} catch (erro) {
  $("carregamento").textContent = `${erro.message} Abra o protótipo pelo servidor local indicado no README.`;
}
