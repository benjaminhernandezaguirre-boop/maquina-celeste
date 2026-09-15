/* The static SVG is the source of the illustration. JavaScript only selects focus. */
(() => {
  'use strict';
  const descriptions = {
    completa: ['Una rueda, cuatro capas.', 'Los signos rodean el mapa; las casas lo dividen; los planetas lo habitan y los aspectos los relacionan.'],
    signos: ['Signos: el cómo.', 'Doce sectores de 30° describen cualidades simbólicas. Sus colores agrupan los cuatro elementos: fuego, tierra, aire y agua.'],
    casas: ['Casas: el dónde.', 'Las doce áreas numeradas sitúan ámbitos de experiencia. AC marca el Ascendente y MC, el Medio Cielo; dependen de la hora y el lugar.'],
    planetas: ['Planetas: el qué.', 'Cada símbolo representa una función; el Sol y la Luna también se incluyen. El pequeño número indica su grado dentro del signo.'],
    aspectos: ['Aspectos: la relación.', 'Las líneas unen posiciones según su distancia angular. Aquí, azul verdoso señala trígonos y sextiles; terracota, cuadratura y oposición.']
  };

  function initializeWheel(wheel) {
    const controls = wheel.querySelector('.nrd-controls');
    const explanation = wheel.querySelector('[data-nrd-copy]');
    if (!controls || !explanation || wheel.dataset.nrdReady === 'true') return;
    const buttons = Array.from(controls.querySelectorAll('[data-nrd-show]'));
    if (!buttons.length) return;

    function selectView(view) {
      if (!Object.prototype.hasOwnProperty.call(descriptions, view)) return;
      wheel.dataset.nrdView = view;
      buttons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.nrdShow === view));
      });
      const [lead, copy] = descriptions[view];
      const strong = document.createElement('strong');
      strong.textContent = lead;
      explanation.replaceChildren(strong, document.createTextNode(' ' + copy));
    }

    buttons.forEach(button => {
      button.addEventListener('click', () => selectView(button.dataset.nrdShow));
    });
    wheel.dataset.nrdReady = 'true';
    controls.hidden = false;
  }

  function initialize() {
    document.querySelectorAll('[data-natal-rueda]').forEach(initializeWheel);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();

