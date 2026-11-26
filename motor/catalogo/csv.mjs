export function tabelaCsv(texto) {
  const linhas = [];
  let linha = [];
  let campo = "";
  let estado = "aberto";
  texto = texto.replace(/^\uFEFF/, "");

  function fecharCampo() {
    linha.push(campo);
    campo = "";
    estado = "aberto";
  }

  function fecharLinha() {
    fecharCampo();
    if (linha.length > 1 || linha[0] !== "") linhas.push(linha);
    linha = [];
  }

  for (let i = 0; i < texto.length; i++) {
    const char = texto[i];
    if (estado === "aspas") {
      if (char === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          estado = "fechado";
        }
      } else {
        campo += char;
      }
    } else if (char === ",") {
      fecharCampo();
    } else if (char === "\r" || char === "\n") {
      fecharLinha();
      if (char === "\r" && texto[i + 1] === "\n") i++;
    } else if (char === '"' && estado === "aberto" && campo === "") {
      estado = "aspas";
    } else if (char === '"' || estado === "fechado") {
      throw new Error("Aspas inválidas no CSV.");
    } else {
      campo += char;
    }
  }
  if (estado === "aspas") throw new Error("Campo sem aspas de fechamento no CSV.");
  if (linha.length || campo || estado === "fechado") fecharLinha();
  const [colunas, ...dados] = linhas;
  if (!colunas || new Set(colunas).size !== colunas.length || colunas.includes("")) {
    throw new Error("Cabeçalho inválido no CSV.");
  }
  return dados.map((valores, i) => {
    if (valores.length !== colunas.length) throw new Error(`Número de campos inválido no registro ${i + 2}.`);
    return Object.fromEntries(colunas.map((coluna, j) => [coluna, valores[j]]));
  });
}
