(() => {
  'use strict';

  function isOrbits(){
    const app = document.getElementById('app');
    const btn = document.getElementById('btnOrbitas');
    return !!(app && (app.classList.contains('orbits') || btn?.getAttribute('aria-pressed') === 'true'));
  }

  function ensureBack(header){
    let back = header.querySelector('.astro-back');
    if(!back){
      back = document.createElement('button');
      back.type = 'button';
      back.className = 'astro-back';
      back.setAttribute('aria-label','Volver a Astroplanetario');
      back.innerHTML = '<span aria-hidden="true">←</span><span>Planetario</span>';
      back.addEventListener('click', () => { location.href = './'; });
      header.insertBefore(back, header.firstChild || null);
    }
    return back;
  }

  function ensureStatus(){
    const escena = document.getElementById('escena');
    if(!escena) return;
    let status = escena.querySelector('.orbit-status');
    if(!status){
      status = document.createElement('div');
      status.className = 'orbit-status';
      status.setAttribute('aria-hidden','true');
      status.innerHTML = '<span>Vista heliocéntrica</span><span>Escala orbital logarítmica</span><span>Tiempo configurable</span>';
      escena.appendChild(status);
    }
  }

  function clearStatus(){
    document.querySelector('.orbit-status')?.remove();
  }

  function sync(){
    const app = document.getElementById('app');
    if(!app) return;
    const active = isOrbits();
    app.classList.toggle('orbits', active);

    if(!active){
      clearStatus();
      return;
    }

    document.title = 'Órbitas · Astroplanetario';
    const marca = document.querySelector('.marca');
    if(marca){
      const h1 = marca.querySelector('h1');
      const sub = marca.querySelector('.sub');
      if(h1) h1.textContent = 'Astroplanetario';
      if(sub) sub.textContent = 'Órbitas · Sistema solar en vivo';
      const header = marca.closest('header');
      if(header) ensureBack(header);
    }

    ensureStatus();
    const pista = document.querySelector('.pista');
    if(pista){
      pista.textContent = matchMedia('(pointer:coarse)').matches
        ? 'Toca un planeta para abrir su ficha · pellizca para acercar'
        : 'Selecciona un planeta · rueda para acercar · controla el tiempo arriba';
    }
  }

  function boot(){
    sync();
    const app = document.getElementById('app');
    const btn = document.getElementById('btnOrbitas');
    if(app) new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});
    if(btn) new MutationObserver(sync).observe(btn,{attributes:true,attributeFilter:['aria-pressed']});
    ['btnOrbitas','btnRueda','btnNatal'].forEach(id => document.getElementById(id)?.addEventListener('click', () => setTimeout(sync,0)));
    setTimeout(sync,80);
    setTimeout(sync,260);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
