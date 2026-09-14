(() => {
"use strict";

const P = window.Planetas;
const nodos = [...document.querySelectorAll("[data-planeta-textura]")];
if (!P || !nodos.length) return;

const css = document.createElement("style");
css.textContent = `
  [data-planeta-textura]{position:relative;isolation:isolate}
  [data-planeta-textura]>.planeta-textura{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
  [data-planeta-textura]>.g{position:relative;z-index:2;transition:opacity .35s ease}
  [data-planeta-textura].textura-lista>.g,
  .jupiter-art.textura-lista:before{opacity:0}
  .jupiter-art:after{z-index:3}
`;
document.head.appendChild(css);

const dpr = Math.min(window.devicePixelRatio || 1, 2);
const quieto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const horaAcelerada = 3 * 60 * 60;
const planetas = nodos.map(el => {
  const canvas = document.createElement("canvas");
  canvas.className = "planeta-textura";
  canvas.setAttribute("aria-hidden", "true");
  el.appendChild(canvas);
  return {el, canvas, ctx: canvas.getContext("2d"), id: el.dataset.planetaTextura};
});

let anterior = -Infinity;
function dibuja(t) {
  requestAnimationFrame(dibuja);
  if (!quieto && t - anterior < 66) return;
  if (quieto && anterior !== -Infinity) return;
  anterior = t;
  const ahora = Date.now();

  for (const planeta of planetas) {
    const lado = Math.min(560, Math.max(80, Math.round(planeta.el.clientWidth * dpr)));
    if (planeta.canvas.width !== lado || planeta.canvas.height !== lado) {
      planeta.canvas.width = lado;
      planeta.canvas.height = lado;
    }
    const giro = quieto ? .18 : P.giroDe(planeta.id, ahora, horaAcelerada);
    const lista = P.pintaEsfera(planeta.ctx, planeta.id, lado / 2, lado / 2, lado * .49, {
      giro,
      ambiente: .25
    });
    planeta.el.classList.toggle("textura-lista", lista);
  }
}

requestAnimationFrame(dibuja);
})();
