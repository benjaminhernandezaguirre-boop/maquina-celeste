(() => {
  'use strict';

  function applyNatalIdentity(){
    const app = document.getElementById('app');
    if(!app || !app.classList.contains('natal')) return;

    document.title = 'Carta natal · Astroplanetario';

    const marca = document.querySelector('.marca');
    if(marca){
      const h1 = marca.querySelector('h1');
      const sub = marca.querySelector('.sub');
      if(h1) h1.textContent = 'Astroplanetario';
      if(sub) sub.textContent = 'Carta natal';

      const header = marca.closest('header');
      if(header && !header.querySelector('.astro-back')){
        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'astro-back';
        back.setAttribute('aria-label','Volver a Astroplanetario');
        back.innerHTML = '<span aria-hidden="true">←</span><span>Planetario</span>';
        back.addEventListener('click', () => { location.href = './'; });
        header.insertBefore(back, header.children[1] || null);
      }
    }

    const pista = document.querySelector('.pista');
    if(pista) pista.textContent = 'Arrastra la carta · rueda o pellizca para ampliar';
  }

  function boot(){
    applyNatalIdentity();
    const app = document.getElementById('app');
    if(app){
      new MutationObserver(applyNatalIdentity).observe(app,{attributes:true,attributeFilter:['class']});
    }
    setTimeout(applyNatalIdentity,80);
    setTimeout(applyNatalIdentity,260);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
