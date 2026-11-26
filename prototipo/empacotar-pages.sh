#!/usr/bin/env bash
set -euo pipefail

destino=${1:?Informe um diretório de destino novo ou vazio}
if [[ -e "$destino" ]] && [[ -n "$(ls -A -- "$destino")" ]]; then
  echo "O diretório de destino precisa estar vazio." >&2
  exit 1
fi

mkdir -p -- "$destino"/{prototipo,motor/catalogo,motor/regras,simulacao,cartas}
cp -R -- prototipo/{index.html,estilo.css,interface,partida} "$destino/prototipo/"
cp -- motor/catalogo/{index,csv}.mjs "$destino/motor/catalogo/"
cp -- motor/regras/{cartas,efeitos,rodada}.mjs "$destino/motor/regras/"
cp -- simulacao/{sorteio,estrategia}.mjs "$destino/simulacao/"
cp -- cartas/{condicoes,habilidades,itens,monstros,treinadores}.csv "$destino/cartas/"

cat > "$destino/index.html" <<'EOF'
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=./prototipo/">
  <title>Catch All</title>
</head>
<body>
  <a href="./prototipo/">Abrir a mesa de jogo</a>
</body>
</html>
EOF
