const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync} = require('node:child_process');
const Birrueda = require('../app/natal-birrueda.js');
const Capas = require('../app/natal-capas.js');
const html = fs.readFileSync(path.join(__dirname, '../astroplanetario.html'), 'utf8');
const DIA = 86400000;
const mod = x => ((x % 360) + 360) % 360;
const cerca = (a, b, tolerancia = 1e-7) => assert.ok(Math.abs(a-b) <= tolerancia, `${a} ≈ ${b}`);
const plain = x => JSON.parse(JSON.stringify(x));

function entre(inicio, fin) {
  const a = html.indexOf(inicio), b = html.indexOf(fin, a + inicio.length);
  assert.ok(a >= 0 && b > a, `Se encuentra el código de producción: ${inicio}`);
  return html.slice(a, b);
}

function motor(longitudes = [350, 11]) {
  const carta = {
    ms: Date.UTC(2000, 0, 15, 12), datos: {horaConocida: true}, puntos: [],
    cuerpos: longitudes.map((lon, i) => ({id: `p${i}`, nombre: `Punto ${i}`, glifo: '●', lon}))
  };
  const c = {Date, Intl, carta, mod360: mod, window: {NatalCapas: Capas}};
  vm.createContext(c);
  vm.runInContext(entre('const CLAVES_ATACIR =', '/* ===================== Tránsitos'), c);
  vm.runInContext(entre('const PAPEL_CLARO =', 'let PAPEL ='), c);
  vm.runInContext(entre('const ASPECTOS =', 'function calculaAspectos('), c);
  const api = vm.runInContext('({TODAS_CLAVES, ANG_ATACIR, ANG_CONTACTOS_ATACIR, ASPECTOS, ORBE_ATACIR, estadoAtacir, arcoDe, msDeArco, contactosAtacir, capaAtacir, avanzarFechaAtacir, PAPEL_CLARO, PAPEL_OSCURO})', c);
  return {...api, carta, clave: id => api.TODAS_CLAVES.find(k => k.id === id)};
}

function contactosPar(m, clave, desde, hasta, angulo) {
  return m.contactosAtacir(clave, desde, hasta).filter(c => c.P.id === 'p0' && c.N.id === 'p1' && (angulo == null || c.asp.a === angulo));
}

