from base import HEADERS, read, write
from expand import values


def main():
    monsters = read("monstros")
    HEADERS["monstros"] += " habilidades_inatas"
    changes = {
        "krakuron": {"ofensiva": 4},
        "owlsel": {"habilidades_inatas": "14"},
        "flouly": {"energia": 7, "ofensiva": 2, "defesa": 4},
        "Agulhio": {"energia": 8},
        "Grotufo": {"defesa": 3},
        "Fetricó": {"energia": 8},
        "Zunzido": {"defesa": 3},
        "Vesperaiz": {"energia": 8, "ofensiva": 3},
        "Carambelo": {"energia": 8},
        "Jaturru": {"energia": 8},
        "Sussural": {"energia": 8},
        "Raiorim": {"ofensiva": 3},
        "Lambisco": {"energia": 8},
        "Pedrelho": {"defesa": 3},
    }
    for row in monsters:
        row["habilidades_inatas"] = ""
        row.update(changes.get(row["nome_monstro"], {}))
    write("monstros", values("monstros", monsters))

    skills = read("habilidades")
    effects = {
        "12": "Realize um ataque. Se o rival também atacar, ele sofre 1 de dano direto.",
        "14": "Role 1d6 e recupere metade do resultado, arredondada para cima. Respeite sua energia máxima.",
        "15": "Bloqueie o ataque do rival. Se bloquear um ataque, cause 2 de dano direto ao rival.",
    }
    for row in skills:
        if row["id_habilidade"] in effects:
            row["efeito"] = effects[row["id_habilidade"]]
    write("habilidades", values("habilidades", skills))

    conditions = read("condicoes")
    conditions[0]["descricao_condicao"] = (
        "No início de cada um dos próximos 3 turnos da rodada, role 1d6. Com 6, remova a condição "
        "sem causar dano. Com 1 a 5, sofra 1 de dano direto. Remova a condição depois do terceiro "
        "teste ou no fim da rodada, o que ocorrer primeiro. Aplicar Incendiar a um monstro já "
        "incendiado não acumula dano nem reinicia a contagem."
    )
    write("condicoes", values("condicoes", conditions))


if __name__ == "__main__":
    main()
