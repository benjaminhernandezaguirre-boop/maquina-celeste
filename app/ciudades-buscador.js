/* ===================== Buscador de ciudades =====================
   Sustituye el desplegable completo por un filtrado en memoria que
   pinta solo las coincidencias. Con esto el tamaño del catálogo deja
   de importar para la interfaz: 3 000 o 300 000 ciudades cuestan lo
   mismo en pantalla.

   Además carga app/ciudades.js solo cuando hace falta, la primera vez
   que alguien toca un campo de ciudad.

   Funciona con el marcado que ya existe, sin cambiarlo:
       <input list="ciudades"> + <datalist id="ciudades">

   Se expone como window.CiudadesBuscador. */
(function(root){
"use strict";

const TOPE = 40;                 // cuántas opciones se pintan como mucho
const MINIMO = 1;                // letras antes de empezar a buscar
const RUTA = "/app/ciudades.js";

let promesa = null, ultimo = null;

const normaliza = t => (root.Ciudades && root.Ciudades.normaliza)
  ? root.Ciudades.normaliza(t)
  : String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const listo = () => !!(root.Ciudades && root.Ciudades.lista && root.Ciudades.lista.length);

/* Carga el catálogo una sola vez. Devuelve siempre la misma promesa. */
function carga(){
  if (listo()) return Promise.resolve(root.Ciudades.lista);
  if (promesa) return promesa;
  promesa = new Promise(function(resuelve, rechaza){
    const ya = document.querySelector('script[data-ciudades]');
    if (ya){ ya.addEventListener("load", () => resuelve(root.Ciudades && root.Ciudades.lista)); return; }
    const s = document.createElement("script");
    s.src = RUTA; s.async = true; s.dataset.ciudades = "1";
    s.onload = () => resuelve(root.Ciudades && root.Ciudades.lista);
    s.onerror = () => { promesa = null; rechaza(new Error("No se pudo cargar el catálogo de ciudades.")); };
    document.head.appendChild(s);
  });
  return promesa;
}

/* Ordena poniendo delante lo que empieza por lo escrito. */
function coincidencias(texto){
  const q = normaliza(texto);
  if (!listo() || q.length < MINIMO) return [];
  const lista = root.Ciudades.lista, porNombre = [], porEtiqueta = [];
  for (let i = 0; i < lista.length; i++){
    const c = lista[i];
    if (normaliza(c.n).startsWith(q)) { porNombre.push(c); if (porNombre.length >= TOPE) break; }
    else if (porEtiqueta.length < TOPE && normaliza(c.etiqueta).includes(q)) porEtiqueta.push(c);
  }
  return porNombre.concat(porEtiqueta).slice(0, TOPE);
}

function pinta(datalist, texto){
  const q = normaliza(texto);
  if (q === ultimo) return;
  ultimo = q;
  if (!q){ datalist.replaceChildren(); return; }
  const frag = document.createDocumentFragment();
  for (const c of coincidencias(texto)){
    const o = document.createElement("option");
    o.value = c.etiqueta;
    frag.appendChild(o);
  }
  datalist.replaceChildren(frag);
}

/* Conecta todos los campos que apuntan a un datalist, presentes y futuros.
   idDatalist por omisión: "ciudades". */
function conecta(idDatalist){
  const id = idDatalist || "ciudades";
  const selector = 'input[list="' + id + '"]';

  function atiende(destino){
    const datalist = document.getElementById(id);
    if (!datalist) return;
    if (!listo()){
      carga().then(function(){ ultimo = null; pinta(datalist, destino.value); })
             .catch(function(){ /* el campo sigue usable escribiendo la etiqueta completa */ });
      return;
    }
    pinta(datalist, destino.value);
  }
  document.addEventListener("input",   e => { if (e.target.matches && e.target.matches(selector)) atiende(e.target); });
  document.addEventListener("focusin", e => { if (e.target.matches && e.target.matches(selector)) atiende(e.target); });
}

root.CiudadesBuscador = { TOPE, MINIMO, carga, listo, coincidencias, conecta, normaliza };
})(typeof window !== "undefined" ? window : globalThis);
