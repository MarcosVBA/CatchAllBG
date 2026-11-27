# Catch All

## Regras

#### Setup

- Busque as cartas de treinadores e de monstros iniciais, deixe-os ao alcance de todos os jogadores
- Prepare as trilhas de monstros, dividindo cada monstro por tipo em 3 montes
- Coloque o tabuleiro de duelo a disposição dos jogadores, junto com as fichas de condições e dados (para contagem de vida e realizar rolagens)

#### Iniciando a Aventura

**Regra Importante**: Nas decisões em sequência, como o início da aventura, a escolha de trilha e os desafios, alterne o jogador inicial em sentido anti-horário.

- 1. Façam um partida rápida de dois ou um, o vencedor começa escolhendo
- 2. Sorteiem seis treinadores diferentes e revelem as cartas. Partindo do jogador inicial, cada jogador escolhe um dos treinadores ainda disponíveis. Depois, cada jogador escolhe um monstro inicial.
- 3. Cada jogador também deve pegar as cartas de habilidade base mais qualquer carta que o seu treinador permita para montar o seu baralho


#### Fase de Captura

1. Alternando o jogador inicial, cada jogador pega 3 cartas de uma trilha que escolher
2. As cartas da pilha são monstros que podem ser recrutados para o time, o jogador escolhe um opção dos que ele puxou e tenta fazer a captura
3. Para efetivamente pegar o monstro, o jogador deve jogar um dado, os resultados 1 e 2 fazem o monstro fugir, não estando mais disponível no jogo.
	- Se caso o monstro fugiu, compre outro monstro da trilha até ter 3 cartas e tente novamente uma captura.
4. Após adicionar um novo monstro no time, adicione um ponto de melhoria em qualquer monstro.
	- Cada time pode ter até 3 monstros. Se uma captura resultar em 4, escolha um dos quatro, inclusive o recém-capturado, para deixar ir antes de distribuir a melhoria. O monstro removido sai da disputa.
5. Você pode escolher entre mais um ponto de habilidade ou uma carta de item.

#### Fase do Desafio

1. Alternando jogador inicial, os jogadores devem desafiar outro para uma batalha, até que todos os jogadores tenham uma batalha ao menos para resolver.
	- Se a quantidade de jogadores é impar, simular um 4 jogador ou permitir uma segunda batalha para o mesmo jogador

#### Fase de Duelo

**Nomenclatura dos Duelos**: O duelo é quando dois jogadores usam seus monstros para vencer rodadas, cada rodada é constituída por turnos, onde os jogadores realizam ações simultaneamente

1. Antes de cada rodada, cada jogador escolhe em segredo um monstro disponível de sua equipe. Os dois revelam os combatentes juntos.
2. Baseado no monstro ativo no momento, pegue as cartas geradas por habilidades dele e junte com seu baralho (base+treinador)
3. A partir daqui, os jogadores devem escolher uma carta de habilidade para executar cada turno, revelando o efeito apenas quando ambos os jogadores já selecionaram sua ação
	- Use todo o seu baralho na sua mão
	- Sempre que realizar uma ação, com uma carta de habilidade, mantenha a carta exposta na lateral do tabuleiro de duelo
	- Se pelo menos um jogador ficar sem cartas de habilidade na mão, ao fim do turno ambos recolhem as cartas e recompõem suas mãos. Adicione uma ficha à rodada, mesmo que os dois esvaziem a mão no mesmo turno. Os bônus totais de ofensiva para ambos são +1, +2, +4, +6, +8 e assim por diante, aumentando em +2 a cada ficha a partir da terceira. O novo bônus vale a partir do próximo turno e as fichas são removidas ao fim da rodada.
	- Se um monstro for nocauteado, o outro vence a rodada. Os dois combatentes ficam indisponíveis até o fim do duelo.
	- Em caso de nocaute simultâneo, o placar fica igual. Os dois jogadores voltam a escolher e podem manter o combatente ou usar outro monstro disponível.
	- No primeiro ciclo, vence o duelo quem ganhar uma rodada. Nos ciclos seguintes, vence quem ganhar duas.
4. O jogador vitorioso do duelo ganha um ponto de habilidade e um troféu (usado para contar vitória)

**Atacar**: Ao atacar, o jogador verificar o resultado do ataque do monstro atacante menos a defesa do monstro que foi atacado, esse valor é somado a uma rolagem de 1d6 para definir o dano

**Ataques rápidos**: Resolva um ataque rápido antes de uma ação que não seja ataque rápido. Se ele nocautear o rival, a ação rival é cancelada. Se ambos usarem ataques rápidos, resolva-os simultaneamente. Bloqueios ainda bloqueiam ataques rápidos.

**Bloqueio parcial**: Calcule o dano do ataque com seus modificadores e bloqueie metade desse valor, arredondando a parcela bloqueada para baixo. Um ataque de 5 causa 3 de dano. Efeitos que dependem de bloquear continuam funcionando. Dano direto causado por efeitos ao bloquear é aplicado separadamente.

**Foco e bloqueio**: O bônus de Foco é consumido no próximo ataque do monstro, mesmo que o adversário bloqueie esse ataque. Passivas podem abrir exceções. Desencaixe, de Pinhisco, preserva o Foco acumulado no primeiro ataque que o rival bloquear em cada rodada.

