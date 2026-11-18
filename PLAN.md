# Plan de implementación — Red de textos navegable por zoom

## Objetivo

Aplicación web para computadora (tablet como secundario) que muestra una red de textos superpuestos. El usuario navega con el zoom (rueda del mouse o pinch de trackpad), centrado en el cursor, y con arrastre para desplazarse. Al acercarse, los textos se separan hasta quedar legibles y el texto más cercano al cursor toma foco mientras el resto se atenúa.

Los textos de música (`MU*`, `MA*`, `ML*`, `MM*`) tienen además un **modo letra** tipo Spotify que se activa al enfocarlos.

**Estado: implementado con el dataset de 22 textos (15 originales + 7 académicos nuevos).**

## Estado actual del prototipo

- Archivos: `index.html`, `styles.css`, `config.js`, `data/texts.js`, `js/app.js`, `tools/build-data.py`.
- Carga los 22 textos del Excel `dataset.xlsx` (fuera del proyecto) distribuyendo cada uno en la zona temática de `orden.png`.
- Las posiciones legibles se organizan alrededor de un **centro vacío** (`x` 900–1500, `y` 1050–1450): dentro de cada zona, el texto con número más bajo queda más cerca del centro. Los bloques se separan con **80–100 px de aire** y se verificó **0 solapamientos** en el layout legible.
- Los textos `AU4`–`AU10` llegan como categoría B pero son largos: usan la variante **B-long** (Anton 12 px, mayúsculas) para poder leerse dentro del mapa sin agrandar el lienzo en exceso.
- En el layout superpuesto, los textos de una misma zona se agrupan alrededor de su punto con **desplazamientos propios**: se ven como láminas que se pisan y no como un bloque macizo. La vista inicial abre encuadrando todo el conjunto (zoom ≈ 0.64 en 1440×900).
- Dos layouts por texto (`overlap` y `readable`) interpolados por zoom.
- Zoom con rueda y pinch de trackpad centrado en el cursor.
- **Paneo con clic y arrastre** (1:1): mantenés el botón y la imagen sigue al cursor; al soltar, el cursor vuelve a enfocar textos.
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
- `?zoom=1.45&x=480&y=1900&focus=MA5`: abre enfocando un texto concreto.

## Decisiones ya tomadas

| Tema | Decisión |
|---|---|
| Cantidad de textos | 22 (15 originales + 7 académicos AU) |
| Contenido | Excel `C:\Users\zucch\OneDrive\Documentos\Hipermediales\dataset.xlsx` |
| Posiciones | Fijas, derivadas de las zonas de `orden.png` |
| Zonas | academia (con banda AU), música universal, música argentina, música latinoamericana, literatura latinoamericana |
| Textos de una misma zona | Se agrupan alrededor de su zona con desplazamientos propios y siguen pisándose al alejar |
| Separación | Cada texto tiene posición “superpuesta” y “legible”; el zoom interpola entre ambas |
| Zoom | Escala limitada + separación + atenuación del resto |
| Navegación | Paneo con clic y arrastre + rueda/pinch para zoom; sin teclado ni doble clic |
| Trackpad | Solo pinch hace zoom; dos dedos sin pinch no desplazan |
| Foco | Por proximidad al cursor |
| Vista inicial | Red completa, textos superpuestos |
| Adaptación | Lienzo fijo 2400×2300 escalado a la ventana |
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

### Cache y versionado

`index.html` referencia los assets con `?v=N` (`styles.css?v=8`, `config.js?v=8`, etc.). Al modificar CSS o JS hay que subir ese número para que los navegadores no mezclen versiones viejas y nuevas. Mezclar un `app.js` nuevo con un `config.js` viejo puede producir valores `NaN` y congelar la vista; por eso además `app.js` define defaults para los parámetros nuevos y la cámara se autorresetea si detecta una transformación inválida.

## Categorías tipográficas

