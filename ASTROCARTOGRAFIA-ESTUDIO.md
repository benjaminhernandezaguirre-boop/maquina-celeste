# Astrocartografía · mapa interactivo

Primera entrega de la mejora geográfica: correcciones de estado y exploración del mapa. Septiembre de 2026.

## Coherencia de la carta

- Los cambios natales muestran un aviso persistente independiente de las consultas del destino. El mapa y las tablas siguen identificados con los datos del último cálculo hasta pulsar Dibujar.
- Nueva carta y la opción vacía de guardadas limpian la identidad, coordenadas manuales, destino y consultas pendientes. No borran las cartas guardadas.
- El nombre puede editarse; la nueva identidad solo se aplica al recalcular. Las coordenadas de una guardada se conservan al editar su hora.
- El formulario se pliega después de calcular para dejar espacio al mapa. Puede abrirse mediante Datos de nacimiento.

## Explorar el mapa

La cámara conserva proporciones geográficas y admite zoom de 1 a 32, arrastre y pinza. Mundo muestra el mapa completo; Nacimiento centra el origen y Ver línea centra el punto más cercano de la línea seleccionada al lugar consultado. Las bandas vacías al encuadrar Mundo no se convierten en coordenadas.

La rueda del ratón desplaza la página. Ctrl/Meta + rueda amplían el mapa. Con el canvas enfocado, +/− amplían, las flechas desplazan e Inicio vuelve al mundo. Ampliar mapa abre una vista superpuesta con foco contenido; Escape la cierra.

Una línea puede seleccionarse en el mapa, en su etiqueta, en la lista accesible o en la tabla de cercanía. Tocar una etiqueta destaca la línea y conserva el destino; tocar un espacio sin línea consulta ese punto. Arrastrar o pellizcar nunca dispara una consulta al soltar.

El grosor y el texto se dibujan en píxeles de pantalla. Las etiquetas desplazadas tienen conectores; se limita su número en vistas pequeñas. Al destacar una línea solo queda su etiqueta, con el resto de líneas atenuadas pero seleccionables. Los filtros siguen afectando a mapa y tablas y expresan su estado mediante aria-pressed.

La ficha explica el planeta y el eje, indica el modo mundo/zodiacal, conserva la referencia tropical del texto de posiciones y muestra distancia y punto más cercano. La lectura se presenta como simbólica.

## Ciudades y coordenadas

Se puede consultar una ciudad del catálogo o introducir coordenadas de destino válidas, incluidos cero y los límites. Buscar localidades carga los destinos bajo demanda; no obliga a descargar el catálogo al abrir una carta guardada. Sus filas permiten centrar y consultar la ciudad. La lista de guardadas incluye el lugar para distinguir nombres repetidos.

La exploración de una línea permite elegir cualquiera de los países del catálogo y sus subdivisiones. En la vista mundial se alternan países para que una concentración de pueblos no oculte el resto del recorrido. Dentro de cada país o región, las localidades se ordenan por distancia mínima a la línea. Todas las coincidencias están disponibles en páginas de 24 resultados.

La distancia máxima inicial es 300 km y admite 100 km, 1000 km o sin límite. Los contadores de países y regiones corresponden a ese alcance. Los países sin coincidencias siguen disponibles: su selección explica que debe ampliarse la distancia o cambiar el filtro. La opción sin límite también muestra localidades lejanas; no implica que la línea cruce esos lugares. No se cambia la posición de la línea al elegir un país.

`Ciudades.explorarLinea()` envía filtros y paginación al worker. El catálogo completo y la caché de distancias de la última línea permanecen allí; la página recibe solo los resultados visibles y contadores. La API previa `cercanasLinea()` se conserva para compatibilidad. Las respuestas antiguas no sustituyen resultados de filtros o cartas más recientes.

## Cálculo y alcance

`app/astrocarto-vista.js` contiene la cámara y los gestos; `app/astrocarto-pintor.js` dibuja y selecciona en pantalla; `app/astrocarto-estudio.css` limita el estilo a esta página. `AstroGeo.puntoCercano()` añade la proyección analítica sobre la rama correcta y sus extremos, sin cambiar `distancia()` ni el motor de efemérides.

Las fórmulas AC/MC/DC/IC y el modelo aproximado de 1800–2050 se mantienen. No se incorpora todavía una fuente de efemérides de mayor precisión. Las distancias inferiores a un kilómetro se muestran como “Menos de 1 km”, sin presentar el redondeo a cero como un paso exacto.

El contorno sigue siendo Natural Earth 110m simplificado, adecuado para contexto regional; ampliar no lo convierte en cartografía de calles. El zoom se detiene en polos y antimeridiano y no repite el mundo.

## Validación

Pruebas de cámara, gestos y selección; ramas geográficas, extremos polares, antimeridiano y punto más cercano; regresiones de identidad, hora pendiente, respuestas asíncronas antiguas, carga bajo demanda y coordenadas. Verificación visual de la página en escritorio y a 390 × 844 píxeles, con tema claro/oscuro y ampliación.

## Próximas entregas

1. Carta relocalizada y comparación de destinos, manteniendo el instante UTC original.
2. Mayor validación de efemérides, sensibilidad a la hora y reporte geográfico exportable.
3. Espacio local y paranes con convenciones explícitas y pruebas independientes.

Esta entrega no agrega esas técnicas ni modifica los PDFs natales.
