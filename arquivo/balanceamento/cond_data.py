from pathlib import Path
from base import HEADERS, read, write

ROOT = Path(__file__).parent / "condicoes-v2"
ORIGINAL = ROOT / "original"
REVIEW = ROOT / "revisao"

COMMON = (" A ficha dura até o fim do segundo turno seguinte à aplicação ou até o fim da rodada, o que ocorrer primeiro. "
          "Consuma a ficha após resolver o gatilho, qualquer que seja o resultado. "
          "Reaplicar enquanto ativa não acumula nem renova a duração.")
HIT = "dano positivo pelo cálculo do ataque, antes dos ajustes das condições"
CONDITIONS = [
    (2, "Ofuscado", f"Quando seu próximo ataque causar {HIT}, role 1d6. "
     "Com 1–3, reduza em 3 o dano desse ataque, até o mínimo de zero. Com 4–6, mantenha o dano." + COMMON),
    (3, "Fissurado", f"Quando sofrer o próximo ataque com {HIT}, role 1d6. "
     "Com 1–3, receba 3 de dano adicional nesse ataque. Com 4–6, mantenha o dano." + COMMON),
    (4, "Esporos", "Quando uma habilidade ou passiva estiver prestes a recuperar sua energia, role 1d6. "
     "Com 1–3, reduza aquela cura em até 3, até o mínimo de zero. Com 4–6, aplique a cura integral. "
     "O gatilho exige que a cura pudesse recuperar pelo menos 1 de energia." + COMMON),
    (5, "Sobrecarga", f"Quando seu próximo ataque causar {HIT}, role 1d6. "
     "Com 1, sofra 2 de dano direto depois de resolver as ações. Com 2–4, mantenha o dano. "
     "Com 5–6, cause 4 de dano adicional nesse ataque." + COMMON),
    (6, "Rastreado", "No próximo turno, escolha e revele sua carta antes de o rival escolher a dele. "
     "Se ambos estiverem Rastreados, escolham e revelem simultaneamente. Remova a ficha depois das escolhas. "
     "Remova a ficha se a rodada acabar antes. Reaplicar enquanto ativa não acumula nem adia o efeito."),
    (7, "Preso", "Na próxima vez que uma das suas cartas bloquear um ataque, resolva o bloqueio e suprima "
     "os demais efeitos daquela carta. Passivas continuam funcionando." + COMMON),
]

SKILLS = [
    (33, "Véu de Cinza", "Bloqueie o ataque do rival. Se bloquear um ataque, aplique Ofuscado ao rival depois de resolver o turno.", "monstro", 2),
    (34, "Trinca de Cascalho", "Realize um ataque com 1 a menos de dano no cálculo. Se causar dano pelo cálculo do ataque, aplique Fissurado ao rival depois de resolver o turno.", "monstro", 3),
    (35, "Pó de Esporos", "Realize um ataque. Se causar dano pelo cálculo do ataque, aplique Esporos ao rival depois de resolver o turno.", "monstro", 4),
    (36, "Para-Raios", "Bloqueie o ataque do rival. Se bloquear um ataque, ganhe Sobrecarga depois de resolver o turno.", "monstro", 5),
    (37, "Marca de Penumbra", "Realize um ataque. Se causar pelo menos 3 de dano pelo cálculo do ataque, aplique Rastreado ao rival depois de resolver o turno. Esta carta só pode aplicar Rastreado uma vez por rodada.", "monstro", 6),
    (38, "Lama Pegajosa", "Realize um ataque. Se causar pelo menos 2 de dano pelo cálculo do ataque, aplique Preso ao rival depois de resolver o turno.", "monstro", 7),
]

