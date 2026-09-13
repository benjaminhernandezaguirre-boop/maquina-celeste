# Astroplanetario

Sitio astrológico estático publicado en astroplanetario.com. Todos los cálculos se realizan en el
navegador; actualmente no existe servidor de cuentas ni base de datos.

## Estructura actual

- `index.html`: portada y navegación planetaria.
- `astroplanetario.html`: órbitas, rueda zodiacal y estudio completo de carta natal.
- `carta-natal.html`: página informativa e indexable de carta natal.
- `astrocarto.html`: mapa de astrocartografía.
- `luna.html`, `mercurio.html`, `venus.html` y `saturno.html`: módulos planetarios.
- `cartas-celebres.html`: colección de cartas verificadas de figuras conocidas.
- `lotes-arabigos.html` y `lotes-arabigos-calculadora.html`: guía y calculadora de 63 lotes.
- `app/efemerides.js`: motor astronómico compartido, ciudades y conversión de tiempo.
- `app/*.js` y `app/*.css`: comportamiento y temas de las páginas.
- `assets/planetas/`: texturas optimizadas de los cuerpos celestes.
- `assets/zodiaco/`: doce ilustraciones zodiacales.
- `tests/`: pruebas de cálculo, navegación, SEO y recursos.

`astroplanetario.html` es la fuente única de la aplicación principal. Los antiguos fragmentos
`app/part-XX.txt` y sus automatizaciones fueron retirados porque ya no intervenían en el sitio.

## Desarrollo y publicación

El proyecto no requiere compilación. Puede abrirse mediante un servidor web local y Vercel publica
automáticamente los cambios integrados en la rama `main`.

Antes de publicar, se ejecutan las pruebas con:

```
node --test tests/*.test.cjs
```

Las rutas limpias y las reglas de caché están declaradas en `vercel.json`. Las páginas públicas
destinadas a buscadores aparecen en `sitemap.xml`.

## Documentación técnica

- `ESTADO-DEL-PROYECTO.md`: arquitectura, mejoras realizadas y precisión del motor.
- `ASTROCARTOGRAFIA-VALIDACION.md`: validación y límites de Astrocartografía.
- `PENDIENTES.md`: trabajo futuro priorizado.

