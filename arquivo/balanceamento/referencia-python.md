# Referência das simulações em Python

Os valores a seguir foram produzidos antes da migração para JavaScript. Servem para comparar a duração e as tendências de balanceamento.

| Cenário | Amostra por versão | Antes das novas condições | Depois das novas condições |
| --- | ---: | ---: | ---: |
| Pares, piso de dano zero | 1.431 pares × 30 rodadas | 12,08 turnos | 12,19 turnos |
| Pares, estratégia mais defensiva, piso 1 e rerrolagem estendida | 1.431 pares × 15 rodadas | 14,52 turnos | 14,66 turnos |

O cenário por pares usa a semente `53131 + 317 × idA + 2879 × idB + 131 × índice` por rodada, com o índice começando em zero. Os treinadores são distintos e sorteados entre os três do catálogo. A amostra alterna entre 1, 2 e 3 melhorias nas formas básicas, limitadas às habilidades disponíveis, e entre 0 e 1 nas evoluções. Nocautes simultâneos e rodadas que atingem o teto de 80 turnos valem meio ponto para cada lado. A faixa central de 80% após as novas condições foi de 6 a 21 turnos no cenário de referência.

Na simulação de duração, após triplicar a energia e antes das novas condições, foram executados 6.000 duelos por ciclo, com semente `47821 + ciclo` e teto de 60 turnos por rodada. Cada time começa com um monstro inicial, captura um por ciclo, distribui uma melhoria por captura e sorteia a ordem dos combatentes. O primeiro duelo tem uma rodada. Os seguintes terminam na segunda vitória. O cenário de referência desempata nocautes simultâneos por sorteio.

| Ciclo | Média por rodada | Média por duelo |
| --- | ---: | ---: |
| 1 | 11,89 | 11,89 |
| 2 | 11,66 | 28,78 |
| 3 | 11,58 | 28,49 |

As amostras pressupõem dano mínimo zero, energia cheia por rodada, resolução prioritária de Ataque Rápido e uso de habilidades conforme as melhorias. As simulações deixam de fora os itens e usam uma heurística de escolha de cartas. Geradores de números diferentes mudam a sequência exata das rodadas, mesmo com a mesma semente.

## Verificação da migração

A simulação JavaScript foi executada com os dois catálogos usados na comparação anterior.

| Cenário | Python antes | JavaScript antes | Python depois | JavaScript depois |
| --- | ---: | ---: | ---: | ---: |
| Pares, piso zero | 12,081 | 12,105 | 12,190 | 12,217 |
| Pares, estratégia mais defensiva, piso 1 e rerrolagem estendida | 14,520 | 14,512 | 14,658 | 14,657 |

Com o catálogo atual, os 18 mil duelos em JavaScript tiveram médias de 11,98, 29,50 e 28,79 turnos por duelo, respectivamente. Nas mesmas três etapas, o catálogo anterior teve médias de 12,09, 29,30 e 28,65 turnos por duelo. O motor JavaScript de duração usa a estratégia de escolha de cartas da análise por pares, que é uma versão posterior à estratégia do cenário de duração em Python.
