from collections import Counter
from random import Random
from statistics import mean, median
from base import read
from matchups import roster
from rounds import outcome

monsters = roster()
initial = [i for i, row in monsters.items() if row["role"] == "inicial"]
captures = [i for i, row in monsters.items() if row["role"] == "capturavel"]
evolutions = {}
for row in read("monstros"):
    for step in row["melhorias_monstro"].split("|"):
        if step.startswith("evolucao:"):
            evolutions[int(row["id_monstro"])] = int(step.split(":")[1])


def summarize(samples):
    ordered = sorted(samples)
    return [round(mean(samples), 2), median(samples), ordered[len(samples) // 10], ordered[len(samples) * 9 // 10]]


def matchup(cycle, bonus, rng):
    starter = rng.sample(initial, 2)
    drawn = rng.sample(captures, cycle * 2)
    teams = []
    for i in range(2):
        ids = [starter[i]] + drawn[i::2]
        points = Counter()
        for turn in range(cycle):
            points[rng.choice(ids[:turn + 2])] += 1
            if bonus:
                points[rng.choice(ids[:turn + 2])] += 1
        team = [((evolutions[id_], points[id_] - 3)
                 if points[id_] >= 3 and id_ in evolutions
                 else (id_, points[id_])) for id_ in ids]
        rng.shuffle(team)
        teams.append(team)
    return teams


def measure(cycle, floor=0, bonus=False, replay=False):
    rng = Random(47821 + cycle)
    duel_lengths, round_lengths = [], []
    sizes = Counter()
    ties = limits = 0
    for trial in range(6000):
        teams = matchup(cycle, bonus, rng)
        trainers = tuple(rng.sample([4, 5, 6], 2))
        total, wins = 0, [0, 0]
        for i, (left, right) in enumerate(zip(*teams)):
            resolved = False
            while not resolved:
                score, duration, _, stuck, double = outcome(
                    monsters[left[0]], monsters[right[0]], (left[1], right[1]),
                    trainers, rng, floor=floor,
                )
                round_lengths.append(duration)
                total += duration
                ties += double
                limits += stuck
                resolved = not (double and replay)
            wins[rng.randrange(2) if score == .5 else int(score == 0)] += 1
            if cycle == 1 or max(wins) == 2:
                break
        sizes[i + 1] += 1
        duel_lengths.append(total)
    print(cycle, floor, bonus, replay, "rodada", summarize(round_lengths),
          "duelo", summarize(duel_lengths), "rodadas por duelo", sizes,
          "duplo KO", round(ties / len(round_lengths), 4), "limite", limits, flush=True)


if __name__ == "__main__":
    import sys
    setting = sys.argv[1]
    for cycle in (1, 2, 3):
        measure(cycle, floor=int(setting == "piso"), bonus=setting == "bonus", replay=setting == "replay")