| Categoría | Fuente | Tamaño / interlineado | Color | Otros |
|---|---|---|---|---|
| A | Roboto Slab 400 | 8.5 / 8.5 px | `#efece3` | — |
| B | Anton 400 | 52 / 51 px | `#f4f2ea` | mayúsculas, tracking −0.01em |
| B-long | Anton 400 | 12 / 13 px | `#f4f2ea` | mayúsculas, tracking −0.01em |
| C | Roboto Slab 300 | 8 / 9.5 px | `#783030` | — |

La categoría B de 52 px queda reservada para titulares breves. Los textos B de más de 400 caracteres se generan como **B-long**: conservan Anton, mayúsculas y color, pero con un cuerpo legible dentro del mapa.

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
2. Normaliza los saltos de línea `_x000B_` a `\n`, las tabulaciones de los textos copiados de PDF a espacios y los espacios finales de cada línea.
3. Aplica correcciones puntuales de saltos perdidos (`You want it darker` / `Hineni, hineni` y `Come with me` / `In the demonstration…`).
4. Convierte los textos `B` de más de 400 caracteres a la categoría `B-long`.
5. Asigna zona según el prefijo del id:
   - `AM` → academia
   - `MU` → música universal
   - `MA` → música argentina
   - `ML`, `MM` → música latinoamericana
   - `LL`, `L` → literatura latinoamericana
   - `A*` → academia
6. Calcula el layout legible desde `READABLE` y el punto de la vista inicial desde `OVERLAP` (con `ANCHORS` como respaldo por zona).
7. Para los textos `M*`, construye `lines[]`: `/` separa versos y `//` separa estrofas; el resto conserva sus saltos de línea reales.
8. Escribe `data/texts.js` con `window.TEXT_NETWORK`.

Para mover un texto hay que editar `READABLE` (layout legible), `OVERLAP` (punto en la vista inicial) o `ANCHORS` (respaldo de zona) y volver a ejecutar el script. Conviene revisar que el layout legible siga sin solapamientos.

### Layout con los textos académicos nuevos

- `AU4`–`AU10` comparten la zona **academia**; en la vista inicial se reparten en filas desplazadas (`OVERLAP`) para que se lean como láminas superpuestas y no como un bloque macizo.
- El layout legible deja un **centro vacío** (`x` 900–1500, `y` 1050–1450) y ordena cada zona en espiral: el número más bajo queda más cerca de ese centro.
- La banda académica ocupa la franja superior en **3 filas**: `AM1`–`AM3` en la fila interior, `AU4`–`AU7` en la del medio y `AU8`–`AU10` al fondo. En la vista inicial se muestran como filas desplazadas que se superponen parcialmente.
- Los bloques mantienen **80–100 px** de separación mínima entre sí.
- Lienzo final: **2400×2300**. El contenido ocupa `x` 40–2360 e `y` 75–2193.
- Verificado con **0 solapamientos** en `?layout=read`, centro vacío y sin errores en consola.

## Modelo de datos

