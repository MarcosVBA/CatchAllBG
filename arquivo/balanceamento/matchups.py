from collections import Counter
from functools import lru_cache
from itertools import combinations, product
from statistics import mean
from base import read


def roster(directory=None):
    location = {"directory": directory} if directory else {}
    data = read("monstros", **location)
    skills = {int(skill["id_habilidade"]): skill["efeito"] for skill in read("habilidades", **location)}
    return {int(row["id_monstro"]): {
        "name": row["nome_monstro"],
        "hp": int(row["energia"]), "off": int(row["ofensiva"]), "def": int(row["defesa"]),
        "types": set(row["tipo"].split("|")), "weak": set(row["fraquezas"].split("|")),
        "deck": [int(item.split(":")[1]) for item in row["melhorias_monstro"].split("|") if item.startswith("habilidade:")],
        "innate": [int(item) for item in row.get("habilidades_inatas", "").split("|") if item],
        "passive": row["passiva_monstro"], "role": row["funcao_setup"], "trail": row["trilha"],
        "hot": 1 if "1 de dano direto" in skills[12] else 2,
        "half_heal": "metade" in skills[14],
    } for row in data}


def weakness(a, b):
    return 2 * bool(a["types"] & b["weak"])


def hits(a, b, floor, bonus=0, flat=0, focus=0):
    return [max(floor, die + a["off"] - b["def"] + weakness(a, b) + bonus + focus) + flat
            for die in range(1, 7)]


def unlocked(a, b, floor):
    candidates = [hits(a, b, floor, int(a["passive"].startswith("No primeiro Atacar")
                                       or ("tipo Psíquico" in a["passive"] and "Psíquico" in b["types"])))]
    for ability in a["innate"] + a["deck"][:2]:
        bonus = {21: b["hp"] > a["hp"], 23: bool(b["types"] & {"Inseto", "Grama"}),
                 27: True, 29: b["def"] > a["def"], 31: True,
                 32: bool(b["types"] & {"Água", "Voador"})}
        if ability in {11, 12, 21, 23, 24, 25, 27, 29, 30, 31, 32}:
            candidates.append(hits(a, b, floor, bonus.get(ability, 0), a["hot"] if ability == 12 else 0))
    return max(candidates, key=lambda damages: (sum(d >= b["hp"] for d in damages), sum(damages)))


def report(data, floor):
    pairs = list(combinations(data.values(), 2))
    directions = [(a, b) for pair in pairs for a, b in (pair, pair[::-1])]
    print(f"{len(pairs)} pares, {len(directions)} direções, piso {floor}")
    severe = []
    for scenario, get_hits in [
        ("Ataque puro", lambda a, b: hits(a, b, floor)),
        ("Até 2 melhorias após entrar na forma + passivas", lambda a, b: unlocked(a, b, floor)),
    ]:
        results = []
        for a, b in directions:
            damage = get_hits(a, b)
            results.append((sum(d >= b["hp"] for d in damage), a["name"], b["name"], min(damage), max(damage)))
        print(scenario, "KO possível", sum(count > 0 for count, *_ in results),
              "KO >50%", sum(count > 3 for count, *_ in results),
              "KO ≥5/6", sum(count >= 5 for count, *_ in results),
              "KO certo", sum(count == 6 for count, *_ in results))
        severe.append([result for result in results if result[0] > 3])
        print("Principais origens:", Counter(a for count, a, b, *_ in results if count > 3).most_common(8))
        print("Principais alvos:", Counter(b for count, a, b, *_ in results if count > 3).most_common(10))
        print("Extremos:", sorted(results, reverse=True)[:8])
    zeros = sum(sum(d <= 0 for d in hits(a, b, floor)) >= 3 for a, b in directions)
    print("Ataque puro sem dano em ≥3/6", zeros)
    print("Tipos capturáveis", Counter(t for a in data.values() if a["trail"] for t in a["types"]))
    print("Fraquezas capturáveis", Counter(t for a in data.values() if a["trail"] for t in a["weak"]))
    for trail in sorted({a["trail"] for a in data.values() if a["trail"]}):
        group = [a for a in data.values() if a["trail"] == trail]
        print(trail, [round(mean(a[k] for a in group), 2) for k in ("hp", "off", "def")])
    return severe


def race(a, b, floor):
    changes = Counter(product(hits(a, b, floor), hits(b, a, floor)))
    skipped = changes.pop((0, 0), 0)

    @lru_cache(None)
    def solve(x, y):
        if x <= 0 or y <= 0:
            return 0.5 if x <= 0 and y <= 0 else float(y <= 0)
        return sum(n * solve(x - dy, y - dx) for (dx, dy), n in changes.items()) / (36 - skipped)

    return solve(a["hp"], b["hp"])


def race_report(data, floor):
    win_scores = {key: [] for key in data}
    for i, j in combinations(data, 2):
        score = race(data[i], data[j], floor)
        win_scores[i].append(score)
        win_scores[j].append(1 - score)
    scores = sorted((round(mean(record) * 100, 1), data[i]["name"]) for i, record in win_scores.items())
    print("Trocas contínuas de Atacar, média de vitória e meio ponto para empate simultâneo, piso", floor)
    print("Menores:", scores[:5], "maiores:", scores[-5:])
    print("Iniciais:", [entry for entry in scores if entry[1] in {"krakon", "owlzin", "flouly"}])


if __name__ == "__main__":
    from pathlib import Path
    import sys
    data = roster(Path(sys.argv[1]) if len(sys.argv) > 1 else None)
    report(data, 0)
    report(data, 1)
    race_report(data, 0)
    race_report(data, 1)