test('Atacir incluye 60°, 90°, 120° y 150° con colores diferenciados y conserva los cinco ángulos de tránsitos', () => {
  const m = motor();
  assert.deepEqual(plain(m.ANG_ATACIR.map(a => a.a)), [0, 60, 90, 120, 180]);
  assert.deepEqual(plain(m.ANG_CONTACTOS_ATACIR.map(a => a.a).sort((a,b) => a-b)), [0, 60, 90, 120, 150, 180]);
  for (const [angulo, clase] of [[60, 'a-violeta'], [90, 'a-rojo'], [120, 'a-azul'], [150, 'a-verde']]) {
    assert.equal(m.ANG_CONTACTOS_ATACIR.find(a => a.a === angulo).cl, clase);
    assert.equal(m.ASPECTOS.find(a => a.a === angulo).cl, clase);
    for (const papel of [m.PAPEL_CLARO, m.PAPEL_OSCURO]) assert.match(papel.asp[clase], /^#[\da-f]{6}([\da-f]{2})?$/i);
  }
  for (const papel of [m.PAPEL_CLARO, m.PAPEL_OSCURO]) {
    assert.equal(new Set(['a-violeta', 'a-rojo', 'a-azul', 'a-verde'].map(c => papel.asp[c])).size, 4);
  }
});

test('los contactos exactos resuelven ambas orientaciones de cada aspecto al cruzar Aries', () => {
  const m = motor();
  for (const id of ['dia1', 'd360', 'dia2']) {
    const clave = m.clave(id);
    for (const angulo of [60, 90, 120, 150]) for (const signo of [-1, 1]) {
      const arco = mod(11 + signo*angulo - 350);
      const eventos = contactosPar(m, clave, arco, arco, angulo);
      assert.equal(eventos.length, 1, `${id}: ${signo*angulo}°`);
      cerca(mod(eventos[0].P.lon + eventos[0].arco - eventos[0].N.lon), mod(signo*angulo));
      cerca(eventos[0].ms, m.carta.ms + arco*clave.dias*DIA, .001);
    }
  }
});

test('conjunción y oposición no se duplican y los contactos se repiten en vueltas positivas y negativas', () => {
  const m = motor(), clave = m.clave('dia1');
  for (const angulo of [0, 60, 90, 120, 150, 180]) {
    const porVuelta = contactosPar(m, clave, 0, 359.999, angulo);
    assert.equal(porVuelta.length, angulo === 0 || angulo === 180 ? 1 : 2);
    for (const c of porVuelta) for (const vuelta of [-8, -1, 0, 1, 17, 100]) {
      const arco = c.arco + 360*vuelta;
      const repetidos = contactosPar(m, clave, arco, arco, angulo);
      assert.equal(repetidos.length, 1);
      cerca(repetidos[0].ms, c.ms + 360*vuelta*DIA, .001);
    }
  }
});

test('cada evento satisface su ángulo geométrico y la búsqueda no pierde contactos entre tres vueltas', () => {
  const m = motor([359.75, .25, 67, 181, 244.5]), clave = m.clave('dia2');
  const eventos = m.contactosAtacir(clave, -350, 710);
  const firmas = new Set();
  for (let i=0; i<eventos.length; i++) {
    const c = eventos[i], rad = (c.P.lon + c.arco - c.N.lon)*Math.PI/180;
    // Ángulo central independiente del algoritmo de búsqueda modular.
    const separacion = Math.atan2(Math.abs(Math.sin(rad)), Math.cos(rad))*180/Math.PI;
    cerca(separacion, c.asp.a);
    assert.ok(c.arco >= -350 && c.arco <= 710);
    if (i) assert.ok(c.ms >= eventos[i-1].ms);
    const firma = `${c.P.id}/${c.N.id}/${c.asp.a}/${c.arco}`;
    assert.ok(!firmas.has(firma)); firmas.add(firma);
  }
  for (const p of m.carta.cuerpos) for (const n of m.carta.cuerpos) {
    if (p.id === n.id) continue;
    for (const a of [0, 60, 90, 120, 150, 180]) {
      const ramas = a === 0 || a === 180 ? [a] : [a, -a];
      for (const rama of ramas) for (let vuelta=-3; vuelta<=3; vuelta++) {
        const arco = n.lon + rama - p.lon + vuelta*360;
        if (arco >= -350 && arco <= 710) assert.ok(firmas.has(`${p.id}/${n.id}/${a}/${arco}`), `contacto faltante ${arco}°`);
      }
    }
  }
});

test('el orbe activo incluye sus límites de ±1° y excluye la fracción inmediatamente exterior', () => {
  const m = motor();
  for (const id of ['dia1', 'd360', 'dia2']) for (const angulo of [60, 90, 120, 150]) {
    m.estadoAtacir.clave = id;
    const clave = m.clave(id), exacto = mod(11 + angulo - 350) + 360*40;
    for (const delta of [-1, -.9999, 0, .9999, 1, -1.0001, 1.0001]) {
      m.estadoAtacir.fecha = m.msDeArco(exacto + delta, clave);
      const capa = m.capaAtacir();
      const encontrado = capa.cerca.some(c => c.P.id === 'p0' && c.N.id === 'p1' && c.asp.a === angulo);
      assert.equal(encontrado, Math.abs(delta) <= 1, `${id}, ${angulo}°, delta ${delta}`);
      cerca(capa.movidos[0].lon, mod(350 + exacto + delta));
    }
  }
});

test('fecha y arco vuelven al mismo valor para claves rápidas, antes del nacimiento y tras cien vueltas', () => {
  const m = motor();
  for (const id of ['dia1', 'd360', 'dia2']) {
    const clave = m.clave(id);
    for (const arco of [-721.25, -1, 0, .5, 1, 359.9, 720, 36000.25]) {
      cerca(m.arcoDe(m.msDeArco(arco, clave), clave), arco);
    }
    for (const ms of [m.carta.ms - 10*DIA, m.carta.ms, m.carta.ms + DIA, Date.UTC(2026, 8, 15, 12)]) {
      cerca(m.msDeArco(m.arcoDe(ms, clave), clave), ms, .001);
      cerca(m.arcoDe(ms + DIA, clave) - m.arcoDe(ms, clave), 1/clave.dias);
    }
  }
});

test('un paso diario conserva la hora y vuelve a la fecha inicial al cruzar mes, año y día bisiesto', () => {
  const m = motor();
  for (const [anio, mes, dia] of [[2024, 1, 28], [2024, 1, 29], [2026, 8, 30], [2026, 11, 31]]) {
    const inicio = new Date(anio, mes, dia, 12, 37, 15, 250).getTime();
    for (const paso of [-1, 1]) {
      const esperado = new Date(anio, mes, dia + paso, 12, 37, 15, 250).getTime();
      const siguiente = m.avanzarFechaAtacir(inicio, paso);
      assert.equal(siguiente, esperado);
      assert.equal(m.avanzarFechaAtacir(siguiente, -paso), inicio);
    }
  }
});

test('el paso de calendario conserva el mediodía al cruzar días de 23 y 25 horas por horario de verano', () => {
  const m = motor();
  // Un proceso separado evita cambiar la zona horaria de las demás pruebas.
  const fuente = `const assert = require('node:assert/strict');
    const avanzar = ${m.avanzarFechaAtacir.toString()};
    for (const [mes, dia, horas] of [[2, 7, 23], [9, 31, 25]]) {
      const inicio = new Date(2026, mes, dia, 12).getTime();
      const fin = avanzar(inicio, 1);
      assert.equal(new Date(fin).getHours(), 12);
      assert.equal(fin - inicio, horas*3600000);
      assert.equal(avanzar(fin, -1), inicio);
    }`;
  const r = spawnSync(process.execPath, ['-e', fuente], {env: {...process.env, TZ: 'America/New_York'}, encoding: 'utf8'});
  assert.equal(r.status, 0, r.error?.message || r.stderr || r.stdout);
});

function canvasFalso() {
  const lineas = [], pila = [];
  let camino = [];
  return {
    lineas, globalAlpha: 1,
    save() { pila.push({globalAlpha: this.globalAlpha, strokeStyle: this.strokeStyle, fillStyle: this.fillStyle}); },
    restore() { Object.assign(this, pila.pop()); },
    beginPath() { camino = []; }, closePath() {},
    moveTo(x,y) { camino.push({x,y}); }, lineTo(x,y) { camino.push({x,y}); }, arc() {}, fill() {}, fillText() {}, setLineDash() {},
    stroke() { if (camino.length === 2) lineas.push({a: camino[0], b: camino[1], tinta: this.strokeStyle}); }
  };
}

test('la birrueda pinta los cuatro ángulos desde longitudes reales, con el color del aspecto en ambos temas', () => {
  const m = motor(), R = 320, asc = 28, cx = 400, cy = 400, arco = 370;
  const centro = Birrueda.geometria(R).centro;
  for (const papel of [undefined, m.PAPEL_CLARO, m.PAPEL_OSCURO]) for (const a of [60, 90, 120, 150]) {
    const asp = m.ANG_CONTACTOS_ATACIR.find(x => x.a === a);
    const P = {id: 'p0', lon: 359}, N = {id: 'p1', lon: mod(359 + arco - a)};
    const g = canvasFalso();
    Birrueda.pintar(g, {R, cx, cy, papel, base: {ang: {asc}, cuerpos: [N]}, capa: {arco, movidos: [{...P, lon: mod(P.lon + arco)}], cerca: [{P, N, asp}]}});
    const u = Birrueda.punto(P.lon + arco, centro, cx, cy, asc);
    const v = Birrueda.punto(N.lon, centro, cx, cy, asc);
    const trazo = g.lineas.find(l => Math.hypot(l.a.x-u.x,l.a.y-u.y) < 1e-7 && Math.hypot(l.b.x-v.x,l.b.y-v.y) < 1e-7);
    assert.ok(trazo, `extremos correctos a ${a}°`);
    cerca(Math.hypot(trazo.a.x-trazo.b.x, trazo.a.y-trazo.b.y), 2*centro*Math.sin(a*Math.PI/360));
    if (papel) assert.equal(trazo.tinta, papel.asp[asp.cl]);
    else assert.notEqual(trazo.tinta, '#6B6A78', `color definido para ${asp.cl}`);
  }
});
