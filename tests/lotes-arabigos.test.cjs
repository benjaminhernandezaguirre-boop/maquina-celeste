const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('la guía ofrece metadatos, contenido y datos estructurados', () => {
  const html = read('lotes-arabigos.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/astroplanetario\.com\/lotes-arabigos">/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, /"@type":"FAQPage"/);
  assert.match(html, /Los siete lotes herméticos/);
  assert.match(html, /ASC \+ Luna − Sol/);
  assert.match(html, /Sol[\s\S]{0,160}sobre el horizonte/i);
  assert.match(html, /href="\/calculadora-lotes-arabigos"/);
});

test('la calculadora incluye los siete lotes y no evalúa fórmulas', () => {
  const html = read('lotes-arabigos-calculadora.html');
  const js = read('app/lotes-arabigos.js');
  for (const id of ['fortuna', 'espiritu', 'eros', 'necesidad', 'coraje', 'victoria', 'nemesis']) {
    assert.match(js, new RegExp(`id:\"${id}\"`));
  }
  assert.doesNotMatch(js, /\beval\s*\(|new Function\s*\(/);
  assert.match(js, /horaSidereaGw/);
  assert.match(js, /Sol bajo el horizonte/);
  assert.match(js, /astroplanetario-formulas-lotes/);
  assert.match(html, /id="ruedaLotes"/);
  assert.match(html, /Carta natal de lotes arábigos/);
  assert.match(js, /function dibujarRueda/);
  assert.match(js, /cuspide[\s\S]{0,80}angular/);
});

test('Neptuno y las rutas públicas enlazan el nuevo módulo', () => {
  const home = read('index.html');
  const vercel = JSON.parse(read('vercel.json'));
  const sitemap = read('sitemap.xml');
  assert.match(home, /data-name="Neptuno"[^>]+href="\/lotes-arabigos"/);
  assert.ok(vercel.rewrites.some(r => r.source === '/lotes-arabigos'));
  assert.ok(vercel.rewrites.some(r => r.source === '/calculadora-lotes-arabigos'));
  assert.match(sitemap, /https:\/\/astroplanetario\.com\/lotes-arabigos/);
  assert.match(sitemap, /https:\/\/astroplanetario\.com\/calculadora-lotes-arabigos/);
});

