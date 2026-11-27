import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { carregarCartas, montarPrompt, opcoesDe } from "../gerar.mjs";
import { executarCandidatas } from "../gerar-candidatas.mjs";

test("CSV aponta para a imagem final de todos os registros e prompt inclui evolução", async () => {
  const cartas = await carregarCartas();
  assert.equal(cartas.length, 142);
  for (const carta of cartas) assert.equal(carta.dados.imagem, `${carta.categoria}/${carta.id}.png`);
  const evolucao = cartas.find(carta => carta.categoria === "monstros" && carta.id === 2);
  const prompt = montarPrompt("{{categoria}} {{nome}} {{dados}} {{anterior}}", evolucao);
  assert.match(prompt, /Forma anterior — krakon/i);
  assert.doesNotMatch(prompt, /imagem: monstros/);
});

test("gera duas versões, preserva arquivos e regenera só a apagada apesar de metadados", async () => {
  const saida = await mkdtemp(join(tmpdir(), "catchall-candidatas-"));
  try {
    const o = { ...opcoesDe(["--categoria", "monstros", "--ids", "1", "--saida", saida]), gerar: true };
    const png = Buffer.from("89504e470d0a1a0a00000000", "hex");
    let chamadas = 0;
    const requisitar = async (_, req) => {
      chamadas++;
      const body = JSON.parse(req.body);
      assert.equal(body.output_format, "png");
      assert.match(body.prompt, /criatura atraente e fofa/i);
      return { ok: true, json: async () => ({ data: [{ b64_json: png.toString("base64") }] }) };
    };
    await executarCandidatas(o, { chave: "teste", requisitar, log() {} });
    assert.equal(chamadas, 2);
    const pasta = join(saida, "monstros");
    const primeira = join(pasta, "1_1.png"), segunda = join(pasta, "1_2.png"), final = join(pasta, "1.png");
    await writeFile(final, "escolha");
    await unlink(segunda);
    await executarCandidatas(o, { chave: "teste", requisitar, log() {} });
    assert.equal(chamadas, 3);
    assert.deepEqual(await readFile(primeira), png);
    assert.deepEqual(await readFile(segunda), png);
    assert.equal(await readFile(final, "utf8"), "escolha");
    assert.equal((await readdir(pasta)).filter(nome => nome.endsWith(".json")).length, 3);
    await executarCandidatas(o, { chave: "teste", requisitar, log() {} });
    assert.equal(chamadas, 3);
  } finally { await rm(saida, { recursive: true, force: true }); }
});

test("prévia não usa API e resposta não PNG não é salva", async () => {
  const saida = await mkdtemp(join(tmpdir(), "catchall-candidatas-"));
  try {
    const o = { ...opcoesDe(["--categoria", "itens", "--ids", "1", "--saida", saida]), gerar: false };
    await executarCandidatas(o, { log() {}, requisitar: () => assert.fail("chamada inesperada") });
    assert.deepEqual(await readdir(saida), []);
    o.gerar = true;
    await assert.rejects(executarCandidatas(o, { chave: "teste", log() {}, requisitar: async () => ({ ok: true, json: async () => ({ data: [{ b64_json: Buffer.from("ffd8ff00", "hex").toString("base64") }] }) }) }), /não retornou PNG/);
    assert.deepEqual(await readdir(join(saida, "itens")), []);
  } finally { await rm(saida, { recursive: true, force: true }); }
});
