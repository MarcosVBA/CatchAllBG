import csv
import re
from pathlib import Path

SOURCE = Path("catch_all_v2.md")
OUT = Path("catch_all_v2_cartas")
HEADERS = {
    "monstros": "id_monstro nome_monstro energia ofensiva defesa passiva_monstro melhorias_monstro verso_monstro descricao_monstro tipo fraquezas trilha funcao_setup",
    "treinadores": "id_treinador nome_treinador passiva_treinador habilidades_iniciais descricao_treinador",
    "habilidades": "id_habilidade nome_habilidade efeito tag id_condicao",
    "condicoes": "id_condicao nome_condicao descricao_condicao",
    "itens": "id_item nome_item quantidade uso_unico momento_uso efeito",
}


def write(name, rows, directory=OUT):
    directory.mkdir(exist_ok=True)
    with (directory / f"{name}.csv").open("w", encoding="utf-8", newline="") as file:
        writer = csv.writer(file, lineterminator="\r\n")
        writer.writerow(HEADERS[name].split())
        for row in rows:
            assert len(row) == len(HEADERS[name].split()), (name, row)
            writer.writerow(row)


def read(name, directory=OUT):
    with (directory / f"{name}.csv").open(encoding="utf-8", newline="") as file:
        return list(csv.DictReader(file))


def main():
    source = SOURCE.read_text()
    tables = {}
    for section in re.split(r"^#### ", source, flags=re.M)[1:]:
        title, _, body = section.partition("\n")
        lines = [line for line in body.splitlines() if line.startswith("|")]
        tables[title.strip()] = [
            ["" if cell.strip() in ("-", "--") else cell.strip() for cell in line.strip("| ").split("|")]
            for line in lines[2:]
        ]

    monsters = tables["Carta de monstro"]
    for row in monsters:
        row.extend([""] * (10 - len(row)))
        links = [f"habilidade:{id_}" for id_ in re.findall(r"id=(\d+)", row[6])]
        if "Evolução" in row[6]:
            links.append(f"evolucao:{row[7]}")
        row[6] = "|".join(links)
        row.extend(["", "", "inicial" if row[0] in {"1", "3", "5"} else "evolucao"])
    write("monstros", monsters)

    trainers = tables["Carta de Treinador"]
    for row in trainers:
        row[3] = {"1": "4", "2": "5", "3": ""}[row[0]]
    write("treinadores", trainers)

    skills = tables["Cartas de habilidade"]
    for row in skills:
        if row[0] == "3":
            row.insert(1, "Repetir")
        row.append("1" if row[0] == "13" else "")
    write("habilidades", skills)
    write("condicoes", [[1, *tables["Condições"][0]]])

    items = re.findall(r"^- (.+?) x(\d+) - (.+)$", source, flags=re.M)
    moments = ["", "Durante o combate", "Ao ser atacado", "Durante a fase da trilha", ""]
    write("itens", [[id_, name, quantity, "sim", moment, effect]
                    for id_, ((name, quantity, effect), moment) in enumerate(zip(items, moments, strict=True), 1)])

    for name, expected in zip(HEADERS, [5, 3, 10, 1, 5], strict=True):
        rows = read(name)
        assert len(rows) == expected and all(None not in row for row in rows)
    assert sum(int(row["quantidade"]) for row in read("itens")) == 11
    skills_by_id = {row[0]: row[1] for row in skills}
    assert {skills_by_id[row[3]] for row in trainers if row[3]} == {"Foco", "Ataque Rápido"}
    for row in monsters:
        for link in filter(None, row[6].split("|")):
            kind, id_ = link.split(":")
            assert id_ in (skills_by_id if kind == "habilidade" else {item[0] for item in monsters})
    print("Exemplos verificados: 5 monstros, 3 treinadores, 10 habilidades, 1 condição, 5 itens (11 cópias).")


if __name__ == "__main__":
    main()
