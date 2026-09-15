const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {DESTINOS, destinoSeguro} = require('../app/continuar-carta.js');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const natal = read('astroplanetario.html');
const origin = 'https://astroplanetario.com';
const rewrites = JSON.parse(read('vercel.json')).rewrites;
const plain = value => JSON.parse(JSON.stringify(value));
const hrefs = source => Array.from(source.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi), m => m[1].replaceAll('&amp;', '&'));

function fileFor(url) {
  const destination = rewrites.find(rule => rule.source === url.pathname)?.destination || url.pathname;
  return destination === '/' ? 'index.html' : destination.replace(/^\//, '');
}

function section(start, end) {
  const first = natal.indexOf(start), last = natal.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first, `Bloque de producción disponible: ${start}`);
  return natal.slice(first, last);
}

function node() {
  const listeners = new Map(), classes = new Set(), attributes = new Map();
  return {
    children: [], hidden: false, textContent: '',
    classList: {add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x)},
    appendChild(child) { this.children.push(child); return child; },
    insertBefore(child) { this.children.unshift(child); },
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute: name => attributes.get(name),
    addEventListener(name, callback) { listeners.set(name, callback); },
    click() { listeners.get('click')?.({target: this}); }
  };
}

test('returnTo acepta las herramientas permitidas y todas tienen una ruta existente', () => {
  assert.ok(Object.keys(DESTINOS).length >= 4);
  for (const [ruta, nombre] of Object.entries(DESTINOS)) {
    assert.deepEqual(destinoSeguro('?view=natal&returnTo=' + encodeURIComponent(ruta)), {ruta, nombre});
    assert.ok(fs.existsSync(path.join(root, fileFor(new URL(ruta, origin)))), ruta);
  }
});

test('returnTo rechaza destinos externos, rutas alteradas y propiedades heredadas', () => {
  const invalid = ['', 'https://example.org', '//example.org', 'javascript:alert(1)',
    'https://astroplanetario.com/calculadora-lotes-arabigos', '\\example.org',
    '/calculadora-lotes-arabigos/../otra', '/calculadora-lotes-arabigos/',
    '/calculadora-lotes-arabigos?next=//example.org', '/calculadora-lotes-arabigos#otro',
    '/calculadora-lotes-arabigos\n', '/CALCULADORA-LOTES-ARABIGOS',
    '%2Fcalculadora-lotes-arabigos', 'constructor', 'toString', '__proto__', '/no-existe'];
  for (const ruta of invalid) assert.equal(destinoSeguro('?returnTo=' + encodeURIComponent(ruta)), null, ruta);
  assert.equal(destinoSeguro('?view=natal'), null);
  assert.equal(destinoSeguro('?returnTo=%E0%A4%A'), null);
  assert.equal(destinoSeguro('?returnTo=//example.org&returnTo=/calculadora-lotes-arabigos'), null);
});

function returnFlow({search = '?view=natal&returnTo=%2Fcalculadora-lotes-arabigos', saved = true, valid = true} = {}) {
  const listeners = new Map(), nodes = new Map(), redirects = [], events = [], records = [];
  const get = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const form = get('natalForm');
  form.firstChild = {nextSibling: {}};
  form.parentElement = get('velo');
  const document = {
    readyState: 'complete', getElementById: get, createElement: node,
    createTextNode: textContent => ({textContent}),
    addEventListener: (name, fn) => listeners.set(name, fn),
    dispatchEvent(event) { events.push(event); listeners.get(event.type)?.(event); }
  };
  const window = {document, location: {search, assign: ruta => redirects.push(ruta)}};
  const context = vm.createContext({window, document, URLSearchParams,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    estadoAtacir: {}, estadoRS: {}, estadoProg: {}, estadoTransitos: {},
    validaCarta() { if (!valid) throw new Error('Datos incompletos'); },
    localAUTC: () => 0, textoDesfase: () => 'UTC', levantarCarta() {}, guardaUltima() {},
    guardaEnLista() { if (saved) records.push({id: 'carta-ejemplo'}); return 'carta-ejemplo'; },
    leerCartas: () => records, pintaCarta() {}, pintaBarra() {}, pintaGuardadas() {},
    velo: get('velo'), volverASinastria: false, zoom: 2
  });
  vm.runInContext(read('app/continuar-carta.js'), context);
  vm.runInContext(section('function aplicaCarta(datos){', 'function llenaFormulario(d){'), context);
  return {context, form, nodes, redirects, events, apply: () => context.aplicaCarta({tz: 'UTC'})};
}

