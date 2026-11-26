# Simulações de Catch All v2

A simulação usa o [motor de combate](../motor/README.md) e as [cartas ativas](../cartas/) para estimar a duração dos duelos e comparar confrontos.

## Executar

Use Node.js 20 ou superior. Execute os comandos na raiz do repositório.

```sh
node --test simulacao/testes/*.test.mjs
node simulacao/simular.mjs pares
node simulacao/simular.mjs duracao
```

`pares` usa 30 rodadas para cada par distinto, inclui as evoluções e registra a média por monstro, os gatilhos de efeitos, a duração e os nocautes possíveis no ataque básico. `duracao` usa 6.000 duelos por ciclo, com uma rodada no primeiro e melhor de três nos seguintes. As amostras de captura e a ordem dos times são sorteadas pelo cenário.

```sh
node simulacao/simular.mjs pares --amostras 15 --defensivo --piso-dano 1 --sorte-em-condicoes
node simulacao/simular.mjs duracao --amostras 1000 --semente 47821 --empate repetir
node simulacao/simular.mjs pares --comparar /caminho/para/outro/catalogo
node simulacao/simular.mjs --help
```

A saída é JSON. `--comparar` executa o mesmo cenário e a mesma configuração em um segundo diretório de CSVs. As repetições com a mesma semente e os mesmos dados produzem o mesmo resultado.

As simulações usam energia cheia, refazem a mão conforme a forma em combate e omitem itens. Por padrão, o cálculo usa piso zero, Ataque Rápido letal cancela a ação rival e o desempate no cenário de duração é por sorteio. A configuração defensiva e as decisões de rerrolagem da CLI pertencem à estratégia da simulação. O [protótipo jogável](../prototipo/README.md) usa o mesmo motor e permite escolher os combatentes a cada rodada, inclusive após empate.

Consulte [a referência em Python](../arquivo/balanceamento/referencia-python.md) para ver a comparação da migração.
