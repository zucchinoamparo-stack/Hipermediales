# Red de textos

Pieza web interactiva: un mapa navegable de textos sobre un lienzo negro, organizado en tres zonas temáticas: **academia**, **música** y **literatura**. La zona de música se abre, a su vez, en tres subzonas: universal, argentina y latinoamericana.

A distancia, los textos se ven como láminas superpuestas; al acercarse se separan hasta quedar legibles y el más cercano al cursor toma foco mientras el resto se atenúa. Los textos de música suman un **modo letra** con avance automático.

Sin frameworks, sin build, sin dependencias: HTML, CSS y JavaScript vanilla.

## Cómo verlo

Alcanza con abrir `index.html` en el navegador. Para trabajar cómodo conviene servir la carpeta:

```bash
python -m http.server 8765
```

Luego `http://127.0.0.1:8765`.

## Cómo se navega

- **Zoom**: rueda del mouse o pinch de trackpad, centrado en el cursor.
- **Desplazamiento**: clic y arrastre (la imagen sigue al cursor 1:1).
- **Foco**: el texto más cercano al cursor se destaca; el resto se atenúa sin desaparecer.
- **Modo letra**: al enfocar un texto de música aparece una ventana de lectura centrada en la línea activa (3 líneas antes y 3 después), que avanza sola cada segundo.
- La cámara queda acotada al lienzo: no se puede perder la página.
- No hay menú, botones ni texto de interfaz.

## Estructura

```
/
├── index.html          # escenario, capa de textos y panel de debug oculto
├── styles.css          # @font-face locales, fondo, tipografías, foco, modo letra
├── config.js           # cámara, zoom, separación, foco y letras
├── data/texts.js       # dataset generado — no editar a mano
├── js/app.js           # cámara, render, interpolación, foco, letras y loop
├── tools/build-data.py # lee el Excel y escribe data/texts.js
├── assets/fonts/       # Anton y Roboto Slab en woff2
└── PLAN.md             # decisiones de diseño y documentación técnica completa
```

`data/texts.js` ya está generado y versionado: el sitio funciona clonando el repo, sin Python ni Excel.

## Dataset y generación de datos

El origen es una planilla Excel (`dataset.xlsx`, columna 1 = id, 2 = categoría, 3 = texto) que **no** está en el repositorio. `tools/build-data.py` la lee y escribe `data/texts.js` con:

- categoría y estilo tipográfico de cada texto;
- su zona temática, derivada del prefijo del id (`AM`/`AU` → academia, `MU` → música universal, `MA` → música argentina, `ML`/`MM` → música latinoamericana, `LL` → literatura);
- dos posiciones por texto: una para la vista superpuesta y otra para el layout legible;
- las líneas de letra de los textos de música (`/` separa versos, `//` separa estrofas).

Para regenerarlo hace falta Python 3 con `openpyxl`:

```bash
pip install openpyxl
python tools/build-data.py "ruta/al/dataset.xlsx"
```

Conviene correrlo solo si cambia el Excel o se mueven textos a mano en `tools/build-data.py`, y revisar después que el layout legible siga sin solapamientos.

## Categorías tipográficas

| Categoría | Fuente | Cuerpo / interlineado | Color |
|---|---|---|---|
| A | Roboto Slab 400 | 8.5 / 8.5 px | `#efece3` |
| B | Anton 400, mayúsculas | 52 / 51 px | `#f4f2ea` |
| B-long | Anton 400, mayúsculas | 12 / 13 px | `#f4f2ea` |
| C | Roboto Slab 300 | 8 / 9.5 px | `#a85050` |

`B-long` es la variante de los textos B largos (más de 400 caracteres): mantiene el gesto display pero en un cuerpo que se puede leer dentro del mapa.

## Parámetros de desarrollo

- `?debug=1` o tecla `D`: panel de ajuste en vivo.
- `?layout=read`: fuerza el layout legible completo.
- `?layout=overlap`: fuerza el layout superpuesto.
- `?zoom=1.45&x=480&y=1900&focus=MA5`: abre en un punto y con un texto enfocado.
- `?v=N` en los assets de `index.html`: subir el número al modificar CSS o JS, para que el navegador no mezcle versiones cacheadas.

## Créditos

Tipografías: [Anton](https://fonts.google.com/specimen/Anton) y [Roboto Slab](https://fonts.google.com/specimen/Roboto+Slab), servidas localmente en `assets/fonts/` (licencia SIL Open Font License).
