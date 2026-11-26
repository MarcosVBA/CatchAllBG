from dataclasses import dataclass, field
from itertools import permutations
from pathlib import Path
from random import Random
from statistics import mean
from matchups import roster, weakness

BASE = {1, 2, 3}
ATTACK = {1, 5, 11, 12, 21, 23, 24, 25, 27, 29, 30, 31, 32}
GUARD = {2, 15, 22, 28}
HEAL = {14, 22, 26}


@dataclass
class Player:
    card: dict
    deck: set
    trainer: int
    hp: int
    hand: set = field(default_factory=set)
    prev: int = 0
    focus: int = 0
    burn: int = 0
    used_attack: bool = False
    used_heal: bool = False

    def __post_init__(self):
        self.hand = self.deck.copy()

    def recover(self, amount):
        self.hp = min(self.card["hp"], self.hp + amount)


def hand(p, points, trainer, inherited=()):
    addition = {trainer} if trainer in (4, 5) else set()
    return BASE | addition | set(p["innate"]) | set(p["deck"][:points]) | set(inherited)


def action(player, rival, rng):
    def score(card):
        kind = (player.prev if player.prev in {1, 2, 4, 5} else 0) if card == 3 else card
        missing_hp = player.card["hp"] - player.hp
        if kind in ATTACK:
            score = 2.2 + (rival.hp <= 4) * 0.9 + (kind != 1) * 0.4
        elif kind == 4:
            score = 1.5 if rival.hp >= 5 else 0.5
        elif kind == 13:
            score = 2.6 if not rival.burn and rival.hp >= 4 else -0.2
        elif kind in GUARD:
            score = 1.1 + (player.hp <= 4) * 0.9 + (kind != 2) * 0.7
        elif kind in (14, 26):
            score = 0.8 * min(missing_hp, 4 if kind == 14 else 2)
        else:
            score = -1.0
        return score + rng.uniform(-1.2, 1.2), card, kind
    _, selected, resolved = max(map(score, sorted(player.hand)))
    player.hand.remove(selected)
    if selected == 3:
        player.prev = 3
    else:
        player.prev = selected
    return selected, resolved


def damage(p, q, skill, opponent_card, opponent_skill, rng, floor):
    hits = skill in ATTACK or skill == 15 and opponent_skill in ATTACK
    if not hits:
        return 0
    bonus = (
        int(skill == 21 and q.hp > p.hp)
        + int(skill == 23 and bool(q.card["types"] & {"Inseto", "Grama"}))
        + int(skill == 25 and q.hp * 2 <= q.card["hp"])
        + int(skill == 27 and opponent_skill in ATTACK)
        + int(skill == 29 and q.card["def"] > p.card["def"])
        + int(skill == 30 and opponent_skill in HEAL)
        + int(skill == 31 and opponent_card in BASE)
        + int(skill == 32 and bool(q.card["types"] & {"Água", "Voador"}))
    )
    if skill == 1 and not p.used_attack and p.card["passive"].startswith("No primeiro Atacar"):
        bonus += 1
    if skill == 1 and "tipo Psíquico" in p.card["passive"] and "Psíquico" in q.card["types"]:
        bonus += 1
    p.used_attack |= skill == 1
    pending = p.focus
    p.focus = 0
    extra = p.card["hot"] if skill == 12 and opponent_skill in ATTACK else 0
    if skill == 15 and p.card["hot"] == 1:
        return 2
    if opponent_skill in GUARD:
        return extra + int(skill in (11, 24))
    roll = rng.randint(1, 6)
    if p.trainer == 6 and roll <= 3:
        roll = rng.randint(1, 6)
    return max(floor, roll + p.card["off"] - q.card["def"] + weakness(p.card, q.card) + bonus + pending) + extra


def outcome(a, b, points, trainers, rng, floor=0, cancel_fast=True, inherited=((), ()), manual=()):
    players = [Player(p, hand(p, points[i], trainers[i], inherited[i]), trainers[i], p["hp"]) for i, p in enumerate((a, b))]
    if manual:
        for player, hp in zip(players, manual, strict=True):
            player.hp = hp
    refreshes = 0
    limit = 60
    for turn in range(1, limit + 1):
        for p in players:
            if p.burn:
                if rng.randint(1, 6) == 6:
                    p.burn = 0
                else:
                    p.hp -= 1
                    if p.card["hot"] == 1:
                        p.burn -= 1
        if any(p.hp <= 0 for p in players):
            break
        choices = [action(p, players[1-i], rng) for i, p in enumerate(players)]
        injuries = [damage(p, players[1-i], choices[i][1], *choices[1-i], rng, floor) for i, p in enumerate(players)]
        canceled = None
        if cancel_fast:
            for i, (_, skill) in enumerate(choices):
                if skill == 5 and choices[1-i][1] != 5 and players[1-i].hp <= injuries[i]:
                    canceled = 1-i
                    injuries[canceled] = 0
        for i, p in enumerate(players):
            if canceled == i:
                p.hp -= injuries[1-i]
                continue
            skill = choices[i][1]
            # Cura e dano simultâneos, respeitando o máximo de energia antes do dano.
            if skill == 14:
                heal = rng.randint(1, 6)
                if "Re-role" in p.card["passive"] and heal <= 3:
                    heal = rng.randint(1, 6)
                if p.card["half_heal"]:
                    heal = (heal + 1) // 2
            elif skill == 26:
                heal = 2
            elif skill == 22:
                heal = int(choices[1-i][1] in ATTACK)
            else:
                heal = 0
            if heal:
                p.recover(heal + int(not p.used_heal and p.card["passive"].startswith("A primeira habilidade")))
                p.used_heal = True
            if skill == 4:
                p.focus += (rng.randint(1, 6) + 1) // 2
            if skill == 28 and choices[1-i][1] in ATTACK:
                p.focus += 1
            if skill == 13 and not players[1-i].burn:
                players[1-i].burn = 3
            p.hp -= injuries[1-i]
        if any(p.hp <= 0 for p in players):
            break
        if any(not p.hand for p in players):
            refreshes += 1
            for p in players:
                p.hand = p.deck.copy()
    left, right = (p.hp > 0 for p in players)
    return (0.5 if left == right else float(left), turn, refreshes, left and right, not left and not right)


def sample(data, first, second, points, trainers=(0, 0), **settings):
    rng = Random(751)
    trials = [outcome(data[first], data[second], points, trainers, rng, **settings) for i in range(1500)]
    return [round(mean(row[col] for row in trials), 3) for col in range(len(trials[0]))]


if __name__ == "__main__":
    import sys
    data = roster(Path(sys.argv[1]) if len(sys.argv) > 1 else None)
    print("Vitória A (empates valem 0,5), turnos, renovações, limite, nocautes simultâneos")
    for first, second in ((1, 3), (3, 5), (5, 1), (3, 115), (2, 123), (4, 117)):
        for points in ((0, 0), (1, 1), (2, 2)) if {first, second} <= {1, 3, 5} else ((2, 2),):
            print(data[first]["name"], data[second]["name"], points, sample(data, first, second, points))
    print("Owlsel, hipótese de herdar Curar I/Bolha x Penaferro:",
          sample(data, 4, 106, (0, 2), inherited=((14, 15), ())))
    print("Ataque Rápido, cancelar ação ao nocautear ou preservar simultaneidade:")
    for cancel in (True, False):
        print(cancel, sample(data, 4, 117, (0, 2), (5, 4), manual=(3, 4), cancel_fast=cancel))
