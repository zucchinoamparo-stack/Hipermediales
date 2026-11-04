# Plan de implementación — Red de textos navegable por zoom

## Objetivo

Aplicación web para computadora (tablet como secundario) que muestra una red de textos superpuestos. El usuario navega únicamente con zoom (rueda del mouse o pinch de trackpad), centrado en el cursor. Al acercarse, los textos se separan hasta quedar legibles y el texto más cercano al cursor toma foco mientras el resto se atenúa.

Los textos de música (`MU*`, `MA*`, `ML*`, `MM*`) tienen además un **modo letra** tipo Spotify que se activa al enfocarlos.

**Estado: implementado con el dataset definitivo de 15 textos.**

## Estado actual del prototipo

- Archivos: `index.html`, `styles.css`, `config.js`, `data/texts.js`, `js/app.js`, `tools/build-data.py`.
- Carga los 15 textos del Excel `dataset.xlsx` (fuera del proyecto) distribuyendo cada uno en la zona temática de `orden.png`.
- Las posiciones legibles están empaquetadas a mano en 4 columnas + fila de academia + columna de literatura; se verificó **0 solapamientos** en el layout legible.
- Los textos de una misma zona comparten el **mismo punto** en el layout superpuesto (decisión del usuario).
- Dos layouts por texto (`overlap` y `readable`) interpolados por zoom.
- Zoom con rueda y pinch de trackpad centrado en el cursor.
- **Navegación con el cursor, sin clic**: al mover el mouse la imagen acompaña al puntero (si el cursor baja, la imagen baja), con una ganancia menor a 1 para poder apuntar a los textos.
- La cámara queda **acotada a los bordes del lienzo**, así no se puede perder la página.
- Foco por proximidad al cursor con atenuación del resto.
- Modo letra para los textos `M*` con avance automático cada 1 s.
- Fuentes self-hosted en `assets/fonts/` (Anton y Roboto Slab variable).
- Sin texto de UI ni controles visibles en la experiencia normal.
- Para probar: servir la carpeta (`python -m http.server 8765`) y abrir `http://127.0.0.1:8765`.

### Parámetros de desarrollo

- `?debug=1` o tecla `D`: panel de ajuste.
- `?layout=read`: fuerza el layout legible completo.
- `?layout=overlap`: fuerza el layout superpuesto.
- `?zoom=1.6&x=760&y=760`: abre en un punto (coordenadas de mundo) y zoom determinados.
- `?zoom=1.45&x=700&y=880&focus=MA5`: abre enfocando un texto concreto.

## Decisiones ya tomadas

| Tema | Decisión |
|---|---|
| Cantidad de textos | 15 (dataset definitivo) |
| Contenido | Excel `C:\Users\zucch\OneDrive\Documentos\Hipermediales\dataset.xlsx` |
| Posiciones | Fijas, derivadas de las zonas de `orden.png` |
| Zonas | academia, música universal, música argentina, música latinoamericana, literatura latinoamericana |
| Textos de una misma zona | Se apilan en el mismo punto al alejar |
| Separación | Cada texto tiene posición “superpuesta” y “legible”; el zoom interpola entre ambas |
| Zoom | Escala limitada + separación + atenuación del resto |
| Navegación | Paneo siguiendo al cursor (sin clic) + rueda/pinch para zoom; sin teclado ni doble clic |
| Trackpad | Solo pinch hace zoom; dos dedos sin pinch no desplazan |
| Foco | Por proximidad al cursor |
| Vista inicial | Red completa, textos superpuestos |
| Adaptación | Lienzo fijo 2400×1400 escalado a la ventana |
| Textos largos | Se leen completos en el mapa, sin panel |
| Estilo | Categorías con tipografía y color propios, según Figma |
| Fuentes | Google Fonts descargadas y servidas localmente |
| Elementos visuales | Solo textos (sin líneas, formas ni imágenes) |
| Interfaz | Ningún texto de UI ni controles visibles |
| Movimiento | Transiciones suaves; sin deriva constante |
| Stack | HTML + CSS + JavaScript vanilla, sin build ni dependencias |
| Publicación | Hosting estático (Netlify / Vercel / GitHub Pages) |
| Configuración | Archivo `config.js` + panel de ajuste en vivo solo para desarrollo |

