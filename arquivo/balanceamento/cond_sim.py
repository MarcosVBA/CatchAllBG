from collections import Counter
from dataclasses import dataclass, field
from itertools import combinations
from random import Random
from statistics import mean
from matchups import roster, weakness
from rounds import ATTACK as OLD_ATTACK, GUARD as OLD_GUARD, hand
from cond_data import ORIGINAL, REVIEW, PASSIVES, SLOTS

ATTACK = OLD_ATTACK | {34, 35, 37, 38}
GUARD = OLD_GUARD | {33, 36}
BASE = {1, 2, 3}
HEAL = {14, 22, 26}


@dataclass
class Combatant:
    card: dict
    trainer: int
    points: int
    hp: int = field(init=False)
    deck: set = field(init=False)
    cards: set = field(init=False)
    flags: set = field(default_factory=set)
    conditions: dict = field(default_factory=dict)
    activations: Counter = field(default_factory=Counter)
    previous: int = 0
    focus: int = 0
    burn: int = 0
    protection: int = 0

    def __post_init__(self):
        self.hp = self.card["hp"]
        self.deck = hand(self.card, self.points, self.trainer)
        self.cards = self.deck.copy()

    def passive(self, key):
        return self.card["passive"].startswith(key + ".")

    def once(self, key):
        if key in self.flags:
            return False
        self.flags.add(key)
        self.activations[key + " teste"] += 1
        return True

    def trigger(self, key, passed=True):
        if passed:
            self.activations[key] += 1
        return passed

    def apply(self, condition, turn):
        if self.hp > 0 and condition not in self.conditions:
            self.conditions[condition] = turn + (1 if condition == 6 else 2)

    def consume(self, condition):
        if condition in self.conditions:
            del self.conditions[condition]
            self.activations[f"condição {condition} teste"] += 1
            return True
        return False

    def heal(self, hp, rng):
        hp = min(hp, self.card["hp"] - self.hp)
        if hp <= 0:
            return 0
        if self.consume(4) and rng.randint(1, 6) <= 3:
            self.trigger("condição 4")
            hp = max(0, hp - 3)
        self.hp += hp
        return hp

    def finish_turn(self, turn):
        self.conditions = {condition: expiry for condition, expiry in self.conditions.items() if expiry > turn}
        if self.protection <= turn:
            self.protection = 0


def effective(p, card):
    if card == 3:
        return p.previous if p.previous in {1, 2, 4, 5} else 0
    return card


def select(p, rival, rng, defensive=False, revealed=None):
    def score(card):
        effect = effective(p, card)
        missing = p.card["hp"] - p.hp
        if effect in ATTACK:
            value = 2.15 + (rival.hp <= 6) * 0.9 + (effect != 1) * 0.25
            value -= (effect in {35, 37, 38}) * .10
            value -= (2 in p.conditions) * .40
            if revealed in GUARD:
                value -= 2.1
            if revealed in HEAL and effect == 30:
                value += .8
            if revealed == 13:
                value += .5
        elif effect == 4:
            value = 1.55 if rival.hp >= 5 else .5
        elif effect == 13:
            value = 2.05 if not rival.burn and rival.hp >= 4 else -.2
        elif effect in GUARD:
            value = 1.15 + (p.hp <= 6) * .65 + (effect != 2) * .45 + defensive * .50
            if revealed is not None:
                value += 2.9 if revealed in ATTACK else -2.0
        elif effect in {14, 26}:
            value = .90 * min(missing, 2) - (4 in p.conditions) * .65
        else:
            value = -1.0
        return value + rng.uniform(-1.25, 1.25)
    card = max(sorted(p.cards), key=score)
    p.cards.remove(card)
    effect = effective(p, card)
    p.previous = card
    return card, effect


def choices(players, rng, defensive):
    flags = [p.consume(6) for p in players]
    if flags[0] != flags[1]:
        i = flags.index(True)
        p, q = players[i], players[1-i]
        seen = select(p, q, rng, defensive)
        answer = select(q, p, rng, defensive, revealed=seen[1])
        p.trigger("condição 6")
        return [answer, seen] if i else [seen, answer]
    return [select(p, players[1-i], rng, defensive) for i, p in enumerate(players)]


