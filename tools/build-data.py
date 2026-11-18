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

DESIGN = {"width": 2400, "height": 2300, "background": "#000000"}

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
    # Variante legible de B para textos largos: conserva Anton en mayúsculas y
    # el color, pero con un cuerpo que permite leerlos dentro del mapa.
    "B-long": {
        "fontFamily": "'Anton', 'Arial Narrow', Impact, sans-serif",
        "fontSize": 12,
        "fontWeight": 400,
        "lineHeight": 13,
        "letterSpacing": "-0.01em",
        "color": "#f4f2ea",
        "textTransform": "uppercase",
    },
}

# Los textos B de más de esta cantidad de caracteres se muestran con la
# variante legible; los B breves conservan el cuerpo display de 52 px.
B_LONG_THRESHOLD = 400

# Distribución de zonas tomada de orden.png: academia arriba al centro, música
# a la izquierda y abajo, literatura a la derecha. En el centro queda un
# rectángulo vacío (x 900–1500, y 1050–1450) alrededor del cual se ordenan los
# textos: dentro de cada zona, el número más bajo queda más cerca del centro.
Y_OFFSET = 600
ANCHORS = {
    "academia": (1180, 400 + Y_OFFSET),
    "musica-universal": (500, 880 + Y_OFFSET),
    "musica-argentina": (640, 1040 + Y_OFFSET),
    "musica-latinoamericana": (760, 960 + Y_OFFSET),
    "literatura-latinoamericana": (1640, 1060 + Y_OFFSET),
}

# Punto de cada texto en la vista inicial. Comparten zona, pero con un
# desplazamiento para que se vean como láminas superpuestas y no como un bloque
# macizo: se distinguen los textos y a la vez siguen pisándose entre sí. La
# cámara encuadra todos estos centros al abrir.
OVERLAP = {
    # Academia: AU en dos filas y AM en la fila inferior.
    "AU9": {"x": 980, "y": 760},
    "AU8": {"x": 1180, "y": 745},
    "AU10": {"x": 1380, "y": 760},
    "AU6": {"x": 950, "y": 935},
    "AU4": {"x": 1180, "y": 915},
    "AU5": {"x": 1410, "y": 935},
    "AU7": {"x": 1640, "y": 920},
    "AM1": {"x": 1070, "y": 1085},
    "AM2": {"x": 1270, "y": 1100},
    "AM3": {"x": 1480, "y": 1085},
    # Música universal: columna compacta a la izquierda, con las láminas más
    # pisadas que en el resto de las zonas.
    "MU4": {"x": 240, "y": 1340},
    "MU3": {"x": 240, "y": 1372},
    "MU1": {"x": 240, "y": 1404},
    "MU2": {"x": 240, "y": 1436},
    # Música argentina: abanico abajo a la izquierda.
    "MA5": {"x": 560, "y": 1640},
    "MA1": {"x": 820, "y": 1600},
    "MA3": {"x": 760, "y": 1740},
    "MA2": {"x": 930, "y": 1700},
    "MA4": {"x": 980, "y": 1850},
    # Música latinoamericana: dos láminas al centro-derecha.
    "ML1": {"x": 1330, "y": 1520},
    "ML2": {"x": 1330, "y": 1680},
    # Literatura: una sola lámina a la derecha.
    "LL1": {"x": 1900, "y": 1420},
}

# Posición legible y ancho de cada texto. Los centros se eligieron para dejar
# 80–100 px de aire entre bloques y un centro vacío; se verifican sin
# solapamientos con ?layout=read.
READABLE = {
    # Academia: AM1–AM3 en la fila interior; AU4–AU7 después; AU8–AU10 al fondo.
    "AM1": {"x": 1010, "y": 942, "width": 420},
    "AM2": {"x": 1530, "y": 876, "width": 420},
    "AM3": {"x": 2100, "y": 890, "width": 520},
    "AU4": {"x": 900, "y": 597, "width": 520},
    "AU5": {"x": 1500, "y": 545, "width": 520},
    "AU6": {"x": 300, "y": 571, "width": 520},
    "AU7": {"x": 2100, "y": 578, "width": 520},
    "AU8": {"x": 1200, "y": 218, "width": 520},
    "AU9": {"x": 600, "y": 212, "width": 520},
    "AU10": {"x": 1800, "y": 192, "width": 520},
    # Música universal: columna a la izquierda, MU1 el más cercano al centro.
    "MU1": {"x": 400, "y": 1220, "width": 400},
    "MU2": {"x": 400, "y": 1420, "width": 400},
    "MU3": {"x": 400, "y": 1030, "width": 400},
    "MU4": {"x": 400, "y": 860, "width": 400},
    # Música argentina: MA1–MA4 en dos columnas y MA5 al fondo a la izquierda.
    "MA1": {"x": 1100, "y": 1580, "width": 420},
    "MA2": {"x": 1600, "y": 1700, "width": 420},
    "MA3": {"x": 1050, "y": 1850, "width": 420},
    "MA4": {"x": 1600, "y": 2010, "width": 420},
    "MA5": {"x": 480, "y": 1900, "width": 460},
    # Música latinoamericana: columna a la derecha del centro.
    "ML1": {"x": 2090, "y": 1550, "width": 400},
    "ML2": {"x": 2090, "y": 1850, "width": 400},
    # Literatura: arriba a la derecha.
    "LL1": {"x": 2100, "y": 1200, "width": 520},
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
    # Varios textos académicos vienen copiados de PDF con tabulaciones entre
    # palabras; se convierten en espacios normales.
    text = text.replace("\t", " ")
    for wrong, right in LINE_FIXES.items():
        text = text.replace(wrong, right)
    return "\n".join(line.rstrip() for line in text.split("\n")).strip()


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
        if category == "B" and len(content) > B_LONG_THRESHOLD:
            category = "B-long"
        shape = READABLE[text_id]
        zone = zone_for(text_id)
        anchor = ANCHORS[zone]
        start = OVERLAP.get(text_id, {})
        entry = {
            "id": text_id,
            "category": category if category in CATEGORIES else "A",
            "theme": zone,
            "lyrics": is_lyrics(text_id),
            "width": shape["width"],
            "z": 10 + len(texts),
            "overlap": {
                "x": start.get("x", anchor[0]),
                "y": start.get("y", anchor[1]),
            },
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
