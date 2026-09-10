# Saturno · línea de vida

Descomprime encima del repo, respetando las carpetas.

| Archivo | Qué es |
|---|---|
| `saturno.html` | **Nuevo.** La línea de vida: los ciclos de los planetas lentos fechados para una persona. |
| `app/efemerides.js` | Se le añadió el Nodo Norte medio, que hacía falta para los retornos nodales. |
| `index.html` | Saturno deja de decir «Próximamente» y lleva a su página. |
| `vercel.json` | `no-cache` para la página nueva. |

## Qué calcula

Treinta y ocho hitos en cien años, de seis ciclos: Saturno (retorno y sus tres cuadrantes),
Júpiter (retorno), Urano (cuadraturas, oposición y retorno), Neptuno (cuadratura y oposición),
Plutón (cuadratura) y los nodos (retorno y medio retorno).

Funciona con una carta guardada o escribiendo una fecha suelta: para estos ciclos no hace falta
la hora, porque ninguno depende del Ascendente.

## Comprobación

Con la carta de ejemplo del 21 de marzo de 1990: retorno de Saturno a los 29,8 (23 de enero de 2020,
cuando Saturno pasó de verdad por 23°50′ de Capricornio), oposición de Saturno a los 14,5,
retorno nodal a los 18,6 y cuadratura de Neptuno a los 41,2. Son las cifras de manual.

La oposición de Urano sale a los 44,5 y no a los 42 que suele citarse. No es un error: por la
excentricidad de la órbita de Urano, ese hito cae entre los 38 y los 46 años según en qué punto
estaba al nacer. Es de las cosas que se ven mejor con la herramienta que explicadas.

## Lo que deliberadamente no incluye

Quirón. Su órbita es inestable y el modelo aproximado que usa todo el proyecto no lo sostiene
con honradez, así que preferí dejarlo fuera antes que dar fechas que no se sostienen.
Si lo quieres, hay que traer efemérides de verdad para ese cuerpo.