def attack(p, q, action, reply, floor, mutual, last_mutual, rng, condition_reroll=False):
    card, skill = action
    other_card, other = reply
    if skill not in ATTACK:
        return 0, 0, 0
    reroll = p.trainer == 6
    def check(die, threshold):
        nonlocal reroll
        if reroll and condition_reroll and die <= threshold:
            reroll = False
            return rng.randint(1, 6)
        return die
    focus = p.focus
    p.focus = 0
    first_atacar = skill == 1 and p.card["passive"].startswith("No primeiro Atacar") and "primeiro" not in p.flags
    if first_atacar:
        p.flags.add("primeiro")
    if other in GUARD:
        chip = int(skill in {11, 24})
        if skill == 1 and p.passive("Fio Cortante") and p.once("Fio Cortante"):
            chip += 3 * p.trigger("Fio Cortante", check(rng.randint(1, 6), 4) >= 5)
        return chip, 0, 0
    bonus = (
        int(skill == 21 and q.hp > p.hp)
        + int(skill == 23 and bool(q.card["types"] & {"Inseto", "Grama"}))
        + int(skill == 25 and q.hp * 2 <= q.card["hp"])
        + int(skill == 27 and mutual)
        + int(skill == 29 and q.card["def"] > p.card["def"])
        + int(skill == 30 and other in HEAL)
        + int(skill == 31 and other_card in BASE)
        + int(skill == 32 and bool(q.card["types"] & {"Água", "Voador"}))
        - int(skill == 34)
    )
    if first_atacar:
        bonus += 1
    if skill == 1 and "tipo Psíquico" in p.card["passive"] and "Psíquico" in q.card["types"]:
        bonus += 1
    roll = rng.randint(1, 6)
    if reroll and roll <= 3:
        reroll = False
        roll = rng.randint(1, 6)
    weak = weakness(p.card, q.card)
    raw = max(floor, p.card["off"] - q.card["def"] + roll + weak + bonus + focus)
    if mutual and last_mutual and p.passive("Ritmo de Caça") and "Ritmo de Caça" not in p.flags:
        new_damage = max(floor, p.card["off"] - q.card["def"] + roll + weak + bonus + focus + 3)
        if new_damage > 0 and p.once("Ritmo de Caça"):
            raw = new_damage
            p.trigger("Ritmo de Caça")
    adjusted, overload = raw, 0
    if raw:
        if weak and q.passive("Refração") and q.once("Refração"):
            adjusted -= min(2, raw) * q.trigger("Refração", rng.randint(1, 6) >= 4)
        if p.consume(2) and check(rng.randint(1, 6), 3) <= 3:
            adjusted -= 3
            p.trigger("condição 2")
        if q.consume(3) and rng.randint(1, 6) <= 3:
            adjusted += 3
            q.trigger("condição 3")
        if p.consume(5):
            surge = check(rng.randint(1, 6), 4)
            if surge == 1:
                overload = 2
            if surge >= 5:
                adjusted += 4
            p.trigger("condição 5", surge == 1 or surge >= 5)
        if q.protection:
            adjusted -= 3
            q.protection = 0
            q.trigger("Casco de Arrasto")
    rolled_damage = max(0, adjusted)
    return rolled_damage + (p.card["hot"] if skill == 12 and mutual else 0), rolled_damage, overload


