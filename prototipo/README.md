# Catch All v2 — protótipo

Jogue uma partida local contra três rivais. Brasa favorece ataques, Muralha valoriza defesa e cura, e Faísca prioriza efeitos de cartas. Cada IA avalia escolhas legais a partir da própria visão da partida e sorteia com pesos diferentes.

## Jogar

Com Node.js 20 ou superior, execute na raiz do repositório:

```sh
node prototipo/servidor.mjs
```

Abra [a mesa de jogo](http://127.0.0.1:4178/prototipo/). A semente é opcional. A mesma semente e as mesmas escolhas humanas reproduzem a partida. O servidor aceita outra porta como primeiro argumento.

## Publicar no GitHub Pages

Na configuração **Settings → Pages** do repositório, selecione **GitHub Actions** como fonte. O [workflow](../.github/workflows/pages.yml) executa os testes e publica o jogo a cada atualização na branch `main`. Também é possível iniciar a publicação em **Actions → Publicar protótipo → Run workflow**.

Para montar o mesmo pacote estático localmente, execute `bash prototipo/empacotar-pages.sh /caminho/para/diretorio-vazio` na raiz do repositório. O site usa caminhos relativos e abre a mesa de jogo pelo `index.html` do pacote.

## Decisões do protótipo

- A iniciativa inicial é sorteada. Seis treinadores diferentes são sorteados e escolhidos em sequência, sem reposição. As fases de decisão giram a iniciativa entre os quatro lugares. Iniciais podem ser escolhidos em cópias independentes.
- Depois de uma captura bem-sucedida, as cartas não escolhidas voltam ao fundo da trilha. Um monstro que foge sai da disputa. Se a trilha acabar, é possível escolher outra. Com as três vazias, a fase de captura é encerrada.
- Pontos de habilidade e de melhoria usam a mesma progressão do catálogo. Evoluções consomem a posição prevista na sequência de melhorias. Um vencedor também distribui a melhoria que recebeu no duelo.
- Monstros evoluídos mantêm as habilidades inatas e desbloqueadas das formas anteriores. Após uma captura que deixe a equipe com quatro monstros, o jogador escolhe um deles para deixar ir antes de distribuir a melhoria; o recém-capturado também pode ser escolhido.
- Armadilha, Mapa da trilha e Poção de Força ficam disponíveis na preparação. Armadilha e Mapa iniciam uma captura extra, com um ponto de melhoria ao capturar. A recompensa extra do ciclo é recebida na captura normal. Armadilha exige que pelo menos um monstro fique na equipe após a troca.
- Super Cura e Salva Vidas ocupam a escolha do turno. A primeira está disponível para monstros feridos. Salva Vidas consome a cópia quando bloqueia um ataque. Jogar um item deixa a mão de habilidades intacta. Gustavo pode rerrolar uma falha de captura e dados de habilidades; no protótipo, a rerrolagem de habilidades é automática em resultados de 1 a 3.
- Cada ciclo tem dois duelos. No primeiro ciclo, uma vitória de rodada decide o duelo. Nos seguintes, são necessárias duas. Antes de cada rodada, os dois jogadores escolhem em segredo e revelam os monstros juntos. Os dois combatentes de uma rodada com vencedor ficam indisponíveis para o restante do duelo.
- Um nocaute simultâneo mantém o placar e reabre a escolha. Cada jogador pode manter seu combatente ou escolher outro disponível. No limite de 120 turnos, vence quem tiver a maior proporção de energia. Proporções iguais também reabrem a escolha.
- Se um time ficar sem combatente para a próxima rodada, perde o duelo. Se ambos esgotarem as equipes, o maior d6 decide, com nova rolagem em caso de dados iguais.
- Os líderes empatados após o terceiro ciclo disputam um desempate em melhor de três. A disponibilidade dos monstros é renovada a cada duelo. Com três líderes, o vencedor do primeiro duelo enfrenta o terceiro.

## Organização e testes

- O [motor de combate](../motor/README.md) resolve as ações de uma rodada, inclusive itens de combate.
- `partida/partida.mjs` gerencia fases, inventários, equipes e troféus. `partida/duelo.mjs` encadeia rodadas. `partida/ia.mjs` escolhe ações.
- `interface/` apresenta a partida e encaminha as escolhas do jogador. O mesmo catálogo CSV alimenta o jogo e as simulações.

```sh
node --test motor/testes/*.test.mjs simulacao/testes/*.test.mjs prototipo/testes/*.test.mjs
```