test('crear una carta guardada activa el retorno solo al completar aplicaCarta', () => {
  const flow = returnFlow();
  assert.deepEqual(flow.redirects, [], 'No redirige al cargar el formulario');
  assert.equal(flow.form.children[0].id, 'continuarCartaAviso');
  flow.apply();
  assert.deepEqual(flow.events.map(event => plain(event.detail)), [{guardada: true}]);
  assert.deepEqual(flow.redirects, ['/calculadora-lotes-arabigos']);
});

test('si la carta no queda guardada, conserva el formulario y explica cómo continuar', () => {
  const flow = returnFlow({saved: false});
  flow.apply();
  assert.deepEqual(flow.events.map(event => plain(event.detail)), [{guardada: false}]);
  assert.deepEqual(flow.redirects, []);
  assert.equal(flow.form.parentElement.classList.contains('visible'), true);
  assert.match(flow.form.children[0].textContent, /no pudo guardarla/);
  assert.match(flow.form.children[0].textContent, /Lotes arábigos/);
});

test('una carta inválida no emite el evento de retorno', () => {
  const flow = returnFlow({valid: false});
  flow.apply();
  assert.deepEqual(flow.events, []);
  assert.deepEqual(flow.redirects, []);
  assert.equal(flow.nodes.get('nError').textContent, 'Datos incompletos');
});

test('quedarse en Carta Natal elimina returnTo; un destino inválido nunca monta el retorno', () => {
  const flow = returnFlow();
  const cancel = flow.form.children[0].children.find(child => child.href);
  const url = new URL(cancel.href, origin);
  assert.equal(url.searchParams.get('view'), 'natal');
  assert.equal(url.searchParams.has('returnTo'), false);
  const invalid = returnFlow({search: '?view=natal&returnTo=//example.org'});
  invalid.apply();
  assert.equal(invalid.form.children.length, 0);
  assert.deepEqual(invalid.redirects, []);
});

test('las nuevas rutas limpias y sus variantes con barra apuntan a páginas existentes', () => {
  for (const route of ['/herramientas', '/predicciones', '/astrologia-horaria']) {
    for (const suffix of ['', '/']) {
      const rule = rewrites.find(item => item.source === route + suffix);
      assert.ok(rule, route + suffix);
      assert.ok(fs.existsSync(path.join(root, rule.destination.slice(1))), rule.destination);
    }
  }
});

test('el directorio, las guías y el menú compartido no tienen destinos ni anclas rotos', () => {
  for (const file of ['herramientas.html', 'predicciones.html', 'astrologia-horaria.html', 'app/navegacion.js']) {
    const base = new URL(file.startsWith('app/') ? '/' : '/' + file, origin);
    for (const href of hrefs(read(file))) {
      const url = new URL(href, base);
      if (url.origin !== origin) continue;
      const target = fileFor(url);
      assert.ok(fs.existsSync(path.join(root, target)), `${file}: ${href}`);
      if (url.hash) {
        const ids = new Set(Array.from(read(target).matchAll(/\bid=["']([^"']+)["']/g), match => match[1]));
        assert.ok(ids.has(decodeURIComponent(url.hash.slice(1))), `${file}: ancla ${href}`);
      }
    }
  }
});

