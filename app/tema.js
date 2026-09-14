/* Interruptor de modo claro / oscuro compartido.
   Usa la misma llave que el resto del sitio. */
(function(){
"use strict";
const LLAVE="astro-studio-theme",raiz=document.documentElement;
let tema="light";
try{const g=localStorage.getItem(LLAVE);if(g==="light"||g==="dark")tema=g}catch(e){}
raiz.dataset.studioTheme=tema;
function arranca(){
  const b=document.getElementById("themeToggle");if(!b)return;
  function pinta(){b.textContent=tema==="dark"?"☀ Modo claro":"☾ Modo oscuro";b.setAttribute("aria-label",b.textContent)}
  pinta();
  b.addEventListener("click",()=>{tema=tema==="dark"?"light":"dark";raiz.dataset.studioTheme=tema;
    try{localStorage.setItem(LLAVE,tema)}catch(e){}pinta();
    window.dispatchEvent(new Event("astro-theme-change"))});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",arranca,{once:true});else arranca();
})();
