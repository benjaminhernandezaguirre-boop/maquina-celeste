# Búsqueda de localidades — 15 de septiembre de 2026

Las búsquedas y la resolución de ciudades consultan `/api/ciudades`. El servidor usa el mismo `app/ciudades-motor.js` y el catálogo GeoNames completo: 235 810 localidades, 246 países y 394 zonas IANA. No cambian las coordenadas, zonas, alias históricos, prioridades ni la resolución de nombres ambiguos. Se entregan como máximo 40 coincidencias y se conserva el recuento global de homónimos.

## Carga y caché

- Abrir la calculadora o enfocar un campo vacío no inicia el Worker ni descarga datos de localidades.
- La primera consulta carga el Worker, su motor y un manifiesto pequeño. La API devuelve únicamente los resultados.
- La entrada espera 140 ms al escribir y descarta respuestas que ya no corresponden al texto actual. El Worker comparte consultas simultáneas y mantiene hasta 64 búsquedas y 64 resoluciones recientes.
- La función de Vercel lee, verifica por SHA-256 e indexa el catálogo una vez por instancia activa. Conserva hasta 128 respuestas; los resultados públicos tienen caché de navegador de 5 minutos y de CDN de 24 horas. Los errores no se cachean.
- El hash del catálogo forma parte de cada URL y respuesta. Si el despliegue cambió de versión, la función responde 409; el Worker actualiza el manifiesto y reintenta una vez. Un fallo de búsqueda permite reintentar o usar coordenadas manuales, sin descargar silenciosamente el catálogo completo.

## Astrocartografía

«Buscar localidades» a lo largo de una línea requiere comparar coordenadas de todo el mundo. Esa acción conserva la descarga e indexación del catálogo mundial en el Worker, con filtros de país y región, distancias y paginación. Después puede reutilizarlo para búsquedas de texto. Esta mejora no elimina esa descarga geográfica explícita.

## Contrato y mantenimiento

`GET /api/ciudades?tipo=buscar|resolver&q=texto&v=sha256` devuelve `{version, resultado}`. Solo acepta esos tres parámetros, consultas de hasta 256 caracteres y GET/HEAD. La búsqueda usa el servidor; nombre del titular, fecha, hora y datos de la carta no forman parte de la petición. Los cálculos astrológicos continúan en el navegador.

`vercel.json` incluye `app/datos/ciudades-*.json` en la función. El proyecto no necesita una base de datos, proveedor de búsqueda ni claves externas. Para desarrollar búsquedas localmente se necesita servir también la función; un servidor de archivos estáticos por sí solo no implementa `/api/ciudades`.

Al actualizar el catálogo, genera conjuntamente datos y manifiesto, publica un nombre de archivo nuevo y conserva los alias. Los archivos de catálogo tienen caché inmutable: no sobrescribas una URL antigua con datos diferentes. La función y el manifiesto deben desplegarse juntos. Las cartas guardadas conservan sus coordenadas y zonas de origen.

## Verificación

Las pruebas cubren equivalencia con el motor mundial, tildes y Unicode, alias, nombres repetidos, límite de 40, versiones, cachés acotadas, carga concurrente, recuperación de fallos, respuestas antiguas al escribir y exploración geográfica completa. Ejecutar `node --test tests/*.test.cjs` desde la raíz.

La configuración sigue la documentación de [funciones Node.js de Vercel](https://vercel.com/docs/functions/runtimes/node-js), [archivos incluidos en funciones](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions) y [caché HTTP](https://vercel.com/docs/caching/cache-control-headers).