## Arquitectura

```
/
├── index.html          # escenario, capa de textos y panel de debug oculto
├── styles.css          # @font-face locales, fondo, tipografías, foco, modo letra
├── config.js           # cámara, zoom, separación, foco y letras
├── data/texts.js       # generado por tools/build-data.py — no editar a mano
├── js/app.js           # cámara, render, interpolación, foco, letras y loop
├── tools/build-data.py # lee el Excel y escribe data/texts.js
├── assets/fonts/       # Anton y Roboto Slab en woff2
└── PLAN.md
```

Sin bundler, sin npm obligatorio. Servir con `python -m http.server` o Live Server para pruebas locales.

## Categorías tipográficas

| Categoría | Fuente | Tamaño / interlineado | Color | Otros |
|---|---|---|---|---|
| A | Roboto Slab 400 | 8.5 / 8.5 px | `#efece3` | — |
| B | Anton 400 | 52 / 51 px | `#f4f2ea` | mayúsculas, tracking −0.01em |
| C | Roboto Slab 300 | 8 / 9.5 px | `#783030` | — |

La categoría B queda definida para titulares, pero el dataset actual no trae ninguna fila B.

Roboto Slab se sirve como fuente variable (`wght 100–900`), lo que permite que el modo letra use negrita real (700) y no una negrita sintética.

## Generación de datos

`data/texts.js` se genera desde el Excel:

```bash
python tools/build-data.py
# o, con otra ruta:
python tools/build-data.py "C:/ruta/al/dataset.xlsx"
```

El script:

1. Lee la primera hoja del Excel (columna 1 = id, 2 = categoría, 3 = texto).
2. Normaliza los saltos de línea `_x000B_` a `\n`.
3. Aplica correcciones puntuales de saltos perdidos (`You want it darker` / `Hineni, hineni` y `Come with me` / `In the demonstration…`).
4. Asigna zona según el prefijo del id:
   - `AM` → academia
   - `MU` → música universal
   - `MA` → música argentina
   - `ML`, `MM` → música latinoamericana
   - `LL`, `L` → literatura latinoamericana
   - `A*` → academia
5. Calcula el layout legible desde `READABLE` y el punto superpuesto desde `ANCHORS`.
6. Para los textos `M*`, construye `lines[]`: `/` separa versos y `//` separa estrofas; el resto conserva sus saltos de línea reales.
7. Escribe `data/texts.js` con `window.TEXT_NETWORK`.

Para mover un texto hay que editar `READABLE` (layout legible) o `ANCHORS` (punto de la zona) y volver a ejecutar el script. Conviene revisar que el layout legible siga sin solapamientos.

## Modelo de datos

```js
window.TEXT_NETWORK = {
  design: { width: 2400, height: 1400, background: "#000000" },
  categories: {
    A: {
      fontFamily: "'Roboto Slab', Rockwell, serif",
      fontSize: 8.5,
      fontWeight: 400,
      lineHeight: 8.5,
      letterSpacing: "0em",
      color: "#efece3",
      textTransform: "none"
    }
  },
  texts: [
    {
      id: "MU1",
      category: "A",
      theme: "musica-universal",
      lyrics: true,                  // solo textos M*
      width: 400,
      z: 10,
      overlap: { x: 210, y: 974 },   // centro en espacio de diseño
      readable: { x: 230, y: 580 },
      content: "Texto completo...",
      lines: ["Línea 1", "Línea 2", "..."] // solo si lyrics
    }
  ]
}
```

Reglas:

