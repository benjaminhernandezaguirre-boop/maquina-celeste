const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const sandbox={};sandbox.window=sandbox;vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','app','natal-luminarias.js'),'utf8'),sandbox);
const L=sandbox.NatalLuminarias;

assert.equal(L.faseDe(0).id,'nueva');
assert.equal(L.faseDe(90).id,'cuarto_creciente');
assert.equal(L.faseDe(180).id,'llena');
assert.equal(L.faseDe(270).id,'cuarto_menguante');
assert.equal(L.separacion(359,1),2);
assert.equal(L.aspectoDe(0,118).id,'trigono');
assert.equal(L.aspectoDe(0,116),null);
assert.deepEqual(JSON.parse(JSON.stringify(L.distanciaNodos(178,0))),{distancia:2,nodo:'Nodo sur',lonNodo:180});

const DIA=L.DIA,base=Date.UTC(2020,0,1),ritmo=360/L.SINODICO;
const Elineal={
  lon:(id,ms)=>L.mod((ms-base)/DIA*(id==='luna'?ritmo:0)),
  velocidad:id=>id==='luna'?ritmo:0,
  sigTT:ms=>ms,
  posGeo:(id,T)=>({lon:L.mod((T-base)/DIA*(id==='luna'?ritmo:0)),lat:id==='luna'?.25:0}),
  nodoNorte:()=>10,
  ecuatorial:(lon,lat)=>({ar:lon,dec:lat})
};
const R={regenteDe:()=> 'marte',PLANETAS:{marte:{nombre:'Marte',glifo:'♂'}}};
const cartaLineal={ms:base+10*DIA,datos:{horaConocida:true},cusp:{c:Array.from({length:13},(_,i)=>i?L.mod((i-1)*30):null)},ang:{asc:0,mc:90},cuerpos:[{id:'sol',nombre:'Sol',glifo:'☉',lon:0},{id:'marte',nombre:'Marte',glifo:'♂',lon:120}]};
const lineal=L.analizar(cartaLineal,Elineal,R);
assert.ok(Math.abs(lineal.fase.edadDias-10)<1e-5);
assert.equal(lineal.sizigia.tipo,'Luna nueva');
assert.equal(lineal.sizigia.casa,1);
assert.equal(lineal.sizigia.regente.id,'marte');
assert.ok(lineal.sizigia.aspectos.some(x=>x.referencia.id==='marte'&&x.aspecto.id==='trigono'));

vm.runInContext(fs.readFileSync(path.join(__dirname,'..','app','efemerides.js'),'utf8'),sandbox);
const E=sandbox.Efem,ms=Date.UTC(1990,2,21,12,30),T=E.sigTT(ms);
const cartaReal={ms,datos:{horaConocida:false},cuerpos:E.ORDEN.map(id=>({id,nombre:id,glifo:id,lon:E.lon(id,ms)}))};
const real=L.analizar(cartaReal,E,R);
const usnoLlena=Date.UTC(1990,2,11,10,59);
assert.equal(real.sizigia.tipo,'Luna llena');
assert.ok(Math.abs(real.sizigia.ms-usnoLlena)<3*3600000,`la Luna llena difiere ${Math.abs(real.sizigia.ms-usnoLlena)/3600000} h de USNO`);
assert.ok(real.fase.edadDias>24&&real.fase.edadDias<26);
assert.ok(real.fase.iluminacion>25&&real.fase.iluminacion<40);
assert.equal(real.sizigia.casa,null);
assert.ok(real.sizigia.diasAntes>9&&real.sizigia.diasAntes<11);
assert.ok(Math.abs(L.errorFase(real.sizigia.ms,180,E))<1e-4);

console.log('natal-luminarias: pruebas correctas');

