import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const porta = Number(process.argv[2] ?? 4178);
if (!Number.isInteger(porta) || porta < 0 || porta > 65535) throw new RangeError("Porta inválida.");

const raiz = new URL("../", import.meta.url);
const prototipo = "/prototipo/";
const publicos = [
  /^\/prototipo\/(index\.html|estilo\.css|(?:interface|partida)\/[a-z-]+\.mjs)$/,
  /^\/motor\/(?:catalogo\/(?:index|csv)|regras\/(?:cartas|efeitos|rodada))\.mjs$/,
  /^\/simulacao\/(?:sorteio|estrategia)\.mjs$/,
  /^\/cartas\/(?:monstros|habilidades|condicoes|treinadores|itens)\.csv$/,
  /^\/imagens\/(?:monstros|habilidades|condicoes|treinadores|itens)\/\d+\.png$/,
];
const mime = { html: "text/html", css: "text/css", mjs: "text/javascript", csv: "text/csv", png: "image/png" };

createServer(async (pedido, resposta) => {
  try {
    let { pathname } = new URL(pedido.url, "http://127.0.0.1");
    if (pedido.method !== "GET" && pedido.method !== "HEAD") {
      resposta.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    if (["/", "/prototipo", "/catch_all_v2_prototipo", "/catch_all_v2_prototipo/"].includes(pathname)) {
      resposta.writeHead(302, { Location: prototipo }).end();
      return;
    }
    if (pathname === prototipo) pathname += "index.html";
    if (!publicos.some(roteiro => roteiro.test(pathname))) {
      resposta.writeHead(404).end("Arquivo não encontrado.");
      return;
    }
    const corpo = await readFile(new URL(pathname.slice(1), raiz));
    const extensao = pathname.split(".").at(-1);
    resposta.writeHead(200, { "Content-Type": extensao === "png" ? mime.png : `${mime[extensao]}; charset=utf-8`, "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff" }).end(pedido.method === "HEAD" ? undefined : corpo);
  } catch (erro) {
    resposta.writeHead(erro.code === "ENOENT" ? 404 : 500).end("Falha ao carregar o arquivo.");
  }
}).listen(porta, "127.0.0.1", function () {
  console.log(`Catch All: http://127.0.0.1:${this.address().port}${prototipo}`);
});
