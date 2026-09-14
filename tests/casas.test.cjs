const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = {window:{}, Math, console};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','app','casas.js'),'utf8'), context);
const C = context.window.Casas;
const m = C.mod360;
const EPS = 23.4367;
const dif = (a,b) => Math.abs(((a-b+540)%360)-180);

/* Ángulos calculados aquí, sin depender del motor, para que la prueba
   valide la geometría de las casas y no otra cosa. */
function ang(ramcDeg, lat, eps = EPS){
  const RAD = Math.PI/180, DEG = 180/Math.PI;
  const e = eps*RAD, phi = lat*RAD, R = ramcDeg*RAD;
  const mc = m(Math.atan2(Math.sin(R), Math.cos(R)*Math.cos(e))*DEG);
  let asc = m(Math.atan2(Math.cos(R), -(Math.sin(R)*Math.cos(e) + Math.tan(phi)*Math.sin(e)))*DEG);
  if(m(asc-mc) > 180) asc = m(asc+180);
  return {asc, mc, ramc:ramcDeg, eps, lat, lon:0};
}
const LATITUDES = [-51, -34.6, 0, 19.43, 40.7, 51.5];
const RAMCS = [0, 73, 144, 215, 290, 350];
const SISTEMAS = ['signos','igual','porfirio','placidio','alcabitius','regiomontano'];

test('los seis sistemas existen y se nombran', () => {
  SISTEMAS.forEach(s => assert.ok(C.NOMBRES[s], s));
  assert.equal(C.NOMBRES.alcabitius, 'Alcabitius');
  assert.equal(C.NOMBRES.regiomontano, 'Regiomontanus');
  assert.deepEqual(Array.from(C.CUADRANTE).sort(), ['alcabitius','placidio','regiomontano']);
});

test('en el ecuador Regiomontanus, Alcabitius y Plácidus coinciden exactamente', () => {
  /* A latitud 0 el punto Norte del horizonte es el polo celeste, así que
     los tres sistemas reparten sobre círculos horarios y deben dar lo mismo.
     Es la comprobación geométrica más fuerte que admiten. */
  for(const ramc of RAMCS){
    const a = ang(ramc, 0);
    const R = C.cuspides('regiomontano', a).c;
    const A = C.cuspides('alcabitius', a).c;
    const P = C.cuspides('placidio', a).c;
    for(let i=1;i<=12;i++){
      assert.ok(dif(R[i],A[i]) < 1e-9, `Regiomontanus vs Alcabitius casa ${i} en RAMC ${ramc}`);
      assert.ok(dif(R[i],P[i]) < 1e-9, `Regiomontanus vs Plácidus casa ${i} en RAMC ${ramc}`);
    }
  }
});

test('Regiomontanus: dos derivaciones independientes dan lo mismo', () => {
  /* Una corta dos planos algebraicamente; la otra busca por bisección
     el punto de la eclíptica que cae sobre el plano de la casa. */
  let peor = 0, n = 0;
  for(const lat of [-66,-55,-34.6,0,19.43,40.7,51.5,66])
    for(const ramc of [0,45,97,180,260,333])
      for(const off of [30,60,120,150]){
        const v = C.regiomontanoVector(ramc, lat, EPS).cuspide(m(ramc+off));
        const u = C.regiomontanoNumerico(ramc, lat, EPS, m(ramc+off));
        if(v === null || u === null) continue;
        peor = Math.max(peor, dif(v,u)); n++;
      }
  assert.ok(n > 150, `solo se compararon ${n} cúspides`);
  assert.ok(peor < 1e-7, `las dos derivaciones difieren ${peor}°`);
});

test('las cúspides angulares son el Ascendente y el Medio Cielo', () => {
  for(const sis of ['porfirio','placidio','alcabitius','regiomontano'])
    for(const lat of LATITUDES) for(const ramc of RAMCS){
      const a = ang(ramc, lat), r = C.cuspides(sis, a);
      if(r.sustituido) continue;
      assert.ok(dif(r.c[1], a.asc) < 1e-8, `${sis}: casa I no es el ASC`);
      assert.ok(dif(r.c[7], a.asc+180) < 1e-8, `${sis}: casa VII no es el DC`);
      assert.ok(dif(r.c[10], a.mc) < 1e-8, `${sis}: casa X no es el MC`);
      assert.ok(dif(r.c[4], a.mc+180) < 1e-8, `${sis}: casa IV no es el FC`);
    }
});

test('las doce cúspides avanzan en orden y ninguna casa es vacía ni mayor de medio círculo', () => {
  for(const sis of SISTEMAS)
    for(const lat of LATITUDES) for(const ramc of RAMCS){
      const r = C.cuspides(sis, ang(ramc, lat));
      if(r.sustituido) continue;
      for(let i=1;i<=12;i++){
        const ancho = m(r.c[i===12?1:i+1] - r.c[i]);
        assert.ok(ancho > 1e-9, `${sis}: casa ${i} vacía`);
        assert.ok(ancho < 180, `${sis}: casa ${i} mide ${ancho.toFixed(2)}°`);
      }
    }
});

test('las doce casas suman el círculo completo', () => {
  for(const sis of SISTEMAS)
    for(const lat of [-34.6, 0, 40.7]) for(const ramc of [0, 144, 290]){
      const r = C.cuspides(sis, ang(ramc, lat));
      if(r.sustituido) continue;
      let suma = 0;
      for(let i=1;i<=12;i++) suma += m(r.c[i===12?1:i+1] - r.c[i]);
      assert.ok(Math.abs(suma - 360) < 1e-7, `${sis}: suman ${suma}`);
    }
});

