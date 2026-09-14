# Astrocartografía: correcciones y validación

Revisión del 10 de septiembre de 2026, sobre `23f9a61746a02391a9975d9b13b7b6f3864a93bb`.

## Correcciones

- ΔT: intervalo 1800–1860 y ramas posteriores a 2050; margen anterior a 1800 para conversiones UTC en el borde del formulario.
- Conversión civil: comprueba fecha y hora por retorno a la zona, rechaza huecos horarios y permite elegir primera/segunda ocurrencia. Incluye cambios de media hora y desfases históricos con segundos.
- Hora natal obligatoria en Astrocartografía; Astroplanetario conserva su modo explícito de hora desconocida.
- Vector geocéntrico terrestre: resta el vector Tierra–Luna al baricentro, incluida Z y transformado al marco J2000.
- Precesión tridimensional eclíptica J2000 → ecuatorial J2000 → ecuatorial de fecha → eclíptica de fecha. Ángulos IAU 1976 de Lieske; no es una implementación de toda la biblioteca SOFA.
- Aberración planetaria del observador a primer orden v/c, además del tiempo-luz. No se añade de nuevo al Sol.
- Sol: longitud VSOP87D abreviada y latitud eclíptica explícitamente aproximada a cero, evitando mezclarla con beta J2000.
- Distancia mínima esférica exacta a la semicircunferencia AC/DC/MC/IC, incluida su frontera. El filtro usa kilómetros; la columna angular es distancia central sobre la esfera.
- Curvas parametrizadas en tres dimensiones, extremos incluidos y cortes del antimeridiano interpolados. Paso de 0,25° sobre el círculo máximo. Sin cortes artificiales en ±85°/88°.
- Una selección activa alimenta marcador y tabla al cambiar el modo y el radio de consulta. Los filtros de astro/eje se aplican también a las tablas.
- Cartas guardadas rellenan el formulario; editar sus datos sí modifica el mapa. Se conservan coordenadas y zona personalizadas al editar la hora.
- Desambiguación de ciudades homónimas; coordenadas manuales disponibles.
- Validación de estructura de cartas importadas/guardadas y escape HTML en los resúmenes. La identidad de una carta incluye zona y ocurrencia horaria.
- Astroplanetario utiliza el mismo `app/efemerides.js`; no conserva una segunda copia del motor ni de la conversión UTC.

## Pruebas reproducibles

Con Node.js, desde la raíz del repositorio, sin instalar paquetes ni acceder a la red:

```text
node --test tests/astrocartografia.test.cjs tests/astrocartografia-ui.test.cjs
```

Las pruebas cubren ΔT, UTC/local, precesión contra una matriz publicada de ERFA,
signo del vector lunar, ecuaciones de horizonte y ramas AC/DC, distancia esférica,
extremos polares, antimeridiano, fechas admitidas, esquema de importación,
HTML escapado, filtros, selección de puntos y edición de cartas guardadas.
Los eventos de interfaz automatizados usan un DOM simulado; no sustituyen las comprobaciones de navegador.

Se verificaron además en navegador real: dibujo de carta de ejemplo, hora vacía,
hora repetida y segunda ocurrencia, punto seleccionado después de cambiar radio/modo,
filtro planetario y paso de carta natal guardada a Astrocartografía. No se observaron
errores de JavaScript en esos recorridos.

## Comparación independiente con JPL Horizons

`tests/fixtures/horizons.json` contiene 50 posiciones consultadas el 10/09/2026:
diez astros a las 12:00 en 1800-01-03, 1900-06-01, 1990-03-21, 2026-09-10 y
2050-12-31. Parámetros: `EPHEM_TYPE=OBSERVER`, `CENTER=500@399`, `QUANTITIES=2`,
`ANG_FORMAT=DEG`, `EXTRA_PREC=YES`, `CSV_FORMAT=YES`, `TLIST_TYPE=JD`.
La referencia es RA/declinación aparente geocéntrica sin atmósfera, de fecha
(IAU76/80). La escala de salida es UTC desde 1962 y UT1 antes de 1962.

Máxima separación angular observada en **estas cinco fechas por astro**, en minutos de arco:

| Astro | Máximo observado |
|---|---:|
| Sol | 0,0210′ (1,26″) |
| Luna | 1,1293′ |
| Mercurio | 0,1754′ |
| Venus | 0,3510′ |
| Marte | 0,9967′ |
| Júpiter | 4,6328′ |
| Saturno | 10,3005′ |
| Urano | 1,7278′ |
| Neptuno | 0,7248′ |
| Plutón | 0,4601′ |

**Esta muestra no establece cotas de error para todo 1800–2050.** Los límites de
las pruebas son presupuestos de regresión del modelo aproximado, no una certificación
de precisión. El error angular celeste tampoco equivale directamente a kilómetros
de error de una línea, especialmente cerca de tangencias polares.

## Limitaciones que permanecen

Los elementos keplerianos y las series lunares siguen siendo abreviados. No se incluye
refracción, relieve, elevación, paralaje topocéntrica ni desviación gravitacional de
la luz. La latitud solar se aproxima a cero. UTC aproxima UT1 y TT se estima mediante
polinomios de ΔT, también para fechas modernas/futuras; no se consulta un servicio EOP
ni una tabla actualizada de segundos intercalares. Se usan latitudes geográficas y
una Tierra esférica de radio 6371,0088 km para distancias. Las zonas dependen del
navegador. MC/IC se interpretan como meridianos de culminación superior/inferior,
aunque el astro no sea visible; en los polos la clasificación de salida/puesta es
degenerada y los extremos se conservan como límites geométricos de las líneas.

Paranes, espacio local, carta relocalizada y zoom siguen siendo ampliaciones futuras.

## Referencias

- [JPL: elementos aproximados, marcos y errores nominales](https://ssd.jpl.nasa.gov/planets/approx_pos.html)
- [NASA: polinomios de ΔT por intervalo](https://eclipse.gsfc.nasa.gov/SEcat5/deltatpoly.html)
- [JPL: API Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html)
- [JPL: convenciones de las cantidades aparentes](https://ssd.jpl.nasa.gov/horizons/manual.html)
- [ERFA: matriz de prueba de precesión IAU 1976, función t_pmat76](https://github.com/liberfa/erfa/blob/master/src/t_erfa_c.c)
- Lieske, J. H. (1979), Astronomy & Astrophysics 73, 282, ecuaciones 6 y 7.
