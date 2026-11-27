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

**Atacar**: Para calcular o dano de um ataque, some a ofensiva do atacante ao resultado de 1d6, subtraia a defesa do alvo e aplique os modificadores. O dano calculado tem mínimo de zero.

**Ataques rápidos**: Resolva um ataque rápido antes de uma ação que não seja ataque rápido. Se ele nocautear o rival, a ação rival é cancelada. Se ambos usarem ataques rápidos, resolva-os simultaneamente. Bloqueios ainda bloqueiam ataques rápidos.

**Bloqueio integral**: Bloqueia todo o dano calculado do ataque, mas efeitos diretos previstos nas cartas são resolvidos separadamente.

**Bloqueio parcial**: Calcule o dano do ataque com seus modificadores e bloqueie metade desse valor, arredondando a parcela bloqueada para baixo. Um ataque de 5 causa 3 de dano. Efeitos que dependem de bloquear continuam funcionando. Dano direto causado por efeitos ao bloquear é aplicado separadamente.

**Foco e bloqueio**: O bônus de Foco é consumido no próximo ataque do monstro, mesmo que o adversário bloqueie esse ataque. Passivas podem abrir exceções. Desencaixe, de Pinhisco, preserva o Foco acumulado no primeiro ataque que o rival bloquear em cada rodada.

**Evolução**: Ao evoluir, o monstro mantém suas habilidades inatas e as habilidades desbloqueadas nas formas anteriores, além das habilidades da nova forma. A evolução ocupa sua posição na sequência de melhorias.

O protótipo limita cada rodada a 120 turnos. Nesse limite, vence quem tiver a maior proporção de energia restante; se as proporções forem iguais, o placar não muda e os jogadores escolhem novamente. Consulte as demais [decisões do protótipo](../prototipo/README.md).

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

Os exemplos abaixo refletem o catálogo atual. Consulte os [CSVs de cartas](../cartas/) para a lista completa de monstros, habilidades, treinadores, condições e itens.

#### Carta de monstro

| ID | Nome | Energia | Ofensiva | Defesa | Passiva | Habilidades inatas | Melhorias | Tipo | Fraquezas | Descrição |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | krakon | 26 | 6 | 2 | — | — | habilidade:11 / habilidade:12 / evolucao:2 | Fogo | Água | Dragão vermelho de escamas rochosas e pequenas asas. Brasas escapam de sua boca quando se prepara para cuspir fogo. |
| 2 | krakuron | 30 | 7 | 2 | — | — | habilidade:13 | Fogo | Água | A forma adulta de Krakon tem asas largas e espinhos de pedra incandescente. Seu sopro espalha fogo pelas fendas da montanha. |
| 3 | owlzin | 30 | 4 | 3 | — | — | habilidade:15 / habilidade:14 / evolucao:4 | Água | Raio | Pequeno ornitorrinco branco com manchas azuis. Sopra bolhas protetoras e mergulha em águas frescas para recuperar as forças. |
| 4 | owlsel | 35 | 4 | 4 | Re-role uma vez o dado de cura e fique com o resultado | 39 | — | Água | Raio | Criatura robusta de pelo branco e manchas azuis, entre um urso e um ornitorrinco. Suas bolhas e águas cintilantes acalmam ferimentos. |
| 5 | flouly | 25 | 4 | 4 | — | — | habilidade:26 / habilidade:27 / evolucao:6 | Grama | Fogo | Ouriço felpudo com flores brancas no dorso. De seus espinhos brotam cipós e gotas de seiva luminosa. |

#### Carta de Treinador

| ID | Nome | Passiva | Habilidades iniciais | Descrição |
| --- | --- | --- | --- | --- |
| 1 | Marcos | — | 4 | Garoto com oculos, timido. Sempre calculando como vencer seus desafios. Cabelo no topo loiro e base escura, camisa florida |
| 2 | Dri | — | 5 | Garota linda, com cabelos vermelho, agitada e energética. Vestido preto, brincos chamativos e dourados |
| 3 | Gustavo | Sorte: Uma vez por tentativa de captura ou dado de habilidade, rerrole o dado e fique com o novo resultado. Não se aplica a dados de ataque, condições ou passivas | — | Garoto moreno, com cabelo crespo e magro. Bastante na dele, porem, amigavél. Regata e roupa de estilo esportivo |


#### Cartas de habilidade