PASSIVES = {
    "Flourosa": "Rebrotar. Após o primeiro ataque que causar dano e deixá-la viva com metade da energia máxima ou menos ao fim das ações do turno, role 1d6. Com 5–6, recupere 4 de energia.",
    "Pipavent": "Fio Cortante. Na primeira vez da rodada em que o rival bloquear seu Atacar, inclusive via Repetir, role 1d6. Com 5–6, cause 3 de dano direto.",
    "Quartzebra": "Refração. Na primeira vez da rodada em que sofrer dano pelo cálculo de um ataque com bônus de fraqueza, role 1d6. Com 4–6, ignore até 2 desse dano.",
    "Raiorim": "Curto-Circuito. Na primeira vez da rodada em que ambos executarem ataques no mesmo turno, role 1d6 após as ações. Com 5–6, o rival sofre 4 de dano direto. Com 1, Raiorim sofre 2 de dano direto.",
    "Lanterno": "Facho na Névoa. Na primeira vez da rodada em que bloquear um ataque, role 1d6 depois de resolver as ações. Com 5–6, aplique Ofuscado ao rival.",
    "Vauzelo": "Faro de Trilha. Na primeira vez da rodada em que o rival revelar Repetir, role 1d6 depois de resolver as ações. Com 4–6, aplique Rastreado ao rival.",
    "Pinhisco": "Desencaixe. Na primeira vez da rodada em que o rival bloquear seu ataque, aplique Preso ao rival depois de resolver as ações.",
    "Lajauro": "Peso da Laje. Seu primeiro Atacar da rodada que causar dano pelo cálculo do ataque a um rival com defesa maior que a sua aplica Fissurado depois de resolver as ações. Vale também via Repetir.",
    "Musgale": "Esporos de Retorno. Na primeira vez da rodada em que o rival recuperar pelo menos 1 de energia, aplique Esporos depois de resolver o turno.",
    "Caramola": "Casco de Arrasto. Na primeira vez da rodada em que bloquear um ataque, ganhe proteção. Reduza em até 3 o dano do cálculo do próximo ataque que acertá-la até o fim do turno seguinte. Remova a proteção quando usada ou vencida.",
    "Coroâmbar": "Ritmo de Caça. Se ambos executaram ataques no turno anterior e revelarem ataques neste turno, seu ataque causa 3 a mais de dano no cálculo. Use uma vez por rodada, ao causar dano em um turno que cumpra o gatilho.",
    "Ecomaré": "Eco de Margem. Na primeira renovação das mãos da rodada, se tiver menos energia atual que o rival, ganhe Sobrecarga.",
}

SLOTS = {
    "Cinzarisco": (21, 33), "Cascalhote": (21, 34),
    "Vinhabril": (27, 35), "Estalume": (22, 36),
    "Ninhombra": (25, 37), "Lamatim": (30, 38),
}

ADJUSTMENTS = {
    "Flourosa": {"energia": -1},
    "Coroâmbar": {"energia": -3},
    "Pipavent": {"energia": 2},
    "Quartzebra": {"energia": 1},
    "Musgale": {"energia": 2, "ofensiva": 1},
    "Vinhabril": {"energia": 2},
    "Vauzelo": {"energia": -1},
}


def as_lists(name, rows):
    return [[row[key] for key in HEADERS[name].split()] for row in rows]


def stage():
    for collection, additions in (("condicoes", CONDITIONS), ("habilidades", SKILLS)):
        write(collection, as_lists(collection, read(collection, ORIGINAL)) + additions, REVIEW)
    HEADERS["monstros"] = " ".join(read("monstros", ORIGINAL)[0])
    monsters = read("monstros", ORIGINAL)
    seen = set()
    for row in monsters:
        name = row["nome_monstro"]
        if name in PASSIVES:
            row["passiva_monstro"] = PASSIVES[name]
            seen.add(name)
        if name in SLOTS:
            previous, replacement = (f"habilidade:{i}" for i in SLOTS[name])
            nodes = row["melhorias_monstro"].split("|")
            assert nodes.count(previous) == 1, name
            nodes[nodes.index(previous)] = replacement
            row["melhorias_monstro"] = "|".join(nodes)
            seen.add(name)
        for field, delta in ADJUSTMENTS.get(name, {}).items():
            row[field] = str(int(row[field]) + delta)
    assert seen == PASSIVES.keys() | SLOTS.keys()
    write("monstros", as_lists("monstros", monsters), REVIEW)


if __name__ == "__main__":
    stage()