- Las posiciones son el **centro** del bloque.
- `content` es texto plano; se escapa al renderizar.
- `lines[]` se usa únicamente en el modo letra y conserva la puntuación, las mayúsculas y las líneas vacías.
- Validar al cargar: ids únicos, categorías existentes, textos no vacíos, posiciones dentro del lienzo.

## Sistema de coordenadas y cámara

- `#stage`: ocupa `100vw × 100vh`, `overflow: hidden`, fondo negro, sin scroll.
- `#world`: tamaño `design.width × design.height`, `transform-origin: 0 0`.
- Transformación: `screen = world * zoom + offset`.
- Cámara: `{ x, y, zoom }` con valores objetivo y suavizado exponencial por frame.
- Encuadre inicial: `zoomFit = min(vw / design.width, vh / design.height) * 0.94`; centrar el lienzo.
- Zoom mínimo: `zoomFit * 0.8`. Zoom máximo: `2.4`.
- Zoom centrado en el cursor:
  1. Convertir la posición del cursor a coordenadas de mundo antes del zoom.
  2. Calcular el nuevo zoom con escala exponencial (`factor = exp(-delta * sensibilidad)`).
  3. Ajustar `offset` para que el punto de mundo bajo el cursor siga bajo el cursor.
  4. Acotar `targetX`/`targetY` a los bordes del lienzo (`camera.constrain()`), para que la página no se pueda perder fuera de pantalla.
- Unificar `deltaMode` y limitar el delta por evento para evitar saltos con trackpads.
- Pinch de trackpad: llega como `wheel` con `ctrlKey = true`; el pinch táctil con dos dedos también está implementado.
- Bloquear scroll de página con `wheel` no pasivo y `touch-action: none`.
- Paneo por cursor: cada movimiento suma `delta * panSensitivity` a la posición objetivo de la cámara. La ganancia menor a 1 evita que el texto quede pegado al puntero y permite apuntar a otro texto.
- Sin arrastre y sin teclado: el desplazamiento surge de mover el cursor y de alejar/acercar el zoom.
- Al salir de la ventana se olvida la última posición del puntero, para que reingresar no produzca un salto.

## Separación por zoom

- Progreso de zoom normalizado:
  `t = clamp((log(zoom) - log(zoomMin)) / (log(zoomMax) - log(zoomMin)), 0, 1)`
- Progreso de separación con `smoothstep(0.10, 0.45, t)`.
- Posición de cada texto por frame:
  `x = lerp(overlap.x, readable.x, s)`, ídem `y`.
- La misma `s` se aplica a todos para conservar la composición.
- No se usa física ni colisiones en tiempo real: la interpolación entre dos layouts fijos es más estable.

## Foco y legibilidad

- Se calcula la posición del cursor en coordenadas de mundo.
- Distancia al rectángulo de cada texto; se elige el más cercano dentro de `focusRadius`.
- El foco solo se activa cuando la separación es suficiente (`s ≥ focusStart`), es decir, cerca del layout legible.
- Texto activo: `z-index` alto y opacidad 1.
- Resto: opacidad atenuada (`focusOpacity`), sin `blur` para preservar rendimiento.
- Al alejar o sacar el cursor de la ventana, el foco se desvanece.
- `user-select: none` y `pointer-events: none` en los textos para que la rueda y el cursor sigan funcionando.

## Modo letra (textos M*)

Se activa al enfocar un texto con `lyrics: true`.

