const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

test('all textured bodies have an optimized local asset', () => {
  for (const name of ['sol','mercurio','venus','tierra','tierra-noche','luna','marte','jupiter','saturno','saturno-anillo','urano','neptuno','pluton']) {
    const file = path.join(root, 'assets', 'planetas', `${name}.webp`);
    assert.ok(fs.statSync(file).size > 500, `${name}.webp is missing or empty`);
  }
});

test('Earth switches from day to night using the visitor local time', () => {
  const source = fs.readFileSync(path.join(root, 'app', 'planetas.js'), 'utf8');
  const context = {window: {}};
  vm.runInNewContext(source, context);
  const at = (hour, minute = 0) => new Date(2026, 8, 12, hour, minute).getTime();
  assert.equal(context.window.Planetas.tierraDeNoche(at(6, 59)), true);
  assert.equal(context.window.Planetas.tierraDeNoche(at(7)), false);
  assert.equal(context.window.Planetas.tierraDeNoche(at(18, 59)), false);
  assert.equal(context.window.Planetas.tierraDeNoche(at(19)), true);
});

