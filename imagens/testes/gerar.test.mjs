import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { carregarCartas, executar, opcoesDe } from "../gerar.mjs";

test("lê todas as categorias e não duplica cartas por quantidade", async () => {
  const cartas = await carregarCartas();
  assert.deepEqual(new Set(cartas.map(c => c.categoria)), new Set(["monstros", "habilidades", "treinadores", "itens", "condicoes"]));
  assert.equal(cartas.filter(c => c.categoria === "monstros").length, 59);
  assert.equal(cartas.filter(c => c.categoria === "itens").length, 5);
});

test("prévia seleciona IDs e não chama a rede ou cria arquivos", async () => {
  const dir = await mkdtemp(join(tmpdir(), "catchall-imagens-"));
  try {
    const saida = [];
    await executar(opcoesDe(["--categoria", "monstros", "--ids", "1,2", "--limite", "1", "--saida", dir]), { log: x => saida.push(x), requisitar: () => assert.fail("não deve chamar a API") });
    assert.match(saida.join("\n"), /krakon/i);
    assert.doesNotMatch(saida.join("\n"), /krakuron/i);
    assert.deepEqual(await readdir(dir), []);
    await assert.rejects(executar(opcoesDe(["--categoria", "monstros", "--ids", "999999"]), { log() {} }), /IDs não encontrados/);
    assert.throws(() => opcoesDe(["--ids", "1"]), /categoria/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("gera uma imagem e metadados e retoma sem chamar a API novamente", async () => {
  const dir = await mkdtemp(join(tmpdir(), "catchall-imagens-"));
  try {
    const o = opcoesDe(["--gerar", "--categoria", "monstros", "--ids", "1", "--saida", dir]);
    const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
    let chamadas = 0;
    const requisitar = async (url, req) => {
      chamadas++;
      assert.equal(url, "https://openrouter.ai/api/v1/images");
      const body = JSON.parse(req.body);
      assert.equal(body.aspect_ratio, "2:3");
      assert.match(body.prompt, /krakon/i);
      return { ok: true, json: async () => ({ data: [{ b64_json: png.toString("base64"), media_type: "image/png" }], usage: { cost: 0.008 } }) };
    };
    await executar(o, { chave: "teste", requisitar, log() {} });
    assert.deepEqual(await readFile(join(dir, "monstros", "1.png")), png);
    const meta = JSON.parse(await readFile(join(dir, "monstros", "1.json"), "utf8"));
    assert.equal(meta.uso.cost, 0.008);
    assert.equal(meta.parametros.model, o.modelo);
    await executar(o, { chave: "teste", requisitar, log() {} });
    assert.equal(chamadas, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("rejeita resposta inválida e exige chave antes de enviar", async () => {
  const dir = await mkdtemp(join(tmpdir(), "catchall-imagens-"));
  try {
    const o = opcoesDe(["--gerar", "--categoria", "itens", "--ids", "1", "--saida", dir]);
    await assert.rejects(executar(o, { chave: "", log() {} }), /OPENROUTER_API_KEY/);
    await assert.rejects(executar(o, { chave: "teste", log() {}, requisitar: async () => ({ ok: true, json: async () => ({ data: [] }) }) }), /não retornou uma imagem/);
    assert.deepEqual(await readdir(join(dir, "itens")), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
