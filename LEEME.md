# Máquina Celeste — carpeta del sitio

Planetario astrológico: órbitas del sistema solar en tiempo real, rueda zodiacal
geocéntrica y cartas natales con casas, aspectos, significados y atacires.

Esta versión incluye una portada animada, una vista orbital con perspectiva y
profundidad, y navegación por arrastre en la carta natal cuando se usa zoom.

## Qué hay en esta carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | El sitio entero. Todo el cálculo y el dibujo van dentro de este archivo. |
| `favicon.svg` | El iconito que sale en la pestaña del navegador. |
| `portada.png` | La imagen que se ve cuando compartes el enlace por WhatsApp o redes. |
| `LEEME.md` | Este texto. No hace falta subirlo, pero tampoco estorba. |

No hay base de datos ni servidor: todo se calcula en el navegador de quien lo abre.
Eso quiere decir que ningún dato de nacimiento sale de la computadora del visitante.

## Cómo publicarlo

Sube los tres primeros archivos **juntos y al mismo nivel**, sin carpeta intermedia.
El archivo se llama `index.html` a propósito: así el sitio abre solo al entrar a la
dirección, sin que nadie tenga que escribir el nombre del archivo.

**Opción rápida y gratuita — Netlify Drop.** Entra a `app.netlify.com/drop` y arrastra
la carpeta completa a la página. En unos segundos te da una dirección pública.
Desde ahí puedes ponerle tu propio dominio si más adelante quieres.

**Opción estable — GitHub Pages.** Crea un repositorio, sube los archivos, y en
Settings → Pages elige la rama principal. Te queda una dirección fija y puedes ir
actualizando el sitio con solo reemplazar `index.html`.

**Tu propio hosting.** Si ya tienes uno para la academia, súbelos por FTP a la carpeta
pública (suele llamarse `public_html` o `www`). Puedes ponerlo en una subcarpeta,
por ejemplo `/planetario`, y quedaría en `tudominio.com/planetario`.

## Dos ajustes que quizá quieras hacer

**La imagen de vista previa.** En `index.html`, cerca del principio, hay dos líneas con
`content="portada.png"`. Cámbialas por la dirección completa, así:

    content="https://tudominio.com/portada.png"

WhatsApp y Facebook piden la dirección completa para mostrar la imagen al compartir.

**El nombre.** Si quieres que diga el nombre de tu academia, busca `<title>` al inicio
del archivo y las líneas `og:title` y `twitter:title`.

## Cosas que conviene saber

- Las tipografías se cargan de Google Fonts. Si el visitante no tiene internet, el sitio
  funciona igual con las letras de respaldo del sistema.
- Los botones de descarga de imagen (rueda y hoja completa) funcionan bien en un sitio
  publicado y al abrir el archivo directamente.
- Las posiciones de los planetas se calculan con los elementos orbitales de la NASA
  y la teoría lunar abreviada de Meeus, con precisión de fracciones de minuto de arco:
  suficiente para signos, casas y aspectos.
- El navegador guarda los últimos datos de nacimiento que se escribieron, solo en esa
  computadora, para no tener que teclearlos otra vez.


## Controles nuevos

- **Carta natal:** usa la rueda del ratón para acercar o alejar y **arrastra** el lienzo
  para recorrer la carta ampliada. En pantalla táctil también puedes arrastrarla con
  el dedo. Haz **doble clic** para volver al centro y restablecer el zoom.
- **Órbitas:** la vista utiliza la coordenada Z de los elementos orbitales para dar
  perspectiva y profundidad. Las posiciones siguen calculándose con los mismos datos
  astronómicos; el cambio es de representación visual.
- **Portada:** el mecanismo zodiacal de la pantalla inicial está animado con CSS. Si el
  sistema del visitante tiene activada la opción de reducir movimiento, la animación
  se desactiva automáticamente.

## Anotación de diseño y cálculo — Luna progresada

Antes de considerar terminada la herramienta de **Luna progresada secundaria**, la
interfaz debe pedir o mostrar de forma explícita los siguientes datos:

- **Fecha natal**.
- **Hora natal exacta**.
- **Ciudad natal**, para resolver correctamente la zona horaria histórica y convertir
  la hora local del nacimiento al instante UTC correspondiente.
- **Fecha a estudiar** para la progresión.

La herramienta no debe asumir silenciosamente una hora como `12:00` cuando la hora
natal es desconocida. Si falta la hora, debe indicarlo claramente y advertir que el
grado de la Luna progresada puede variar.

El método de cálculo es **progresión secundaria: 1 día de efemérides = 1 año de vida**.
La Luna progresada debe obtenerse de la posición lunar calculada para el día simbólico
correspondiente; no debe desplazarse artificialmente con la clave de Naibod.

Para una futura **carta progresada completa**, además de los datos natales conviene
pedir la **ciudad de residencia o ubicación elegida** si se van a calcular Ascendente,
Medio Cielo y casas.

Antes de dar por validada la precisión fina del módulo, conviene contrastar varios
casos contra efemérides profesionales (por ejemplo Swiss Ephemeris/Astrodienst) y
verificar signo, grado y minutos de arco con una tolerancia pequeña.
