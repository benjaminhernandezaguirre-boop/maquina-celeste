# Pasada de mantenimiento

14 de septiembre de 2026. Se aplica sobre el paquete 10 ya publicado.
No toca lógica de cálculo: son etiquetas, firma y peso.

## 1. Buscadores · las 17 páginas completas

Seis páginas no tenían etiquetas. Ahora **17 de 17** tienen canonical,
Open Graph, description y tarjeta de Twitter.

    astrocarto.html                  faltaban canonical y Open Graph
    luna.html                        faltaban las tres: era la peor
    mercurio.html                    faltaban canonical y Open Graph
    venus.html                       faltaban canonical y Open Graph
    saturno.html                     faltaban canonical y Open Graph
    lotes-arabigos-calculadora.html  faltaba Open Graph

Los canonical apuntan exactamente a las URLs del `sitemap.xml`, para que no
haya dos direcciones compitiendo por la misma página.

### Títulos reescritos para buscar

Los títulos eran genéricos. Un título que dice "Luna · Astroplanetario" no lo
busca nadie. Los cambié por lo que la gente escribe de verdad:

    Luna · Astroplanetario
      → Fases de la Luna, lunaciones y revolución lunar | Astroplanetario

    Mercurio · Astroplanetario
      → Mercurio retrógrado: calendario de retrogradaciones y sombras | Astroplanetario

    Venus · Astroplanetario
      → El ciclo de Venus: la rosa de ocho años y el lucero | Astroplanetario

    Saturno · Astroplanetario
      → Retorno de Saturno y tu línea de vida planetaria | Astroplanetario

    Astrocartografía · Astroplanetario
      → Astrocartografía: el mapa de tus líneas planetarias | Astroplanetario

Ninguno lleva año, para que no caduque solo.

## 2. La firma del Instituto · 17 de 17

Estaba en 4 páginas. Ahora está en todas, adaptada a cómo termina cada una:

- Páginas con pie (`carta-natal`, lotes, liberación): dentro del pie existente.
- Páginas con nota final (`luna`, `mercurio`, `venus`, `saturno`): al final de esa nota.
- Páginas sin pie (`astrocarto`, `cartas-celebres`): se creó uno sobrio.
- **Portada**: en el hueco que el propio código tenía reservado con un comentario
  que decía *"Aquí va tu nombre y el de tu academia cuando quieras"*. Va en las dos
  franjas, la de escritorio y la de móvil, para no repetir el choque de versiones
  anteriores.
- **Astroplanetario**: su `<footer>` está oculto por diseño y solo aparece en
  algunas vistas, así que la firma se puso además en el **pie del PDF**, que es lo
  que se llevan tus alumnos. Ahora cada informe dice:
  *astroplanetario.com · Instituto de Artes Esotéricas y Saberes Ancestrales*.

Contraste medido en las páginas claras y en las oscuras: legible en todas.
Sin desbordes a 390 ni a 1280 px.

## 3. Crédito de GeoNames

La licencia CC BY 4.0 obliga a dar crédito visible, y solo estaba en un
comentario dentro del código. Ahora aparece en las **12 páginas** que usan el
catálogo y en la portada.

## 4. Imágenes · 3.76 MB → 2.57 MB

Las doce ilustraciones del zodiaco pasaron de 800×1200 a **740×1110** con calidad
74, conservando el canal de transparencia.

Por qué 740 y no menos: en pantalla se muestran a 440×550, así que 740 es
exactamente la resolución que pide una pantalla retina. Bajar más se vería blando.

    assets     3.76 MB → 2.57 MB   (−32%)
    repo       5.4 MB  → 4.2 MB

Los atributos `width`/`height` del HTML se actualizaron a las medidas nuevas,
para que no haya salto de maquetación mientras carga.

**Honestidad sobre esto:** el visitante solo descarga UNA de estas doce, y va con
carga diferida y por debajo del pliegue. Así que la ganancia real es sobre todo en
peso del repositorio y del despliegue, no en velocidad percibida. La mejora de
velocidad de esta pasada es menor que la de buscadores.

## Verificación

    159 pruebas          todas en verde
    17 páginas           sin un solo error de JavaScript
    firma                visible y con contraste suficiente a 390 y 1280 px
    PDF                  sigue adaptándose: 11 hojas contemporánea, 9 tradicionales

## Lo que sigue

El punto 6 del paquete 10: la página de herramientas organizada por escuela.
