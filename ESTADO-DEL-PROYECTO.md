# Astroplanetario · paquete completo

Todo lo que hemos hecho, en un solo lugar. **Descomprime encima del repo, respetando las carpetas**,
y haz commit. No borra nada tuyo: solo reemplaza los archivos de esta lista.

## Cómo aplicarlo con GitHub Desktop

1. Abre la carpeta del repositorio clonado (en GitHub Desktop: **Repository → Show in Explorer/Finder**).
2. Descomprime este zip **dentro de esa carpeta**, aceptando reemplazar. La estructura ya coincide:
   los archivos sueltos van a la raíz y los de `app/` y `scripts/` a sus carpetas.
3. Vuelve a GitHub Desktop: en la pestaña **Changes** verás la lista de archivos modificados.
4. Escribe un mensaje abajo a la izquierda, **Commit to main**, y luego **Push origin**.
5. Vercel se entera solo y vuelve a desplegar en un minuto.

Si algún archivo no aparece como cambiado, es que ya lo tenías igual: no pasa nada.

## Los archivos

| Archivo | Estado |
|---|---|
| `astroplanetario.html` | La app completa en un solo archivo, en la raíz. Reemplaza el sistema de ocho `part-XX.txt`. |
| `index.html` | La portada. Navega a cada módulo con enlaces reales. |
| `mercurio.html` | Retrogradaciones, sombras y calendario. |
| `venus.html` | Ciclo de ocho años, rosa, pentagrama, luceros y entrada a sinastría. |
| `saturno.html` | Línea de vida: retornos y ciclos de los planetas lentos. |
| `astrocarto.html` | **Nuevo.** Astrocartografía: el mapa del mundo con las líneas de ángulo. Lleva el contorno del mundo incrustado, así que no pide nada por la red. |
| `luna.html` | El tuyo, ya sin astronomía propia: la pide toda al motor compartido. |
| `app/efemerides.js` | El motor de cálculo compartido (`window.Efem`), las 195 ciudades y las correcciones de marco y tiempo. |
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
7. **Faltaba la precesión de los equinoccios.** Éste era el gordo. Los elementos orbitales están
   referidos al equinoccio de J2000, pero el zodiaco tropical se mide desde el punto vernal del día que
   se calcula. Sin esa corrección todos los planetas salían unos 22′ atrasados, y como el Ascendente sí
   estaba bien, planetas y ángulos no estaban en el mismo sistema. Medido contra las entradas de signo
   publicadas: Plutón en Acuario salía con 17 días de retraso, Neptuno en Aries con 10, Urano en
   Géminis con 8. Ahora los cuatro caen dentro del día.
8. **Faltaba ΔT.** Los astros se calculan en tiempo terrestre y la hora sidérea —y con ella el
   Ascendente— en tiempo universal. Iba todo en universal: hoy son 69 segundos, que en la Luna son 40″.
9. **El Sol tenía medio grado de holgura.** Se cambió por una serie periódica (VSOP87, sólo la longitud
   de la Tierra) más nutación y aberración. Contra doce equinoccios y solsticios publicados entre 1990 y
   2026, el peor desvío queda en medio minuto de tiempo. Sin esto la revolución solar no valía: diez
   minutos de error en el retorno mueven el Ascendente dos grados y medio.
10. **La rueda recalculaba la capa exterior sesenta veces por segundo.** Cada fotograma repetía las
   bisecciones de los tránsitos. Ahora la capa se guarda y sólo se rehace cuando cambia algo de lo que
   depende.

## Lo que se añadió