- La letra entra recién cuando el foco se mantiene **0.18 s** (`lyricsSettle`), para que el paneo con el cursor no haga parpadear el modo letra.
- Ventana de lectura de **13.8em** con máscara de degradado de 12 % a 88 %.
- Se ven 3 líneas antes y 3 después de la activa.
- Línea activa: **1.4×** el tamaño base y **negrita 700**, conservando puntuación, mayúsculas y saltos de línea originales.
- Líneas inactivas: opacidad **0.3**.
- Las líneas del texto se envuelven si son largas; las líneas vacías se conservan y separan estrofas.
- Avance automático cada **1 s**, con transición de desplazamiento y fundido de ~250 ms.
- El recorrido es continuo: después de la última línea vuelve a la primera.
- El índice de cada texto se conserva entre entradas y salidas de foco.
- Al salir del foco, el texto vuelve a su estado normal (contenido completo, sin ventana de letra).
- El zoom sigue funcionando mientras hay foco.

## Configuración

```js
window.NETWORK_CONFIG = {
  fitPadding: 0.94,          // margen del encuadre inicial
  minZoomFactor: 0.8,        // zoom mínimo relativo al encuadre
  maxZoom: 2.4,              // zoom máximo absoluto
  wheelSensitivity: 0.0016,
  pinchSensitivity: 0.0025,
  smoothing: 0.16,           // suavizado de cámara por frame
  panSensitivity: 0.5,       // cuánto acompaña la imagen al cursor (0–1)
  separationStart: 0.1,      // inicio de la separación
  separationEnd: 0.45,       // fin de la separación
  focusRadius: 170,          // radio de foco en px de pantalla
  focusOpacity: 0.22,        // opacidad del resto al enfocar
  focusStart: 0.85,          // separación mínima para enfocar
  lyricsInterval: 1,         // segundos por línea
  lyricsSettle: 0.18,        // espera antes de entrar en modo letra
  lyricsInactiveOpacity: 0.3,
  lyricsActiveScale: 1.4
};
```

Panel de desarrollo:

- Oculto por defecto, sin texto visible para el usuario final.
- Se abre con `?debug=1` o la tecla `D`.
- Permite ajustar zoom máximo, sensibilidad de rueda, paneo con cursor, rango de separación, radio y opacidad de foco, y suavizado.
- Incluye un botón para volver a la vista general.

## Criterios de aceptación

- Se ve la red completa al abrir, con textos superpuestos y sin UI.
- La rueda y el pinch hacen zoom hacia el cursor; no hay scroll de página.
- Mover el cursor desplaza la imagen en la misma dirección, sin clic.
- El paneo no mueve la imagen cuando el puntero está sobre el panel de desarrollo.
- La cámara no se puede perder fuera del lienzo.
- Al acercarse, los textos se separan de forma continua hasta el layout legible.
- Cada texto puede leerse completo, incluidos los más largos.
- El texto más cercano al cursor se destaca y el resto se atenúa sin desaparecer.
- Los textos M* muestran el modo letra al enfocarse y avanzan solos cada segundo.
- No hay saltos, recortes ni superposiciones residuales en el estado legible.
- Se publica como sitio estático y funciona con un link.

## Riesgos y puntos abiertos

- **Paneo vs. foco:** como la imagen acompaña al cursor, mover el mouse también desplaza la página. Con `panSensitivity: 0.5` todavía se puede apuntar a otro texto; si se sube hacia 1, el texto queda pegado al puntero y cuesta cambiar de foco.
- **Densidad de la página:** la vista inicial ahora encuadra el conjunto de textos (no el lienzo) y las zonas están compactadas. El centro sigue vacío porque así es la composición de `orden.png`; se puede seguir ajustando `ANCHORS`.
- **Textos largos:** si un texto crece en el Excel, hay que revisar que su altura siga entrando en la columna asignada y que no solape a los vecinos.
- **Modo letra en textos muy largos:** el avance es continuo y vuelve al inicio; si se prefiere que se detenga en la última línea, es un cambio de una línea en `advanceLyric`.
- **Pinch en distintos navegadores:** validar el caso `wheel + ctrlKey` y el comportamiento en Safari.
- **Tablet:** queda como soporte secundario; el pinch táctil está implementado pero falta probarlo en dispositivo real.
- **Publicación:** aún no desplegado.
