# Paleta editorial: petróleo, salvia y oro

Identidad común para las 22 páginas informativas: Carta Natal; Herramientas; Predicciones; Astrología Horaria; Cartas Célebres; Lotes Arábigos; Liberación Zodiacal; Profecciones; Dignidades; el índice del horóscopo semanal y sus doce signos.

`app/tema-editorial.css` se carga únicamente en los HTML que declaran `data-editorial`. Las calculadoras y el planetario conservan sus estilos. La paleta no modifica posiciones, escuelas, informes, textos, fechas ni destinos de navegación.

| Función | Color claro |
| --- | --- |
| Cabeceras, cierres y pies | Petróleo `#173F43` |
| Portadas | Salvia `#D5E2D5` |
| Bloques de apoyo | Salvia profunda `#BED2C4` |
| Índices y detalles | Oro mate `#C6A56A` |
| Fondo de lectura | Arena `#F0E8D8` |
| Tarjetas y papel | Crema `#FBF5E8` |
| Texto principal | `#183D3C` |

Los textos pequeños usan tonos más oscuros que el oro decorativo. El selector existente de modo claro/oscuro conserva su comportamiento; la variante oscura dispone de superficies y tinta adaptadas.

## Mantener la identidad

- Añadir `data-editorial` al elemento `html` de una nueva página informativa y cargar la hoja común después de los estilos originales.
- Asignar clases por su función: `editorial-cabecera`, `editorial-hero`, `editorial-indice`, `editorial-salvia`, `editorial-petroleo`, `editorial-pie`. La clase `editorial-franja` extiende el fondo manteniendo el ancho de lectura. El menú de cabecera tiene un fondo separado para permitir su despliegue.
- Mantener los ajustes de estructura en los adaptadores `editorial-natal.css`, `editorial-tradicion.css`, `editorial-directorios.css` y `editorial-horoscopo.css`.
- En las guías tradicionales `--text` puede ser una familia tipográfica. No redefinirla como color sin comprobar la página.
- El generador de horóscopos incorpora esta identidad; regenerar la siguiente edición no elimina la paleta.

Verificación: 26 pruebas existentes de navegación, guía natal, liberación zodiacal, cumpleaños y horóscopos; revisión de páginas y modos de color en navegador. Los archivos de cálculos permanecen sin cambios.
