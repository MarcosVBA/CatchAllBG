import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { Workbook } from "@oai/artifact-tool";

const expected = {
  monstros: [54, 14],
  treinadores: [3, 5],
  habilidades: [28, 5],
  condicoes: [7, 3],
  itens: [5, 6],
};

for (const [file, [rowCount, cols]] of Object.entries(expected)) {
  const csv = await fs.readFile(`catch_all_v2_cartas/${file}.csv`, "utf8");
  const book = await Workbook.fromCSV(csv, { sheetName: file });
  const sheet = book.worksheets.getActiveWorksheet();
  const rows = sheet.getUsedRange(true).values;
  assert.equal(rows.length, rowCount + 1, file);
  assert.equal(rows[0].length, cols, file);
  console.log(`${file}: ${rowCount} registros, ${cols} colunas`);
}
