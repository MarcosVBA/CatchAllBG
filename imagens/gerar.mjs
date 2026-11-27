import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tabelaCsv } from "../motor/catalogo/csv.mjs";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const categorias = {
  monstros: ["id_monstro", "nome_monstro"],
  habilidades: ["id_habilidade", "nome_habilidade"],
  treinadores: ["id_treinador", "nome_treinador"],
  itens: ["id_item", "nome_item"],
  condicoes: ["id_condicao", "nome_condicao"],
};
const ajuda = `Uso: node imagens/gerar.mjs [opções]

Sem --gerar, apenas exibe a prévia e não envia requisições.
  --gerar                  Envia as requisições pagas ao OpenRouter
  --categoria NOME         monstros, habilidades, treinadores, itens ou condicoes
  --ids 1,2,3              IDs dentro da categoria escolhida
  --limite N               Limita a quantidade de imagens pendentes
  --modelo ID              Modelo da API de imagens (padrão: FLUX 3 Image Klein)
  --proporcao RAZAO        Proporção (padrão: 2:3)
  --resolucao VALOR        Resolução da API (padrão: 768)
  --prompt CAMINHO         Arquivo de modelo de prompt
  --saida DIRETORIO        Diretório das imagens e metadados
  --ajuda                  Mostra esta ajuda`;

export function opcoesDe(args) {
  const o = { gerar: false, modelo: "black-forest-labs/flux-3-image-klein", proporcao: "2:3", resolucao: "768", prompt: join(raiz, "imagens/prompt.txt"), saida: join(raiz, "imagens/geradas") };
  const campos = { "--categoria": "categoria", "--ids": "ids", "--limite": "limite", "--modelo": "modelo", "--proporcao": "proporcao", "--resolucao": "resolucao", "--prompt": "prompt", "--saida": "saida" };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--gerar") o.gerar = true;
    else if (arg === "--ajuda") o.ajuda = true;
    else if (campos[arg]) {
      const valor = args[++i];
      if (!valor || valor.startsWith("--")) throw new Error(`Informe um valor para ${arg}.`);
      o[campos[arg]] = valor;
    } else throw new Error(`Opção desconhecida: ${arg}.`);
  }
  if (o.categoria && !categorias[o.categoria]) throw new Error("Categoria desconhecida.");
  if (o.ids) {
    if (!o.categoria || !/^\d+(,\d+)*$/.test(o.ids)) throw new Error("Use --ids com --categoria e IDs numéricos separados por vírgulas.");
    o.ids = new Set(o.ids.split(",").map(Number));
  }
  if (o.limite !== undefined) {
    if (!/^[1-9]\d*$/.test(o.limite)) throw new Error("--limite deve ser um inteiro positivo.");
    o.limite = Number(o.limite);
  }
  if (!/^\d+:\d+$/.test(o.proporcao)) throw new Error("A proporção deve ser no formato 2:3.");
  return o;
}

export async function carregarCartas() {
  const lista = [];
  for (const [categoria, [idCampo, nomeCampo]] of Object.entries(categorias)) {
    const linhas = tabelaCsv(await readFile(join(raiz, "cartas", `${categoria}.csv`), "utf8"));
    const vistos = new Set();
    for (const dados of linhas) {
      const id = dados[idCampo];
      if (!/^\d+$/.test(id ?? "") || !dados[nomeCampo] || vistos.has(Number(id))) throw new Error(`ID ou nome inválido em ${categoria}: ${id}.`);
      vistos.add(Number(id));
      lista.push({ categoria, id: Number(id), nome: dados[nomeCampo], dados });
    }
  }
  const monstros = new Map(lista.filter(c => c.categoria === "monstros").map(c => [c.id, c]));
  for (const carta of monstros.values()) {
    if (carta.dados.funcao_setup === "evolucao") {
      const anterior = monstros.get(Number(carta.dados.verso_monstro));
      if (anterior && anterior.dados.funcao_setup !== "evolucao") carta.anterior = anterior;
    }
  }
  return lista;
}

export function montarPrompt(modelo, carta, orientacoes = {}) {
  const dados = Object.entries(carta.dados)
    .filter(([chave, valor]) => valor && !chave.startsWith("id_") && !chave.startsWith("nome_") && !["quantidade", "imagem"].includes(chave))
    .map(([chave, valor]) => `${chave}: ${valor}`).join("\n");
  const valores = { categoria: carta.categoria, nome: carta.nome, dados,
    orientacao: orientacoes[carta.categoria === "monstros" ? carta.dados.funcao_setup : carta.categoria] ?? "",
    anterior: carta.anterior ? `Forma anterior — ${carta.anterior.nome}: ${carta.anterior.dados.descricao_monstro}` : "" };
  for (const chave of ["categoria", "nome", "dados"]) if (!modelo.includes(`{{${chave}}}`)) throw new Error(`Prompt precisa conter {{${chave}}}.`);
  return modelo.replace(/\{\{(categoria|nome|dados|orientacao|anterior)\}\}/g, (_, chave) => valores[chave]);
}

