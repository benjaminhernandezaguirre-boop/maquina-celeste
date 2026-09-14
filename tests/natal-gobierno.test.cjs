const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = {window:{}, Math, console, JSON, Intl, Date, Object, Array, Set, Number, String, RangeError, Error};
context.globalThis = context;
['casas.js','escuelas.js','efemerides.js','profecciones.js','dignidades.js','natal-gobierno.js']
  .forEach(f => vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','app',f),'utf8'), context));
const E = context.window.Escuelas;
const G = context.window.NatalGobierno;
const C = context.window.Casas;

/* Carta construida a propósito para el caso obligatorio:
   Ascendente en Sagitario 15° y Plutón en Sagitario 16°, conjunto al grado. */
function cartaSagitario(){
  const asc = 255, mc = 170, ramc = 170;
  const cuerpos = [
    {id:'sol',nombre:'Sol',lon:300},        {id:'luna',nombre:'Luna',lon:45},
    {id:'mercurio',nombre:'Mercurio',lon:310},{id:'venus',nombre:'Venus',lon:280},
    {id:'marte',nombre:'Marte',lon:120},    {id:'jupiter',nombre:'Júpiter',lon:95},
    {id:'saturno',nombre:'Saturno',lon:200},{id:'urano',nombre:'Urano',lon:75},
    {id:'neptuno',nombre:'Neptuno',lon:265},{id:'pluton',nombre:'Plutón',lon:256}
  ];
  const ang = {asc, mc, ramc, eps:23.4367, lat:19.43, lon:-99.13};
  return {datos:{}, ms:0, ang, cusp:C.cuspides('placidio', ang).c, cuerpos, puntos:[], diurna:true};
}

test('el regente del Ascendente es el del signo, no el planeta conjunto', () => {
  const carta = cartaSagitario();
  ['contemporanea','helenistica','medieval','renacentista'].forEach(perfil => {
    const r = G.regenteAscendente(carta, {perfil});
    assert.equal(r.signoAscendente, 'Sagitario', perfil);
    assert.equal(r.regente, 'Júpiter', `${perfil}: Sagitario lo rige Júpiter`);
    assert.notEqual(r.regente, 'Plutón', `${perfil}: la conjunción no da la regencia`);
  });
});

test('Plutón aparece conjunto al Ascendente en contemporánea, con su orbe', () => {
  const c = G.conjuncionesAscendente(cartaSagitario(), {perfil:'contemporanea'});
  assert.equal(c.aplica, true);
  const p = c.lista.find(x => x.id === 'pluton');
  assert.ok(p, 'Plutón debe aparecer');
  assert.ok(Math.abs(p.orbe - 1) < 1e-6, `el orbe fue ${p.orbe}`);
  assert.ok(c.orbeMaximo > 0, 'el orbe máximo debe estar declarado');
  assert.ok(/no convierte/i.test(c.nota), 'la tarjeta debe decir que no otorga regencia');
});

test('Plutón destaca por angularidad, con la distancia a la vista', () => {
  const a = G.angularidad(cartaSagitario(), {perfil:'contemporanea'});
  const p = a.lista.find(x => x.id === 'pluton' && x.corto === 'AC');
  assert.ok(p, 'Plutón debe aparecer angular al AC');
  assert.ok(Math.abs(p.distancia - 1) < 1e-6);
  assert.ok(a.lista.every(x => typeof x.distancia === 'number'));
});

test('si Plutón está en Sagitario su dispositor es Júpiter', () => {
  const d = G.dispositores(cartaSagitario(), {perfil:'contemporanea'});
  assert.equal(d.disponeA.pluton, 'jupiter');
});

test('la conjunción al Ascendente no convierte a Plutón en dispositor de nadie', () => {
  const d = G.dispositores(cartaSagitario(), {perfil:'contemporanea'});
  assert.ok(!Object.values(d.disponeA).includes('pluton'),
    'nadie debe estar dispuesto por Plutón en esta carta');
});

test('en los marcos tradicionales Plutón no entra en ninguna de las seis lecturas', () => {
  const carta = cartaSagitario();
  ['helenistica','medieval','renacentista'].forEach(perfil => {
    const r = G.analizar(carta, {perfil});
    assert.ok(!r.conjuncionesAscendente.lista.some(x => x.id === 'pluton'), perfil);
    assert.ok(!r.angularidad.lista.some(x => x.id === 'pluton'), perfil);
    assert.equal(r.dispositores.disponeA.pluton, undefined, perfil);
    assert.ok(!r.dominancia.marcador.some(x => x.id === 'pluton'), perfil);
  });
});

test('la capa complementaria muestra los transaturninos sin meterlos en el cálculo', () => {
  const carta = cartaSagitario();
  const cfg = {perfil:'helenistica', complementaria:true};
  const conj = G.conjuncionesAscendente(carta, cfg);
  const p = conj.lista.find(x => x.id === 'pluton');
  assert.ok(p, 'con la capa activa Plutón se ve');
  assert.equal(p.complementario, true, 'y viene marcado como complementario');
  /* Pero sigue sin disponer ni puntuar. */
  const d = G.dispositores(carta, cfg);
  assert.equal(d.disponeA.pluton, undefined);
  const dom = G.dominancia(carta, cfg);
  assert.ok(!dom.marcador.some(x => x.id === 'pluton'));
});

test('los dispositores finales están en su propio domicilio', () => {
  const carta = cartaSagitario();
  carta.cuerpos.find(c => c.id === 'jupiter').lon = 250;   // Júpiter a Sagitario
  const d = G.dispositores(carta, {perfil:'helenistica'});
  assert.ok(d.finales.some(f => f.id === 'jupiter'), 'Júpiter en Sagitario es dispositor final');
  assert.equal(d.disponeA.jupiter, 'jupiter');
});

test('los circuitos cerrados se detectan y no se repiten', () => {
  const d = G.dispositores(cartaSagitario(), {perfil:'contemporanea'});
  d.circuitos.forEach(c => {
    assert.ok(c.miembros.length > 1, 'un circuito necesita al menos dos planetas');
    assert.equal(new Set(c.miembros).size, c.miembros.length, 'sin repetidos dentro del circuito');
  });
  const firmas = d.circuitos.map(c => c.firma);
  assert.equal(new Set(firmas).size, firmas.length, 'no debe listarse dos veces el mismo circuito');
});

test('el almutén solo aparece donde el marco lo admite, y dice con qué método', () => {
  const carta = cartaSagitario();
  const hel = G.almuten(carta, {perfil:'helenistica'});
  assert.equal(hel.aplica, false);
  assert.ok(hel.motivo.length > 20, 'debe explicar por qué no');
  const med = G.almuten(carta, {perfil:'medieval'});
  assert.equal(med.aplica, true);
  assert.ok(/Ibn Ezra/.test(med.metodo), `el método fue: ${med.metodo}`);
  assert.ok(med.ganador && med.ganador.planeta);
  assert.ok(/no es el regente/i.test(med.nota), 'debe distinguirse del regente del Ascendente');
});

test('la dominancia declara sus criterios y admite empate', () => {
  const d = G.dominancia(cartaSagitario(), {perfil:'contemporanea'});
  assert.ok(d.criterios.length >= 4);
  d.criterios.forEach(c => { assert.ok(c.texto); assert.ok(typeof c.puntos === 'number'); });
  assert.ok(Array.isArray(d.ganadores));
  d.marcador.forEach(m => {
    const suma = m.razones.reduce((a,r) => a + r.puntos, 0);
    assert.equal(m.puntos, suma, `${m.nombre}: los puntos deben salir de las razones listadas`);
  });
  if(d.ganadores.length > 1) assert.equal(d.empate, true);
});

test('cuando nadie reúne criterios no se inventa un ganador', () => {
  /* Carta sin hora: no hay ángulos, ni regente del Ascendente, ni secta. */
  const carta = cartaSagitario();
  carta.ang = null; carta.cusp = null; carta.diurna = null;
  const d = G.dominancia(carta, {perfil:'helenistica'});
  const conCriterio = d.marcador.filter(m => m.puntos > 0);
  if(!conCriterio.length){
    assert.equal(d.sinResultado, true);
    assert.deepEqual(Array.from(d.ganadores), []);
    assert.ok(/no se fuerza/i.test(d.nota));
  }
});

test('sin hora, las tarjetas que dependen del Ascendente lo dicen en vez de fallar', () => {
  const carta = cartaSagitario();
  carta.ang = null; carta.cusp = null;
  const r = G.analizar(carta, {perfil:'contemporanea'});
  assert.equal(r.regenteAscendente.aplica, false);
  assert.ok(/hora/i.test(r.regenteAscendente.motivo));
  assert.equal(r.conjuncionesAscendente.aplica, false);
  assert.equal(r.angularidad.aplica, false);
  /* Los dispositores sí se pueden calcular sin hora. */
  assert.equal(r.dispositores.aplica, true);
});

test('las seis lecturas son objetos distintos y ninguna se confunde con otra', () => {
  const r = G.analizar(cartaSagitario(), {perfil:'contemporanea'});
  ['regenteAscendente','conjuncionesAscendente','angularidad','dispositores','almuten','dominancia']
    .forEach(k => assert.ok(r[k], `falta la lectura ${k}`));
  /* El regente del signo y el planeta más angular no tienen por qué coincidir,
     y el módulo no debe forzar que coincidan. */
  const angular = r.angularidad.lista[0];
  assert.ok(angular && angular.id !== r.regenteAscendente.id,
    'en esta carta de prueba el más angular no es el regente, que es justo lo que se quiere mostrar');
});
