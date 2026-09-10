(() => {
  'use strict';
  const root = document.documentElement;
  let theme = 'dark';
  try { theme = localStorage.getItem('astro-studio-theme') === 'light' ? 'light' : 'dark'; } catch {}
  root.dataset.studioTheme = theme;
  function boot(){
    const host = document.querySelector('header');
    if(!host) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'studio-theme-toggle';
    function render(){
      button.textContent = theme === 'dark' ? '☀ Modo claro' : '☾ Modo oscuro';
      button.setAttribute('aria-label', 'Cambiar a modo ' + (theme === 'dark' ? 'claro' : 'oscuro'));
    }
    button.addEventListener('click', () => {
      theme = theme === 'dark' ? 'light' : 'dark';
      root.dataset.studioTheme = theme;
      try { localStorage.setItem('astro-studio-theme',theme); } catch {}
      render(); window.dispatchEvent(new Event('astro-theme-change'));
    });
    render(); host.append(button);
    window.dispatchEvent(new Event('astro-theme-change'));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
