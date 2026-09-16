# Felicitaciones de temporada

Los doce diseños aprobados se muestran como una ficha compacta en 19 guías, páginas de herramientas y calculadoras. En la carta natal ocupa el espacio derecho de la barra de datos y acciones; en las demás páginas acompaña el título o la ilustración lateral. La guía natal conserva su historia, datos del signo y contexto lunar.

## Criterio editorial

`app/cumpleanos.js` elige el signo por el día y mes locales actuales. Las fechas son los intervalos convencionales aproximados del zodiaco tropical, no instantes astronómicos de ingreso solar. La selección es independiente de la fecha de nacimiento, la escuela y el reloj de simulación. Se revisa en la siguiente medianoche local y al volver a la pestaña. La guía natal escucha el mismo cambio para mantener coherentes texto e imagen.

## Integración

Cada página carga `app/cumpleanos.css`, el script diferido y un contenedor `[data-cumpleanos]`. Las calculadoras secundarias añaden `app/cumpleanos-calculadoras.css`. Solo se solicita la imagen del signo vigente, con un texto alternativo equivalente a la felicitación. El componente reserva su proporción antes de cargar la imagen y no intercepta los controles de la herramienta.

En escritorio mide 252 × 84 px en la barra natal y hasta 270 × 90 px en las demás páginas. En la barra natal móvil de hasta 620 px se oculta para conservar el espacio de los controles. No forma parte de las exportaciones de la rueda ni de los informes; también se oculta al imprimir.

## Imágenes y mantenimiento

`assets/cumpleanos/` contiene doce WebP de menos de 200 kB cada uno: 2.33 MB en total, frente a 28.04 MB de los PNG originales. Conservan composición y dimensiones mediante compresión WebP. Para volver a prepararlos, ejecutar `python scripts/preparar-banners.py CARPETA_PNG CARPETA_DESTINO` con Pillow instalado. Los originales aprobados se conservan fuera del despliegue.

Las pruebas `tests/cumpleanos.test.cjs` cubren cambios de signo, fin de año, año bisiesto, actualización diaria y carga de una sola imagen. `tests/seo-carta-natal.test.cjs` verifica también que historia, fechas y contexto lunar sigan el calendario compartido.
