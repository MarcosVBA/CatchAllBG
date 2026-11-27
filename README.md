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
| [editor/monstros.html](editor/monstros.html) | Editor local de monstros e consulta de habilidades compartilhadas |
| [arquivo/](arquivo/README.md) | Regras antigas, scripts experimentais, catálogos intermediários e resultados históricos |

Para editar monstros, abra `editor/monstros.html` no navegador e selecione `cartas/monstros.csv` e `cartas/habilidades.csv`. Em navegadores compatíveis, use **Abrir monstros para editar** para salvar diretamente no arquivo selecionado; caso contrário, use a opção de download e substitua o CSV manualmente. A página funciona localmente, sem enviar os arquivos a um servidor.

## Validar e simular

```sh
node --test motor/testes/*.test.mjs simulacao/testes/*.test.mjs prototipo/testes/*.test.mjs
node simulacao/simular.mjs pares
node simulacao/simular.mjs duracao
```
