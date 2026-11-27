import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, cp, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { arteDaCarta, revelarArteCarregada, urlDaImagem } from "../interface/imagens.mjs";
import { carregarCatalogo } from "../../motor/catalogo/arquivo.mjs";

test("catálogo disponibiliza as imagens das cinco categorias", async () => {
  const catalogo = await carregarCatalogo();
  for (const categoria of ["monstros", "habilidades", "condicoes", "treinadores", "itens"]) {
    assert.equal(catalogo[categoria].get(1).imagem, `${categoria}/1.png`);
  }
});

test("arte é restrita ao caminho final e aparece somente após carregamento", () => {
  assert.match(urlDaImagem("monstros/1.png"), /\/imagens\/monstros\/1\.png$/);
  for (const invalido of ["monstros/1_1.png", "../segredo.png", "https://exemplo.com/1.png", "monstros/1.png\" onerror=\"x", ""]) {
    assert.equal(urlDaImagem(invalido), null);
    assert.equal(arteDaCarta({ imagem: invalido }), "");
  }
  assert.match(arteDaCarta({ imagem: "itens/1.png" }), /alt="" hidden/);
  const alvo = { hidden: true, classList: { contains: nome => nome === "arte-carta" } };
  revelarArteCarregada({ target: alvo });
  assert.equal(alvo.hidden, false);
  const outro = { hidden: true, classList: { contains: () => false } };
  revelarArteCarregada({ target: outro });
  assert.equal(outro.hidden, true);
});

test("pacote inclui artes finais e não inclui candidatas ou metadados", async () => {
  const base = await mkdtemp(join(tmpdir(), "catchall-pacote-"));
  try {
    const repo = join(base, "repo"), destino = join(base, "site");
    await mkdir(repo);
    for (const pasta of ["prototipo", "motor", "simulacao", "cartas"]) await cp(new URL(`../../${pasta}/`, import.meta.url), join(repo, pasta), { recursive: true });
    await mkdir(join(repo, "imagens", "monstros"), { recursive: true });
    await writeFile(join(repo, "imagens", "monstros", "1.png"), "final");
    await writeFile(join(repo, "imagens", "monstros", "1_1.png"), "candidata");
    await writeFile(join(repo, "imagens", "monstros", "1.json"), "privado");
    await promisify(execFile)("bash", ["prototipo/empacotar-pages.sh", destino], { cwd: repo });
    assert.equal(await readFile(join(destino, "imagens", "monstros", "1.png"), "utf8"), "final");
    await assert.rejects(access(join(destino, "imagens", "monstros", "1_1.png")), { code: "ENOENT" });
    await assert.rejects(access(join(destino, "imagens", "monstros", "1.json")), { code: "ENOENT" });
  } finally { await rm(base, { recursive: true, force: true }); }
});
