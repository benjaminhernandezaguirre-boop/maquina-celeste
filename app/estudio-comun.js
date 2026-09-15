/* Shared presentation only. Calculation modules retain their nodes and events. */
(() => {
  'use strict';
  const body = document.body;
  const kind = body.dataset.estudio;
  if (!kind) return;
  const root = document.documentElement;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const routes = {profecciones:'/calculadora-profecciones',dignidades:'/calculadora-dignidades',liberacion:'/calculadora-liberacion-zodiacal',lotes:'/calculadora-lotes-arabigos',astrocarto:'/astrocarto.html',mercurio:'/mercurio.html',venus:'/venus.html',saturno:'/saturno.html',luna:'/luna.html'};
  function createChartLink() {
    const link = el('a', 'estudio-link', 'Crear carta y continuar');
    link.href = '/astroplanetario.html?view=natal&returnTo=' + encodeURIComponent(routes[kind]);
    return link;
  }
  function theme() {
    if (kind === 'astrocarto' || document.querySelector('#themeToggle,.studio-theme-toggle')) return;
    let saved = 'light';
    try { if (localStorage.getItem('astro-studio-theme') === 'dark') saved = 'dark'; } catch (_) {}
    root.dataset.studioTheme = saved;
    const button = el('button', 'studio-theme-toggle');
    button.type = 'button';
    const paint = () => {
      button.textContent = root.dataset.studioTheme === 'dark' ? '☀ Modo claro' : '☾ Modo oscuro';
      button.setAttribute('aria-label', button.textContent);
    };
    button.addEventListener('click', () => {
      root.dataset.studioTheme = root.dataset.studioTheme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('astro-studio-theme', root.dataset.studioTheme); } catch (_) {}
      paint();
      window.dispatchEvent(new Event('astro-theme-change'));
    });
    paint(); document.querySelector('header')?.append(button);
  }
  let tabCount = 0;
  function tabs(host, groups, label) {
    groups = groups.filter(group => group.nodes.length);
    if (!groups.length) return;
    const nav = el('div', 'estudio-tabs');
    nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', label);
    const panes = [], buttons = [];
    groups.forEach((group, i) => {
      const id = 'estudio-' + kind + '-' + (++tabCount);
      const button = el('button', 'estudio-tab', group.label);
      button.type = 'button'; button.id = id + '-tab';
      button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', id);
      const pane = el('div', 'estudio-pane'); pane.id = id;
      pane.setAttribute('role', 'tabpanel'); pane.setAttribute('aria-labelledby', button.id);
      pane.tabIndex = 0;
      group.nodes.forEach(node => pane.append(node));
      button.addEventListener('click', () => activate(i));
      nav.append(button); buttons.push(button); panes.push(pane);
    });
    function activate(index, focus = false) {
      panes.forEach((pane, i) => { pane.hidden = i !== index; });
      buttons.forEach((button, i) => {
        button.setAttribute('aria-selected', String(i === index));
        button.tabIndex = i === index ? 0 : -1;
      });
      panes[index].querySelector('details.formula-avanzada')?.setAttribute('open', '');
      if (focus) buttons[index].focus();
    }
    nav.addEventListener('keydown', event => {
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % buttons.length;
      if (event.key === 'ArrowLeft') next = (i - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next !== undefined) { event.preventDefault(); activate(next, true); }
    });
    host.append(nav, ...panes); activate(0);
  }
  function resultNavigation() {
    const output = document.getElementById('salida');
    if (!output || !['lotes','profecciones','liberacion'].includes(kind)) return;
    function followResult(event) {
      // Native buttons dispatch their own click on Enter/Space. The lot card
      // is a role=button article whose existing module handles keydown.
      if (event.type === 'keydown' && (kind !== 'lotes' || !['Enter',' '].includes(event.key))) return;
      let target;
      if (kind === 'lotes' && event.target.closest('#resultados [data-lote]')) {
        target = document.getElementById('ruedaLotes');
      } else if (event.type === 'click' && ['profecciones','liberacion'].includes(kind) && event.target.closest('[data-ir]')) {
        target = document.getElementById(kind === 'profecciones' ? 'anillo' : 'ruedaTiempo');
      }
      const pane = target?.closest('.estudio-pane');
      if (!pane) return;
      // Reveal before the calculation module redraws or scrolls. Keep its
      // delegated event untouched so selection and date changes still run.
      document.getElementById(pane.getAttribute('aria-labelledby'))?.click();
      queueMicrotask(() => {
        if (pane.closest('[hidden]')) return;
        target.setAttribute('tabindex', '-1');
        target.focus({preventScroll:true});
        target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
      });
    }
    output.addEventListener('click', followResult, true);
    output.addEventListener('keydown', followResult, true);
  }
  function dataEditor() {
    const panel = document.querySelector('main.ancho > section.panel');
    if (!panel) return;
    panel.classList.add('estudio-datos');
    const details = el('details', 'estudio-editor');
    const summary = el('summary');
    summary.append(el('strong', '', 'Carta y opciones'), el('span', 'estudio-carta-nombre', 'Elige o introduce los datos de nacimiento'));
    const content = el('div', 'estudio-editor-contenido');
    const heading = panel.querySelector(':scope > h2');
    if (heading) heading.remove();
    while (panel.firstChild) content.append(panel.firstChild);
    details.append(summary, content); panel.append(details);
    const output = document.getElementById('salida');
    details.open = !output || output.hidden;
    const chart = document.getElementById('cartaSelect');
    const updateName = () => {
      const manual = document.getElementById('panelManual');
      const name = manual && !manual.hidden ? document.getElementById('nNombre')?.value || 'Datos nuevos' : chart?.selectedOptions[0]?.textContent;
      summary.querySelector('span').textContent = name || 'Elige o introduce los datos de nacimiento';
    };
    content.addEventListener('change', updateName);
    if (output) new MutationObserver(() => { if (!output.hidden) { details.open = false; updateName(); } }).observe(output, {attributes:true, attributeFilter:['hidden']});
    if (!output?.hidden) updateName();
    const sourceButtons = [...document.querySelectorAll('[data-fuente]')];
    const syncSource = () => sourceButtons.forEach(button => {
      const selected = button.classList.contains('activo');
      button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(selected));
      button.setAttribute('aria-controls', button.dataset.fuente === 'manual' ? 'panelManual' : 'panelGuardada');
      button.tabIndex = selected || button.disabled ? -1 : 0;
      if (selected) button.tabIndex = 0;
    });
    sourceButtons.forEach(button => {
      new MutationObserver(syncSource).observe(button, {attributes:true, attributeFilter:['class','disabled']});
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
        const other = sourceButtons.find(candidate => candidate !== button && !candidate.disabled);
        if (other) { event.preventDefault(); other.click(); other.focus(); }
      });
    });
    syncSource();
    if (kind === 'lotes' && !panel.querySelector('.estudio-link')) content.append(createChartLink());
  }
  function technicalTabs() {
    const output = document.getElementById('salida');
    if (!output) return;
    const direct = [...output.children];
    if (kind === 'lotes') {
      const get = selector => direct.filter(node => node.matches(selector));
      tabs(output, [
        {label:'Explorador',nodes:get('.explorador')},
        {label:'Interpretación',nodes:get('.resultados-cabecera,.resultados')},
        {label:'Fórmula propia',nodes:get('.formula-avanzada')}
      ], 'Secciones de lotes arábigos');
      return;
    }
    const sections = direct.filter(node => node.tagName === 'SECTION');
    const labels = {
      profecciones:['Año activo','Planetas activados','Doce meses','Vida completa'],
      dignidades:['Planetas','Ángulos','Almutén'],
      liberacion:['Periodo activo','Capítulos L1','Temporadas L2','Lectura','Transiciones']
    }[kind];
    if (labels) tabs(output, sections.map((node,i) => ({label:labels[i], nodes:[node]})), 'Resultados del estudio');
  }
  function planetWorkspace() {
    if (!['mercurio','venus','saturno'].includes(kind)) return;
    const shell = document.querySelector('.shell');
    const panels = [...shell.querySelectorAll(':scope > section.panel')];
    if (!panels.length) return;
    const workspace = el('main', 'estudio-workspace');
    const main = el('section', 'estudio-principal'); main.setAttribute('aria-label','Explorador del estudio');
    const sidebar = el('aside', 'estudio-sidebar'); sidebar.setAttribute('aria-label','Datos y estado actual');
    shell.insertBefore(workspace, panels[0]);
    sidebar.append(panels.shift());
    if (kind === 'mercurio') {
      const natal = document.getElementById('panelNatal');
      const natalNodes = [natal];
      if (natal.hidden) {
        const empty = el('section','panel estudio-vacio');
        empty.append(el('h2','','Estudia tu carta'),el('p','','Guarda una carta natal para ver qué planetas toca este ciclo de Mercurio.'),createChartLink());
        natalNodes.push(empty);
      } else natal.append(createChartLink());
      tabs(main,[{label:'Ciclo actual',nodes:[panels[0]]},{label:'Calendario',nodes:[panels[2]]},{label:'Tu carta',nodes:natalNodes}], 'Estudio de Mercurio');
    } else if (kind === 'venus') {
      tabs(main,panels.map((node,i)=>({label:['Rosa de Venus','Conjunciones','Retrogradaciones','Sinastría'][i],nodes:[node]})), 'Estudio de Venus');
    } else {
      sidebar.prepend(el('h2','estudio-sidebar-titulo','Carta y fecha de nacimiento'));
      sidebar.append(createChartLink());
      tabs(main,panels.map((node,i)=>({label:['Línea de vida','Cuenta completa'][i],nodes:[node]})), 'Ciclos planetarios');
    }
    workspace.append(main, sidebar);
  }
  function moonAccessibility() {
    if (kind !== 'luna') return;
    const nav = document.querySelector('.main > .tabs');
    nav.setAttribute('role','tablist');
    const buttons = [...nav.querySelectorAll('[data-tab]')];
    const sync = () => buttons.forEach(button => {
      button.id = 'luna-tab-' + button.dataset.tab;
      button.setAttribute('role','tab');
      button.setAttribute('aria-controls','panel-' + button.dataset.tab);
      button.tabIndex = button.getAttribute('aria-selected') === 'true' ? 0 : -1;
      const panel = document.getElementById('panel-' + button.dataset.tab);
      panel.setAttribute('role','tabpanel'); panel.setAttribute('aria-labelledby',button.id);
    });
    buttons.forEach(button => new MutationObserver(sync).observe(button,{attributes:true,attributeFilter:['aria-selected']}));
    nav.addEventListener('keydown', event => {
      const i = buttons.indexOf(document.activeElement);
      if (i < 0 || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
      event.preventDefault(); buttons[next].click(); buttons[next].focus();
    });
    sync();
  }
  theme();
  dataEditor(); technicalTabs(); planetWorkspace(); moonAccessibility(); resultNavigation();
})();
