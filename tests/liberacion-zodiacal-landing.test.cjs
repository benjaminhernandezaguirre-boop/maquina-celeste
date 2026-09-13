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