test('Alcabitius triseca los semiarcos del Ascendente', () => {
  const a = ang(97, 19.43);
  const p = C.alcabitius(a.ramc, a.asc, a.eps);
  assert.ok(p, 'debe resolverse en latitud media');
  assert.ok(p.sad > 0 && p.san > 0);
  assert.ok(Math.abs(p.sad + p.san - 180) < 1e-9, 'los dos semiarcos suman media vuelta');
  /* Las cúspides 11 y 12 caen dentro del semiarco diurno, en orden. */
  const arAsc = C.arDesdeLon(a.asc, a.eps);
  assert.ok(dif(C.arDesdeLon(p.c12, a.eps), m(arAsc - p.sad/3)) < 1e-7);
  assert.ok(dif(C.arDesdeLon(p.c11, a.eps), m(arAsc - 2*p.sad/3)) < 1e-7);
});

test('Plácidus no tiene solución pasado el círculo polar y lo dice', () => {
  let fallos = 0, avisos = 0;
  for(let ramc = 0; ramc < 360; ramc += 15){
    const r = C.cuspides('placidio', ang(ramc, 75));
    if(r.sustituido){ fallos++; if(r.aviso && /polar/i.test(r.aviso)) avisos++; }
  }
  assert.equal(fallos, 24, 'a 75° de latitud Plácidus no debería resolver nunca');
  assert.equal(avisos, 24, 'cada fallo debe traer su explicación');
});

test('un sistema sin solución nunca se sustituye en silencio', () => {
  const r = C.cuspides('placidio', ang(90, 75));
  assert.equal(r.sustituido, true);
  assert.equal(r.sistemaPedido, 'placidio');
  assert.equal(r.nombrePedido, 'Plácidus');
  assert.equal(r.sistema, 'signos');
  assert.ok(r.aviso.length > 40, 'el aviso debe explicar qué pasó');
});

test('en latitudes habitables los tres sistemas de cuadrante sí resuelven', () => {
  for(const lat of [-51, -34.6, 0, 19.43, 40.7, 51.5, 60])
    for(let ramc = 0; ramc < 360; ramc += 30)
      for(const sis of C.CUADRANTE)
        assert.equal(C.cuspides(sis, ang(ramc, lat)).sustituido, undefined,
          `${sis} falló en lat ${lat}, RAMC ${ramc}`);
});

test('las casas de signos enteros siderales nacen del Ascendente sideral', () => {
  const aya = 24.2167;
  for(const [ramc, lat] of [[0,19.43],[97,19.43],[215,-34.6],[300,51.5],[41,35.7]]){
    const a = ang(ramc, lat);
    const sid = C.cuspides('signos', a, {ayanamsa:aya});
    const ascSid = m(a.asc - aya);
    const c1Sid = m(sid.c[1] - aya);
    /* La casa I empieza en grado 0 de un signo... */
    const resto = Math.min(c1Sid % 30, 30 - (c1Sid % 30));
    assert.ok(resto < 1e-6, `la casa I sideral empieza en ${c1Sid}`);
    /* ...y es el signo del Ascendente sideral. */
    assert.equal(Math.floor(m(c1Sid + 1e-9)/30), Math.floor(ascSid/30),
      'la casa I no coincide con el signo del Ascendente sideral');
    assert.equal(sid.sideral, true);
    assert.equal(sid.ayanamsa, aya);
  }
});

test('desplazar cúspides tropicales no equivale a construirlas en sideral', () => {
  /* Este es el error que la implementación debe evitar: con ayanamsa,
     restar el desfase a las cúspides tropicales deja la casa I a mitad
     de signo, y a veces en el signo anterior. */
  const aya = 24.2167, a = ang(300, 51.5);
  const trop = C.cuspides('signos', a, {ayanamsa:0});
  const sid  = C.cuspides('signos', a, {ayanamsa:aya});
  const desplazada = m(trop.c[1] - aya);
  const correcta = m(sid.c[1] - aya);
  assert.ok(dif(desplazada, correcta) > 1, 'el caso elegido debe mostrar la diferencia');
  assert.ok(Math.min(desplazada % 30, 30 - desplazada % 30) > 1,
    'la versión desplazada no cae en grado 0, por eso está mal');
});

test('casaDe encuentra la casa de una longitud en cualquier sistema', () => {
  for(const sis of SISTEMAS){
    const r = C.cuspides(sis, ang(144, 40.7));
    if(r.sustituido) continue;
    for(let i=1;i<=12;i++){
      const medio = m(r.c[i] + m(r.c[i===12?1:i+1] - r.c[i])/2);
      assert.equal(C.casaDe(medio, r.c), i, `${sis}: el medio de la casa ${i}`);
    }
    assert.equal(C.casaDe(r.c[1] + 1e-7, r.c), 1);
  }
});

test('signos enteros e iguales coinciden solo cuando el Ascendente está en grado 0', () => {
  const a = ang(73, 19.43);
  const s = C.cuspides('signos', a).c, i = C.cuspides('igual', a).c;
  const offset = a.asc % 30;
  if(offset > 1e-6) assert.ok(dif(s[1], i[1]) > 1e-6, 'no deberían coincidir aquí');
  assert.ok(Math.min(s[1] % 30, 30 - s[1] % 30) < 1e-9, 'signos enteros empieza en grado 0');
  assert.ok(dif(i[1], a.asc) < 1e-9, 'casas iguales empieza en el Ascendente');
});
