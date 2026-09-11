const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
  assert.match(home, /<a class="planet earth nav"[^>]+href="\/carta-natal"/);

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
  assert.match(html, /id="temporadaTitulo">Feliz cumpleaños, Virgo/);
  assert.match(html, /id="temporadaElemento">Tierra/);
  assert.match(html, /id="temporadaModalidad">Mutable/);
  assert.match(html, /id="temporadaRegente">Mercurio/);
  assert.match(html, /src="\/app\/efemerides\.js"/);
  assert.match(html, /Efem\.lon\("luna",ms\)/);
  assert.match(html, /assets\/zodiaco\/virgo-celestial\.webp/);
  assert.match(html, /Virgo entre griegos y romanos/);
  assert.match(html, /Diké o Astrea/);
  assert.match(html, /Spica/);
  assert.match(html, /Justitia/);
  assert.match(html, /Ceres/);
});

