# Carta natal: cálculos y exportación por escuela

Revisión sobre `9becd4b7a6eefa29029b07883a703c360814e8b4`.

## Correcciones

- Regente del Ascendente, dispositores, dignidades y puntos sensibles usan el zodiaco seleccionado. Las posiciones astronómicas permanecen en su marco tropical para conservar los aspectos y el horizonte.
- La secta depende de la altura del centro solar, no del número de casa. Fortuna utiliza esa misma decisión diurna/nocturna.
- Las cúspides se reconstruyen con la fecha, localización, sistema y ayanamsa actuales; se elimina la caché incompleta.
- Una carta sin hora descarta ángulos, casas y Fortuna, incluso si recibe datos antiguos de una carta con hora.
- Pantalla y PDF comparten el modelo `NatalInforme`. Los perfiles filtran población, regencias, métodos y puntuaciones. Las técnicas opcionales se activan explícitamente.
- El almutén usa los puntos zodiacales de lectura y las casas elegidas; conserva las horas planetarias astronómicas. El cálculo independiente conserva sus valores predeterminados.
- Se distinguen regente, conjunción al Ascendente, proximidad angular, dispositor y prioridad por puntos. Una conjunción no sustituye al regente.
- La rueda queda libre de la caja central. La información se conserva en el encabezado de las hojas y de la imagen de la rueda.
- Símbolos con mayor tamaño, peso y contraste; selector adaptable y cuadrantes seleccionables.
- PDF con fondo marfil uniforme, tablas ajustadas al contenido, continuación de filas y numeración real. No incluye revolución solar.

## Verificación

`node --test tests/*.test.cjs`: **170 pruebas correctas**.

Casos nuevos: zodiaco sideral, cambios de casas y ubicación, amanecer con casas de signos enteros, Fortuna, carta sin hora, perfiles, métodos opcionales, población complementaria y paginación larga.

Revisión local en navegador: ejemplo con hora y sin hora, perfil helenístico y personalizado, modos claro/oscuro, tamaño móvil, descarga del informe sin errores de consola. PDFs de muestra para los cuatro perfiles predefinidos; revisión de rueda, tablas, márgenes y numeración mediante renderizado.

## Límites conservados

- El motor de efemérides sigue siendo aproximado. Cambiar de escuela no incrementa la precisión astronómica.
- Horizonte geométrico del centro solar geocéntrico aparente; no incorpora refracción ni radio solar.
- El temperamento y la prioridad son modelos simplificados con criterios visibles; no equivalen a un juicio histórico completo.
- El PDF conserva la exportación existente mediante páginas rasterizadas. Su texto no es seleccionable.
- No se incorpora en este cambio la página distribuidora de herramientas por familias.
