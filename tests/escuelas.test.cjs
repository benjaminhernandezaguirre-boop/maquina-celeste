const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = {window:{}, Math, console, JSON, localStorage:undefined};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','app','escuelas.js'),'utf8'), context);
const E = context.window.Escuelas;

test('existen los cinco perfiles pedidos', () => {
  const ids = Array.from(E.PERFILES.map(p => p.id));
  assert.deepEqual(ids, ['contemporanea','helenistica','medieval','renacentista','personalizada']);
});

test('cada perfil trae la configuración que le corresponde', () => {
  const esperado = {
    contemporanea:{poblacion:'diez',  regencias:'modernas',      zodiaco:'trop', casas:'placidio'},
    helenistica:  {poblacion:'siete', regencias:'tradicionales', zodiaco:'trop', casas:'signos'},
    medieval:     {poblacion:'siete', regencias:'tradicionales', zodiaco:'trop', casas:'alcabitius'},
    renacentista: {poblacion:'siete', regencias:'tradicionales', zodiaco:'trop', casas:'regiomontano'}
  };
  Object.entries(esperado).forEach(([id, v]) => {
    const e = E.resuelve({perfil:id});
    assert.equal(e.poblacion, v.poblacion, id);
    assert.equal(e.regencias, v.regencias, id);
    assert.equal(e.zodiaco, v.zodiaco, id);
    assert.equal(e.casas, v.casas, id);
  });
});

test('la población planetaria es siete o diez, nunca otra cosa', () => {
  E.PERFILES.forEach(p => {
    const e = E.resuelve({perfil:p.id});
    assert.ok(e.cuerpos.length === 7 || e.cuerpos.length === 10, p.id);
    assert.equal(e.cuerpos.length + e.fuera.length, 10, p.id);
  });
});

test('no se atribuye a la escuela helenística nada posterior a ella', () => {
  ['almutenFiguris','puntuacionLilly','dignidadesAccidentales'].forEach(m => {
    assert.equal(E.permite({perfil:'helenistica'}, m), false, m);
    assert.ok(E.motivoVeto({perfil:'helenistica'}, m), `${m} debe explicar por qué no se ofrece`);
  });
  /* Y no por prohibirlo en helenística deja de existir donde sí corresponde. */
  assert.equal(E.permite({perfil:'medieval'}, 'almutenFiguris'), true);
  assert.equal(E.permite({perfil:'renacentista'}, 'puntuacionLilly'), true);
  assert.equal(E.permite({perfil:'medieval'}, 'puntuacionLilly'), false, 'Lilly es del XVII, no medieval');
});

test('los métodos declaran su procedencia y su estado', () => {
  Object.entries(E.METODOS).forEach(([id, m]) => {
    assert.ok(m.nombre, id);
    assert.ok(['helenistica','medieval','renacentista','moderna','compartida'].includes(m.origen), `${id}: origen ${m.origen}`);
    assert.ok(['disponible','futura'].includes(m.estado), `${id}: estado ${m.estado}`);
  });
});

test('el catálogo nunca ofrece como disponible algo que no está implementado', () => {
  E.PERFILES.forEach(p => {
    const c = E.catalogo({perfil:p.id});
    [...c.incluidos, ...c.opcionales, ...c.vedados].forEach(m =>
      assert.equal(E.METODOS[m.id].estado, 'disponible', `${p.id} ofrece ${m.id}, que es futura`));
    c.futuras.forEach(m => assert.equal(m.estado, 'futura'));
    assert.ok(c.futuras.length > 0, 'debe haber técnicas futuras declaradas aparte');
  });
});

test('los perfiles tradicionales dejan fuera a los transaturninos', () => {
  ['helenistica','medieval','renacentista'].forEach(id => {
    const e = E.resuelve({perfil:id});
    assert.deepEqual(Array.from(e.fuera).sort(), ['neptuno','pluton','urano']);
    ['urano','neptuno','pluton'].forEach(t => assert.ok(!e.cuerpos.includes(t), `${id} incluye ${t}`));
  });
  assert.deepEqual(Array.from(E.resuelve({perfil:'contemporanea'}).fuera), []);
});