```js
window.TEXT_NETWORK = {
  design: { width: 2400, height: 2300, background: "#000000" },
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
      overlap: { x: 500, y: 1480 },  // centro en espacio de diseño
      readable: { x: 230, y: 1180 },
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
- Encuadre inicial: se calcula el bounding box del layout superpuesto y se ajusta con `computeHome`, para que la red ocupe el cuadro sin depender del espacio vacío del lienzo.
- Zoom mínimo: `zoomFit * 0.8`. Zoom máximo: `2.4`.
- Zoom centrado en el cursor:
  1. Convertir la posición del cursor a coordenadas de mundo antes del zoom.
  2. Calcular el nuevo zoom con escala exponencial (`factor = exp(-delta * sensibilidad)`).
  3. Ajustar `offset` para que el punto de mundo bajo el cursor siga bajo el cursor.
  4. Acotar `targetX`/`targetY` a los bordes del lienzo (`camera.constrain()`), para que la página no se pueda perder fuera de pantalla.
- Unificar `deltaMode` y limitar el delta por evento para evitar saltos con trackpads.
- Pinch de trackpad: llega como `wheel` con `ctrlKey = true`; el pinch táctil con dos dedos también está implementado.
- Bloquear scroll de página con `wheel` no pasivo y `touch-action: none`.
- Paneo con arrastre 1:1: `pointerdown` inicia el arrastre, cada `pointermove` suma el delta a la posición objetivo de la cámara y `pointerup` lo termina. El cursor pasa de `grab` a `grabbing`.
- Mientras se arrastra, el foco se suspende para que el modo letra no parpadee; al soltar, vuelve a evaluarse bajo el cursor.
- Un clic sin movimiento no inicia el paneo (hay un umbral de 3 px) y no altera el foco.
- Sin teclado: el desplazamiento surge del arrastre y de alejar/acercar el zoom.
- Al salir de la ventana se termina el arrastre en curso.

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

- La letra entra recién cuando el foco se mantiene **0.18 s** (`lyricsSettle`), para que el arrastre no haga parpadear el modo letra.
- Al enfocar, el texto se convierte en una **ventana de lectura centrada en la línea activa**, con **3 líneas antes y 3 después** visibles. La ventana ocupa el lugar del texto, es decir, el centro de zoom del usuario.
- La ventana mide **13.8em** de alto, recorta el resto (`overflow: hidden`) y se desvanece arriba y abajo con una máscara de degradado de 12 % a 88 %.
- El bloque interno se desplaza con una transición de ~250 ms para mantener la línea activa en el centro de la ventana.
- Línea activa: **1.4×** el tamaño base y **negrita 700**, conservando puntuación, mayúsculas y saltos de línea originales.
- Líneas inactivas: opacidad **0.3**.
- Las líneas del texto se envuelven si son largas; las líneas vacías se conservan y separan estrofas.
- Avance automático cada **1 s**, desplazando la ventana y fundiendo el resaltado.
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
- Permite ajustar zoom máximo, sensibilidad de rueda, rango de separación, radio y opacidad de foco, y suavizado.
- Incluye un botón para volver a la vista general.

## Criterios de aceptación

- Se ve la red completa al abrir, con textos superpuestos y sin UI.
- La rueda y el pinch hacen zoom hacia el cursor; no hay scroll de página.
- Con clic y arrastre la imagen sigue al cursor 1:1, sin seleccionar texto.
- El arrastre no se inicia cuando el puntero está sobre el panel de desarrollo.
- La cámara no se puede perder fuera del lienzo.
- Al acercarse, los textos se separan de forma continua hasta el layout legible.
- Cada texto puede leerse completo, incluidos los más largos.
- El texto más cercano al cursor se destaca y el resto se atenúa sin desaparecer.
- Los textos M* muestran el modo letra al enfocarse y avanzan solos cada segundo.
- No hay saltos, recortes ni superposiciones residuales en el estado legible.
- Se publica como sitio estático y funciona con un link.

## Riesgos y puntos abiertos

- **Ventana de letra y foco:** la ventana de 7 líneas cambia la altura visual del texto pero el foco usa la altura cacheada antes del modo letra; si se ajusta el tamaño de la ventana, revisar que el radio de foco siga seleccionando el texto correcto.
- **Densidad de la página:** la vista inicial encuadra el conjunto de textos (no el lienzo) y las zonas están compactadas. El layout legible deja un centro vacío fijo (`x` 900–1500, `y` 1050–1450) y ordena los textos por número alrededor de él; se puede seguir ajustando `READABLE` y `ANCHORS`.
- **Banda académica:** los 7 textos AU están pensados para la variante B-long de 12 px. Si se quiere el efecto monumental de B (52 px), el lienzo y el layout tienen que crecer mucho y la vista inicial se aleja; es una decisión de diseño pendiente de validar.
- **Textos largos:** si un texto crece en el Excel, hay que revisar que su altura siga entrando en la columna asignada y que no solape a los vecinos.
- **Modo letra en textos muy largos:** el avance es continuo y vuelve al inicio; si se prefiere que se detenga en la última línea, es un cambio de una línea en `advanceLyric`.
- **Pinch en distintos navegadores:** validar el caso `wheel + ctrlKey` y el comportamiento en Safari.
- **Tablet:** queda como soporte secundario; el pinch táctil está implementado pero falta probarlo en dispositivo real.
- **Publicación:** aún no desplegado.
