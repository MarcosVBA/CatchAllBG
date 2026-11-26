# Motor de combate

O motor resolve uma rodada entre dois monstros. O [protótipo](../prototipo/README.md) e as [simulações](../simulacao/README.md) usam as mesmas regras e o mesmo [catálogo](../cartas/).

| Diretório | Responsabilidade |
| --- | --- |
| `regras/` | Preparação das formas e das mãos, ordem de escolha e revelação, resolução de ações, condições, passivas e resultado da rodada |
| `catalogo/` | Leitura e validação dos CSVs. Somente `arquivo.mjs` usa o sistema de arquivos do Node.js |
| `testes/` | Casos de combate com escolhas e rolagens fixas |

## Usar o motor numa interface

Os módulos `regras/` e `catalogo/index.mjs` usam importações relativas e APIs JavaScript que também existem no navegador. Os imports do exemplo partem da raiz do repositório. A aplicação pode buscar os cinco CSVs com `fetch` e passar os textos a `lerCatalogo` na forma `{ monstros, habilidades, condicoes, treinadores, itens }`. Atributos e composição das mãos vêm dos CSVs. Mudanças no efeito de cartas, condições ou passivas exigem atualizar o código das regras e o texto correspondente no catálogo.

```js
import { lerCatalogo } from "./motor/catalogo/index.mjs";
import { criarRodada } from "./motor/regras/rodada.mjs";

const catalogo = lerCatalogo(textosCsv);
const rodada = criarRodada({
  catalogo,
  combatentes: [
    { monstroId: 5, treinadorId: 1, melhorias: 1 },
    { monstroId: 3, treinadorId: 2, melhorias: 1 },
  ],
  d6: () => 1 + Math.floor(Math.random() * 6),
  rerrolar: ({ valor }) => valor <= 3,
});

const eventosDeAbertura = rodada.iniciarTurno();
const visaoDoJogador0 = rodada.observar(0);
const eventosDaEscolha0 = rodada.escolherCarta(0, 1);
const eventosDaEscolha1 = rodada.escolherCarta(1, 2);
```

- `iniciarTurno()` resolve os efeitos do início do turno e pode encerrar a rodada antes das escolhas. `observar(jogador)` informa a fase, a mão desse jogador, os atributos públicos e se ele pode escolher.
- `ordemDeEscolha` indica quem deve jogar primeiro sob Rastreado. A jogada comum fica oculta até as duas escolhas. `revelada` mostra a carta adversária antecipada apenas quando a regra prevê isso.
- `escolherCarta(jogador, id)` retorna os eventos daquela chamada, incluindo revelação, rolagens, dano, cura, aplicação de condições, renovação e fim da rodada. A função `d6` é síncrona e deve retornar um inteiro de 1 a 6. A função opcional `rerrolar` decide quando usar uma rerrolagem oferecida pelo motor.
- Para usar itens em combate, passe os IDs das cópias em `itens` na configuração do combatente. `observar` lista os itens utilizáveis naquele momento, e `escolherItem(jogador, id)` submete a ação de Super Cura ou Salva Vidas. O evento `item-consumido` permite atualizar o inventário da partida.
- Ao receber `{ tipo: "nocaute-simultaneo", vencedor: null }`, a aplicação decide o que acontece no duelo. A rodada seguinte começa com outra chamada a `criarRodada`.
