(function(){
  'use strict';
  function montar(){
    const cabecera=document.querySelector('header');
    let nav=document.querySelector('[data-astro-nav]');
    if(!nav && !cabecera)return;
    if(!nav){nav=document.createElement('nav');cabecera.appendChild(nav);}
    nav.classList.add('astro-site-nav');nav.setAttribute('aria-label','Explorar Astroplanetario');
    if(cabecera)cabecera.classList.add('astro-nav-host');
    nav.innerHTML=`<a class="astro-nav-directo" href="/herramientas">Todas las herramientas</a>
      <a class="astro-nav-predicciones" href="/predicciones">Predicciones</a>
      <details class="astro-nav-menu"><summary>Explorar <span aria-hidden="true">⌄</span></summary>
        <div class="astro-nav-panel"><p>Encuentra tu herramienta</p>
          <a href="/herramientas">Todas las herramientas <span>Ver el directorio</span></a>
          <a href="/carta-natal">Carta natal <span>Tu mapa de nacimiento</span></a>
          <a href="/predicciones">Predicciones <span>Ciclos, técnicas y horaria</span></a>
          <a href="/horoscopo-semanal">Horóscopo semanal <span>Amor, trabajo y dinero por signo</span></a>
          <a href="/herramientas#relaciones">Relaciones <span>Sinastría y carta compuesta</span></a>
          <a href="/herramientas#astrogeografia">Astrogeografía <span>Tu carta sobre el mundo</span></a>
          <a href="/herramientas#estudio-tradicion">Estudio y tradición <span>Dignidades y lotes</span></a>
          <a href="/herramientas#biblioteca">Biblioteca <span>Cartas célebres y guías</span></a>
          <a href="/">Volver al planetario <span>Explora los planetas</span></a>
        </div>
      </details>`;
    document.querySelectorAll('.astro-tools-fallback').forEach(a=>a.remove());
    const menu=nav.querySelector('details'),summary=menu.querySelector('summary');
    document.addEventListener('click',ev=>{if(menu.open&&!nav.contains(ev.target))menu.open=false;});
    document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&menu.open){menu.open=false;summary.focus();}});
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.open=false;}));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',montar,{once:true});else montar();
})();
