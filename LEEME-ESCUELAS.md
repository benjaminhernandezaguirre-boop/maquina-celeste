# Paquete 10 · Escuelas y marcos de interpretación

14 de septiembre de 2026. Parte del `main` que me mandaste (paquete 9 ya aplicado).

## Lo que hay que saber antes de aplicarlo

**El punto 10 no lo pude hacer.** Desde donde trabajo no tengo GitHub ni
credenciales, y el zip viene sin historial de git, así que no puedo abrir el PR
ni revisar el despliegue. Si lo quieres como PR: en GitHub Desktop crea una rama
antes de pegar los archivos, y al subir te aparece "Create Pull Request".

**Los puntos 6 y 10 quedan pendientes.** Están detallados abajo, sin adornos.
Lo digo aquí arriba para que no lo descubras publicando.

## Archivos nuevos

    app/casas.js              Los seis sistemas de casas, con Alcabitius y Regiomontanus
    app/escuelas.js           Los cinco perfiles: única fuente de verdad
    app/natal-gobierno.js     Las seis lecturas separadas del punto 4
    tests/casas.test.cjs           14 pruebas
    tests/escuelas.test.cjs        16 pruebas
    tests/natal-gobierno.test.cjs  14 pruebas

## Archivos modificados

    astroplanetario.html      Selector, banda, tarjetas, casas delegadas, PDF por perfil

El suite pasa de 115 a **159 pruebas, todas en verde**. Las 17 páginas cargan sin
errores. Comprobado a 360, 414 y 768 px sin desbordes.

## Punto 5 · Cómo se validaron las casas

No tengo acceso a efemérides externas, así que validé por geometría:

- **En el ecuador, Regiomontanus, Alcabitius y Plácidus deben coincidir
  exactamente**, porque a latitud 0 el punto Norte del horizonte es el polo
  celeste y los tres reparten sobre círculos horarios. Coinciden con diferencia
  **0.00e+0°**.
- **Regiomontanus, calculado de dos maneras independientes**: cortando dos planos
  algebraicamente, y buscando por bisección el punto de la eclíptica que cae sobre
  el plano del círculo de casa. 192 cúspides en 8 latitudes, discrepancia máxima
  **3,6·10⁻¹² grados**.
- Plácidus está **portado tal cual** del que ya tenías. Mi reescritura salió mal;
  el de producción lleva meses dando resultados correctos.
- **Límite polar declarado**: a 75° Plácidus no resuelve en ninguna de las 24
  posiciones probadas, y cada fallo devuelve `sustituido:true` con su explicación,
  que se muestra en la banda y en el PDF. Nunca cambia de sistema en silencio.
- **Signos enteros siderales**: las casas nacen del signo del Ascendente sideral.
  El caso que lo demuestra: ASC sideral en Tauro 5,28° → la casa I empieza en
  Tauro 0°, mientras que desplazar las cúspides tropicales la habría puesto en
  Aries. Un signo entero de error.

## Punto 2 · Qué se veda y por qué

En el perfil **helenístico** quedan vedados el almutén figuris, la puntuación de
Lilly y las dignidades accidentales, con el motivo escrito en pantalla y en el
PDF: son posteriores en más de mil años. En **medieval** entra el almutén (Ibn
Ezra, siglo XII) pero sigue vetado Lilly (1647). Cada perfil se presenta como
convención de configuración, no como la práctica única de su época.

## Punto 4 · El caso obligatorio

Probado con Ascendente en Sagitario 15° y Plutón en Sagitario 16°:

    CONTEMPORÁNEA
      Regente del Ascendente : Júpiter
      Conjuntos al AC        : Plutón a 1.0°
      Angularidad            : Plutón AC 1.0°
      Dispositor de Plutón   : Júpiter
      Prioridad              : Júpiter, por regir el Ascendente

    HELENÍSTICA
      Plutón no aparece en ninguna de las seis lecturas.

La conjunción no convierte a Plutón en regente ni en dispositor de nadie. Con la
capa complementaria activada se ve en marcos tradicionales, marcado como tal,
pero sigue sin disponer ni puntuar.

## Punto 8 · El PDF

Lleva una **primera hoja de configuración y criterios**: escuela, zodiaco,
ayanamsa aplicada, sistema de casas (con el aviso si hubo sustitución), población,
regencias, el encuadre del perfil y la tabla de métodos con su procedencia y su
estado, incluidos los vedados con su motivo.

Las hojas dependen del perfil y la numeración sale del resultado:

    contemporánea  11 hojas
    helenística     9 hojas
    renacentista    9 hojas

La revolución solar sigue siendo informe aparte y las descargas del modo normal
no se tocaron.

## Punto 3 · La escuela afecta a toda la carta

Cerrado. El mecanismo es una sola vista filtrada de la carta: los ocho módulos
`natal-*`, la rueda, la tabla de posiciones, los aspectos y los balances leen
todos de `carta.cuerpos`, así que filtrando en un solo sitio la escuela alcanza a
todos sin tocar ninguno de ellos. Los datos de nacimiento se conservan por
referencia: no se altera nada de lo que escribió quien levantó la carta.

Medido sobre la misma carta, pasando de contemporánea a helenística:

    contemporánea   16 renglones de posiciones · 30 aspectos · 11 tocan transaturninos
    helenística     13 renglones             · 19 aspectos ·  0 tocan transaturninos

Con la **capa complementaria** activada, los transaturninos vuelven a verse en la
tabla marcados como *complementario*, pero los aspectos siguen en 19 y ninguno los
toca: se muestran sin entrar en los cálculos, que es lo que pedía el punto.

Las frases que decían "Sol, Luna y ocho planetas" o "los diez cuerpos" ahora
cuentan la población real del marco.

## LO QUE SIGUE A MEDIAS

**Punto 6 — parcial.** El catálogo de técnicas por escuela y procedencia existe en
`escuelas.js`, distingue disponibles de futuras y sale impreso en la primera hoja
del PDF. Lo que no hice es la **página de herramientas reorganizada**. Nada
anuncia métodos sin implementar: recepciones, firdaria, decenios, direcciones
primarias, hyleg y casas derivadas están marcados como futuros.

**Punto 9 — sustancialmente cerrado.** Las reglas están centralizadas en
`escuelas.js` y `casas.js`; pantalla y PDF leen los mismos módulos y la misma
vista filtrada de la carta. Queda pendiente lo del punto 6.

**Punto 10 — no lo puedo hacer.** Sin GitHub desde aquí.

## Nota sobre las ayanamsas

Revisé una duda que yo mismo había planteado hace versiones: las constantes de
ayanamsa **están bien**. Guardan el valor en J2000 y se les suma la precesión de
la fecha de la carta, lo que hoy da 24°13′ para Lahiri, que es lo que muestra
Astro-Seek. Mi advertencia anterior era infundada.

## Pendiente y fuera de este paquete

La ampliación del catálogo de ciudades con GeoNames, como acordamos.