test('la capa complementaria no mete a los transaturninos en el cálculo', () => {
  const e = E.resuelve({perfil:'helenistica', complementaria:true});
  assert.equal(e.complementaria, true);
  assert.equal(e.cuerpos.length, 7, 'siguen sin entrar en la población de cálculo');
  const sinCapa = E.resuelve({perfil:'contemporanea', complementaria:true});
  assert.equal(sinCapa.complementaria, false, 'no hay capa si no hay nada excluido');
});

test('con regencias tradicionales cada signo tiene regente dentro de los siete', () => {
  ['helenistica','medieval','renacentista'].forEach(id => {
    for(let s = 0; s < 12; s++){
      const r = E.regenteDeSigno(s, {perfil:id});
      assert.ok(E.regenteValido({perfil:id}, r), `${id}: el signo ${s} lo rige ${r}, que no está en la población`);
    }
  });
});

test('con regencias modernas Escorpio, Acuario y Piscis cambian de regente', () => {
  const m = E.resuelve({perfil:'contemporanea'}).regentes;
  const t = E.REGENTES_TRADICIONALES;
  assert.equal(m[7], 'Plutón');   assert.equal(t[7], 'Marte');
  assert.equal(m[10], 'Urano');   assert.equal(t[10], 'Saturno');
  assert.equal(m[11], 'Neptuno'); assert.equal(t[11], 'Júpiter');
  /* Los otros nueve no cambian. */
  [0,1,2,3,4,5,6,8,9].forEach(s => assert.equal(m[s], t[s], `el signo ${s} no debería cambiar`));
});

test('el perfil personalizado admite sideral con Plácidus y tropical con signos enteros', () => {
  const a = E.resuelve({perfil:'personalizada', zodiaco:'lahiri', casas:'placidio'});
  assert.equal(a.sideral, true);
  assert.equal(a.casas, 'placidio');
  assert.ok(a.ayanamsaBase > 20 && a.ayanamsaBase < 30);
  const b = E.resuelve({perfil:'personalizada', zodiaco:'trop', casas:'signos'});
  assert.equal(b.sideral, false);
  assert.equal(b.casas, 'signos');
  assert.equal(b.ayanamsaBase, null);
});

test('solo el perfil personalizado acepta ajustes sueltos', () => {
  const fijo = E.resuelve({perfil:'helenistica', casas:'placidio', poblacion:'diez'});
  assert.equal(fijo.casas, 'signos', 'un perfil cerrado no debe dejarse cambiar por la puerta de atrás');
  assert.equal(fijo.poblacion, 'siete');
  const libre = E.resuelve({perfil:'personalizada', casas:'placidio', poblacion:'siete'});
  assert.equal(libre.casas, 'placidio');
  assert.equal(libre.poblacion, 'siete');
});

test('los cuatro sistemas de casas de los perfiles existen en el módulo de casas', () => {
  const casasJs = {window:{}, Math, console};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','app','casas.js'),'utf8'), casasJs);
  const C = casasJs.window.Casas;
  E.PERFILES.forEach(p => assert.ok(C.NOMBRES[E.resuelve({perfil:p.id}).casas], `${p.id}: casas desconocidas`));
  E.CASAS.forEach(c => assert.ok(C.NOMBRES[c.id], `${c.id} está en el selector pero no implementado`));
});

test('la firma dice siempre escuela, zodiaco, casas, población y regencias', () => {
  const f = E.firma({perfil:'renacentista'});
  assert.ok(f.includes('Renacentista'));
  assert.ok(f.includes('Tropical'));
  assert.ok(f.includes('Regiomontanus'));
  assert.ok(f.includes('siete planetas'));
  assert.ok(f.includes('tradicionales'));
  assert.ok(!f.includes('ayanamsa'), 'sin sideral no se menciona ayanamsa');
});

test('con zodiaco sideral la firma muestra la ayanamsa aplicada', () => {
  const f = E.firma({perfil:'personalizada', zodiaco:'lahiri'}, 24.2167);
  assert.ok(/ayanamsa 24° 13′/.test(f), `la firma fue: ${f}`);
});

test('cada perfil se presenta como convención, no como la verdad de su época', () => {
  E.PERFILES.forEach(p => {
    assert.ok(p.encuadre && p.encuadre.length > 40, `${p.id} necesita encuadre`);
    assert.ok(p.resumen && p.resumen.length > 20, `${p.id} necesita resumen`);
  });
});
