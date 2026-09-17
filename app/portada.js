(function () {
  'use strict';
  const escenario = document.getElementById('escenario');
  if (!escenario) return;
  // Preserve inbound links that used the former planetarium homepage as a router.
  const params = new URLSearchParams(location.search);
  if (['orbitas', 'rueda', 'natal'].includes(params.get('view'))) {
    location.replace('/astroplanetario.html' + location.search + location.hash);
    return;
  }
  const slides = Array.from(escenario.querySelectorAll('[data-seccion]'));
  const buttons = Array.from(document.querySelectorAll('[data-ir]'));
  const rail = document.getElementById('secciones');
  const menu = document.getElementById('explorar');
  const contador = document.getElementById('numeroActual');
  const anuncio = document.getElementById('anuncioSeccion');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ids = slides.map(slide => slide.dataset.seccion);
  let current = 0;
  let animation;
  let pointer;
  let preloadToken = 0;

  function loadImage(index) {
    const img = slides[index]?.querySelector('.fondo');
    if (!img || !img.dataset.src) return;
    // Only the active and next scene are fetched, never all thirteen on entry.
    img.loading = 'eager';
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    delete img.dataset.src;
    delete img.dataset.srcset;
  }
  function nextImage() {
    const token = ++preloadToken;
    if (navigator.connection?.saveData) return;
    const preload = () => {
      if (token === preloadToken) loadImage((current + 1) % slides.length);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(preload, {timeout: 1800});
    else setTimeout(preload, 800);
  }
  function show(index, {announce = true, updateUrl = true, animate = true} = {}) {
    const previous = current;
    current = (index + slides.length) % slides.length;
    animation?.cancel();
    loadImage(current);
    const focusWasInSlide = slides.some(slide => slide.contains(document.activeElement));
    slides.forEach((slide, i) => {
      slide.hidden = i !== current;
      slide.inert = i !== current;
    });
    buttons.forEach(button => button.setAttribute('aria-current', String(button.dataset.ir === ids[current])));
    contador.textContent = String(current + 1).padStart(2, '0');
    if (announce) anuncio.textContent = `${current + 1} de ${slides.length}: ${slides[current].dataset.nombre}`;
    if (focusWasInSlide) escenario.focus({preventScroll: true});
    if (updateUrl) history.replaceState(null, '', location.pathname + location.search + '#' + ids[current]);
    const active = rail.querySelector(`[data-ir="${ids[current]}"]`);
    if (active) {
      const left = active.offsetLeft - rail.offsetLeft - (rail.clientWidth - active.offsetWidth) / 2;
      rail.scrollTo({left, behavior: reduced.matches || !animate ? 'instant' : 'smooth'});
    }
    if (animate && previous !== current && !reduced.matches && slides[current].animate) {
      const direction = index > previous ? 1 : -1;
      animation = slides[current].animate([
        {opacity: .35, transform: `translateX(${direction * 36}px)`},
        {opacity: 1, transform: 'translateX(0)'}
      ], {duration: 400, easing: 'cubic-bezier(.2,.7,.2,1)'});
    }
    nextImage();
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    const fromMenu = menu.contains(button);
    if (fromMenu) menu.open = false;
    show(ids.indexOf(button.dataset.ir));
    if (fromMenu) escenario.focus({preventScroll: true});
  }));
  document.getElementById('anterior').addEventListener('click', () => show(current - 1));
  document.getElementById('siguiente').addEventListener('click', () => show(current + 1));
  document.querySelectorAll('[data-salto]').forEach(link => link.addEventListener('click', event => {
    const index = ids.indexOf(link.dataset.salto);
    if (index < 0) return;
    event.preventDefault();
    show(index);
    escenario.focus({preventScroll: true});
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary').focus();
      return;
    }
    const inCarousel = escenario.contains(event.target) || event.target.closest('.navegador');
    if (!inCarousel || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.matches('input,textarea,select')) return;
    const indices = {ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: slides.length - 1};
    if (Object.hasOwn(indices, event.key)) {
      event.preventDefault();
      show(indices[event.key]);
      if (event.target.closest('.seccion-boton')) {
        rail.querySelector(`[data-ir="${ids[current]}"]`)?.focus({preventScroll: true});
      }
    }
  });
  document.addEventListener('click', event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  // Horizontal swipes only. Vertical page scrolling and selection of text remain native.
  escenario.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('a,button,summary')) return;
    pointer = {id: event.pointerId, x: event.clientX, y: event.clientY, t: performance.now()};
  });
  escenario.addEventListener('pointerup', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y, elapsed = performance.now() - pointer.t;
    pointer = null;
    if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.5 || elapsed > 1200 || window.getSelection()?.toString()) return;
    show(current + (dx < 0 ? 1 : -1));
  });
  escenario.addEventListener('pointercancel', () => {pointer = null;});
  escenario.addEventListener('pointerleave', () => {pointer = null;});
  window.addEventListener('hashchange', () => {
    const index = ids.indexOf(location.hash.slice(1));
    if (index >= 0) show(index, {updateUrl: false});
  });
  const initial = ids.indexOf(location.hash.slice(1));
  document.getElementById('navegador').hidden = false;
  document.getElementById('explorar').hidden = false;
  show(initial < 0 ? 0 : initial, {announce: false, updateUrl: false, animate: false});
})();
