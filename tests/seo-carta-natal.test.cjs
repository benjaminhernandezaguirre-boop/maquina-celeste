const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('carta natal has one focused, indexable landing page', () => {
  const html = read('carta-natal.html');
  assert.match(html, /<title>[^<]*Carta natal gratis[^<]*Astroplanetario<\/title>/i);
  assert.match(html, /<meta name="description" content="[^"]*Calcula tu carta natal gratis/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/astroplanetario\.com\/carta-natal">/);
  assert.equal((html.match(/<h1\b/gi) || []).length, 1);
  assert.match(html, /href="\/astroplanetario\.html\?view=natal"/);
  assert.match(html, /application\/ld\+json/);
});

test('homepage, clean route and discovery files point to carta natal', () => {
  const home = read('index.html');
  const natalEntry = home.match(/<section\b[^>]*data-seccion="carta-natal"[\s\S]*?<\/section>/);
  assert.ok(natalEntry, 'the homepage exposes its natal section');
  assert.match(natalEntry[0], /href="\/astroplanetario\.html\?view=natal"/);
  assert.match(natalEntry[0], /href="\/carta-natal"/);
  assert.match(home, /href="\/planetario\.html"/);
  assert.match(read('planetario.html'), /<a class="planet earth nav"[^>]+href="\/carta-natal"/);

  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(vercel.rewrites.some(r => r.source === '/carta-natal' && r.destination === '/carta-natal.html'));

  assert.match(read('robots.txt'), /Sitemap: https:\/\/astroplanetario\.com\/sitemap\.xml/);
  assert.match(read('sitemap.xml'), /<loc>https:\/\/astroplanetario\.com\/carta-natal<\/loc>/);
});

test('carta natal landing and calculator default to light with a shared theme choice', () => {
  const landing = read('carta-natal.html');
  const studioTheme = read('app/studio-theme.js');
  assert.match(landing, /<html[^>]+data-studio-theme="light"/i);
  assert.match(landing, /id="themeToggle"/);
  assert.match(landing, /astro-studio-theme/);
  assert.match(studioTheme, /let theme = 'light'/);
  assert.match(studioTheme, /saved === 'light' \|\| saved === 'dark'/);
});

test('carta natal includes a seasonal zodiac and live lunar module', () => {
  const html = read('carta-natal.html');
  assert.match(html, /id="temporadaTitulo">Temporada de Virgo/);
  assert.match(html, /id="temporadaElemento">Tierra/);
  assert.match(html, /id="temporadaModalidad">Mutable/);
  assert.match(html, /id="temporadaRegente">Mercurio/);
  assert.match(html, /src="\/app\/efemerides\.js"/);
  assert.match(html, /Efem\.lon\("luna",ms\)/);
  assert.match(html, /href="\/app\/cumpleanos\.css\?v=20260915"/);
  assert.match(html, /src="\/app\/cumpleanos\.js\?v=20260915" defer/);
  assert.equal((html.match(/data-cumpleanos\b/g) || []).length, 1);
  assert.match(html, /Virgo entre griegos y romanos/);
  assert.match(html, /Diké o Astrea/);
  assert.match(html, /Spica/);
  assert.match(html, /Justitia/);
  assert.match(html, /Ceres/);
  assert.match(html, /AstroCumpleanos\?\.signoDeFecha\(hoy\)/);
  assert.match(html, /addEventListener\("astro-temporada"/);
  assert.doesNotMatch(html, /temporadaImagen|Feliz cumpleaños/);
  assert.match(read('app/carta-natal-guia.css'), /\.temporada-cabecera h2\{[^}]*clip-path:inset\(50%\)/);
  assert.match(html, /id="temporadaCaja"/);
  assert.match(html, /elemento-tierra/);
  assert.match(html, /elemento-agua/);
  assert.match(html, /elemento-fuego/);
  assert.match(html, /elemento-aire/);
  assert.match(html, /estacion-primavera/);
  assert.match(html, /estacion-verano/);
  assert.match(html, /estacion-otono/);
  assert.match(html, /estacion-invierno/);
  assert.match(html, /Verano · transición al otoño/);
  const signs = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo', 'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];
  for (const sign of signs) {
    assert.match(html, new RegExp(`imagen:\"${sign}\"`));
    const image = path.join(root, 'assets', 'zodiaco', `${sign}-celestial.webp`);
    assert.ok(fs.existsSync(image), `missing seasonal image for ${sign}`);
    assert.ok(fs.statSync(image).size > 10000, `seasonal image for ${sign} is unexpectedly small`);
  }
});

test('seasonal history, dates, colors and lunar context follow the shared calendar and refresh event', () => {
  const html = read('carta-natal.html');
  const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('const signos=['));
  const script = source.slice(source.lastIndexOf('(()=>{'));
  const nodes = new Map(), events = new Map(), lunarDates = [];
  const classes = new Set();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {textContent: '', innerHTML: '', classList: {add: (...names) => names.forEach(n => classes.add(n)), remove: (...names) => names.forEach(n => classes.delete(n))}});
    return nodes.get(id);
  };
  let selectedDate;
  const initialSign = {slug: 'aries', nombre: 'Aries', elemento: 'fuego', inicio: 319, fin: 420};
  const context = {
    Date, Intl, Number,
    document: {readyState: 'complete', getElementById: node},
    AstroCumpleanos: {signoDeFecha: date => {selectedDate = date; return initialSign;}},
    addEventListener: (name, fn) => events.set(name, fn),
    Efem: {lon: (planet, ms) => {lunarDates.push(ms); return planet === 'luna' ? 60 : 0;}, mod360: n => ((n % 360) + 360) % 360}
  };
  context.window = context;
  vm.runInNewContext(script, context);
  assert.equal(node('temporadaTitulo').textContent, 'Temporada de Aries');
  assert.equal(node('temporadaFechas').textContent, '19 de marzo–19 de abril · fechas aproximadas');
  assert.equal(node('temporadaElemento').textContent, 'Fuego');
  assert.equal(node('temporadaRegente').textContent, 'Marte');
  assert.ok(classes.has('elemento-fuego'));
  assert.match(node('historiaTexto').innerHTML, /Frixo y Hele/);
  assert.equal(lunarDates[0], selectedDate.getTime());

  const date = new Date(2027, 0, 5, 0, 0, 1);
  events.get('astro-temporada')({detail: {fecha: date, signo: {slug: 'capricornio', nombre: 'Capricornio', elemento: 'Tierra', inicio: 1222, fin: 120}}});
  assert.equal(node('temporadaTitulo').textContent, 'Temporada de Capricornio');
  assert.equal(node('temporadaFechas').textContent, '22 de diciembre–19 de enero · fechas aproximadas');
  assert.equal(node('temporadaRegente').textContent, 'Saturno');
  assert.ok(classes.has('elemento-tierra'));
  assert.ok(!classes.has('elemento-fuego'));
  assert.match(node('historiaTexto').innerHTML, /cabra marina/);
  assert.equal(lunarDates.at(-1), date.getTime());
  assert.match(node('lunaFecha').textContent, /5 de enero de 2027/);
});
