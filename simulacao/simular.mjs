import { parseArgs } from "node:util";
import { carregarCatalogo } from "../motor/catalogo/arquivo.mjs";
import { simularDuracao, simularPares } from "./cenarios.mjs";

const ajuda = `Uso: node simulacao/simular.mjs <pares|duracao> [opções]

  --amostras N            Rodadas por par ou duelos por ciclo
  --semente N             Semente do gerador
  --catalogo DIRETORIO    Diretório com os cinco CSVs
  --comparar DIRETORIO    Executa o mesmo cenário em um segundo catálogo
  --limite N              Teto de turnos por rodada
  --piso-dano 0|1         Piso do cálculo de ataque
  --defensivo             A estratégia automática prioriza mais bloqueios
  --empate sorteio|repetir   Desempate de nocaute simultâneo no cenário duracao
  --bonus-melhoria        Dá um ponto adicional por captura no cenário duracao
  --help                  Exibe esta ajuda`;

function inteiro(valor) {
  if (valor === undefined) return undefined;
  if (!/^\d+$/.test(valor)) throw new Error(`Valor inteiro inválido: ${valor}.`);
  return Number(valor);
}

try {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      amostras: { type: "string" }, semente: { type: "string" }, catalogo: { type: "string" },
      comparar: { type: "string" }, limite: { type: "string" }, "piso-dano": { type: "string" },
      defensivo: { type: "boolean" },
      empate: { type: "string" }, "bonus-melhoria": { type: "boolean" }, help: { type: "boolean" },
    },
  });
  if (values.help || !positionals.length) {
    console.log(ajuda);
  } else {
    const [cenario] = positionals;
    const executores = new Map([["pares", simularPares], ["duracao", simularDuracao]]);
    const executar = executores.get(cenario);
    if (positionals.length !== 1 || !executar) throw new Error("Escolha o cenário pares ou duracao.");
    if (cenario === "pares" && (values.empate !== undefined || values["bonus-melhoria"])) {
      throw new Error("As opções de desempate e bônus só se aplicam ao cenário duracao.");
    }
    const opcoes = {
      amostras: inteiro(values.amostras), semente: inteiro(values.semente), limite: inteiro(values.limite),
      pisoDano: inteiro(values["piso-dano"]), defensivo: values.defensivo,
      empate: values.empate, bonusMelhoria: values["bonus-melhoria"],
    };
    const resultado = executar(await carregarCatalogo(values.catalogo), opcoes);
    const comparacao = values.comparar ? executar(await carregarCatalogo(values.comparar), opcoes) : undefined;
    console.log(JSON.stringify({ cenario, resultado, comparacao }, null, 2));
  }
} catch (erro) {
  console.error(erro.message);
  process.exitCode = 1;
}
