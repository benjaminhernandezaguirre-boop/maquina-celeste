const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'liberacion-zodiacal.js'), 'utf8');
const ephemerisSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'efemerides.js'), 'utf8');
const context = {window:{}};
vm.runInNewContext(ephemerisSource, context);
vm.runInNewContext(source, context);
const Z = context.window.LiberacionZodiacal;
const E = context.window.Efem;
const DAY = 86400000;

test('traditional sign periods preserve the Valens sequence', () => {
  assert.deepEqual(Array.from(Z.PERIODOS), [15,8,20,25,19,20,8,15,12,27,30,12]);
  assert.equal(Z.PERIODOS[9], 27);
  assert.equal(Z.PERIODOS[10], 30);
});

test('Fortune and Spirit reverse between day and night', () => {
  assert.deepEqual({...Z.loteDesdePosiciones(100, 40, 10, true)}, {fortuna:70, espiritu:130});
  assert.deepEqual({...Z.loteDesdePosiciones(100, 40, 10, false)}, {fortuna:130, espiritu:70});
});

test('an Aries release changes to Taurus after fifteen ideal years', () => {
  const birth = Date.UTC(2000,0,1);
  assert.equal(Z.pilaEn(birth,0,birth+15*360*DAY-1).pila[0].signo,0);
  assert.equal(Z.pilaEn(birth,0,birth+15*360*DAY).pila[0].signo,1);
});

test('all four levels begin from the released lot sign', () => {
  const birth = Date.UTC(1990,4,10,12);
  const stack = Z.pilaEn(birth,5,birth).pila;
  assert.deepEqual(Array.from(stack,p=>p.signo), [5,5,5,5]);
  assert.deepEqual(Array.from(stack,p=>p.nivel), [1,2,3,4]);
});

test('a long Cancer period performs the loosing of the bond to Capricorn', () => {
  const parent={nivel:1,signo:3,inicio:0,fin:25*360*DAY};
  const children=Z.hijos(parent,2);
  assert.equal(children.length>12,true);
  assert.equal(children[12].liberacion,true);
  assert.equal(children[12].signo,9);
  assert.equal(children[12].inicio,Z.PERIODOS.reduce((a,b)=>a+b,0)*30*DAY);
});

test('culminating and angular signs are measured from Fortune', () => {
  assert.equal(Z.esCulminante(9,0),true);
  assert.equal(Z.esAngular(0,0),true);
  assert.equal(Z.esAngular(3,0),true);
  assert.equal(Z.esAngular(6,0),true);
  assert.equal(Z.esAngular(9,0),true);
  assert.equal(Z.esAngular(8,0),false);
});

test('a civil birth record produces finite lots and four active periods', () => {
  const carta = Z.prepararCarta({
    nombre:'Ejemplo', anio:1990, mes:3, dia:21, hora:6, min:30,
    horaConocida:true, lat:19.4326, lon:-99.1332,
    tz:'America/Mexico_City', lugarTexto:'Ciudad de México, México',
    sistema:'signos', factorOrbe:1, desambiguacion:'reject'
  }, E);
  assert.equal(Number.isFinite(carta.lotes.fortuna), true);
  assert.equal(Number.isFinite(carta.lotes.espiritu), true);
  assert.equal(carta.diurna, false);
  assert.deepEqual(Array.from(Z.calcular(carta, 'espiritu', Date.UTC(2026,8,12)).pila, p => p.nivel), [1,2,3,4]);
});
