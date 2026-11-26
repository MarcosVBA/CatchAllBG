from collections import Counter
from base import HEADERS, read, write

TRAILS = {
    "Montanha": {"Rocha", "Voador", "Noturno", "Fogo"},
    "Floresta": {"Grama", "Inseto", "Noturno", "Normal"},
    "Riacho": {"Água", "Psíquico", "Raio", "Normal"},
}

SKILLS = """
21|Investida de Cascalho|Realize um ataque. Ele causa 1 de dano adicional se o rival tiver mais energia atual que você ao revelar as cartas.
22|Abrigo de Pedra|Bloqueie o ataque do rival. Se bloquear um ataque, recupere 1 de energia após a resolução do turno.
23|Rasante|Realize um ataque com +1 de dano se o rival tiver o tipo Inseto ou Grama.
24|Chama de Fenda|Realize um ataque. Se o rival bloquear, cause 1 de dano direto.
25|Bote na Penumbra|Realize um ataque com +1 de dano se o rival tiver metade ou menos da energia máxima dele ao revelar as cartas.
26|Seiva Clara|Recupere 2 de energia.
27|Golpe de Cipó|Realize um ataque. Se o rival também atacar, acrescente 1 ao dano do seu ataque.
28|Carapaça Fechada|Bloqueie o ataque do rival. Se bloquear um ataque, seu próximo ataque causa +1 de dano.
29|Tranco de Ombro|Realize um ataque com +1 de dano se o rival tiver defesa superior à sua.
30|Marola|Realize um ataque. Se o rival revelar uma habilidade que recupere energia, acrescente 1 ao dano do seu ataque.
31|Eco Mental|Realize um ataque. Se o rival revelar uma carta de habilidade base, acrescente 1 ao dano do seu ataque.
32|Faísca de Margem|Realize um ataque. Se o rival tiver o tipo Água ou Voador, acrescente 1 ao dano do seu ataque.
"""