def turn_actions(players, selections, floor, last_mutual, turn, rng, condition_reroll=False):
    effects = [selection[1] for selection in selections]
    mutual = all(effect in ATTACK for effect in effects)
    canceled = None
    order = (1, 0) if effects[1] == 5 and effects[0] != 5 else (0, 1)
    hits = [(0, 0, 0), (0, 0, 0)]
    for i in order:
        p, q = players[i], players[1-i]
        hits[i] = attack(p, q, selections[i], selections[1-i], floor, mutual, last_mutual, rng, condition_reroll)
        if effects[i] == 5 and effects[1-i] != 5 and hits[i][0] >= q.hp:
            canceled = 1-i
            break
    dealt = [hit[0] for hit in hits]
    recovery = [0, 0]
    scheduled = []
    secondary = [hit[2] for hit in hits]
    for i, p in enumerate(players):
        if canceled == i:
            continue
        q = players[1-i]
        skill, other = effects[i], effects[1-i]
        blocked = skill in GUARD and other in ATTACK and canceled != 1-i
        suppression = blocked and p.consume(7)
        if suppression:
            p.trigger("condição 7", skill != 2)
        if not suppression:
            if skill == 14:
                heal = rng.randint(1, 6)
                if "Re-role" in p.card["passive"] and heal <= 3:
                    heal = rng.randint(1, 6)
                recovery[i] = (heal + 1) // 2
            elif skill == 26:
                recovery[i] = 2
            elif skill == 22 and blocked:
                recovery[i] = 1
            if skill == 15 and blocked:
                dealt[i] += 2
            if skill == 28 and blocked:
                p.focus += 1
            if skill == 33 and blocked:
                scheduled.append((q, 2))
            if skill == 36 and blocked:
                scheduled.append((p, 5))
        if skill == 4:
            p.focus += (rng.randint(1, 6) + 1) // 2
        if skill == 13 and not q.burn:
            q.burn = 3
        if skill in {34, 35, 38} and hits[i][1] >= (2 if skill == 38 else 1):
            scheduled.append((q, {34: 3, 35: 4, 38: 7}[skill]))
        if skill == 37 and hits[i][1] >= 3 and p.once("Marca de Penumbra"):
            scheduled.append((q, 6))
        if mutual and canceled is None and p.passive("Curto-Circuito") and p.once("Curto-Circuito"):
            surge = rng.randint(1, 6)
            secondary[1-i] += 4 * (surge >= 5)
            secondary[i] += 2 * (surge == 1)
            p.trigger("Curto-Circuito", surge == 1 or surge >= 5)
        if blocked and p.passive("Facho na Névoa") and p.once("Facho na Névoa"):
            if p.trigger("Facho na Névoa", rng.randint(1, 6) >= 5):
                scheduled.append((q, 2))
        if selections[1-i][0] == 3 and p.passive("Faro de Trilha") and p.once("Faro de Trilha"):
            if p.trigger("Faro de Trilha", rng.randint(1, 6) >= 4):
                scheduled.append((q, 6))
        if skill in ATTACK and other in GUARD and p.passive("Desencaixe") and p.once("Desencaixe"):
            scheduled.append((q, 7))
            p.trigger("Desencaixe")
        if skill == 1 and hits[i][1] > 0 and q.card["def"] > p.card["def"] and p.passive("Peso da Laje") and p.once("Peso da Laje"):
            scheduled.append((q, 3))
            p.trigger("Peso da Laje")
        if blocked and p.passive("Casco de Arrasto") and p.once("Casco de Arrasto"):
            p.protection = turn + 1
    healed = [0, 0]
    for i, p in enumerate(players):
        heal = recovery[i]
        if heal and p.hp < p.card["hp"] and p.card["passive"].startswith("A primeira habilidade") and "cura antiga" not in p.flags:
            heal += 1
            p.flags.add("cura antiga")
        healed[i] += p.heal(heal, rng)
        p.hp -= dealt[1-i] + secondary[i]
        if 0 < p.hp * 2 <= p.card["hp"] and dealt[1-i] > 0 and effects[1-i] in ATTACK and p.passive("Rebrotar") and p.once("Rebrotar"):
            if p.trigger("Rebrotar", rng.randint(1, 6) >= 5):
                healed[i] += p.heal(4, rng)
    for i, p in enumerate(players):
        if healed[1-i] and p.hp > 0 and p.passive("Esporos de Retorno") and p.once("Esporos de Retorno"):
            scheduled.append((players[1-i], 4))
            p.trigger("Esporos de Retorno")
    for target, condition in scheduled:
        target.apply(condition, turn)
    return mutual and canceled is None


def refresh(players, turn, refreshes):
    for i, p in enumerate(players):
        p.cards = p.deck.copy()
        if refreshes == 1 and p.passive("Eco de Margem") and p.hp < players[1-i].hp:
            p.apply(5, turn)
            p.trigger("Eco de Margem")


