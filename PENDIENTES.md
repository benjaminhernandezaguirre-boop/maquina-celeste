# Astroplanetario · lo que falta

Lista de trabajo al 12 de septiembre de 2026. Marca las casillas conforme avances.
El tamaño es orientativo: **chico** es una tarde, **mediano** son varios días, **grande** es un módulo entero.

---

## 1. Arreglos pendientes

No hay errores visuales o de estructura conocidos con prioridad alta. El módulo Luna ya utiliza las
doce ilustraciones zodiacales reales, reserva espacio para su ficha y obtiene las ciudades del motor
compartido.

## 2. Las tres herramientas que más falta hacen

- [x] **Guardar varias cartas.** Hoy el navegador recuerda solo la última. Falta una lista con nombre, fecha y lugar; abrir cualquiera con un clic; borrarlas; y exportar o importar una carta como archivo, para que un alumno te mande la suya y tú la abras en el proyector. *(mediano)*
- [x] **Tránsitos en rueda doble.** Natal por dentro, cielo del día por fuera, lista de aspectos activos con su orbe y calendario de los que vienen. El motor ya existe: es el mismo mecanismo del atacir, cambiando el punto movido por la posición real de la fecha. *(mediano)*
- [x] **Sinastría y carta compuesta.** Dos cartas superpuestas y la reja de aspectos entre ambas. Pide antes tener resuelto el punto de guardar varias cartas. *(grande)*

## 3. Los módulos de planeta que la portada ya promete

Siete astros dicen «Próximamente». Este es el orden que yo seguiría:

- [x] **Mercurio · retrogradaciones.** Calendario con las fechas exactas de estación retrógrada y directa, el periodo de sombra, el signo, y qué toca de la carta natal del consultante. Es el tema más buscado de toda la astrología. *(mediano)*
- [x] **Saturno · línea de vida.** Retorno de Saturno a los 29 y 58, oposición de Urano a los 42, retorno de Quirón a los 50, cada uno con su fecha para esa persona. Se explica solo y engancha. *(mediano)*
- [x] **Venus · sinastría y ciclo de Venus.** La rosa de ocho años dibujada, las fases de lucero del alba y de la tarde, y sus retrogradaciones. *(mediano)*
- [ ] **Marte · tránsitos**, si prefieres colgarlos de ahí en vez de dejarlos en la carta natal. *(ya contado arriba)*
- [ ] **Júpiter · retornos** de cualquier planeta, no solo el suyo. *(mediano)*
- [ ] **Urano, Neptuno y Plutón · línea de tiempo generacional.** Cuándo entró cada uno en cada signo y qué pasaba en el mundo. Astrología mundana sin diapositivas. *(mediano)*
- [x] **Sol · revolución solar.** Ver el punto de precisión más abajo: hay que hacerlo después de afinar el Sol. *(grande)*  
  → hecho el 10 sep 2026, después de afinar el Sol.

## 4. Técnicas de cálculo que faltan

- [x] **Zodiaco sideral**, con selector de ayanamsa (Lahiri, Fagan-Bradley, Krishnamurti, Raman) y un botón para alternar con el tropical sobre la misma carta. Es restar un valor a todas las longitudes. *(chico)*  
  → hecho el 11 sep 2026, con las cuatro ayanamsas y el selector junto a las posiciones.
- [x] **Carta dracónica.** Rotar la carta hasta poner el Nodo Norte en 0° de Aries. *(chico)*  
  → hecha el 11 sep 2026, en el mismo selector de zodiaco.
- [x] **Progresiones secundarias**, un día igual a un año. *(chico)*  
  → hechas el 11 sep 2026, en la pestaña «Progresiones».
- [x] **Direcciones de arco solar** como vista propia. El cálculo ya está dentro del atacir; falta presentarlo aparte. *(chico)*  
  → hecho el 11 sep 2026, como segundo modo de la pestaña «Progresiones».
- [x] **Revolución solar y revolución lunar.** La lunar ya está en el módulo de Luna; falta la solar, con su propio selector de lugar, porque la persona no siempre cumple años donde nació. *(mediano, depende de la precisión del Sol)*  
  → la solar ya está, con selector de lugar.

