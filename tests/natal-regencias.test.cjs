const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app/natal-regencias.js'),'utf8'),ctx);
const R=ctx.NatalRegencias;
const base=(lons,extra={})=>({datos:{horaConocida:true,lat:19,lon:-99,tz:'America/Mexico_City'},ms:0,diurna:true,ang:{asc:5},cuerpos:R.ORDEN.map(id=>({id,lon:lons[id]??0})),...extra});

test('traditional sign rulers include the two domiciles of Mercury, Venus, Mars, Jupiter and Saturn',()=>{
  assert.deepEqual(Array.from(R.REGENTES),['marte','venus','mercurio','luna','sol','mercurio','venus','marte','jupiter','saturno','saturno','jupiter']);
});

test('a chain ends at a planet in its own domicile',()=>{
  const a=R.analizar(base({sol:125,luna:35,venus:185}));
  const sun=a.filas.find(x=>x.id==='sol');
  const moon=a.filas.find(x=>x.id==='luna');
  assert.equal(sun.cadena.tipo,'final');assert.equal(sun.cadena.final,'sol');
  assert.deepEqual(Array.from(moon.cadena.recorrido),['luna','venus']);assert.equal(moon.cadena.final,'venus');
});

test('mutual domicile reception produces one circuit without duplicates',()=>{
  const a=R.analizar(base({marte:35,venus:5}));
  assert.ok(a.recepciones.some(x=>x.a==='venus'&&x.b==='marte'));
  assert.ok(a.ciclos.some(x=>x.ids.includes('venus')&&x.ids.includes('marte')));
  assert.equal(a.recepciones.filter(x=>[x.a,x.b].includes('venus')&&[x.a,x.b].includes('marte')).length,1);
});

test('the Ascendant ruler and luminary dispositors come from their tropical signs',()=>{
  const a=R.analizar(base({sol:100,luna:220},{ang:{asc:65}}));
  assert.equal(a.regenteCarta.id,'mercurio');
  assert.equal(a.luminarias.sol.id,'luna');
  assert.equal(a.luminarias.luna.id,'marte');
});

test('unknown birth time suppresses chart ruler and almuten but preserves chains',()=>{
  const carta=base({sol:125},{datos:{horaConocida:false},ang:null,diurna:null});
  const a=R.analizar(carta,{D:{almutenFiguris(){throw new Error('must not run')}}});
  assert.equal(a.regenteCarta,null);assert.equal(a.almuten,null);assert.equal(a.filas.length,7);
});

test('almuten figuris is reused from the existing dignity engine',()=>{
  const D={almutenFiguris(carta){assert.equal(carta.asc,5);return{ganador:{planeta:'Júpiter',total:27,esencial:16,accidental:11}}}};
  const a=R.analizar(base({}),{D,E:{}});
  assert.deepEqual({...a.almuten},{id:'jupiter',nombre:'Júpiter',glifo:'♃',total:27,esencial:16,accidental:11});
});

test('the natal calculator exposes package two inside the professional panel',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../astroplanetario.html'),'utf8');
  assert.match(html,/app\/natal-regencias\.js/);
  assert.match(html,/id="regenciasProfesionales"/);
  assert.match(html,/Regente de la carta/);
  assert.match(html,/Mapa de disposiciones/);
  assert.match(html,/Ver las siete cadenas completas/);
  assert.match(html,/Recepción mutua por domicilio/);
});

