const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = {window:{}, Intl, console};
['efemerides.js','profecciones.js','dignidades.js'].forEach(f =>
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','app',f),'utf8'), context));
const D = context.window.Dignidades;
const E = context.window.Efem;
const P = context.window.Profecciones;
const CINCO = ['Júpiter','Marte','Mercurio','Saturno','Venus'];

/* ---------- tablas ---------- */

test('ambas tablas de términos están bien formadas', () => {
  [['egipcios',D.TERMINOS_EGIPCIOS],['ptolemaicos',D.TERMINOS_PTOLEMAICOS]].forEach(([nombre,tabla]) => {
    assert.equal(tabla.length, 12, nombre);
    tabla.forEach((fila, s) => {
      assert.equal(fila.length, 5, `${nombre} ${D.SIGNOS[s]}`);
      assert.equal(fila[4][1], 30, `${nombre} ${D.SIGNOS[s]} debe cerrar en 30°`);
      assert.deepEqual(Array.from(fila.map(f => f[0])).sort(), CINCO, `${nombre} ${D.SIGNOS[s]}: los cinco planetas una sola vez`);
      let prev = 0;
      fila.forEach(f => { assert.ok(f[1] > prev, `${nombre} ${D.SIGNOS[s]}: límites crecientes`); prev = f[1]; });
    });
  });
});

test('los términos no se reparten entre las luminarias', () => {
  [D.TERMINOS_EGIPCIOS, D.TERMINOS_PTOLEMAICOS].forEach(tabla =>
    tabla.forEach(fila => fila.forEach(f =>
      assert.ok(f[0] !== 'Sol' && f[0] !== 'Luna'))));
});

test('los términos egipcios coinciden con la tabla de Valente', () => {
  const muestras = [[0,0,'Júpiter'],[0,10,'Venus'],[0,22,'Marte'],[0,28,'Saturno'],
                    [4,17,'Saturno'],[6,27,'Venus'],[8,5,'Júpiter'],[11,29,'Saturno']];
  muestras.forEach(([s,g,esperado]) =>
    assert.equal(D.terminoDe(s,g,D.TERMINOS_EGIPCIOS).planeta, esperado, `${D.SIGNOS[s]} ${g}°`));
});

test('los términos ptolemaicos coinciden con el Tetrabiblos I.21', () => {
  const muestras = [[0,0,'Júpiter'],[0,10,'Venus'],[4,3,'Saturno'],[9,3,'Venus'],[11,7,'Venus']];
  muestras.forEach(([s,g,esperado]) =>
    assert.equal(D.terminoDe(s,g,D.TERMINOS_PTOLEMAICOS).planeta, esperado, `${D.SIGNOS[s]} ${g}°`));
});

test('las dos tablas de términos no son la misma', () => {
  assert.notDeepEqual(JSON.stringify(D.TERMINOS_EGIPCIOS), JSON.stringify(D.TERMINOS_PTOLEMAICOS));
});

test('el límite de un término pertenece al siguiente', () => {
  // Aries: Júpiter hasta 6. El grado 6 exacto ya es de Venus.
  assert.equal(D.terminoDe(0, 5.99, D.TERMINOS_EGIPCIOS).planeta, 'Júpiter');
  assert.equal(D.terminoDe(0, 6, D.TERMINOS_EGIPCIOS).planeta, 'Venus');
});

test('las faces siguen el orden caldeo completo', () => {
  const esperado = [['Marte','Sol','Venus'],['Mercurio','Luna','Saturno'],['Júpiter','Marte','Sol'],
    ['Venus','Mercurio','Luna'],['Saturno','Júpiter','Marte'],['Sol','Venus','Mercurio'],
    ['Luna','Saturno','Júpiter'],['Marte','Sol','Venus'],['Mercurio','Luna','Saturno'],
    ['Júpiter','Marte','Sol'],['Venus','Mercurio','Luna'],['Saturno','Júpiter','Marte']];
  esperado.forEach((f,s) => f.forEach((p,d) =>
    assert.equal(D.fazDe(s,d), p, `faz de ${D.SIGNOS[s]} decano ${d+1}`)));
});

test('las siete exaltaciones están en su signo y en su grado', () => {
  const esperado = {0:['Sol',19],1:['Luna',3],3:['Júpiter',15],5:['Mercurio',15],
                    6:['Saturno',21],9:['Marte',28],11:['Venus',27]};
  Object.entries(esperado).forEach(([s,[p,g]]) => {
    assert.equal(D.EXALTACIONES[s].planeta, p);
    assert.equal(D.EXALTACIONES[s].grado, g);
  });
  [2,4,7,8,10].forEach(s => assert.ok(!D.EXALTACIONES[s], `${D.SIGNOS[s]} no tiene exaltación`));
});

test('exilio y caída se oponen al domicilio y a la exaltación', () => {
  for (let s = 0; s < 12; s++) {
    assert.equal(D.exilioDe(s), D.REGENTES[D.mod(s+6,12)]);
    const ex = D.EXALTACIONES[D.mod(s+6,12)];
    assert.equal(D.caidaDe(s), ex ? ex.planeta : null);
  }
  assert.equal(D.exilioDe(0), 'Venus');
  assert.equal(D.caidaDe(6), 'Sol');
});

test('las regencias tradicionales no usan planetas modernos', () => {
  assert.deepEqual(Array.from(D.REGENTES),
    ["Marte","Venus","Mercurio","Luna","Sol","Mercurio","Venus","Marte","Júpiter","Saturno","Saturno","Júpiter"]);
  assert.equal(D.REGENTES[7], 'Marte', 'Escorpio lo rige Marte');
  assert.equal(D.REGENTES[10], 'Saturno', 'Acuario lo rige Saturno');
  assert.equal(D.REGENTES[11], 'Júpiter', 'Piscis lo rige Júpiter');
});

test('las triplicidades doroteas traen participante y las ptolemaicas no', () => {
  assert.equal(D.TRIPLICIDAD_DOROTEO.fuego.dia, 'Sol');
  assert.equal(D.TRIPLICIDAD_DOROTEO.fuego.noche, 'Júpiter');
  assert.equal(D.TRIPLICIDAD_DOROTEO.fuego.participante, 'Saturno');
  assert.equal(D.TRIPLICIDAD_DOROTEO.agua.dia, 'Venus');
  assert.equal(D.TRIPLICIDAD_DOROTEO.agua.noche, 'Marte');
  assert.equal(D.TRIPLICIDAD_PTOLOMEO.agua.dia, 'Marte');
  assert.ok(!D.TRIPLICIDAD_PTOLOMEO.fuego.participante);
});

test('el elemento del signo sigue el ciclo fuego-tierra-aire-agua', () => {
  assert.equal(D.elementoDe(0), 'fuego');
  assert.equal(D.elementoDe(1), 'tierra');
  assert.equal(D.elementoDe(2), 'aire');
  assert.equal(D.elementoDe(3), 'agua');
  assert.equal(D.elementoDe(11), 'agua');
});

/* ---------- puntuación ---------- */

test('la puntuación ptolemaica usa los valores clásicos', () => {
  assert.deepEqual(Object.assign({},D.PUNTOS), {domicilio:5,exaltacion:4,triplicidad:3,termino:2,faz:1,exilio:-5,caida:-4});
});

test('el Sol en su exaltación de día suma exaltación, triplicidad y faz', () => {
  const e = D.estadoDe('Sol', 19.5, true);   // Aries 19°30ʹ
  assert.equal(e.puntuacion, 4 + 3 + 1);
  assert.equal(e.resumen, 'En exaltación');
  assert.equal(e.peregrino, false);
});

test('solo el regente de triplicidad en secta puntúa, no el participante', () => {
  const dia   = D.estadoDe('Saturno', 5, true);   // Aries de día: Saturno solo participa
  const noche = D.estadoDe('Júpiter', 5, false);  // Aries de noche: Júpiter rige
  assert.ok(!dia.dignidades.some(d => d.tipo === 'triplicidad'));
  assert.ok(noche.dignidades.some(d => d.tipo === 'triplicidad'));
});

test('un planeta en su exilio queda en negativo', () => {
  const venus = D.estadoDe('Venus', 5, true);     // Venus en Aries
  assert.ok(venus.puntuacion < 0);
  assert.equal(venus.resumen.startsWith('En exilio'), true);
});

test('peregrino es no tener ninguna de las cinco ni ninguna debilidad', () => {
  const e = D.estadoDe('Luna', 100, true);
  const tiene = e.dignidades.length || e.debilidades.length;
  assert.equal(e.peregrino, !tiene);
});

test('la triplicidad cambia con la secta', () => {
  const dia   = D.estadoDe('Sol', 5, true);
  const noche = D.estadoDe('Sol', 5, false);
  assert.ok(dia.puntuacion > noche.puntuacion, 'el Sol rige el fuego de día');
});

test('el almutén de un grado es quien más puntos reúne ahí', () => {
  const a = D.almutenDeGrado(19.5, true);         // Aries 19°30ʹ
  assert.equal(a.ganador.planeta, 'Sol');
  assert.ok(a.marcador.every((x,i,arr) => i === 0 || arr[i-1].puntuacion >= x.puntuacion), 'ordenado de mayor a menor');
});

/* ---------- carta real ---------- */

const datos = {nombre:'Prueba',anio:1990,mes:1,dia:15,hora:10,min:30,horaConocida:true,
  lat:19.4326,lon:-99.1332,tz:'America/Mexico_City',lugarTexto:'CDMX',sistema:'signos',factorOrbe:1};
const carta = P.prepararCarta(datos, E);

test('la tabla de la carta trae los siete tradicionales', () => {
  const t = D.tablaCarta(carta);
  assert.equal(t.length, 7);
  assert.deepEqual(Array.from(t.map(r => r.planeta)), Array.from(D.PLANETAS));
  t.forEach(r => { assert.ok(Number.isFinite(r.puntuacion)); assert.ok(r.casa >= 1 && r.casa <= 12); });
});

test('Saturno en Capricornio sale en domicilio', () => {
  const s = D.tablaCarta(carta).find(r => r.planeta === 'Saturno');
  assert.equal(D.SIGNOS[D.signoDe(s.lon)], 'Capricornio');
  assert.equal(s.resumen, 'En domicilio');
  assert.ok(s.puntuacion >= 5);
});

test('cambiar la tabla de términos cambia el resultado en algún grado', () => {
  const eg = D.tablaCarta(carta, {terminos:'egipcios'});
  const pt = D.tablaCarta(carta, {terminos:'ptolemaicos'});
  assert.notDeepEqual(Array.from(eg.map(r => r.detalle.termino.planeta)), Array.from(pt.map(r => r.detalle.termino.planeta)));
});

test('la hora planetaria encuentra la salida del Sol, no el ocaso', () => {
  const hp = D.horaPlanetaria(carta.nacimiento, datos.lat, datos.lon, E, datos.tz);
  assert.ok(hp, 'debe resolverse en latitud media');
  assert.ok(hp.salida < hp.ocaso, 'la salida va antes del ocaso');
  assert.ok(hp.ocaso < hp.siguienteSalida);
  assert.ok(hp.salida <= carta.nacimiento && carta.nacimiento < hp.siguienteSalida);
  const hora = new Intl.DateTimeFormat('en-GB',{timeZone:datos.tz,hour:'2-digit',hourCycle:'h23'}).format(new Date(hp.salida));
  assert.ok(Number(hora) >= 5 && Number(hora) <= 8, `la salida cayó a las ${hora}h`);
});

test('el 15 de enero de 1990 fue lunes, así que manda la Luna', () => {
  const hp = D.horaPlanetaria(carta.nacimiento, datos.lat, datos.lon, E, datos.tz);
  assert.equal(hp.regenteDia, 'Luna');
  assert.equal(hp.regenteHora, 'Marte', 'cuarta hora diurna desde la Luna en orden caldeo');
  assert.equal(hp.esDia, true);
});

test('las horas planetarias son desiguales fuera de los equinoccios', () => {
  const hp = D.horaPlanetaria(carta.nacimiento, datos.lat, datos.lon, E, datos.tz);
  assert.ok(Math.abs(hp.duracionHora - 3600000) > 60000, 'en enero la hora diurna no dura 60 minutos');
});

test('la hora planetaria se rinde con sol circumpolar en vez de mentir', () => {
  const verano = E.localAUTC(2020,6,21,12,0,'UTC','earlier');
  assert.equal(D.horaPlanetaria(verano, 82, 0, E, 'UTC'), null);
});

test('la sicigia prenatal cae en el mes anterior al nacimiento', () => {
  const sz = D.sicigiaPrenatal(carta.nacimiento, E);
  assert.ok(sz, 'debe encontrarse');
  assert.ok(['luna nueva','luna llena'].includes(sz.tipo));
  const dias = (carta.nacimiento - sz.ms) / 86400000;
  assert.ok(dias > 0 && dias < 30, `cayó ${dias.toFixed(1)} días antes`);
});

test('en una luna nueva el Sol y la Luna coinciden; en la llena se oponen', () => {
  const sz = D.sicigiaPrenatal(carta.nacimiento, E);
  const sep = E.mod360(E.lon('luna', sz.ms) - E.lon('sol', sz.ms));
  const esperada = sz.tipo === 'luna nueva' ? 0 : 180;
  const dif = Math.abs(((sep - esperada + 180) % 360) - 180);
  assert.ok(dif < 0.05, `la separación se desvió ${dif.toFixed(4)}°`);
});

test('el almutén figuris puntúa los cinco puntos hylegiacales', () => {
  const a = D.almutenFiguris(carta, {E});
  assert.equal(a.puntos.length, 5);
  assert.deepEqual(Array.from(a.puntos.map(p => p.nombre)),
    ['Sol','Luna','Ascendente','Lote de Fortuna','Sicigia prenatal']);
  assert.equal(a.tabla.length, 7);
  assert.ok(a.tabla.every((x,i,arr) => i === 0 || arr[i-1].total >= x.total), 'ordenado de mayor a menor');
  assert.equal(a.ganador, a.tabla[0]);
  a.tabla.forEach(t => assert.equal(t.total, t.esencial + t.accidental));
});

test('el Lote de Fortuna se invierte con la secta', () => {
  const dia = D.almutenFiguris(carta, {E});
  assert.equal(carta.diurna, true);
  const esperado = D.mod(carta.asc + carta.cuerpos.luna - carta.cuerpos.sol, 360);
  assert.ok(Math.abs(dia.fortuna - esperado) < 1e-9);
});

test('el reparto accidental por casa reparte 78 puntos entre las doce', () => {
  assert.equal(D.PUNTOS_CASA.length, 12);
  assert.equal(D.PUNTOS_CASA.reduce((a,b) => a+b, 0), 78);
  assert.deepEqual(Array.from(D.PUNTOS_CASA).sort((a,b)=>a-b), [1,2,3,4,5,6,7,8,9,10,11,12]);
  assert.equal(D.PUNTOS_CASA[0], 12, 'la casa I es la más fuerte');
  assert.equal(D.PUNTOS_CASA[11], 1, 'la casa XII la más débil');
});