## 4 bis. Astrocartografía · hecha el 10 sep 2026

`astrocarto.html`: mapa del mundo con las cuatro líneas de ángulo de cada planeta, cálculo en mundo o
zodiacal, qué líneas pasan por una ciudad, y por dónde pasa una línea. Lo que se le puede añadir cuando
quieras:

- [ ] **Paranes.** Los cruces entre dos líneas: dos planetas en ángulo a la vez en la misma latitud.
      Es la parte más fina del método y sale de lo que ya está calculado. *(mediano)*
- [ ] **Líneas de espacio local.** El azimut de cada planeta desde un punto: rectas que salen de la
      ciudad en abanico, en vez de curvas sobre el mundo. Otra escuela, otro dibujo. *(mediano)*
- [ ] **Reubicar la carta.** Levantar la carta natal completa para otra ciudad y comparar las dos
      ruedas lado a lado. Media hora de trabajo y se entiende de golpe qué es una relocación. *(chico)*
- [ ] **Zoom por continente.** Hoy el mapa es mundial; para una gira por Europa se querría acercar. *(mediano)*

## 5. Para dar clase

- [ ] **Modo clase.** Tipografía grande, paneles ocultos, el astro que señalas se ilumina, y la carta explicada por pasos: primero luminarias, luego Ascendente, luego aspectos. Ningún programa lo tiene, porque están hechos para el consultor y no para el maestro. *(mediano)*
- [ ] **Ficha en PDF para el alumno.** Ya exportas la rueda y la hoja en imagen; falta el PDF con la rueda, las tablas y los significados, listo para imprimir o entregar. *(mediano)*
- [ ] **Cuestionarios de práctica.** «¿En qué signo está la Luna?», «¿qué planeta rige esta casa?», sobre cartas reales o al azar, con puntaje. Reaprovecha todo lo que ya está hecho. *(mediano)*
- [ ] **Efemérides del mes, imprimibles.** Tabla del mes con ingresos, estaciones, lunaciones y luna vacía, en una hoja que puedas repartir. *(mediano)*

## 6. Cimientos

- [x] **Afinar la precisión del Sol.** Hoy andamos en fracciones de minuto de arco: de sobra para signos, casas y aspectos, pero corto para una revolución solar, donde medio minuto de arco mueve el instante del retorno unos diez minutos de reloj y corre el Ascendente dos o tres grados. Es trabajo acotado y conocido. *(mediano, bloquea la revolución solar)*  
  → hecho, y de paso apareció algo más gordo: faltaba la precesión de los equinoccios en todos los planetas, y ΔT. Ver ESTADO-DEL-PROYECTO.md.
- [ ] **Que se instale en el teléfono y funcione sin internet.** Un manifiesto y un service worker: el alumno le da «instalar» y le queda como app, y en el salón funciona aunque el wifi esté caído. *(chico, se nota mucho)*

## 7. Decisiones que dependen de ti

- [ ] **Criterio de las casas de exaltación y exilio.** Ahora se muestran las dos cosas rotuladas por separado: la correspondencia natural (la casa lleva el número del signo) y el gozo tradicional. Si tu academia enseña solo una, se quita la otra en un minuto.
- [ ] **El orbe del atacir.** Está en 1°. Dime si lo quieres más cerrado.
- [ ] **Claves de atacir extra.** ¿Dejo fijas también las de Tito Maciá —1° cada 25 días para el ciclo de Venus, 1° cada 73 para la escuela Huber—, o con las veintiséis actuales basta?
- [ ] **El tono de los significados.** ¿Te sirven como están para tus alumnos, o los quieres más largos, más cortos o más técnicos?

---

## Lo que ya está hecho, para no repetirlo

Portada Astroplanetario con carrusel · Órbitas con control de tiempo y ciudad · Rueda zodiacal ·
Carta natal con cuatro sistemas de casas, aspectos con orbes ajustables, nodos, Lilith y Parte de la
Fortuna · Significados de planeta en signo y en casa, Ascendente y aspectos · Atacires con veintiséis
claves agrupadas, rueda doble y calendario de contactos · Descarga de la rueda sola y de la hoja
completa · Módulo de Luna con fases, lunaciones, revolución lunar, luna vacía y luna progresada.

