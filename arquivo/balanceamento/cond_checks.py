from collections import Counter
from unittest.mock import patch
from base import read
from cond_data import ORIGINAL, REVIEW, PASSIVES, SLOTS, ADJUSTMENTS
from cond_sim import Combatant, attack, choices, refresh, roster, turn_actions


class Dice:
    def __init__(self, *values):
        self.values = list(values)

    def randint(self, low, high):
        result = self.values.pop(0)
        assert low <= result <= high
        return result


def actor(name=None, trainer=0):
    data = next((row.copy() for row in cards.values() if row["name"] == name), cards[101].copy())
    if name is None:
        data.update(hp=24, off=3, types={"Normal"}, weak={"Raio"}, passive="")
        data["def"] = 3
    return Combatant(data, trainer, 2)


def hit(initial, defender, ability, reply, *rolls, reroll=False):
    return attack(initial, defender, (ability, ability), (reply, reply),
                  0, False, False, Dice(*rolls), reroll)


def mechanics():
    for condition, rolls, expected in (
        (2, (4, 3), 1), (2, (4, 4), 4), (5, (4, 5), 8), (5, (4, 4), 4)
    ):
        a, b = actor(), actor()
        a.apply(condition, 1)
        assert hit(a, b, 1, 0, *rolls)[0] == expected
        assert condition not in a.conditions
    a, b = actor(), actor()
    a.apply(5, 1)
    turn_actions([a, b], [(1, 1), (0, 0)], 0, False, 2, Dice(4, 1))
    assert (a.hp, b.hp) == (22, 20)
    for roll, expected in ((3, 7), (4, 4)):
        a, b = actor(), actor()
        b.apply(3, 1)
        assert hit(a, b, 1, 0, 4, roll)[0] == expected
        assert 3 not in b.conditions
    a, b = actor(), actor()
    a.apply(2, 1)
    b.apply(3, 1)
    assert hit(a, b, 1, 0, 4, 1, 1)[0] == 4
    a.apply(2, 1)
    assert hit(a, b, 1, 2) == (0, 0, 0)
    assert 2 in a.conditions
    a.apply(2, 2)
    assert a.conditions[2] == 3
    a.finish_turn(2)
    assert 2 in a.conditions
    a.finish_turn(3)
    assert 2 not in a.conditions
    for roll, expected in ((3, 1), (4, 4)):
        a = actor()
        a.apply(4, 1)
        assert a.heal(4, Dice()) == 0 and 4 in a.conditions
        a.hp -= 5
        assert a.heal(4, Dice(roll)) == expected and 4 not in a.conditions
    for trapped, counter in ((False, 2), (True, 0)):
        a, b = actor(), actor()
        if trapped:
            b.apply(7, 1)
        turn_actions([a, b], [(1, 1), (15, 15)], 0, False, 2, Dice())
        assert (a.hp, b.hp) == (24-counter, 24) and 7 not in b.conditions
    a, b = actor(), actor()
    b.apply(6, 1)
    order = []
    def spy(p, q, rng, defensive, revealed=None):
        order.append((p is b, revealed))
        return (1, 1)
    with patch("cond_sim.select", spy):
        choices([a, b], Dice(), False)
        assert order == [(True, None), (False, 1)]
        order.clear()
        a.apply(6, 1)
        b.apply(6, 1)
        choices([a, b], Dice(), False)
        assert order == [(False, None), (True, None)]

    a, b = actor("Pipavent"), actor()
    assert hit(a, b, 1, 2, 6)[0] == 3
    refresh([a, b], 3, 1)
    assert hit(a, b, 1, 2)[0] == 0
    a, b = actor(trainer=6), actor()
    a.apply(5, 1)
    assert hit(a, b, 1, 0, 4, 1, 6, reroll=True)[0] == 8
    a.apply(5, 2)
    assert hit(a, b, 1, 0, 3, 4, 1, reroll=True) == (4, 4, 2)
    a, b = actor("Flourosa"), actor()
    a.hp = 16
    turn_actions([a, b], [(0, 0), (1, 1)], 0, False, 2, Dice(3, 6))
    assert a.hp == 17 and "Rebrotar" in a.flags
    a.hp = 2
    turn_actions([a, b], [(0, 0), (1, 1)], 0, False, 3, Dice(4))
    assert a.hp < 0
    a, b = actor("Quartzebra"), actor()
    b.card["types"] = {"Inseto"}
    assert hit(b, a, 1, 0, 4, 4)[0] == 4
    assert hit(b, a, 1, 0, 4)[0] == 6
    a, b = actor("Ecomaré"), actor()
    a.hp = 10
    a.cards.clear()
    refresh([a, b], 4, 1)
    assert a.cards == a.deck and a.conditions[5] == 6
    a.consume(5)
    refresh([a, b], 7, 2)
    assert 5 not in a.conditions
    a, b = actor("Caramola"), actor()
    turn_actions([a, b], [(2, 2), (1, 1)], 0, False, 2, Dice())
    assert a.protection == 3
    assert hit(b, a, 1, 0, 6)[0] == 2 and a.protection == 0
    a, b = actor("Coroâmbar"), actor()
    before = b.hp
    mutual = turn_actions([a, b], [(1, 1), (1, 1)], 0, False, 2, Dice(4, 4))
    assert mutual and b.hp == before-4
    turn_actions([a, b], [(1, 1), (1, 1)], 0, mutual, 3, Dice(4, 4))
    assert b.hp == before-11
    turn_actions([a, b], [(1, 1), (1, 1)], 0, mutual, 4, Dice(4, 4))
    assert b.hp == before-15