async function existe(caminho) {
  try { await access(caminho, constants.F_OK); return true; }
  catch (erro) { if (erro.code === "ENOENT") return false; throw erro; }
}

export async function gerarImagem(carta, prompt, o, chave, requisitar = fetch) {
  const body = { model: o.modelo, prompt, aspect_ratio: o.proporcao, resolution: o.resolucao, response_format: "b64_json", ...(o.formato ? { output_format: o.formato } : {}) };
  const resposta = await requisitar("https://openrouter.ai/api/v1/images", {
    method: "POST", headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!resposta.ok) throw new Error(`OpenRouter retornou HTTP ${resposta.status}; consulte a conta ou os parâmetros antes de tentar novamente.`);
  const resultado = await resposta.json();
  const imagem = resultado.data?.[0];
  if (!imagem?.b64_json || !/^[A-Za-z0-9+/]+={0,2}$/.test(imagem.b64_json)) throw new Error("A API não retornou uma imagem em base64. A requisição pode ter sido cobrada; verifique a conta antes de repetir.");
  const bytes = Buffer.from(imagem.b64_json, "base64");
  const png = bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  const extensao = png ? "png" : jpeg ? "jpg" : webp ? "webp" : null;
  if (!extensao) throw new Error("A API retornou dados que não são PNG, JPEG ou WebP. A requisição pode ter sido cobrada.");
  return { bytes, extensao, uso: resultado.usage ?? null, pedido: body };
}

export async function executar(o, { chave = process.env.OPENROUTER_API_KEY, requisitar = fetch, log = console.log } = {}) {
  const modeloPrompt = await readFile(resolve(o.prompt), "utf8");
  const orientacoes = JSON.parse(await readFile(join(raiz, "imagens/orientacoes.json"), "utf8"));
  let cartas = await carregarCartas();
  if (o.categoria) cartas = cartas.filter(c => c.categoria === o.categoria);
  if (o.ids) {
    const encontrados = new Set(cartas.map(c => c.id));
    const ausentes = [...o.ids].filter(id => !encontrados.has(id));
    if (ausentes.length) throw new Error(`IDs não encontrados: ${ausentes.join(", ")}.`);
    cartas = cartas.filter(c => o.ids.has(c.id));
  }
  const pendentes = [];
  for (const carta of cartas) {
    const base = join(resolve(o.saida), carta.categoria, String(carta.id));
    if ((await Promise.all(["png", "jpg", "webp", "json"].map(ext => existe(`${base}.${ext}`)))).some(Boolean)) {
      log(`Já existe: ${carta.categoria}/${carta.id} — ${carta.nome}`);
    } else pendentes.push({ carta, base, prompt: montarPrompt(modeloPrompt, carta, orientacoes) });
  }
  const selecionadas = pendentes.slice(0, o.limite);
  log(`${selecionadas.length} de ${pendentes.length} cartas pendentes selecionadas. Modelo: ${o.modelo}; proporção: ${o.proporcao}; resolução: ${o.resolucao}.`);
  if (!o.gerar) {
    for (const { carta, prompt } of selecionadas) log(`\n[${carta.categoria}/${carta.id}] ${carta.nome}\n${prompt}`);
    log("Prévia: nenhuma requisição foi enviada. Use --gerar para gerar imagens pagas.");
    return;
  }
  if (!selecionadas.length) return;
  if (!chave) throw new Error("Defina OPENROUTER_API_KEY antes de gerar imagens.");
  for (const { carta, base, prompt } of selecionadas) {
    log(`Gerando ${carta.categoria}/${carta.id} — ${carta.nome}...`);
    await mkdir(dirname(base), { recursive: true });
    const imagem = await gerarImagem(carta, prompt, o, chave, requisitar);
    const arquivo = `${base}.${imagem.extensao}`;
    await writeFile(arquivo, imagem.bytes, { flag: "wx" });
    await writeFile(`${base}.json`, JSON.stringify({ categoria: carta.categoria, id: carta.id, nome: carta.nome, arquivo: `${carta.id}.${imagem.extensao}`, data: new Date().toISOString(), parametros: imagem.pedido, uso: imagem.uso }, null, 2) + "\n", { flag: "wx" });
    log(`Salvo: ${arquivo}${imagem.uso?.cost != null ? ` (US$ ${imagem.uso.cost})` : ""}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const o = opcoesDe(process.argv.slice(2));
    if (o.ajuda) console.log(ajuda);
    else await executar(o);
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}
