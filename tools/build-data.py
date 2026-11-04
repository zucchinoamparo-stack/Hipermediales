"""Genera data/texts.js a partir del Excel del dataset.

Uso:
    python tools/build-data.py

El Excel vive fuera del proyecto; la ruta se puede pasar por argumento:
    python tools/build-data.py "C:/ruta/al/dataset.xlsx"
"""

import json
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "data" / "texts.js"
DEFAULT_SOURCE = Path(r"C:\Users\zucch\OneDrive\Documentos\Hipermediales\dataset.xlsx")

DESIGN = {"width": 2400, "height": 1400, "background": "#000000"}

CATEGORIES = {
    "A": {
        "fontFamily": "'Roboto Slab', Rockwell, serif",
        "fontSize": 8.5,
        "fontWeight": 400,
        "lineHeight": 8.5,
        "letterSpacing": "0em",
        "color": "#efece3",
        "textTransform": "none",
    },
    "B": {
        "fontFamily": "'Anton', 'Arial Narrow', Impact, sans-serif",
        "fontSize": 52,
        "fontWeight": 400,
        "lineHeight": 51,
        "letterSpacing": "-0.01em",
        "color": "#f4f2ea",
        "textTransform": "uppercase",
    },
    "C": {
        "fontFamily": "'Roboto Slab', Rockwell, serif",
        "fontSize": 8,
        "fontWeight": 300,
        "lineHeight": 9.5,
        "letterSpacing": "0em",
        "color": "#783030",
        "textTransform": "none",
    },
}

# Centro de cada zona tomado de orden.png (marco 1071x565) y escalado al lienzo.
ANCHORS = {
    "academia": (1203, 357),
    "musica-universal": (210, 974),
    "musica-argentina": (400, 1148),
    "musica-latinoamericana": (585, 1066),
    "literatura-latinoamericana": (1799, 1148),
}

# Posición legible y ancho de cada texto (se verifican sin solapamientos).
READABLE = {
    "AM1": {"x": 610, "y": 200, "width": 420},
    "AM2": {"x": 1060, "y": 215, "width": 420},
    "AM3": {"x": 1590, "y": 200, "width": 560},
    "MU1": {"x": 230, "y": 580, "width": 400},
    "MU2": {"x": 230, "y": 731, "width": 400},
    "MU3": {"x": 230, "y": 874, "width": 400},
    "MU4": {"x": 230, "y": 995, "width": 400},
    "MA5": {"x": 700, "y": 880, "width": 460},
    "MA1": {"x": 1170, "y": 1179, "width": 420},
    "MA2": {"x": 1170, "y": 603, "width": 420},
    "MA3": {"x": 1170, "y": 876, "width": 420},
    "MA4": {"x": 1170, "y": 1036, "width": 420},
    "ML1": {"x": 1600, "y": 620, "width": 400},
    "ML2": {"x": 1600, "y": 849, "width": 400},
    "LL1": {"x": 2110, "y": 930, "width": 520},
}

# Correcciones puntuales de saltos de línea perdidos en el Excel.
LINE_FIXES = {
    "You want it darkerHineni, hineni": "You want it darker\nHineni, hineni",
    "Come with meIn the demonstration of this evidence": (
        "Come with me\nIn the demonstration of this evidence"
    ),
}

ZONE_PREFIXES = [
    ("AM", "academia"),
    ("MU", "musica-universal"),
    ("MA", "musica-argentina"),
    ("ML", "musica-latinoamericana"),
    ("MM", "musica-latinoamericana"),
    ("LL", "literatura-latinoamericana"),
    ("L", "literatura-latinoamericana"),
    ("AU", "academia"),
    ("AA", "academia"),
    ("AL", "academia"),
    ("A", "academia"),
]


def normalize(text):
    text = text.replace("_x000B_", "\n").replace("\x0b", "\n")
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    for wrong, right in LINE_FIXES.items():
        text = text.replace(wrong, right)
    return text.strip()


def zone_for(text_id):
    up = text_id.upper()
    for prefix, zone in ZONE_PREFIXES:
        if up.startswith(prefix):
            return zone
    return "academia"


def is_lyrics(text_id):
    return text_id.upper().startswith("M")


def readable_lines(text):
    """Devuelve las líneas tal como se muestran en el modo letra.

    Algunos textos del Excel usan "/" como separador de verso y "//" como
    separación de estrofa; el resto ya viene con saltos de línea reales.
    """
    prepared = text.replace("//", "\n\n")
    lines = []
    for raw_line in prepared.split("\n"):
        if "/" in raw_line:
            lines.extend(part.strip() for part in raw_line.split("/"))
        else:
            lines.append(raw_line.rstrip())
    return lines


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    wb = openpyxl.load_workbook(source, data_only=True)
    ws = wb[wb.sheetnames[0]]

    texts = []
    for row in range(2, ws.max_row + 1):
        raw_id = ws.cell(row, 1).value
        if not raw_id:
            continue
        text_id = str(raw_id).strip()
        category = str(ws.cell(row, 2).value or "A").strip().upper()
        content = normalize(ws.cell(row, 3).value or "")
        shape = READABLE[text_id]
        zone = zone_for(text_id)
        anchor = ANCHORS[zone]
        entry = {
            "id": text_id,
            "category": category if category in CATEGORIES else "A",
            "theme": zone,
            "lyrics": is_lyrics(text_id),
            "width": shape["width"],
            "z": 10 + len(texts),
            "overlap": {"x": anchor[0], "y": anchor[1]},
            "readable": {"x": shape["x"], "y": shape["y"]},
            "content": content,
        }
        if entry["lyrics"]:
            entry["lines"] = readable_lines(content)
        texts.append(entry)

    payload = {"design": DESIGN, "categories": CATEGORIES, "texts": texts}

    lines = [
        "// Archivo generado por tools/build-data.py — no editar a mano.",
        "window.TEXT_NETWORK = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";",
        "",
    ]
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text("\n".join(lines), encoding="utf-8")

    print(f"{DEST} — {len(texts)} textos")
    for entry in texts:
        print(
            f"  {entry['id']:4} {entry['category']} {entry['theme']:28} "
            f"{len(entry['content']):5} chars"
        )


if __name__ == "__main__":
    main()
