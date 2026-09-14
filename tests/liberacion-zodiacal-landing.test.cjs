const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Pluto opens the indexable zodiacal releasing guide', () => {
  const home = read('index.html');
  assert.match(home, /class="planet pluto nav"[^>]+data-name="Plutón"[^>]+href="\/liberacion-zodiacal"/);
  assert.match(home, /'Plutón':'pluton'/);

  const html = read('liberacion-zodiacal.html');
  assert.match(html, /<title>[^<]*Liberación zodiacal[^<]*Astroplanetario<\/title>/i);
  assert.match(html, /<link rel="canonical" href="https:\/\/astroplanetario\.com\/liberacion-zodiacal">/);
  assert.equal((html.match(/<h1\b/gi) || []).length, 1);
  assert.match(html, /data-planeta-textura="pluton"/);
  assert.match(html, /Fortuna y Espíritu/);
  assert.match(html, /data-nivel="L1"/);
  assert.match(html, /data-nivel="L4"/);
  assert.match(html, /Liberación del vínculo/);
  assert.match(html, /application\/ld\+json/);
});

test('clean route and sitemap expose the guide', () => {
  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(vercel.rewrites.some(r => r.source === '/liberacion-zodiacal' && r.destination === '/liberacion-zodiacal.html'));
  assert.match(read('sitemap.xml'), /<loc>https:\/\/astroplanetario\.com\/liberacion-zodiacal<\/loc>/);
});

test('guide opens the complete calculator and its public route is indexable', () => {
  const guide = read('liberacion-zodiacal.html');
  assert.match(guide, /href="\/calculadora-liberacion-zodiacal"[^>]*>Abrir calculadora<\/a>/);

  const calculator = read('liberacion-zodiacal-calculadora.html');
  assert.match(calculator, /<html lang="es" data-studio-theme="light">/);
  assert.match(calculator, /<link rel="canonical" href="https:\/\/astroplanetario\.com\/calculadora-liberacion-zodiacal">/);
  assert.match(calculator, /id="loteEspiritu"[^>]+checked/);
  assert.match(calculator, /id="loteFortuna"/);
  assert.match(calculator, /id="ruedaTiempo"/);
  assert.match(calculator, /Nivel 1 · Grandes capítulos/);
  assert.match(calculator, /Nivel 2 · Dentro del capítulo/);
  assert.match(calculator, /app\/efemerides\.js/);
  assert.match(calculator, /app\/liberacion-zodiacal\.js/);
  assert.match(calculator, /app\/liberacion-zodiacal-ui\.js/);

  const vercel = JSON.parse(read('vercel.json'));
  assert.ok(vercel.rewrites.some(r => r.source === '/calculadora-liberacion-zodiacal' && r.destination === '/liberacion-zodiacal-calculadora.html'));
  assert.match(read('sitemap.xml'), /<loc>https:\/\/astroplanetario\.com\/calculadora-liberacion-zodiacal<\/loc>/);
});