- **Guardar varias cartas**, con lista, borrado y exportar/importar en `.json`.
- **Tránsitos** en rueda doble, con activos, fechas exactas y calendario de doce meses.
- **Sinastría y carta compuesta**, con los dos métodos de casas compuestas a elegir.
- **Mercurio, Venus y Saturno** con página propia.
- **Revolución solar**: pestaña propia. Calcula el minuto exacto del retorno del Sol, permite levantarla
  en el lugar de nacimiento o en cualquier otra ciudad —las dos escuelas—, y da los ejes del año
  (Ascendente de la revolución y la casa natal donde cae, tu Ascendente natal en las casas de la
  revolución, la casa solar del año, el regente del Ascendente en las dos regencias), los planetas
  pegados a los ángulos, la tabla de posiciones con doble casa, los aspectos internos, los contactos
  con la natal y las seis revoluciones siguientes.
- **Astrocartografía** (`astrocarto.html`): las cuatro líneas de cada planeta —AC, MC, DC, IC— sobre el
  mapa del mundo, con los continentes dibujados. Se enciende y se apaga cada astro y cada tipo de línea;
  se elige entre cálculo *en mundo* (con la latitud real del astro) y *zodiacal* (proyectado sobre la
  eclíptica), que para Plutón cambia el trazo miles de kilómetros y da para una clase entera. Tocando el
  mapa dice qué líneas pasan por ahí, hay una tabla de qué cruza una ciudad y otra de por dónde pasa una
  línea concreta, sobre las 195 ciudades del motor. Se entra desde la portada y desde la pestaña Casas.
- **Zodiaco sideral y dracónico**: un selector encima de las posiciones cambia el zodiaco de toda la carta
  —tropical, sideral con cuatro ayanamsas (Lahiri, Fagan-Bradley, Krishnamurti y Raman) o dracónica, que gira
  la carta hasta poner el Nodo Norte en 0° de Aries—. Como se resta lo mismo a planetas, ángulos y cúspides,
  los aspectos y las casas no cambian: sólo el signo de cada astro. Mientras no sea tropical, la barra de
  arriba lleva una marca para que nadie lea una carta sideral creyendo que es tropical.
- **Progresiones**: pestaña propia con dos modos. *Secundarias* (un día por un año) con la Luna y el Sol
  progresados y sus próximos cambios de signo, la tabla de posiciones con cuánto avanzó cada astro, y los
  contactos con la natal. *Arco solar*, con el arco recorrido, los contactos activos, el calendario de los
  próximos diez grados y la tabla de posiciones dirigidas. Los ángulos progresados van por arco solar, que es
  la convención corriente; el método queda escrito en pantalla porque hay escuelas que usan otro.
- **Enlaces directos a pestaña**: `astroplanetario.html?view=natal&tab=sinastria`
  (sirven `posiciones`, `aspectos`, `casas`, `significados`, `atacir`, `transitos`, `revolucion`, `progresiones`, `sinastria`).

## Lo que sigue pendiente

Está en `PENDIENTES.md`, que ahora viene dentro del repo y está al día.

De la astrocartografía quedan los paranes, las líneas de espacio local, reubicar la carta entera para
otra ciudad y el zoom por continente. De lo pequeño queda: el sprite del zodiaco no es una imagen válida y el título de Luna se encima con
la tarjeta del signo. `luna.html` y `astroplanetario.html` utilizan ahora el mismo motor `app/efemerides.js`.
Se puede seguir abriendo el sitio localmente conservando la carpeta `app`.

### Precisión y correcciones de Astrocartografía

Las garantías de precisión anteriores quedan sustituidas por las mediciones y
limitaciones de [ASTROCARTOGRAFIA-VALIDACION.md](ASTROCARTOGRAFIA-VALIDACION.md).
El motor sigue siendo aproximado: la muestra contra JPL Horizons incluye errores
de hasta 10,30 minutos de arco para Saturno. No se garantiza precisión de segundos
de arco para todos los astros ni todas las fechas.

Se corrigieron ΔT histórico, horas inexistentes/repetidas, vector Tierra–Luna,
precesión tridimensional, distancias esféricas, continuidad de curvas y selección
de datos. Los resultados antiguos deben recalcularse con la versión corregida.

Quirón sigue fuera del modelo.
