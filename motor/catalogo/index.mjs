import { BASE, CONDICOES_IMPLEMENTADAS, HABILIDADES_IMPLEMENTADAS } from "../regras/cartas.mjs";
import { tabelaCsv } from "./csv.mjs";

export const TABELAS = ["monstros", "habilidades", "condicoes", "treinadores", "itens"];

const PASSIVAS = new Set([
  "Rebrotar", "Fio Cortante", "Refração", "Curto-Circuito", "Facho na Névoa", "Faro de Trilha",
  "Desencaixe", "Peso da Laje", "Esporos de Retorno", "Casco de Arrasto", "Ritmo de Caça", "Eco de Margem",
  "Cascalho em Órbita", "Mergulho Oportuno", "Jardim de Retorno", "Bolha Errante", "Corrente de Retorno",
]);

function passiva(texto) {
  if (!texto) return null;
  if (texto.startsWith("No primeiro Atacar")) return texto.includes("permanece") ? "Primeiro Atacar Persistente" : "Primeiro Atacar";
  if (texto.startsWith("Seu Atacar") && texto.includes("Psíquico")) return "Atacar contra Psíquico";
  if (texto.startsWith("A primeira habilidade") && texto.includes("recuperar")) return "Primeira cura";
  if (texto.startsWith("Re-role")) return "Rerrolar cura";
  const nome = texto.split(".")[0];
  if (!PASSIVAS.has(nome)) throw new Error(`Passiva sem implementação: ${texto}.`);
  return nome;
}

function inteiro(texto, campo, minimo = 1) {
  const valor = Number(texto);
  if (!/^\d+$/.test(texto) || !Number.isSafeInteger(valor) || valor < minimo) {
    throw new Error(`Valor inválido em ${campo}: ${texto}.`);
  }
  return valor;
}

function lista(texto) {
  return texto ? texto.split("|") : [];
}

function ids(texto) {
  return lista(texto).map(valor => inteiro(valor, "referência"));
}

function indexar(linhas, converter) {
  const porId = new Map();
  for (const linha of linhas) {
    const entrada = converter(linha);
    if (porId.has(entrada.id)) throw new Error(`ID duplicado: ${entrada.id}.`);
    porId.set(entrada.id, entrada);
  }
  return porId;
}

export function lerCatalogo(textos) {
  const condicoes = indexar(tabelaCsv(textos.condicoes), linha => ({
    id: inteiro(linha.id_condicao, "id_condicao"), nome: linha.nome_condicao, descricao: linha.descricao_condicao, imagem: linha.imagem ?? "",
  }));
  const habilidades = indexar(tabelaCsv(textos.habilidades), linha => ({
    id: inteiro(linha.id_habilidade, "id_habilidade"), nome: linha.nome_habilidade, efeito: linha.efeito,
    classe: linha.tag, condicao: linha.id_condicao ? inteiro(linha.id_condicao, "id_condicao") : null, imagem: linha.imagem ?? "",
  }));
  const treinadores = indexar(tabelaCsv(textos.treinadores), linha => {
    if (linha.passiva_treinador && !linha.passiva_treinador.startsWith("Sorte:")) {
      throw new Error(`Passiva de treinador sem implementação: ${linha.passiva_treinador}.`);
    }
    return {
      id: inteiro(linha.id_treinador, "id_treinador"), nome: linha.nome_treinador, cartas: ids(linha.habilidades_iniciais),
      sorte: Boolean(linha.passiva_treinador), descricao: linha.descricao_treinador, imagem: linha.imagem ?? "",
    };
  });
  const monstros = indexar(tabelaCsv(textos.monstros), linha => ({
    id: inteiro(linha.id_monstro, "id_monstro"), nome: linha.nome_monstro,
    energia: inteiro(linha.energia, "energia"), ofensiva: inteiro(linha.ofensiva, "ofensiva", 0),
    defesa: inteiro(linha.defesa, "defesa", 0), passiva: passiva(linha.passiva_monstro),
    descricaoPassiva: linha.passiva_monstro, descricao: linha.descricao_monstro, imagem: linha.imagem ?? "",
    melhorias: lista(linha.melhorias_monstro).map(texto => {
      const partes = /^(habilidade|evolucao):(\d+)$/.exec(texto);
      if (!partes) throw new Error(`Melhoria desconhecida: ${texto}.`);
      return { tipo: partes[1], id: inteiro(partes[2], "melhoria") };
    }),
    verso: linha.verso_monstro ? inteiro(linha.verso_monstro, "verso_monstro") : null,
    tipos: lista(linha.tipo), fraquezas: lista(linha.fraquezas), inatas: ids(linha.habilidades_inatas),
    trilha: linha.trilha, papel: linha.funcao_setup,
  }));
  const itens = indexar(tabelaCsv(textos.itens), linha => ({
    id: inteiro(linha.id_item, "id_item"), nome: linha.nome_item, quantidade: inteiro(linha.quantidade, "quantidade"),
    unico: linha.uso_unico === "sim", momento: linha.momento_uso, efeito: linha.efeito, imagem: linha.imagem ?? "",
  }));

  function exigirHabilidade(id, classe) {
    if (habilidades.get(id)?.classe !== classe) throw new Error(`Habilidade ${id} inválida para a classe ${classe}.`);
  }

  for (const id of BASE) exigirHabilidade(id, "base");
  for (const { id } of condicoes.values()) {
    if (!CONDICOES_IMPLEMENTADAS.has(id)) throw new Error(`Condição sem implementação: ${id}.`);
  }
  for (const habilidade of habilidades.values()) {
    const { id, classe, condicao } = habilidade;
    if (!HABILIDADES_IMPLEMENTADAS.has(id)) throw new Error(`Habilidade sem implementação: ${id}.`);
    if (!["base", "monstro", "treinador"].includes(classe)) throw new Error(`Classe de habilidade inválida: ${classe}.`);
    if (condicao !== null && !condicoes.has(condicao)) throw new Error(`Condição ${condicao} ausente na habilidade ${id}.`);
    const esperado = id >= 33 && id <= 38 ? id - 31 : ({ 13: 1, 16: 2, 19: 7, 20: 6, 49: 3, 53: 3, 58: 2 })[id] ?? null;
    if (condicao !== esperado) throw new Error(`Condição inesperada para a habilidade ${id}.`);
  }
  for (const treinador of treinadores.values()) {
    for (const id of treinador.cartas) exigirHabilidade(id, "treinador");
  }
  for (const monstro of monstros.values()) {
    if (!monstro.tipos.length || !monstro.fraquezas.length) throw new Error(`Tipos ou fraquezas ausentes em ${monstro.nome}.`);
    if (!["inicial", "capturavel", "evolucao"].includes(monstro.papel)
      || Boolean(monstro.trilha) !== (monstro.papel === "capturavel")) {
      throw new Error(`Papel ou trilha inválida em ${monstro.nome}.`);
    }
    if (monstro.verso !== null && monstros.get(monstro.verso)?.verso !== monstro.id) {
      throw new Error(`Verso inválido em ${monstro.nome}.`);
    }
    for (const id of monstro.inatas) exigirHabilidade(id, "monstro");
    for (const melhoria of monstro.melhorias) {
      if (melhoria.tipo === "habilidade") {
        exigirHabilidade(melhoria.id, "monstro");
      } else if (melhoria.id !== monstro.verso || monstros.get(melhoria.id)?.papel !== "evolucao") {
        throw new Error(`Evolução inválida em ${monstro.nome}.`);
      }
    }
  }
  return { monstros, habilidades, condicoes, treinadores, itens };
}
