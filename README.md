# Catch All

Jogo de tabuleiro competitivo de captura e combate entre monstros. O protótipo permite jogar uma partida local contra três IAs com estilos diferentes.

## Jogar

Com Node.js 20 ou superior, execute na raiz deste repositório.

```sh
node prototipo/servidor.mjs
```

Abra [a mesa de jogo](http://127.0.0.1:4178/). Consulte as [decisões do protótipo](prototipo/README.md) para ver como a versão digital aplica as regras da partida.

## Projeto

| Diretório | Conteúdo |
| --- | --- |
| [regras/](regras/catch_all_v2.md) | Documento de regras vigente, versão 2 |
| [cartas/](cartas/) | Catálogo de monstros, habilidades, condições, treinadores e itens em CSV |
| [motor/](motor/README.md) | Leitura do catálogo e regras de combate compartilhadas |
| [simulacao/](simulacao/README.md) | Cenários, estratégias e comandos para analisar duração e balanceamento |
| [prototipo/](prototipo/README.md) | Interface HTML, fluxo da partida e estratégias dos três rivais |
| [arquivo/](arquivo/README.md) | Regras antigas, scripts experimentais, catálogos intermediários e resultados históricos |

## Validar e simular

```sh
node --test motor/testes/*.test.mjs simulacao/testes/*.test.mjs prototipo/testes/*.test.mjs
node simulacao/simular.mjs pares
node simulacao/simular.mjs duracao
```
