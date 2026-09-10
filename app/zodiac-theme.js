(() => {
  'use strict';

  function isZodiac(){
    const app = document.getElementById('app');
    const rueda = document.getElementById('btnRueda');
    return !!(app && (app.classList.contains('zodiac') || rueda?.getAttribute('aria-pressed') === 'true'));
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
    let status = escena.querySelector('.zodiac-status');
    if(!status){
      status = document.createElement('div');
      status.className = 'zodiac-status';
      status.setAttribute('aria-hidden','true');
      status.innerHTML = '<span>Vista geocéntrica</span><span>Zodiaco tropical</span><span>Posiciones en tiempo real</span>';
      escena.appendChild(status);
    }
  }

  function clearStatus(){
    document.querySelector('.zodiac-status')?.remove();
  }

  function sync(){
    const app = document.getElementById('app');
    if(!app) return;
    const active = isZodiac();
    app.classList.toggle('zodiac', active);

    if(!active){
      clearStatus();
      return;
    }

    document.title = 'Rueda zodiacal · Astroplanetario';
    const marca = document.querySelector('.marca');
    if(marca){
      const h1 = marca.querySelector('h1');
      const sub = marca.querySelector('.sub');
      if(h1) h1.textContent = 'Astroplanetario';
      if(sub) sub.textContent = 'Rueda zodiacal';
      const header = marca.closest('header');
      if(header) ensureBack(header);
    }

    ensureStatus();
    const pista = document.querySelector('.pista');
    if(pista){
      pista.textContent = matchMedia('(pointer:coarse)').matches
        ? 'Toca un astro para abrir su ficha'
        : 'Selecciona un astro · rueda del ratón para acercar';
    }
  }

  function boot(){
    sync();
    const app = document.getElementById('app');
    const rueda = document.getElementById('btnRueda');
    if(app) new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});
    if(rueda) new MutationObserver(sync).observe(rueda,{attributes:true,attributeFilter:['aria-pressed']});
    ['btnOrbitas','btnRueda','btnNatal'].forEach(id => document.getElementById(id)?.addEventListener('click', () => setTimeout(sync,0)));
    setTimeout(sync,80);
    setTimeout(sync,260);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
