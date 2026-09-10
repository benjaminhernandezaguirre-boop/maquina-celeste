# Cambios: un solo archivo en vez de ocho trozos

Descomprime este paquete **encima de tu repo**, respetando las carpetas, y haz commit.
Solo toca los archivos que aparecen aquí; lo demás se queda igual.

## Qué se cambió

| Archivo | Qué pasó |
|---|---|
| `astroplanetario.html` | **Nuevo.** Es la app completa en un solo archivo, armada a partir de los ocho `app/part-XX.txt` de tu repo. Va en la raíz, para que las rutas `app/…css`, `app/…js`, `favicon.svg` y `assets/…` sigan funcionando sin tocarlas. |
| `index.html` | La portada ya no descarga ocho trozos ni reescribe el documento: navega a `./astroplanetario.html?view=orbitas\|rueda\|natal`. También lleva el arreglo del fallo que abría todo en Órbitas. |
| `app/natal-theme.js`, `app/orbit-theme.js`, `app/zodiac-theme.js` | El botón «← Planetario» hacía `location.reload()`. Eso funcionaba cuando la app vivía dentro de `index.html`, pero ahora recargaría la propia app. Ahora hace `location.href = './'`. |
| `vercel.json` | Se añadió `no-cache` para `/astroplanetario.html`, igual que ya tenías para `luna.html`. |
| Vista previa al compartir | `astroplanetario.html` apuntaba a `portada.png`, que no existe en tu repo: ahora usa `hero-cosmica.webp`, que sí está. Y a `index.html` le puse la tarjeta que le faltaba, para que el enlace se vea con imagen en WhatsApp. Para que la imagen salga de verdad hay que cambiar esas rutas por la dirección completa de tu dominio. |
| `scripts/partir.py` | **Nuevo y opcional.** Vuelve a partir `astroplanetario.html` en ocho `part-XX.txt`, por si alguna herramienta te pide trozos. |

## Qué ganas

- **Enlaces de verdad.** `tudominio.com/astroplanetario.html?view=natal` abre directo la carta natal. Puedes mandarle a un alumno el enlace del módulo que quieras. Añade `&auto=1` y además levanta la carta de ejemplo sola.
- **Recargar ya no te saca.** Antes, al refrescar volvías a la portada; ahora te quedas en el módulo.
- **El botón «atrás» del navegador funciona** entre la portada y los módulos.
- **Una descarga en vez de ocho**, y el navegador puede cachearla.
- **Editas un archivo.** De aquí en adelante, `astroplanetario.html` es la fuente.

## Sobre los `app/part-XX.txt` y los workflows

Los dejé donde estaban: el sitio ya no los lee, pero no estorban y te sirven de respaldo.

Ojo con esto: tus workflows de `.github/workflows/apply-*.yml` parchan esos trozos buscando
texto exacto. Como el sitio ya no los usa, **si vuelves a lanzar uno no verás ningún efecto**.
Cuando quieras un cambio nuevo, hazlo sobre `astroplanetario.html`.

Y una advertencia que aplica también a futuro: esos parches por coincidencia de texto no avisan
cuando fallan. Si la cadena que buscan cambió, el workflow termina en verde sin haber hecho nada.
Si sigues usándolos, conviene que aborten con error cuando no encuentren el punto de inserción.

## Pendientes que no toqué

- `assets/zodiac/zodiac-sprite.webp` no es una imagen válida: por eso el recuadro de la
  ilustración zodiacal en Luna sale vacío. Hay que reemplazarlo por el sprite de verdad.
- En `luna.html`, el título «LUNA MENGUANTE» se encima con la tarjeta del signo en pantallas
  anchas. Se arregla reservándole espacio al encabezado.

## Un detalle que no es fallo

`?auto=1` solo levanta la carta sola si ese navegador ya tiene datos guardados de una carta
anterior. En un navegador nuevo no hay nada que levantar y se queda el formulario, que es
lo correcto. Lo comprobé en los dos casos.
