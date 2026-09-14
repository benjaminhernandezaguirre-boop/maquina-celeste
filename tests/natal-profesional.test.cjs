const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'app/natal-profesional.js'),'utf8');
const ctx={};
vm.createContext(ctx);
vm.runInContext(source,ctx);
const P=ctx.NatalProfesional;

test('essential dignities combine the visible traditional components',()=>{
  const sun=P.dignidadesEsenciales('sol',19,true);
  assert.equal(sun.puntos,8);
  assert.deepEqual(Array.from(sun.detalles,d=>d.label),['Exaltación','Triplicidad','Decano']);

  const mars=P.dignidadesEsenciales('marte',22,true);
  assert.equal(mars.termino,'marte');
  assert.equal(mars.puntos,7);

  const venus=P.dignidadesEsenciales('venus',7,true);
  assert.equal(venus.exilio,true);
  assert.equal(venus.termino,'venus');
  assert.equal(venus.puntos,-3);
});

test('Egyptian bounds and Chaldean decans respect exact boundaries',()=>{
  assert.equal(P.regenteTermino(0,5.999),'jupiter');
  assert.equal(P.regenteTermino(0,6),'venus');
  assert.equal(P.regenteTermino(0,29.999),'saturno');
  assert.equal(P.regenteDecano(0,9.999),'marte');
  assert.equal(P.regenteDecano(0,10),'sol');
  assert.equal(P.regenteDecano(0,20),'venus');
});

test('solar condition uses the declared cazimi, combustion and beam thresholds',()=>{
  assert.equal(P.condicionSolar('venus',100+17/60,100).tipo,'cazimi');
  assert.equal(P.condicionSolar('venus',100.284,100).tipo,'combusto');
  assert.equal(P.condicionSolar('venus',108.49,100).tipo,'combusto');
  assert.equal(P.condicionSolar('venus',108.5,100).tipo,'rayos');
  assert.equal(P.condicionSolar('venus',117,100).tipo,'libre');
});

test('sect distinguishes day and night families and Mercury phase',()=>{
  assert.equal(P.sectaPlaneta('jupiter',140,100,true,10).coincide,true);
  assert.equal(P.sectaPlaneta('venus',140,100,true,4).coincide,false);
  assert.equal(P.sectaPlaneta('mercurio',90,100,true,10).secta,'diurna');
  assert.equal(P.sectaPlaneta('mercurio',110,100,false,4).secta,'nocturna');
});

test('professional analysis scores exactly the seven traditional planets',()=>{
  const ids=['sol','luna','mercurio','venus','marte','jupiter','saturno','urano','neptuno','pluton'];
  const carta={datos:{horaConocida:true},diurna:true,ms:0,cusp:[null,0,30,60,90,120,150,180,210,240,270,300,330],cuerpos:ids.map((id,i)=>({id,nombre:id,lon:i*25,retro:false}))};
  const E={velocidad:()=>1};
  const result=P.analizar(carta,E);
  assert.equal(result.filas.length,7);
  assert.deepEqual(Array.from(result.filas,x=>x.id),ids.slice(0,7));
  assert.deepEqual(Array.from(result.excluidos),['urano','neptuno','pluton']);
  assert.equal(result.cartaSecta.tipo,'diurna');
});

test('calculator and landing expose package one and its criteria',()=>{
  const calculator=fs.readFileSync(path.join(root,'astroplanetario.html'),'utf8');
  const landing=fs.readFileSync(path.join(root,'carta-natal.html'),'utf8');
  assert.match(calculator,/app\/natal-profesional\.js/);
  assert.match(calculator,/id="tabProfesional"/);
  assert.match(calculator,/id="hojaProfesional"/);
  assert.match(calculator,/profesional:'tabProfesional'/);
  for(const text of ['Dignidad esencial','Dignidad accidental','Criterios de este cálculo','Triplicidades','Términos','Decanos'])assert.match(calculator,new RegExp(text));
  for(const id of ['analisis-profesional','dignidades-esenciales','dignidades-accidentales','secta'])assert.match(landing,new RegExp(`id="${id}"`));
  assert.match(landing,/tab=profesional/);
});