test('los enlaces de continuar de las cuatro calculadoras vuelven a la misma herramienta', () => {
  const pages = {
    'lotes-arabigos-calculadora.html': '/calculadora-lotes-arabigos',
    'profecciones-calculadora.html': '/calculadora-profecciones',
    'dignidades-calculadora.html': '/calculadora-dignidades',
    'liberacion-zodiacal-calculadora.html': '/calculadora-liberacion-zodiacal'
  };
  for (const [file, ruta] of Object.entries(pages)) {
    const links = hrefs(read(file)).map(href => new URL(href, origin)).filter(url => url.searchParams.has('returnTo'));
    assert.ok(links.length, `${file}: falta crear y continuar`);
    for (const link of links) {
      assert.equal(link.pathname, '/astroplanetario.html');
      assert.equal(link.searchParams.get('view'), 'natal');
      assert.equal(destinoSeguro(link.search)?.ruta, ruta);
    }
  }
});

function openTechnique(tab) {
  const nodes = new Map(), timeouts = [], paints = [];
  const get = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const document = {readyState: 'complete', getElementById: get,
    querySelector: selector => selector === '.opcion[data-vista="natal"]' ? {click() {}} : null};
  const context = vm.createContext({document, URLSearchParams, location: {search: '?view=natal&tab=' + tab},
    setTimeout: fn => timeouts.push(fn), solicitudLugarRS: 0, modoCarta: 'normal',
    lecturaActual: {perfil: 'helenistica', casas: 'signos', zodiaco: 'trop'},
    atacirActivo: false, transitosActivo: false, revolucionActivo: false, progresActivo: false,
    sinastriaActivo: false, compuestaActiva: false,
    sincronizaPestMovil: id => { get('pestMovil').value = id; },
    pintaAtacir: () => paints.push('atacir'), pintaTransitos: () => paints.push('transitos'),
    pintaRevolucion: () => paints.push('revolucion'), pintaProgres: () => paints.push('progresiones'),
    pintaSinastria: () => paints.push('sinastria')});
  get('modoAvanzado').addEventListener('click', () => { context.modoCarta = 'avanzado'; });
  vm.runInContext(section('const pestañas = [[', '/* ===================== Arranque ===================== */'), context);
  vm.runInContext(section('/* Entrada directa desde el planetario:', '</script>'), context);
  for (let i = 0; timeouts.length; i++) {
    assert.ok(i < 50, 'La entrada directa termina');
    timeouts.shift()();
  }
  return {context, nodes, paints};
}

test('los accesos directos abren la técnica solicitada en normal y preservan la escuela activa', () => {
  const expected = {atacir: ['tabAtacir', 'hojaAtacir'], transitos: ['tabTransitos', 'hojaTransitos'],
    revolucion: ['tabRevolucion', 'hojaRevolucion'], progresiones: ['tabProgres', 'hojaProgres'],
    sinastria: ['tabSinastria', 'hojaSinastria']};
  const published = new Set(['herramientas.html', 'predicciones.html'].flatMap(file => hrefs(read(file)))
    .map(href => new URL(href, origin)).filter(url => url.pathname === '/astroplanetario.html')
    .map(url => url.searchParams.get('tab')));
  for (const [tab, [button, panel]] of Object.entries(expected)) {
    assert.ok(published.has(tab), `El directorio permite abrir ${tab}`);
    const flow = openTechnique(tab);
    assert.equal(flow.nodes.get(button).getAttribute('aria-selected'), 'true');
    assert.equal(flow.nodes.get(panel).hidden, false);
    assert.equal(flow.nodes.get('hojaResumen').hidden, true);
    assert.equal(flow.nodes.get('pestMovil').value, button);
    assert.deepEqual(flow.paints, [tab]);
    assert.equal(flow.context.modoCarta, 'normal');
    assert.deepEqual(plain(flow.context.lecturaActual), {perfil: 'helenistica', casas: 'signos', zodiaco: 'trop'});
  }
});