ROSTERS = {
    "Montanha": """
Cascalhote|9|3|3|Rocha|Água|21|22||Cabrito de xisto com cascos largos que fazem estalar o cascalho.
Pumicão|10|2|4|Rocha|Grama|22|29||Lagarto de pedra-pomes que se prende aos paredões com a barriga.
Lajauro|7|4|3|Rocha|Água|29|21||Escaravelho de pedra com uma laje afiada nas costas.
Quartzebra|8|3|3|Rocha|Inseto|22|21||Potro de quartzo com listras que cintilam ao amanhecer.
Agulhio|7|4|2|Voador|Raio|23|29||Ave de rapina magra que alinha as penas do bico antes de mergulhar.
Penaferro|9|2|4|Voador|Raio|22|23||Coruja cinzenta com penas de ferro dobráveis.
Pipavent|8|3|2|Voador|Rocha|23|21|No primeiro Atacar da rodada, seu ataque causa +1 de dano.|Pipa viva com quatro olhos nas pontas e uma cauda de fitas.
Alapedra|8|3|3|Rocha/Voador|Água/Raio|21|23||Raia de ardósia que plana entre picos sem bater as asas.
Grotufo|8|4|2|Noturno|Fogo|25|29||Roedor de gruta cujos tufos de pelo ofuscam sua silhueta.
Lanterno|8|2|4|Noturno|Psíquico|22|25||Morador de cavernas que leva uma luz azul presa ao chifre.
Sibilume|7|3|3|Noturno|Inseto|25|21|Seu Atacar causa +1 de dano se o rival for do tipo Psíquico.|Serpente preta com uma fileira de pontos brilhantes no pescoço.
Brasal|8|4|2|Fogo|Água|24|29||Texugo cuja juba de brasas deixa marcas nos túneis.
Fornalhito|9|3|2|Fogo|Rocha|24|21||Tatu avermelhado com um forno entre as placas das costas.
Cinzarisco|8|3|3|Fogo|Raio|21|24||Lagarto coberto de cinza que se ergue nas patas traseiras quando venta.
Brumalha|8|3|3|Fogo/Noturno|Água/Psíquico|24|25||Gato de pelo enfumaçado que aparece quando as fogueiras se apagam.
""",
    "Floresta": """
Brotozelo|8|3|3|Grama|Fogo|27|26||Lebre com duas folhas novas que se enrolam como orelhas.
Raizurso|10|2|4|Grama|Inseto|26|27||Urso de madeira tenra com raízes resistentes entre os dedos.
Fetricó|7|4|2|Grama|Voador|27|29||Rã de samambaia que desenrola seus brotos ao saltar.
Musgale|9|2|3|Grama|Fogo|26|28|A primeira habilidade da rodada que recuperar sua energia restaura 1 de energia adicional.|Caracol cinza com um pedaço de chão de floresta sobre a concha.
Vinhabril|8|3|3|Grama/Inseto|Fogo/Voador|27|28||Louva-a-deus com gavinhas que prendem seus pés a galhos finos.
Zunzido|7|4|2|Inseto|Fogo|29|28||Vespa de asas largas cujo voo faz ressoar o tronco das árvores.
Casulã|9|2|4|Inseto|Voador|28|26||Lagarta envolta em fibras claras que endurecem quando puxadas.
Pinhisco|8|3|3|Inseto|Rocha|28|29||Besouro marrom que se esconde dentro de uma pinha oca.
Sardâmbar|8|3|2|Inseto|Voador|27|28|No primeiro Atacar da rodada, seu ataque causa +1 de dano.|Inseto comprido com pintas alaranjadas e uma crista que vibra.
Ninhombra|9|3|2|Noturno|Psíquico|25|26||Gambá cuja cauda escura se abre como um ninho suspenso.
Vesperaiz|7|4|2|Noturno/Grama|Fogo/Inseto|25|27||Morcego sem voo que se pendura em raízes pelos ganchos das asas.
Tronquito|9|3|3|Normal|Inseto|29|28||Paca de patas grossas que empurra galhos com os ombros.
Folhocelo|8|3|3|Normal|Psíquico|26|29||Cervo pequeno que usa folhas caídas para mascarar o cheiro.
Mofurim|8|2|4|Normal|Grama|28|26||Esquilo de pelo felpudo que se enrola como uma bola nas tocas.
Carambelo|7|4|2|Normal|Noturno|29|27||Quati de cauda listrada que protege seus frutos escondidos.
""",
    "Riacho": """
Borbulim|8|3|3|Água|Raio|30|26||Peixe arredondado que sopra bolhas para marcar seu território.
Remolga|10|2|4|Água|Grama|22|30||Lontra de dorso largo que usa pedras redondas como boias.
Jaturru|7|4|2|Água|Raio|30|29||Peixe de bico achatado que salta para interceptar insetos.
Lamatim|9|3|2|Água|Psíquico|30|22||Salamandra bege que se enterra na lama para esperar a correnteza.
Voltilim|8|3|3|Água/Raio|Grama/Rocha|32|30||Enguia que acende uma fileira de pontos amarelos sob a água.
Ecolume|8|3|3|Psíquico|Noturno|31|26||Medusa de água doce com pequenos anéis giratórios na cabeça.
Ondívago|9|2|4|Psíquico|Inseto|26|31||Peixe translúcido que reage a passos na margem antes de eles tocarem o chão.
Sussural|7|4|2|Psíquico|Noturno|31|25||Garça fina que caça ouvindo os peixes sob a lâmina de água.
Raiorim|8|4|2|Raio|Rocha|32|29||Rã amarela que acumula eletricidade entre os dedos compridos.
Estalume|9|3|2|Raio|Grama|32|22||Girino crescido com uma cauda luminosa que estala na água.
Fulgapé|8|3|3|Raio|Rocha|32|31||Aranha-d'água que risca a superfície com descargas curtas.
Caramola|8|2|4|Normal|Grama|28|30||Caramujo que estica a cauda elástica para voltar à margem.
Vauzelo|9|3|3|Normal|Água|29|22||Cão de patas membranosas que carrega seixos de um lado para o outro.
Lambisco|7|4|2|Normal|Raio|29|30||Rato pescador que usa os bigodes compridos para sentir a corrente.
Pedrelho|8|3|2|Normal/Água|Raio/Grama|30|29|No primeiro Atacar da rodada, seu ataque causa +1 de dano.|Ave de praia que coleta pedrinhas claras com o bico.
""",
}


def rows(text):
    return [line.split("|") for line in text.strip().splitlines()]


def values(name, data):
    return [[row[key] for key in HEADERS[name].split()] for row in data]


def main():
    monsters = read("monstros")
    skills = read("habilidades")
    for row, weakness in zip(monsters, ("Água", "Água", "Raio", "Raio", "Fogo"), strict=True):
        row["fraquezas"] = weakness
        if row["id_monstro"] == "5":
            row.update(
                tipo="Grama",
                descricao_monstro="Ouriço felpudo de cujo dorso brotam flores brancas que se fecham quando ele se encolhe.",
                melhorias_monstro="habilidade:26|habilidade:27",
            )
    additions = []
    for trail, text in ROSTERS.items():
        for name, hp, attack, defense, types, weak, first, second, passive, description in rows(text):
            additions.append([101 + len(additions), name, hp, attack, defense, passive,
                              f"habilidade:{first}|habilidade:{second}", "", description,
                              types.replace("/", "|"), weak.replace("/", "|"), trail, "capturavel"])
    write("monstros", values("monstros", monsters) + additions)
    write("habilidades", values("habilidades", skills) + [[*row, "monstro", ""] for row in rows(SKILLS)])
    assert Counter(row["trilha"] for row in read("monstros") if row["trilha"]) == dict.fromkeys(TRAILS, 15)
    print("Expansão verificada: 50 monstros, 15 capturáveis por trilha e 22 habilidades no total.")


if __name__ == "__main__":
    main()