| ID | Nome | Efeito | Tipo |
| --- | --- | --- | --- |
| 1 | Atacar | Realize um ataque | base |
| 2 | Defesa | Bloquei o ataque do oponente | base |
| 3 | Repetir | Repita a ultima ação, apenas se ela for uma habilidade base ou de treinador | base |
| 4 | Foco | Role 1d6 e acrescente o resultado integral ao cálculo de dano do próximo ataque. | treinador |
| 5 | Ataque Rápido | Realize um ataque, porem, considere o dano aplicado antes de executar a ação do oponente | treinador |
| 11 | Guspe de Chama | Realize um ataque, se o oponente bloquear, cause 2 de dano direto | monstro |
| 12 | Pele Quente | Realize um ataque. Se o rival também atacar, ele sofre 1 de dano direto. | monstro |
| 13 | Incinerar | Cause "Incendiar" no oponente | monstro |
| 14 | Curar I | Role 1d6. Recupere 2 de energia com 1–4 ou 3 de energia com 5–6. Respeite sua energia máxima. | monstro |
| 15 | Bolha de água | Bloqueie metade do dano do ataque rival, arredondando a parcela bloqueada para baixo. Se bloquear um ataque, cause 4 de dano direto ao rival. | monstro |


#### Condições

| Condição | Descrição |
| --- | --- |
| Incendiar | No início de cada um dos próximos 3 turnos da rodada, role 1d6. Com 6, remova a condição sem causar dano. Com 1 a 5, sofra 1 de dano direto. Remova a condição depois do terceiro teste ou no fim da rodada, o que ocorrer primeiro. Aplicar Incendiar a um monstro já incendiado não acumula dano nem reinicia a contagem. |
| Ofuscado | Quando seu próximo ataque causar dano positivo pelo cálculo do ataque, antes dos ajustes das condições, role 1d6. Com 1–3, reduza em 4 o dano desse ataque, até o mínimo de zero. Com 4–6, mantenha o dano. A ficha dura até o fim do segundo turno seguinte à aplicação ou até o fim da rodada, o que ocorrer primeiro. Consuma a ficha após resolver o gatilho, qualquer que seja o resultado. Reaplicar enquanto ativa não acumula nem renova a duração. |
| Fissurado | Quando sofrer o próximo ataque com dano positivo pelo cálculo do ataque, antes dos ajustes das condições, role 1d6. Com 1–3, receba 4 de dano adicional nesse ataque. Com 4–6, mantenha o dano. A ficha dura até o fim do segundo turno seguinte à aplicação ou até o fim da rodada, o que ocorrer primeiro. Consuma a ficha após resolver o gatilho, qualquer que seja o resultado. Reaplicar enquanto ativa não acumula nem renova a duração. |
| Esporos | Quando uma habilidade ou passiva estiver prestes a recuperar sua energia, role 1d6. Com 1–3, reduza aquela cura em até 3, até o mínimo de zero. Com 4–6, aplique a cura integral. O gatilho exige que a cura pudesse recuperar pelo menos 1 de energia. A ficha dura até o fim do segundo turno seguinte à aplicação ou até o fim da rodada, o que ocorrer primeiro. Consuma a ficha após resolver o gatilho, qualquer que seja o resultado. Reaplicar enquanto ativa não acumula nem renova a duração. |
| Sobrecarga | Quando seu próximo ataque causar dano positivo pelo cálculo do ataque, antes dos ajustes das condições, role 1d6. Com 1, sofra 2 de dano direto depois de resolver as ações. Com 2–4, mantenha o dano. Com 5–6, cause 5 de dano adicional nesse ataque. A ficha dura até o fim do segundo turno seguinte à aplicação ou até o fim da rodada, o que ocorrer primeiro. Consuma a ficha após resolver o gatilho, qualquer que seja o resultado. Reaplicar enquanto ativa não acumula nem renova a duração. |
| Rastreado | No próximo turno, escolha e revele sua carta antes de o rival escolher a dele. Se ambos estiverem Rastreados, escolham e revelem simultaneamente. Remova a ficha depois das escolhas. Remova a ficha se a rodada acabar antes. Reaplicar enquanto ativa não acumula nem adia o efeito. |
| Preso | Na próxima vez que uma das suas cartas bloquear um ataque, resolva o bloqueio e suprima os demais efeitos daquela carta. Passivas continuam funcionando. A ficha dura até o fim do segundo turno seguinte à aplicação ou até o fim da rodada, o que ocorrer primeiro. Consuma a ficha após resolver o gatilho, qualquer que seja o resultado. Reaplicar enquanto ativa não acumula nem renova a duração. |


#### Item

Uso único:

- Armadilha x2 - Remova um monstro do seu time, realize a fase de captura novamente e no fim, adicione um ponto de melhoria em qualquer monstro
- Super Cura x2 - Recupere toda a energia de seu monstro em combate
- Salva Vidas x2 - Ao ser atacado, bloqueie o ataque e recupere 4 pontos de vidas
- Mapa da trilha x2 - Durante a fase da trilha, busque mais 3 cartas e realize a captura
- Poção de Força x2 - 2 pontos de melhoria





