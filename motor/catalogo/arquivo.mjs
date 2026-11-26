import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { lerCatalogo, TABELAS } from "./index.mjs";

export async function carregarCatalogo(diretorio = new URL("../../cartas/", import.meta.url)) {
  const textos = await Promise.all(TABELAS.map(async tabela => {
    const nome = `${tabela}.csv`;
    const path = diretorio instanceof URL ? new URL(nome, diretorio) : resolve(diretorio, nome);
    return [tabela, await readFile(path, "utf8")];
  }));
  return lerCatalogo(Object.fromEntries(textos));
}
