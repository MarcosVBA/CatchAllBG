import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { carregarCartas, gerarImagem, montarPrompt, opcoesDe } from "./gerar.mjs";

const diretorio = dirname(fileURLToPath(import.meta.url));

export async function executarCandidatas(o, { chave = process.env.OPENROUTER_API_KEY, requisitar = fetch, log = console.log } = {}) {
  const modelo = await readFile(resolve(o.prompt), "utf8");
  const orientacoes = JSON.parse(await readFile(join(diretorio, "orientacoes.json"), "utf8"));
  let cartas = await carregarCartas();
  if (o.categoria) cartas = cartas.filter(carta => carta.categoria === o.categoria);
  if (o.ids) {
    const existentes = new Set(cartas.map(carta => carta.id));
    const ausentes = [...o.ids].filter(id => !existentes.has(id));
    if (ausentes.length) throw new Error(`IDs não encontrados: ${ausentes.join(", ")}.`);
    cartas = cartas.filter(carta => o.ids.has(carta.id));
  }
  const pendentes = [];
  for (const carta of cartas) for (const versao of [1, 2]) {
    const arquivo = join(resolve(o.saida), carta.categoria, `${carta.id}_${versao}.png`);
    try { await access(arquivo); }
    catch (erro) {
      if (erro.code !== "ENOENT") throw erro;
      pendentes.push({ carta, versao, arquivo, prompt: montarPrompt(modelo, carta, orientacoes) });
    }
  }
  const selecionadas = pendentes.slice(0, o.limite);
  log(`${selecionadas.length} de ${pendentes.length} imagens ausentes selecionadas. Modelo: ${o.modelo}; resolução: ${o.resolucao}; proporção: ${o.proporcao}.`);
  if (!o.gerar) {
    for (const { carta, versao, prompt } of selecionadas) log(`\n[${carta.categoria}/${carta.id}_${versao}.png] ${carta.nome}\n${prompt}`);
    log("Prévia: nenhuma requisição foi enviada.");
    return;
  }
  if (selecionadas.length && !chave) throw new Error("Defina OPENROUTER_API_KEY antes de gerar imagens.");
  for (const { carta, versao, arquivo, prompt } of selecionadas) {
    log(`Gerando ${carta.categoria}/${carta.id}_${versao}.png — ${carta.nome}...`);
    await mkdir(dirname(arquivo), { recursive: true });
    const imagem = await gerarImagem(carta, prompt, { ...o, formato: "png" }, chave, requisitar);
    if (imagem.extensao !== "png") throw new Error("A API não retornou PNG. A requisição pode ter sido cobrada; verifique a conta antes de repetir.");
    await writeFile(arquivo, imagem.bytes, { flag: "wx" });
    const registro = join(dirname(arquivo), `${carta.id}_${versao}.${randomUUID()}.json`);
    await writeFile(registro, JSON.stringify({ categoria: carta.categoria, id: carta.id, nome: carta.nome, versao, arquivo: `${carta.id}_${versao}.png`, data: new Date().toISOString(), parametros: imagem.pedido, uso: imagem.uso }, null, 2) + "\n", { flag: "wx" });
    log(`Salvo: ${arquivo}${imagem.uso?.cost != null ? ` (US$ ${imagem.uso.cost})` : ""}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.includes("--ajuda")) {
      console.log("Uso: node imagens/gerar-candidatas.mjs [--previa] [--categoria NOME] [--ids 1,2] [--limite N] [--modelo ID] [--proporcao 2:3] [--resolucao 768] [--prompt ARQUIVO] [--saida DIRETORIO]\nSem --previa, gera imagens pagas ausentes. --limite conta imagens, não cartas.");
    } else {
      const previa = args.includes("--previa");
      const o = opcoesDe(args.filter(arg => arg !== "--previa"));
      o.gerar = !previa;
      if (!args.includes("--saida")) o.saida = diretorio;
      await executarCandidatas(o);
    }
  } catch (erro) {
    console.error(`Erro: ${erro.message}`);
    process.exitCode = 1;
  }
}
