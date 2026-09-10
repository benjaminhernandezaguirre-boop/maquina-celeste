# Astroplanetario · paquete completo

Todo lo que hemos hecho, en un solo lugar. **Descomprime encima del repo, respetando las carpetas**,
y haz commit. No borra nada tuyo: solo reemplaza los archivos de esta lista.

## Los archivos

| Archivo | Estado |
|---|---|
| `astroplanetario.html` | La app completa en un solo archivo, en la raíz. Reemplaza el sistema de ocho `part-XX.txt`. |
| `index.html` | La portada. Navega a cada módulo con enlaces reales. |
| `mercurio.html` | Retrogradaciones, sombras y calendario. |
| `venus.html` | Ciclo de ocho años, rosa, pentagrama, luceros y entrada a sinastría. |
| `saturno.html` | Línea de vida: retornos y ciclos de los planetas lentos. |
| `luna.html` | El tuyo, con un cambio: las ciudades salen del motor compartido. |
| `app/efemerides.js` | El motor de cálculo compartido (`window.Efem`) y las 195 ciudades. |
| `app/natal-theme.js`, `app/orbit-theme.js`, `app/zodiac-theme.js` | Los tuyos, con el botón «← Planetario» arreglado. |
| `vercel.json` | Cabeceras `no-cache` para las páginas nuevas. |
| `scripts/partir.py` | Opcional: vuelve a partir la app en ocho trozos si alguna herramienta te los pide. |

## Lo que se arregló por el camino

1. **La carta natal no se abría desde el planetario.** El arranque llamaba a `cambiaVista()`, que no
   es global. Todo entraba en Órbitas y la carta se calculaba sin mostrarse.
2. **El botón «← Planetario»** hacía `location.reload()`, que dejó de servir al pasar a páginas reales.
3. **`luna.html` sacaba las ciudades de los `part-XX.txt`.** Era lo último que dependía de los trozos.
4. **La barra de datos de la carta se salía de la pantalla en teléfono** sin poder alcanzarla. Ahora se desliza.
5. **Las siete pestañas no cabían** y «Sinastría» quedaba escondida. Ahora van en dos filas.
6. **El cálculo de tránsitos tardaba 2,7 segundos.** La posición de la Tierra se recalculaba una vez por
   planeta en cada instante. Memorizada: 30 milisegundos. Aceleró toda la página, no solo los tránsitos.

## Lo que se añadió

- **Guardar varias cartas**, con lista, borrado y exportar/importar en `.json`.
- **Tránsitos** en rueda doble, con activos, fechas exactas y calendario de doce meses.
- **Sinastría y carta compuesta**, con los dos métodos de casas compuestas a elegir.
- **Mercurio, Venus y Saturno** con página propia.
- **Enlaces directos a pestaña**: `astroplanetario.html?view=natal&tab=sinastria`
  (sirven `posiciones`, `aspectos`, `casas`, `significados`, `atacir`, `transitos`, `sinastria`).

## Lo que sigue pendiente

Está en `PENDIENTES.md`. De lo más cercano: el sprite del zodiaco no es una imagen válida,
el título de Luna se encima con la tarjeta del signo, y `astroplanetario.html` y `luna.html`
todavía llevan su propia copia de la astronomía en vez de usar `app/efemerides.js`.
