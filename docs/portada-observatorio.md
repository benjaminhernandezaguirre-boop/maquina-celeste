# Portada del observatorio

La portada en `index.html` ofrece trece destinos mediante diapositivas, con enlaces nativos a las calculadoras y a sus guías. Los textos y enlaces están en el HTML; el diseño está en `app/portada.css` y los controles en `app/portada.js`.

## Navegación

- Flechas, selector de secciones, menú Explorar y gestos horizontales.
- Flechas del teclado y Home/End dentro del carrusel o selector. El foco acompaña la selección del carril.
- Enlaces directos como `/#astrocartografia` y `/#horoscopo`.
- No hay reproducción automática. Se respeta la preferencia de movimiento reducido.
- Las diapositivas inactivas están ocultas e inertes. Los cambios se anuncian sin interrumpir la lectura.
- Sin JavaScript siguen disponibles el primer destino, su guía y el directorio de herramientas.
- Los enlaces históricos `/?view=natal`, `/?view=rueda` y `/?view=orbitas` conservan parámetros y abren la calculadora existente.
- El planetario animado anterior permanece en `planetario.html`. Los regresos generales dicen Inicio y apuntan a `/`.

## Identidad e imágenes

Paleta petróleo, salvia y oro. Marca AstroPlanetario.com con Astro y .com marfil, Planetario dorado y emblema independiente a la izquierda. Sin contorno dorado ni órbitas sobre las letras.

Los trece fondos de `assets/portada` son ilustraciones generadas para este proyecto y exportadas en WebP a 1600×900 y 800×450. No representan posiciones astronómicas calculadas. La rueda SVG también es decorativa; las calculadoras conservan sus motores y datos reales.

Al entrar solo se solicita el fondo inicial y, en un momento libre, el siguiente. Los demás se cargan al recorrerlos. Si el navegador informa ahorro de datos, se evita la precarga del siguiente. Los fondos decorativos tienen texto alternativo vacío y los títulos de las secciones permanecen como texto accesible.

Para editar una sección, mantener coordinados su `data-seccion`, los botones `data-ir`, el enlace principal y el ItemList de los metadatos. Para sustituir un fondo, conservar ambas resoluciones y sus proporciones.