def simulate(a, b, points, trainers, rng, defensive=False, floor=0, condition_reroll=False):
    players = [Combatant(card, trainers[i], points[i]) for i, card in enumerate((a, b))]
    last_mutual = False
    refreshes = 0
    for turn in range(1, 81):
        for p in players:
            if p.burn:
                if rng.randint(1, 6) == 6:
                    p.burn = 0
                else:
                    p.hp -= 1
                    p.burn -= 1
        if any(p.hp <= 0 for p in players):
            break
        last_mutual = turn_actions(players, choices(players, rng, defensive), floor, last_mutual, turn, rng, condition_reroll)
        if any(p.hp <= 0 for p in players):
            break
        for p in players:
            p.finish_turn(turn)
        if any(not p.cards for p in players):
            refreshes += 1
            refresh(players, turn, refreshes)
    a_alive, b_alive = (p.hp > 0 for p in players)
    left = .5 if a_alive == b_alive else float(a_alive)
    return left, turn, refreshes, a_alive and b_alive, players


def sample(a, b, points, trainers, rng, count, defensive, floor=0):
    return [simulate(a, b, points, trainers, rng, defensive, floor) for _ in range(count)]


def sweep(directory, count, defensive, floor, condition_reroll):
    cards = roster(directory)
    results = {}
    totals, hand_totals, events = [], [], Counter()
    for a_id, b_id in combinations(cards, 2):
        a, b = cards[a_id], cards[b_id]
        batches = []
        for t in range(count):
            rng = Random(53131 + a_id * 317 + b_id * 2879 + t * 131)
            progress = (t % 3 + 1) if a["role"] != "evolucao" else t % 2
            rival_progress = (t % 3 + 1) if b["role"] != "evolucao" else t % 2
            trainers = tuple(rng.sample((4, 5, 6), 2))
            batches.append(simulate(a, b, (progress, rival_progress), trainers, rng, defensive, floor, condition_reroll))
        results[(a_id, b_id)] = mean(row[0] for row in batches)
        totals.extend(row[1] for row in batches)
        hand_totals.extend(row[2] for row in batches)
        for row in batches:
            for p in row[4]:
                events.update(p.activations)
    return results, totals, hand_totals, events


def benchmark(count=16, floor=0, defensive=False, condition_reroll=False):
    before = roster(ORIGINAL)
    base, original_turns, original_hands, old = sweep(ORIGINAL, count, defensive, floor, condition_reroll)
    after, turns, hands, events = sweep(REVIEW, count, defensive, floor, condition_reroll)
    affected = PASSIVES.keys() | SLOTS.keys()
    print("pares", len(after), "rodadas por versão", len(turns), "defensivo", defensive, "piso", floor, "rerrolagem", condition_reroll)
    for index, (r, h) in enumerate(((original_turns, original_hands), (turns, hands))):
        ordered = sorted(r)
        print("versão", index, "média", round(mean(r), 3),
              "faixa 80%", (ordered[len(r)//10], ordered[len(r)*9//10]),
              "duas renovações", round(mean(x >= 2 for x in h), 3), "80 turnos", r.count(80))
    for id_, entry in before.items():
        if entry["name"] not in affected:
            continue
        orig_scores, final_scores = [], []
        for (a, b), value in base.items():
            if id_ == a:
                orig_scores.append(value)
                final_scores.append(after[(a, b)])
            if id_ == b:
                orig_scores.append(1-value)
                final_scores.append(1-after[(a, b)])
        gains = [n - o for o, n in zip(orig_scores, final_scores, strict=True)]
        print(entry["name"], round(mean(orig_scores)*100, 1), round(mean(final_scores)*100, 1),
              "variação", round(mean(gains)*100, 1))
    print("eventos", sorted(events.items()))


if __name__ == "__main__":
    import sys
    benchmark(int(sys.argv[1]), int(sys.argv[2]), bool(int(sys.argv[3])), bool(int(sys.argv[4])) if len(sys.argv) > 4 else False)
