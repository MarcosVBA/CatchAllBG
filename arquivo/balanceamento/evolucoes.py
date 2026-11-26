import csv
from collections import Counter
from pathlib import Path
from shutil import copyfile
from base import OUT, read

staging = Path(__file__).parent / "evolucoes"
staging.mkdir(exist_ok=True)
forms = {
    "5": ("6", "Flourosa", 10, 2, 3, "", 27, 26, "Grama", "Fogo",
          "Ouriço de focinho escuro com espinhos cobertos de brotos. As flores brancas se fecham juntas quando ele se defende."),
    "101": ("146", "Cascalforje", 10, 3, 3, "", 22, 29, "Rocha", "Água",
            "Cabra de xisto com chifres em camadas. Seus cascos se encaixam nas fendas da montanha."),
    "124": ("147", "Coroâmbar", 9, 3, 3, "No primeiro Atacar da rodada, seu ataque causa +1 de dano.",
            28, 27, "Inseto", "Voador",
            "Inseto de carapaça âmbar com uma coroa serrilhada que vibra antes de cada investida."),
    "136": ("148", "Ecomaré", 9, 3, 3, "", 31, 30, "Psíquico|Água", "Noturno|Raio",
            "Medusa de água doce com anéis que ondulam como círculos na superfície do riacho."),
}

original = read("monstros")
skills = {row["id_habilidade"]: row for row in read("habilidades")}
rows = [row.copy() for row in original]
by_id = {row["id_monstro"]: row for row in rows}
for base_id, spec in forms.items():
    id_, name, hp, offense, defense, passive, innate, improvement, types, weak, description = spec
    base = by_id[base_id]
    assert not base["verso_monstro"] and id_ not in by_id
    assert len(base["melhorias_monstro"].split("|")) == 2
    base["melhorias_monstro"] += f"|evolucao:{id_}"
    base["verso_monstro"] = id_
    assert all(skills[str(key)]["tag"] == "monstro" for key in (innate, improvement))
    new = dict(id_monstro=id_, nome_monstro=name, energia=hp, ofensiva=offense, defesa=defense,
               passiva_monstro=passive, melhorias_monstro=f"habilidade:{improvement}", verso_monstro=base_id,
               descricao_monstro=description, tipo=types, fraquezas=weak, trilha="", funcao_setup="evolucao",
               habilidades_inatas=str(innate))
    rows.insert(rows.index(base) + 1, new)
    by_id[id_] = new

assert len(by_id) == len(rows) == 54
assert Counter(row["funcao_setup"] for row in rows) == {"inicial": 3, "capturavel": 45, "evolucao": 6}
assert Counter(row["trilha"] for row in rows if row["trilha"]) == {"Montanha": 15, "Floresta": 15, "Riacho": 15}
assert all(by_id[row["verso_monstro"]]["verso_monstro"] == row["id_monstro"]
           for row in rows if row["verso_monstro"])
for old in original:
    current = by_id[old["id_monstro"]]
    allowed = {"melhorias_monstro", "verso_monstro"} if old["id_monstro"] in forms else set()
    assert all(current[key] == value for key, value in old.items() if key not in allowed)
assert len({row["nome_monstro"].casefold() for row in rows}) == len(rows)
for id_, *_ in forms.values():
    row = by_id[id_]
    assert any(set(row["fraquezas"].split("|")) & set(other["tipo"].split("|")) for other in rows if other != row)

with (staging / "monstros.csv").open("w", encoding="utf-8", newline="") as file:
    writer = csv.DictWriter(file, fieldnames=list(original[0]))
    writer.writeheader()
    writer.writerows(rows)
copyfile(OUT / "habilidades.csv", staging / "habilidades.csv")
