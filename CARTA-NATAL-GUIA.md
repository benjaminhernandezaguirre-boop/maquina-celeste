# Guía de Carta Natal · renovación del 15 de septiembre de 2026

La entrada pública sigue en `/carta-natal`, con la calculadora en `/astroplanetario.html?view=natal`.

## Recorrido de la página

1. Introducción y rueda didáctica: signos, casas, diez cuerpos y aspectos. Los botones destacan cada capa y explican su función.
2. Qué es una carta natal, Sol/Luna/Ascendente y las cuatro piezas de lectura. La temporada zodiacal ocupa una ficha lateral compacta, con historia y cielo actual desplegables.
3. Cuatro elementos ilustrados y las tres modalidades, con la regla real del balance de la aplicación.
4. Modos normal/avanzado, perfiles de escuela, conceptos profesionales y descargas PNG/PDF.
5. Datos de entrada, carta sin hora, preguntas frecuentes y acceso final a calcular.

## Diseño y alcance

- Marfil, verde profundo y acentos por elemento; tema claro inicial y elección compartida de claro/oscuro.
- Las ilustraciones existentes de Aries, Tauro, Géminis y Piscis acompañan a fuego, tierra, aire y agua. Carga diferida y dimensiones declaradas.
- La rueda es SVG estático accesible. Se identifica como ejemplo didáctico: sus posiciones no pertenecen a una carta personal. JavaScript solo destaca capas; el dibujo y la guía siguen disponibles sin él.
- La ficha mantiene los doce signos estacionales, la historia y el cálculo lunar anterior. Su texto visible es breve y la referencia estacional identifica el hemisferio norte.
- `app/carta-natal-guia.css` contiene la presentación de la guía; `app/carta-natal-rueda.css` y `app/carta-natal-rueda.js` aíslan el componente didáctico.
- La página conserva canonical, datos estructurados, ruta y enlaces a calcular. Se retiran referencias a paquetes de desarrollo y al fragmento obsoleto de regencias.

La calculadora, sus cálculos y sus informes no se modifican. El contenido describe los cinco perfiles existentes y diferencia nivel de presentación, escuela, zodiaco y sistema de casas.

## Validación

262 pruebas existentes aprobadas; las cuatro pruebas SEO de Carta Natal también se vuelven a ejecutar tras finalizar el contenido. Revisión de HTML/JSON y referencias internas, rueda SVG con diez cuerpos, interacción con teclado, ficha desplegable y temas claro/oscuro. Comprobación visual en escritorio y a 390 × 844 píxeles, sin desbordamiento horizontal.
