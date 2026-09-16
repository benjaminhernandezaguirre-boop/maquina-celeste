/* Felicitación editorial por temporada. Usa el calendario local de hoy,
   nunca la fecha de nacimiento ni el reloj de las calculadoras. */
(function(root){
  'use strict';
  const signos=Object.freeze([
    {slug:'aries',nombre:'Aries',elemento:'fuego',inicio:321,fin:420},
    {slug:'tauro',nombre:'Tauro',elemento:'tierra',inicio:420,fin:521},
    {slug:'geminis',nombre:'Géminis',elemento:'aire',inicio:521,fin:621},
    {slug:'cancer',nombre:'Cáncer',elemento:'agua',inicio:621,fin:723},
    {slug:'leo',nombre:'Leo',elemento:'fuego',inicio:723,fin:823},
    {slug:'virgo',nombre:'Virgo',elemento:'tierra',inicio:823,fin:923},
    {slug:'libra',nombre:'Libra',elemento:'aire',inicio:923,fin:1023},
    {slug:'escorpio',nombre:'Escorpio',elemento:'agua',inicio:1023,fin:1122},
    {slug:'sagitario',nombre:'Sagitario',elemento:'fuego',inicio:1122,fin:1222},
    {slug:'capricornio',nombre:'Capricornio',elemento:'tierra',inicio:1222,fin:120},
    {slug:'acuario',nombre:'Acuario',elemento:'aire',inicio:120,fin:219},
    {slug:'piscis',nombre:'Piscis',elemento:'agua',inicio:219,fin:321}
  ].map(Object.freeze));
  function signoDeFecha(fecha=new Date()){
    if(!fecha||typeof fecha.getTime!=='function'||!Number.isFinite(fecha.getTime()))return null;
    const md=(fecha.getMonth()+1)*100+fecha.getDate();
    return signos.find(s=>s.inicio<s.fin?md>=s.inicio&&md<s.fin:md>=s.inicio||md<s.fin)||null;
  }
  const api={signos,signoDeFecha};
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(!root.document)return;
  root.AstroCumpleanos=api;
  let temporizador=null,ultimoDia='';
  function actualizar(){
    const fecha=new Date(),signo=signoDeFecha(fecha);
    if(!signo)return;
    const hosts=root.document.querySelectorAll('[data-cumpleanos]');
    if(!hosts.length)return;
    for(const host of hosts){
      host.classList.add('cumpleanos-banner');
      let enlace=host.querySelector('.cumpleanos-enlace');
      if(!enlace){
        enlace=root.document.createElement('a');
        enlace.className='cumpleanos-enlace';
        host.appendChild(enlace);
      }
      enlace.href='/horoscopo-semanal/'+signo.slug;
      enlace.setAttribute('aria-label','¡Feliz cumpleaños, '+signo.nombre+'! Ver el horóscopo semanal de '+signo.nombre+'.');
      enlace.title='Ver el horóscopo semanal de '+signo.nombre;
      let imagen=host.querySelector('img');
      if(!imagen){
        imagen=root.document.createElement('img');
        imagen.width=840;imagen.height=280;imagen.decoding='async';
        // Una sola imagen vigente. No precargar las otras once temporadas.
        imagen.loading='eager';imagen.fetchPriority='low';
      }
      if(imagen.parentNode!==enlace)enlace.appendChild(imagen);
      if(host.dataset.signo!==signo.slug){
        host.dataset.signo=signo.slug;host.dataset.elemento=signo.elemento;
        imagen.alt='¡Feliz cumpleaños, '+signo.nombre+'!';
        imagen.src='/assets/cumpleanos/'+signo.slug+'.webp?v=20260915';
      }
    }
    const dia=fecha.getFullYear()+'-'+fecha.getMonth()+'-'+fecha.getDate();
    if(dia!==ultimoDia){
      ultimoDia=dia;
      root.dispatchEvent(new CustomEvent('astro-temporada',{detail:{signo,fecha}}));
    }
    root.clearTimeout(temporizador);
    const siguiente=new Date(fecha.getFullYear(),fecha.getMonth(),fecha.getDate()+1);
    temporizador=root.setTimeout(actualizar,siguiente.getTime()-fecha.getTime()+100);
  }
  api.actualizar=actualizar;
  root.document.addEventListener('visibilitychange',()=>{if(!root.document.hidden)actualizar();});
  root.addEventListener('pageshow',actualizar);
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',actualizar,{once:true});else actualizar();
})(typeof window!=='undefined'?window:globalThis);
