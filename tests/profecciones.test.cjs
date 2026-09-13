const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = {window:{}, Intl, console};
['efemerides.js','profecciones.js'].forEach(f =>
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','app',f),'utf8'), context));
const P = context.window.Profecciones;
const E = context.window.Efem;

const datos = {nombre:'Prueba',anio:1990,mes:1,dia:15,hora:10,min:30,horaConocida:true,
  lat:19.4326,lon:-99.1332,tz:'America/Mexico_City',lugarTexto:'CDMX',sistema:'signos',factorOrbe:1};
const carta = P.prepararCarta(datos, E);
const enJunio = y => E.localAUTC(y,6,1,12,0,datos.tz,'earlier');

test('el Ascendente marca la casa I y la profección avanza un signo por año', () => {
  for (const edad of [0, 1, 5, 11, 12, 30, 47]) {
    const a = P.anual(carta, edad, E, false);
    assert.equal(a.signo, P.mod(carta.ascSigno + edad, 12), `signo a los ${edad}`);
    assert.equal(a.casa, (edad % 12) + 1, `casa a los ${edad}`);
  }
});

test('cada doce años vuelve al Ascendente', () => {
  [0,12,24,36,48,60,72,84].forEach(edad => {
    const a = P.anual(carta, edad, E, false);
    assert.equal(a.casa, 1);
    assert.equal(a.signo, carta.ascSigno);
  });
});

test('el señor del año es el regente tradicional del signo profectado', () => {
  const tradicional = ["Marte","Venus","Mercurio","Luna","Sol","Mercurio","Venus","Marte","Júpiter","Saturno","Saturno","Júpiter"];
  assert.deepEqual(Array.from(P.REGENTES), tradicional);
  for (let edad = 0; edad < 36; edad++) {
    const a = P.anual(carta, edad, E, false);
    assert.equal(a.senor, tradicional[a.signo]);
  }
});

test('la edad se cuenta por cumpleaños, no por días transcurridos', () => {
  const tz = datos.tz;
  const vispera = E.localAUTC(2020,1,15,10,29,tz,'earlier');
  const justo   = E.localAUTC(2020,1,15,10,30,tz,'earlier');
  assert.equal(P.edadEn(datos, vispera, E), 29);
  assert.equal(P.edadEn(datos, justo,   E), 30);
});

test('un nacimiento del 29 de febrero cumple el 28 en los años comunes', () => {
  const d = {...datos, anio:2000, mes:2, dia:29};
  const comun = P.aniversario(d, 1, E);          // 2001 no es bisiesto
  const bis   = P.aniversario(d, 4, E);          // 2004 sí lo es
  const parte = ms => new Intl.DateTimeFormat('en-CA',{timeZone:d.tz,month:'2-digit',day:'2-digit'}).format(new Date(ms));
  assert.equal(parte(comun), '02-28');
  assert.equal(parte(bis),   '02-29');
});

test('los doce meses profectados cubren el año sin huecos ni solapes', () => {
  const a = P.anual(carta, 30, E, false);
  const meses = P.mensuales(a);
  assert.equal(meses.length, 12);
  assert.equal(meses[0].inicio, a.inicio);
  assert.equal(meses[11].fin, a.fin);
  meses.forEach((m,i) => { if (i) assert.equal(m.inicio, meses[i-1].fin); });
  assert.equal(meses[0].signo, a.signo);
  assert.equal(P.mod(meses[11].signo - a.signo, 12), 11);
});

test('las doce unidades diarias caben dentro de su mes', () => {
  const a = P.anual(carta, 30, E, false);
  const m = P.mensuales(a)[3];
  const dias = P.diarias(m);
  assert.equal(dias.length, 12);
  assert.equal(dias[0].inicio, m.inicio);
  assert.equal(dias[11].fin, m.fin);
});

test('calcular entrega el nivel vigente en la fecha pedida', () => {
  const r = P.calcular(carta, enJunio(2020), {E});
  assert.equal(r.edad, 30);
  assert.equal(P.SIGNOS[r.anual.signo], 'Virgo');
  assert.equal(r.anual.casa, 7);
  assert.equal(r.anual.senor, 'Mercurio');
  assert.ok(r.fecha >= r.anual.inicio && r.fecha < r.anual.fin);
  assert.ok(r.fecha >= r.mensual.inicio && r.fecha < r.mensual.fin);
  assert.ok(r.fecha >= r.diaria.inicio && r.fecha < r.diaria.fin);
});

test('la casa natal del señor del año se cuenta por signos enteros', () => {
  const r = P.calcular(carta, enJunio(2020), {E});
  assert.equal(r.senorNatal.nombre, 'Mercurio');
  assert.equal(r.senorNatal.casa, P.casaDe(carta.cuerpos.mercurio, carta.ascSigno));
});

test('la configuración por signos enteros distingue lo que ve de lo que no', () => {
  assert.equal(P.configuracion(0,0).aspecto, 'conjunción');
  assert.equal(P.configuracion(0,2).aspecto, 'sextil');
  assert.equal(P.configuracion(0,3).aspecto, 'cuadratura');
  assert.equal(P.configuracion(0,4).aspecto, 'trígono');
  assert.equal(P.configuracion(0,6).aspecto, 'oposición');
  assert.equal(P.configuracion(0,1).ve, false, 'el semisextil no ve');
  assert.equal(P.configuracion(0,5).ve, false, 'el quincuncio no ve');
  assert.equal(P.configuracion(3,0).distancia, P.configuracion(0,3).distancia, 'la distancia es simétrica');
});

test('la tabla de vida entrega un renglón por año y es coherente con anual()', () => {
  const t = P.tablaDeVida(carta, 0, 90, E, false);
  assert.equal(t.length, 91);
  t.forEach(f => {
    const a = P.anual(carta, f.edad, E, false);
    assert.equal(f.signo, a.signo);
    assert.equal(f.senor, a.senor);
  });
});

test('alinear con la revolución solar mueve el corte menos de dos días', () => {
  const normal   = P.anual(carta, 30, E, false);
  const alineado = P.anual(carta, 30, E, true);
  const dif = Math.abs(alineado.inicio - normal.inicio) / 86400000;
  assert.ok(dif < 2, `la diferencia fue de ${dif.toFixed(2)} días`);
});

test('una fecha anterior al nacimiento se rechaza', () => {
  assert.throws(() => P.calcular(carta, E.localAUTC(1980,1,1,12,0,datos.tz,'earlier'), {E}), /anterior al nacimiento/);
});

test('sin hora de nacimiento no hay profección', () => {
  assert.throws(() => P.prepararCarta({...datos, horaConocida:false}, E), /hora de nacimiento/);
});