def integrity():
    monsters, skills, conditions = [read(key, REVIEW) for key in ("monstros", "habilidades", "condicoes")]
    assert (len(monsters), len(skills), len(conditions)) == (54, 28, 7)
    ids = {row["id_monstro"]: row for row in monsters}
    skill_ids = {row["id_habilidade"]: row for row in skills}
    condition_ids = {row["id_condicao"]: row for row in conditions}
    assert len(ids) == 54 and len(skill_ids) == 28 and len(condition_ids) == 7
    assert Counter(row["trilha"] for row in monsters if row["trilha"]) == dict.fromkeys(("Floresta", "Montanha", "Riacho"), 15)
    assert Counter(row["funcao_setup"] for row in monsters) == {"capturavel": 45, "inicial": 3, "evolucao": 6}
    assert {row["id_condicao"] for row in skills if row["id_condicao"]} == condition_ids.keys()
    assert all(21 <= int(row["energia"]) <= 30 for row in monsters)
    new_ids = {str(pair[1]) for pair in SLOTS.values()}
    seen = set()
    for row in monsters:
        chain = row["melhorias_monstro"].split("|")
        for node in filter(None, chain):
            kind, id_ = node.split(":")
            if kind == "habilidade":
                assert skill_ids[id_]["tag"] == "monstro"
                seen.add(id_)
            else:
                assert kind == "evolucao" and row["verso_monstro"] == id_ and ids[id_]["funcao_setup"] == "evolucao"
        for id_ in filter(None, row["habilidades_inatas"].split("|")):
            assert skill_ids[id_]["tag"] == "monstro"
        if row["verso_monstro"]:
            assert ids[row["verso_monstro"]]["verso_monstro"] == row["id_monstro"]
    assert new_ids <= seen
    old = {row["id_monstro"]: row for row in read("monstros", ORIGINAL)}
    for id_, row in ids.items():
        name = row["nome_monstro"]
        changed = {col for col in row if row[col] != old[id_][col]}
        assert changed == ({"passiva_monstro"} if name in PASSIVES else set()) | ({"melhorias_monstro"} if name in SLOTS else set()) | set(ADJUSTMENTS.get(name, {}))
    for key, count in (("habilidades", 22), ("condicoes", 1)):
        assert read(key, ORIGINAL) == read(key, REVIEW)[:count]


cards = roster(REVIEW)
mechanics()
integrity()
print("Casos dirigidos e integridade das três tabelas passaram.")
