# Buscador mundial de ciudades

Implementación del 15 de septiembre de 2026 sobre GeoNames cities500.

## Cobertura y origen

La instantánea incluye 235,808 registros oficiales de 246 países y territorios,
394 zonas IANA y dos localidades conservadas por compatibilidad (235,810 en total).
No se aplican umbrales regionales adicionales. Se conservan las coordenadas WGS84,
los identificadores GeoNames y la zona IANA de cada registro. Los homónimos incluyen
región/país; cuando es necesario, municipio e identificador para distinguirlos.

Fuente: https://download.geonames.org/export/dump/readme.txt
Licencia: Creative Commons Attribution 4.0, https://creativecommons.org/licenses/by/4.0/.
GeoNames distribuye datos sin garantía de exactitud/completitud. Los archivos se
transformaron a filas compactas con diccionarios de regiones y zonas; los nombres
de países se muestran en español. Se incluyen nombre principal, transliteración
ASCII y aliases del catálogo anterior, no todos los nombres alternativos de GeoNames.

## Cómo funciona

- `app/ciudades.js`: fachada ligera. Al abrir la página no inicia Worker ni descarga datos.
- `app/ciudades-buscador.js`: inicia carga al tocar un campo, espera 140 ms entre
  pulsaciones y muestra hasta 40 opciones. Informa carga/error y permite reintentar.
- `app/ciudades-worker.js`: consulta el manifiesto y descarga una sola copia del
  catálogo por página. La carga, el índice y las búsquedas corren en segundo plano.
- `app/ciudades-motor.js`: resolución global de nombres/etiquetas, ranking por
  coincidencia y población, búsqueda sin acentos y consulta de cercanía a líneas.
- `app/datos/ciudades-manifest.json`: fecha, conteos, pesos y SHA-256 de la fuente
  y del catálogo. Archivo pequeño que se revalida; el JSON fechado se puede cachear.

`Ciudades.resolverAsync(texto)` devuelve `{ciudad, ambiguas, coincidencias, total}`.
Una entrada ambigua no selecciona automáticamente la ciudad más poblada. La búsqueda
limita resultados, pero la resolución cuenta coincidencias en el catálogo completo.

`Ciudades.lista` / `Efem.CIUDADES` ahora contienen sólo hasta 256 resultados recientes.
No deben recorrerse como si representaran el mundo. `resolver(texto)` consulta esa
caché; sólo sirve para presentación. Toda entrada que determine coordenadas utiliza
`resolverAsync`. La fachada conserva además hasta 64 respuestas recientes, cada una
con un máximo de 40 coincidencias. Nunca recibe el catálogo completo desde el Worker.

Astrocartografía utiliza `Ciudades.explorarLinea(astro,eje,opciones)` para recorrer
localidades de todos los países, filtradas por país, subdivisión y distancia a la
línea. La geometría esférica es la misma que en el mapa. El Worker conserva la última
línea calculada y devuelve páginas de 24 localidades, contadores de países y regiones.
La vista mundial alterna países; dentro de un país o región se ordena por distancia.
Respuestas antiguas no reemplazan una consulta más reciente. La API previa
`cercanasLinea(astro,eje)` sigue disponible con sus 12 resultados de compatibilidad.

## Zonas horarias y cartas guardadas

Se conservan identificadores IANA, nunca offsets fijos. `Efem.localAUTC` utiliza
las reglas históricas disponibles en Intl del navegador; se rechazan horas
inexistentes y se requiere elegir la ocurrencia si la hora se repite. Luna usa
ahora esa misma conversión; su formulario directo rechaza horas ambiguas y una
carta guardada puede suministrar la ocurrencia elegida en la carta natal.

Las cartas guardadas mantienen sus coordenadas, zona y ocurrencia originales al
abrirse o editar la hora; no se sustituyen por las coordenadas del catálogo nuevo.
2,919 etiquetas anteriores se reconocen como aliases y dos localidades se conservan.
Si un navegador no reconoce una zona nueva, el cálculo informa el error: no la
sustituye por UTC ni por una ciudad cercana. Las reglas históricas dependen del tzdb
del navegador; ampliar ciudades no hace exacta la hora civil de toda época histórica.

## Mediciones locales

Con el catálogo real, Node 24.19 y recolección de basura explícita:

- JSON preparado: 14,143,616 bytes; gzip nivel 9: 4,927,414 bytes.
- Memoria retenida adicional (datos e índice): aproximadamente 53.9 MiB.
- Lectura, parseo e índice: 522 ms.
- Diez consultas de prueba: 29–55 ms por consulta; hasta 40 resultados.

Estas cifras corresponden al motor en Node sobre este equipo, no a una medición
RAM de un teléfono ni al consumo total de la página. El navegador puede consumir
más memoria durante parseo/búsquedas. Vercel decide la compresión HTTP efectiva.
La caché del navegador es reutilizable, pero puede ser desalojada y no constituye
una garantía de funcionamiento sin conexión.

## Actualizar la instantánea

1. Descargar desde el directorio oficial `cities500.zip`, `admin1CodesASCII.txt` y
   `admin2Codes.txt`; descomprimir cities500.txt en la misma carpeta.
2. Ejecutar, desde la raíz del repositorio:

   `node scripts/generar-ciudades.cjs RUTA_A_LA_CARPETA AAAA-MM-DD`

3. El generador valida registros/zonas, conserva `scripts/ciudades-compat.json`,
   escribe el JSON fechado y actualiza el manifiesto. Si un ID de compatibilidad
   desaparece, se detiene para revisar el alias en vez de trasladarlo por cercanía.
4. Ejecutar `node --test tests/*.test.cjs` y comprobar ciudad/fecha/UTC en navegador.
5. Publicar juntos JSON y manifiesto. El Worker lee el archivo indicado por el
   manifiesto; no es necesario modificar rutas de datos en JavaScript. Si cambia
   el código del Worker/motor, incrementar sus versiones de URL.

No se necesita usuario GeoNames ni una API pública en tiempo de ejecución. La
primera descarga requiere conexión; coordenadas manuales y cartas guardadas siguen
operativas si el catálogo no está disponible.