**Evolução**: Ao evoluir, o monstro mantém suas habilidades inatas e as habilidades desbloqueadas nas formas anteriores, além das habilidades da nova forma. A evolução ocupa sua posição na sequência de melhorias.

#### Andamento do jogo

Após o inicio da aventura, os jogadores sempre seguem a mesma sequência:
- Realizam suas capturas
- Melhoram o seu time
- Desafiam outros jogadores para um combate
Esse ciclo é feito 3 vezes, após a terceira, o jogador com mais troféus (vitórias) é o vencedor. Se houver empate, resolva com um duelo.

#### Tipos de monstro

Cada monstro deve ter ao menos um tipo e uma fraqueza (que pode ser comum de seu tipo ou não), os tipos disponíveis são:

- Fogo
- Grama
- Água
- Rocha
- Inseto
- Normal
- Noturno
- Psíquico
- Voador
- Fada
- Raio

Se um monstro tiver fraqueza ao tipo de seu rival, recebe +1 de dano no cálculo dos ataques desse rival.

#### Trilhas

- trilha da montanha: tipo rocha, voador, noturno e fogo
- trilha da floresta: tipo grama, inseto, noturno e normal
- trilha do riacho: tipo água, psíquico, raio e normal

### Exemplo de cartas

#### Carta de monstro

| id_monstro | nome_monstro | energia | ofensiva | defesa | passiva_monstro | melhorias_monstro | verso_monstro | descricao_monstro | tipo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | krakon | 8 | 4 | 2 | - | Guspe de Chama (id=11) -> Pele Quente (id=12) -> Evolução | 2 | Dragão pequeno, vermelho e com escamas de pedra, possui pequenas asas | Fogo |
| 2 | krakuron | 10 | 5 | 2 | - | Incinerar (id=13) | 1 | Dragão maior, vermelho e com escamades de pedra, possui asas grandes e espinhos pelo corpo | Fogo |
| 3 | owlzin | 26 | 3 | 3 | - | Bolha de água (id=15) -> Curar I (id=14) -> Evolução | 4 | Como um ornitorrinco amigavél, branco com manchas em formato de bolha azul | Água |
| 4 | owlsel | 10 | 3 | 3 | Re-role uma vez o dado de cura e fique com o resultado | - | 3 | A mistura de um ornitorrinco e um urso, branco com manchas azuis, forte | Água |
| 5 | flouly | 24 | 3 | 4 | - | Seiva Clara (id=26) -> Golpe de Cipó (id=27) -> Evolução | 6 | Ouriço felpudo com flores brancas que se fecham quando ele se encolhe. | Grama |

#### Carta de Treinador

| id_treinador | nome_treinador | passiva_treinador | melhorias_treinador | descricao_treinador |
| --- | --- | --- | --- | --- |
| 1 | Marcos | - | Foco (grátis, id=3) | Garoto com oculos, timido. Sempre calculando como vencer seus desafios. Cabelo no topo loiro e base escura, camisa florida |
| 2 | Dri | - | Ataque Rápido (grátis, id=4) | Garota linda, com cabelos vermelho, agitada e energética. Vestido preto, brincos chamativos e dourados |
| 3 | Gustavo | Sorte: Uma vez por tentativa de captura ou dado de habilidade, rerrole o dado e fique com o novo resultado. Não se aplica a dados de ataque, condições ou passivas | -- | Garoto moreno, com cabelo crespo e magro. Bastante na dele, porem, amigavél. Regata e roupa de estilo esportivo |

#### Cartas de habilidade

| id_habilidade | nome_habilidade | efeito | tag |
| --- | --- | --- |
| 1 | Atacar | Realize um ataque | base |
| 2 | Defesa | Bloquei o ataque do oponente | base |
| 3 | Repita a ultima ação, apenas se ela for uma habilidade base ou de treinador | base |
| 4 | Foco | Role 1d6 e acrescente o resultado integral ao cálculo de dano do próximo ataque. | treinador |
| 5 | Ataque Rápido | Realize um ataque, porem, considere o dano aplicado antes de executar a ação do oponente | treinador | 
| 11 | Guspe de Chama | Realize um ataque. Se o oponente bloquear, cause 2 de dano direto. | monstro |
| 12 | Pele Quente | Realize um ataque, se o oponente também te atacou, ele sofre 2 de dano direto | monstro |
| 13 | Incinerar | Cause "Incendiar" no oponente | monstro |
| 14 | Curar I | Role 1d6. Recupere 2 de energia com 1–4 ou 3 de energia com 5–6. | monstro |
| 15 | Bolha de água | Bloqueie metade do dano do ataque rival, arredondando a parcela bloqueada para baixo. Se bloquear um ataque, cause 4 de dano direto ao rival. | monstro |

#### Condições

| nome_condicao | descricao_condicao|
| --- | --- |
| Incendiar | No inicio do turno de combate, o jogador joga 1d6. Resultados diferentes de 6 geram 1 de dano direto, se o resultado for 6, remova a condição. |

#### Item

Uso único:

- Armadilha x2 - Remova um monstro do seu time, realize a fase de captura novamente e no fim, adicione um ponto de melhoria em qualquer monstro
- Super Cura x2 - Recupere toda a energia de seu monstro em combate
- Salva Vidas x2 - Ao ser atacado, bloqueie o ataque e recupere 4 pontos de vidas
- Mapa da trilha x2 - Durante a fase da trilha, busque mais 3 cartas e realize a captura
- Poção de Força x2 - 2 pontos de melhoria





