/* Mejora progresiva del directorio. Las fichas y sus enlaces viven en el HTML. */
(function(){
  'use strict';
  const form=document.getElementById('filtrosHerramientas');
  if(!form)return;
  const search=document.getElementById('buscarHerramienta');
  const family=document.getElementById('familiaHerramienta');
  const format=document.getElementById('tipoHerramienta');
  const status=document.getElementById('resultadoHerramientas');
  const empty=document.getElementById('sinHerramientas');
  const sections=Array.from(document.querySelectorAll('[data-familia]'));
  const cards=Array.from(document.querySelectorAll('[data-herramienta]'));
  const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
  const index=cards.map(card=>({card,text:normalize(card.textContent+' '+(card.dataset.busqueda||'')),family:card.closest('[data-familia]').dataset.familia}));
  let announceTimer;
  function filter(){
    const words=normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let count=0;
    index.forEach(item=>{
      const visible=(!family.value||item.family===family.value)&&(!format.value||item.card.dataset.tipo===format.value)&&words.every(word=>item.text.includes(word));
      item.card.hidden=!visible;if(visible)count++;
    });
    sections.forEach(section=>{section.hidden=!Array.from(section.querySelectorAll('[data-herramienta]')).some(card=>!card.hidden)});
    empty.hidden=count!==0;
    clearTimeout(announceTimer);
    announceTimer=setTimeout(()=>{status.textContent=count===cards.length?'19 accesos en 6 familias':count+' '+(count===1?'acceso encontrado':'accesos encontrados');},150);
  }
  function reset(){search.value='';family.value='';format.value='';filter()}
  form.hidden=false;
  form.addEventListener('submit',event=>event.preventDefault());
  search.addEventListener('input',filter);
  family.addEventListener('change',filter);
  format.addEventListener('change',filter);
  document.querySelectorAll('[data-limpiar-filtros]').forEach(button=>button.addEventListener('click',()=>{reset();search.focus()}));
  // Los enlaces de familia conservan su navegación nativa, incluso sin JavaScript.
  // Limpiamos los filtros para que el destino del enlace siempre esté visible.
  document.querySelectorAll('[data-ir-familia]').forEach(link=>link.addEventListener('click',reset));
  window.addEventListener('hashchange',()=>{if(sections.some(section=>'#'+section.id===location.hash))reset()});
  filter();
})();
