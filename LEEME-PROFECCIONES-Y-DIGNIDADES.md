# Profecciones anuales y dignidades esenciales

Paquete del 13 de septiembre de 2026. Se aplica igual que siempre: descomprime,
copia todo dentro de tu carpeta de `maquina-celeste` reemplazando lo que pregunte,
y sube desde GitHub Desktop.

## Archivos nuevos (12)

    profecciones.html                  guía · ruta /profecciones
    profecciones-calculadora.html      calculadora · ruta /calculadora-profecciones
    dignidades.html                    guía · ruta /dignidades
    dignidades-calculadora.html        calculadora · ruta /calculadora-dignidades
    app/profecciones.js                el cálculo
    app/profecciones-ui.js             la pantalla
    app/dignidades.js                  las tablas y la puntuación
    app/dignidades-ui.js               la pantalla
    app/tecnica-theme.css              estilos compartidos por las cuatro páginas
    app/tema.js                        interruptor claro/oscuro compartido
    tests/profecciones.test.cjs        14 pruebas
    tests/dignidades.test.cjs          31 pruebas

## Archivos modificados (9)

    astroplanetario.html   columna «Dignidad» en Posiciones + bloque de profección en Revolución
    index.html             Marte deja de decir «Próximamente» y lleva a /profecciones
    carta-natal.html       enlaces a dignidades y profecciones en el menú
    lotes-arabigos.html    lo mismo
    liberacion-zodiacal.html            lo mismo + se documenta el año de 360 días
    liberacion-zodiacal-calculadora.html  enlace a profecciones
    vercel.json            4 rutas limpias nuevas (8 entradas con y sin barra final)
    sitemap.xml            13 → 17 URLs
    PENDIENTES.md          sección 4 ter con todo lo hecho y lo que queda

No se borró nada.

## Criterios que se tomaron

Todos se ven en pantalla y se pueden cambiar desde la propia página:

- **Términos egipcios** por omisión (Valente, Firmico), con los ptolemaicos en el selector.
- **Triplicidades de Dorotheo** con regente diurno, nocturno y participante, con las de
  Ptolomeo en el selector. Solo puntúa el regente que corresponde a la secta.
- **Regencias tradicionales.** Los planetas modernos aparecen como información pero no
  reciben dignidad esencial.
- Las profecciones cortan en el **cumpleaños**, con casilla para alinear al momento exacto
  de la revolución solar.

## Cómo correr las pruebas

    node --test tests/*.test.cjs

Son 94 en total: las 49 que ya había más las 45 nuevas. Ojo: con `node --test tests/`
a secas no funciona en esta versión de Node, y eso ya venía de antes.

## Lo que queda suelto

- Las dignidades no tienen lugar propio en el carrusel de la portada: se llega desde el menú
  de las páginas de técnica y desde la tabla de posiciones. Cuando liberes un planeta, ahí va.
- El señor del año todavía no está enlazado con la pestaña de Tránsitos. Esa unión es la que
  permitiría fechar los acontecimientos dentro del año.
