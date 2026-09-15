(function(root){
  'use strict';
  const DESTINOS=Object.freeze({
    '/calculadora-lotes-arabigos':'Lotes arábigos',
    '/calculadora-profecciones':'Profecciones',
    '/calculadora-dignidades':'Dignidades',
    '/calculadora-liberacion-zodiacal':'Liberación zodiacal',
    '/astrocarto.html':'Astrocartografía',
    '/saturno.html':'Línea de vida',
    '/venus.html':'Venus y relaciones',
    '/mercurio.html':'Retrogradaciones',
    '/luna.html':'La Luna'
  });
  function destinoSeguro(busqueda){
    const ruta=new URLSearchParams(busqueda).get('returnTo');
    return Object.prototype.hasOwnProperty.call(DESTINOS,ruta)?{ruta,nombre:DESTINOS[ruta]}:null;
  }
  const api={DESTINOS,destinoSeguro};
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(!root.document)return;
  root.ContinuarCarta=api;
  function montar(){
    const destino=destinoSeguro(root.location.search),form=root.document.getElementById('natalForm');
    if(!destino||!form)return;
    const aviso=root.document.createElement('p');aviso.className='astro-retorno';aviso.id='continuarCartaAviso';
    const b=root.document.createElement('b');b.textContent='Crear carta y continuar con '+destino.nombre;aviso.appendChild(b);
    aviso.appendChild(root.document.createTextNode('Al guardar una carta nueva o abrir una guardada, volverás a esta herramienta. '));
    const cancelar=root.document.createElement('a');cancelar.href='/astroplanetario.html?view=natal';cancelar.textContent='Quedarme en Carta Natal';aviso.appendChild(cancelar);
    form.insertBefore(aviso,form.firstChild.nextSibling);
    root.document.addEventListener('astro:carta-lista',event=>{
      if(!event.detail?.guardada){
        aviso.textContent='La carta se calculó, pero este navegador no pudo guardarla. Permite el almacenamiento del sitio para continuar con '+destino.nombre+'.';
        form.parentElement?.classList.add('visible');
        return;
      }
      root.location.assign(destino.ruta);
    });
  }
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',montar,{once:true});else montar();
})(typeof window!=='undefined'?window:globalThis);
