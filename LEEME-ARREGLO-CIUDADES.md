# Arreglo urgente: el catálogo de ciudades

Paquete del 14 de septiembre de 2026. Reemplaza los archivos y sube desde GitHub Desktop.

## Qué estaba roto

En la v6 el catálogo de ciudades se sacó de `app/efemerides.js` a un archivo propio,
`app/ciudades.js`, con 2 921 ciudades en vez de la lista corta anterior. Buen cambio.

El problema: dentro de `efemerides.js` quedó

    const CIUDADES = window.Ciudades?.lista || [];

y `ciudades.js` solo se cargaba en `astroplanetario.html`. En todas las demás páginas
`window.Ciudades` no existía, así que `Efem.CIUDADES` quedaba en **cero ciudades**.

Consecuencia en el sitio en vivo: en estas páginas la pestaña «Datos nuevos» no
funcionaba. El desplegable salía vacío y al calcular siempre respondía
*«Elige una ciudad completa de la lista»*, sin manera de salir de ahí.

    astrocarto.html                       ← también la búsqueda de líneas por ciudad
    profecciones-calculadora.html
    dignidades-calculadora.html
    liberacion-zodiacal-calculadora.html
    lotes-arabigos-calculadora.html
    luna.html                             ← tenía lista de respaldo, degradaba sin avisar

Las cartas ya guardadas seguían abriendo bien, porque guardan sus propias coordenadas.
Por eso el fallo era fácil de no ver.

## El arreglo

Una línea por página: `ciudades.js` **antes** de `efemerides.js`. El orden importa,
porque `CIUDADES` se captura como constante en el momento de cargar el motor.

    <script src="/app/ciudades.js"></script>
    <script src="/app/efemerides.js"></script>

## También corregido

- `tests/astrocartografia-ui.test.cjs` no cargaba el catálogo y por eso fallaban
  4 de sus pruebas. Ahora lo carga.
- En esa misma prueba, `'Madrid'` pasó a ser ambiguo con el catálogo nuevo
  (España y Colombia), así que se cambió por `'Madrid, España'`.
- `vercel.json`: cabecera de caché para `app/ciudades.js`. Son 223 KB que el
  navegador debe guardar, no volver a bajar en cada visita.

El suite pasa de 110/114 a **114/114**. Las 17 páginas cargan sin errores.

## Nota sobre el catálogo nuevo

71 de los 2 843 nombres distintos son ambiguos: Córdoba (3), León (3), Mérida (3),
Toledo (3), Madrid (2), Santiago (2), Guadalajara (2), Valencia (2)… La aplicación
lo resuelve pidiendo la etiqueta completa, que es lo que entrega el desplegable.
Conviene tenerlo presente si alguien escribe el nombre a mano.
