from collections import Counter
from base import OUT, read
from expand import TRAILS


def by_id(name, key, expected):
    rows = read(name)
    assert len(rows) == expected and all(None not in row and None not in row.values() for row in rows)
    indexed = {row[key]: row for row in rows}
    assert len(indexed) == expected
    assert all(key.isdigit() and int(key) > 0 for key in indexed)
    return indexed


monsters = by_id("monstros", "id_monstro", 50)
trainers = by_id("treinadores", "id_treinador", 3)
skills = by_id("habilidades", "id_habilidade", 22)
conditions = by_id("condicoes", "id_condicao", 1)
items = by_id("itens", "id_item", 5)
assert len(list(OUT.glob("*.csv"))) == 5
assert Counter(row["trilha"] for row in monsters.values() if row["trilha"]) == dict.fromkeys(TRAILS, 15)
assert Counter(row["funcao_setup"] for row in monsters.values()) == {"capturavel": 45, "inicial": 3, "evolucao": 2}
assert len({row["nome_monstro"].casefold() for row in monsters.values()}) == len(monsters)

catalog_types = {typ for row in monsters.values() for typ in row["tipo"].split("|")}
assert catalog_types == set().union(*TRAILS.values())
used_monster_skills = set()
for id_, row in monsters.items():
    trail = row["trilha"]
    assert bool(trail) == (row["funcao_setup"] == "capturavel")
    types = set(row["tipo"].split("|"))
    weak = row["fraquezas"].split("|")
    assert weak and all(typ in catalog_types for typ in weak)
    assert any(set(other["tipo"].split("|")) & set(weak) for k, other in monsters.items() if k != id_)
    assert row["descricao_monstro"] and all(int(row[key]) > 0 for key in ("energia", "ofensiva", "defesa"))
    if trail:
        assert types <= TRAILS[trail]
        assert len(row["melhorias_monstro"].split("|")) == 2
    verso = row["verso_monstro"]
    if verso:
        assert verso != id_ and monsters[verso]["verso_monstro"] == id_
    for token in filter(None, row["melhorias_monstro"].split("|")):
        kind, link = token.split(":")
        if kind == "habilidade":
            assert skills[link]["tag"] == "monstro"
            used_monster_skills.add(link)
        else:
            assert kind == "evolucao" and link == verso and monsters[link]["funcao_setup"] == "evolucao"
    for link in filter(None, row["habilidades_inatas"].split("|")):
        assert skills[link]["tag"] == "monstro"
        used_monster_skills.add(link)

assert used_monster_skills == {key for key, row in skills.items() if row["tag"] == "monstro"}
for row in trainers.values():
    for link in filter(None, row["habilidades_iniciais"].split("|")):
        assert skills[link]["tag"] == "treinador"
assert {key for key, row in skills.items() if row["tag"] == "base"} == {"1", "2", "3"}
assert all(row["id_condicao"] in conditions for row in skills.values() if row["id_condicao"])
assert sum(int(row["quantidade"]) for row in items.values()) == 11
assert all(row["uso_unico"] == "sim" for row in items.values())
for file in OUT.glob("*.csv"):
    for row in read(file.stem):
        assert all(not field.startswith(("=", "+", "-", "@", "\t")) for field in row.values())
print("Estrutura CSV, contagens, tipos, fraquezas, melhorias, evoluções, passivas e referências verificados.")
