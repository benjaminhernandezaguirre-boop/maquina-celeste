# Horóscopo semanal por signo

Primera edición: **13–19 de septiembre de 2026**, publicada el 16. La portada está en `/horoscopo-semanal` y cada signo tiene su URL, por ejemplo `/horoscopo-semanal/virgo`. El banner de cumpleaños enlaza directamente al signo de temporada; el selector de cada lectura ofrece los doce signos. También hay accesos desde Predicciones, el directorio y Explorar.

## Contenido y criterio

`data/horoscopos/2026-09-13.json` conserva los textos originales de amor, trabajo, dinero y reflexión, sus eventos de referencia y las fuentes. El marco editorial es tropical geocéntrico, por signo solar y casas solares de signos enteros. Estos sectores no son casas natales calculadas del visitante. Los aspectos astronómicos y sus fechas se distinguen de la interpretación astrológica. No se incluyen promesas de resultados ni recomendaciones de inversión.

Los cinco eventos seleccionados se contrastaron con Astrodienst (Swiss Ephemeris y acontecimientos del cielo) y USNO para el cuarto creciente. Las horas visibles están redondeadas al minuto y referidas a Ciudad de México, UTC−06:00 en esta edición. Mercurio–Urano ocurre el 13 por la noche en México y el 14 en UTC; no es una discrepancia de fechas. El motor local sirve de contraste aproximado, no como fuente de exactitud al minuto.

## Publicar la siguiente edición

1. Conservar el JSON anterior y crear otro archivo `data/horoscopos/AAAA-MM-DD.json` con el mismo esquema, fecha real de publicación e intervalo explícito.
2. Verificar los nuevos acontecimientos, sus zonas horarias y las doce lecturas. No reutilizar automáticamente las fechas o los textos anteriores.
3. Ejecutar `node scripts/generar-horoscopo.cjs --edition AAAA-MM-DD`. El comando exige una edición concreta y valida doce signos únicos, campos completos, fuentes y eventos dentro del intervalo. Genera trece páginas HTML indexables y utilizables sin JavaScript.
4. Actualizar `lastmod` de las trece entradas del sitemap, revisar en navegador y publicar el JSON junto con las páginas generadas. Los títulos, metadatos y canonical se generan desde los datos; las URLs de acceso se mantienen.

La generación y publicación de nuevas lecturas es explícita: no hay un proceso automático semanal ni llamadas de IA en cada visita. `app/horoscopo.js` sólo marca si la edición está en curso, es futura o ya terminó, usando `America/Mexico_City`. Una edición vencida conserva sus fechas y no se presenta como la actual. Sin JavaScript dice «Edición publicada».

Los JSON anteriores quedan disponibles para un archivo editorial futuro; por ahora no se publican páginas de archivo duplicadas. Los contenidos y las imágenes de la sección no modifican cálculos, PDFs, escuelas ni cartas guardadas.

## Comprobaciones

`tests/horoscopo.test.cjs` verifica integridad de la edición, contenido sin JavaScript, enlaces entre signos, canonical, salidas regeneradas, fechas por zona y escapado de texto. Los tests de cumpleaños verifican que imagen y enlace cambien juntos en el límite de temporada. Los de navegación comprueban rutas, sitemap y descubrimiento.
