# Ruedas comparadas · septiembre de 2026

La carta A ocupa la banda interior azul y B la exterior cobre. Cada banda conserva planetas, cúspides y ejes independientes. Las líneas de casas terminan dentro de su banda; el centro queda libre para aspectos cruzados. Las posiciones próximas se separan visualmente mediante líneas guía hacia su longitud real, sin desplazar sus coordenadas ni sus aspectos.

## Qué se representa en cada técnica

| Técnica | Casas exteriores |
| --- | --- |
| Sinastría | Las de B, calculadas con su fecha, hora, lugar y la escuela activa. Sin hora de B se omiten sus casas y ángulos. |
| Revolución solar | Las del retorno exacto, con el lugar natal o el lugar elegido para la revolución. |
| Secundarias | MC dirigido por arco solar; ASC derivado del MC y la latitud natal; casas calculadas con el sistema activo y la ayanamsa del instante progresado. Es una convención explícita de progresión de ángulos. |
| Arco solar | Las cúspides y los ejes natales trasladados uniformemente por el arco solar verdadero. Son casas dirigidas, no casas de un evento geográfico. |
| Atacir | Las cúspides y los ejes natales trasladados por el arco de la clave elegida. Se conservan las anchuras originales de las casas. |
| Tránsitos | Solo planetas exteriores sobre las casas natales. El formulario actual elige un día y no define un evento con hora y lugar propios. No se inventan casas del tránsito. |
| Compuesta | Una rueda propia con sus casas derivadas; no se mezcla con los dos juegos natales. |

ASC/MC/DSC/IC proceden de los ángulos calculados: no se sustituyen por las cúspides I/X/VII/IV. Esto importa en signos enteros e iguales. Se mantienen los avisos de sustitución del sistema en latitudes polares.

## Graduación e interacción

- Cada signo tiene 30 marcas de un grado; destacan 5° y 10°. El límite 30° de un signo coincide con 0° del siguiente. Las casas no se fuerzan a medir 30°.
- El origen zodiacal común es el de la carta A, igual que en las tablas existentes. Las longitudes tropicales del motor se conservan; la graduación usa el mismo desfase del anillo zodiacal. No se ofrece un origen dracónico independiente por persona.
- Al tocar o seleccionar un punto se identifica A/B y se muestran su casa en cada carta y sus contactos dentro del orbe de la rueda. El selector también permite consultar los cuatro ejes sin depender del clic en el lienzo.
- Ambas poblaciones respetan la escuela. Los transaturninos opcionales llevan † y quedan fuera de los aspectos del marco tradicional.
- El móvil reserva más espacio a la rueda y permite plegar el panel con «Ver rueda completa».

## Exportación y mantenimiento

«Descargar rueda» y «Hoja completa» emplean el mismo pintor que la pantalla. Hay además un PDF independiente de comparación, de una página A4. El informe natal avanzado mantiene su alcance natal; no incluye la revolución solar.

`app/natal-birrueda.js` separa la geometría y el dibujo del estado de la página. `app/natal-capas.js` prepara casas dirigidas y aplica la población de la escuela. Las cachés de sinastría, retorno y progresiones incluyen la configuración de lectura. La clave libre de atacir incluye su velocidad en la firma.

Las pruebas cubren cúspides independientes, cruce 359°/0°, grupos densos, ausencia de hora, ángulos distintos de las cúspides, marcas siderales, selección por capa y renovación de cachés. Durante la prueba de reapertura se corrigió también el campo de coordenadas para aceptar los cinco decimales de GeoNames, sin redondear ni bloquear el formulario.

## Referencias de convenciones

- [Tipos de cartas de Astrodienst](https://www.astro.com/faq/fq_fh_owtype_e.htm): sinastría, natal con revolución y superposición de tránsitos.
- [Métodos de casas progresadas de Astro Gold](https://www.astrogold.io/ufaq/when-i-do-a-progressed-chart-in-astro-gold-why-does-it-give-me-an-ascendant-a-few-degrees-different-than-the-one-calculated-by-some-other-software/).
- [Convención de progresiones de TimePassages](https://support.astrograph.com/support/solutions/articles/66000519170-why-are-timepassage-s-secondary-progressions-different-than-astro-com-s-).
- [Manual de atacires de Tito Maciá](https://titomacia.net/2021/05/27/manual-manejo-programa-kepler-calculo-de-los-atacires/).
- [Métodos de carta compuesta](https://www.astro.com/faq/fq_fh_compo_e.htm).
