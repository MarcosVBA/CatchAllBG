# Gerador de ilustrações

O script lê os cinco CSVs atuais de `cartas/` e cria uma cena vertical por registro, inclusive para condições. A coluna de quantidade não multiplica as imagens. Ele usa Node.js 20 ou superior e a [API de imagens do OpenRouter](https://openrouter.ai/docs/guides/overview/multimodal/image-generation), sem dependências adicionais.

O modelo padrão é `black-forest-labs/flux-3-image-klein`, em 768 e proporção 2:3. Os parâmetros são pedidos ao provedor: dimensões e proporções suportadas dependem do modelo. Consulte os preços no OpenRouter antes de gerar; as requisições, referências e eventuais tentativas podem ser cobradas. A prévia é gratuita e não precisa de chave.

## Duas candidatas por carta

O wrapper percorre todas as categorias e gera as versões que faltam em `imagens/<categoria>/<id>_1.png` e `<id>_2.png`. Ele não substitui imagens existentes: se uma versão for apagada, somente ela será gerada novamente. Registros JSON históricos de gerações não impedem a retomada. Primeiro examine a prévia sem custo:

```sh
node imagens/gerar-candidatas.mjs --previa
node imagens/gerar-candidatas.mjs --previa --categoria monstros --ids 1,2
```

Após definir `OPENROUTER_API_KEY` conforme abaixo, gere uma seleção ou todo o catálogo:

```sh
node imagens/gerar-candidatas.mjs --categoria monstros --ids 1,2
node imagens/gerar-candidatas.mjs
```

A execução normal é paga e pode gerar até 284 imagens para o catálogo atual vazio. `--limite` restringe o número de imagens, e `--saida`, `--modelo`, `--proporcao`, `--resolucao` e `--prompt` também estão disponíveis. Use `--ajuda` para ver as opções. Confirme preços e saldo antes de executar; o script para no primeiro erro e não tenta novamente automaticamente. Um erro após a chamada pode ter gerado cobrança.

Os CSVs indicam apenas a imagem final, por exemplo `monstros/1.png`, relativa à pasta `imagens/`. Escolha visualmente a candidata e copie-a para `imagens/monstros/1.png`, preservando as candidatas. O wrapper nunca altera essa imagem final. O protótipo exibe as artes finais disponíveis automaticamente; sem imagem a carta permanece utilizável. As pastas de imagens geradas são ignoradas pelo Git; para distribuí-las, será necessário decidir como incluí-las no projeto.

O prompt geral está em `prompt.txt`; as orientações por categoria e fase estão em `orientacoes.json`. Nas evoluções, o texto da forma anterior é incluído quando a ligação está disponível. Isso não garante continuidade visual, pois nenhuma imagem de referência é enviada automaticamente.

## Gerador individual anterior

Na raiz do projeto, visualize os prompts de todas as cartas:

```sh
node imagens/gerar.mjs
```

Para começar com apenas dois monstros:

```sh
node imagens/gerar.mjs --categoria monstros --ids 1,2
```

Depois de criar uma chave no OpenRouter e carregar créditos, configure-a no terminal (sem colocá-la no código ou no histórico):

```sh
read -rs -p 'Chave OpenRouter: ' OPENROUTER_API_KEY; export OPENROUTER_API_KEY; echo
node imagens/gerar.mjs --categoria monstros --ids 1,2 --gerar
```

Para gerar todo o catálogo, use `node imagens/gerar.mjs --gerar`. Pode-se combinar `--categoria`, `--ids` e `--limite` para executar lotes pequenos; veja `node imagens/gerar.mjs --ajuda`. O modelo, a resolução, a proporção, o arquivo do prompt e a pasta de saída também são configuráveis. Modelo alternativo deve aceitar a API de imagens do OpenRouter e os parâmetros escolhidos.

As imagens ficam em `imagens/geradas/<categoria>/<id>.<formato>`, junto a um JSON com o prompt, parâmetros, data e custos retornados pela API quando disponíveis. Essa pasta é ignorada pelo Git. Cada execução pula registros com imagem ou JSON existente; para refazer uma arte, mova ambos para outro local ou escolha outra pasta com `--saida`. A execução é sequencial e para no primeiro erro. Uma falha ou interrupção pode ocorrer depois de uma cobrança: confira a conta e os arquivos antes de tentar novamente.

Edite [prompt.txt](prompt.txt) para alterar a orientação artística. Ele deve conter `{{categoria}}`, `{{nome}}` e `{{dados}}`; `{{orientacao}}` e `{{anterior}}` inserem a orientação específica e a forma anterior. O resultado visual deve ser revisado: o modelo pode não seguir todas as instruções.

Para verificar o código sem chamar o serviço:

```sh
node --test imagens/testes/*.test.mjs
```
