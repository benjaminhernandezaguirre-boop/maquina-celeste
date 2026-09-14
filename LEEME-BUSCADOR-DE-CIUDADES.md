# Buscador de ciudades y carga diferida

Paquete del 14 de septiembre de 2026. Incluye el arreglo de la regresión del
catálogo y prepara el terreno para un catálogo mucho más grande.

## Qué cambia

**1. El desplegable ya no se llena entero.** Antes cada calculadora metía las
2 921 ciudades en el `<datalist>` al abrir la página. Ahora se pintan como mucho
**40 coincidencias**, y solo cuando escribes. ChatGPT ya lo había hecho así en
`astroplanetario.html`; esto lo extiende a las otras seis páginas y le pone tope
también allí, porque sin tope una sola letra puede meter miles de opciones.

**2. El catálogo se descarga solo cuando hace falta.** `app/ciudades.js` ya no se
carga al abrir. Llega la primera vez que alguien toca un campo de ciudad. Quien
entra a leer una guía, o abre una carta guardada, no baja ni un byte de ciudades.

**3. El motor lee el catálogo en vivo.** `Efem.CIUDADES` era una copia tomada al
cargar, y por eso bastaba con que `ciudades.js` llegara tarde para que quedara
vacía — que es exactamente lo que rompió cuatro calculadoras. Ahora es un getter:
refleja el catálogo esté donde esté y llegue cuando llegue. **Ese fallo no puede
volver a ocurrir.**

## Archivos

    app/ciudades-buscador.js   NUEVO · filtrado, tope y carga diferida
    app/efemerides.js          CIUDADES pasa a getter vivo
    app/profecciones-ui.js     usa el buscador
    app/dignidades-ui.js       usa el buscador
    app/liberacion-zodiacal-ui.js  usa el buscador
    astrocarto.html            usa el buscador; las «ciudades cercanas» esperan al catálogo
    astroplanetario.html       tope de 40 opciones en su buscador
    luna.html, lotes-arabigos-calculadora.html, *-calculadora.html  carga diferida
    tests/astrocartografia-ui.test.cjs  carga el catálogo; 'Madrid' → 'Madrid, España'
    vercel.json                cabeceras de caché

114 de 114 pruebas pasan. Las 17 páginas cargan sin errores.

## Probado con un catálogo de 55 000 ciudades

Se generó un catálogo sintético de 55 000 ciudades (8.1 MB en crudo, 1.6 MB
comprimido) y se midió la calculadora de profecciones con él:

    abrir la página          919 ms   (0 opciones, catálogo aún sin bajar)
    cargar el catálogo       746 ms   desde la primera letra escrita
    opciones pintadas         40      de 55 000
    escribir letra a letra   3–25 ms
    calcular                 correcto

Con el desplegable antiguo, 55 000 ciudades habrían tardado ~690 ms en construirse
en escritorio y cerca de tres segundos en un celular, cada vez que se abre la página.

## Para meter el catálogo grande

Ya no hace falta tocar código. Basta reemplazar `app/ciudades.js` conservando su
forma:

    root.Ciudades = { lista, normaliza, resolver, version, fuente }

donde cada ciudad es `{n, r, lat, lon, tz, etiqueta}`.

Recomendación para tus alumnos: en vez de volcar el mundo entero, baja el umbral
de población de México y Latinoamérica (de 15 000 a 1 000 habitantes) y deja el
resto del mundo como está. La gente nace en pueblos chicos, y tus alumnos nacen en
pueblos chicos mexicanos. Eso da mucha más cobertura útil por kilobyte.

GeoNames no es alcanzable desde mi entorno, así que la descarga del catálogo
(`cities5000.zip` o `cities1000.zip` de download.geonames.org) tendrás que hacerla
tú o pedírsela a ChatGPT.

## Nota

71 de los 2 843 nombres del catálogo actual son ambiguos: Córdoba, León, Mérida y
Toledo aparecen tres veces; Madrid, Santiago, Guadalajara y Valencia, dos. Con un
catálogo mayor serán muchos más. El buscador lo resuelve mostrando siempre la
etiqueta completa —«Mérida, Yucatán, MX»—, que es lo que hay que elegir.
