const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const sandbox={};sandbox.window=sandbox;vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','app','natal-estrellas.js'),'utf8'),sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','app','efemerides.js'),'utf8'),sandbox);
const F=sandbox.NatalEstrellas,E=sandbox.Efem;

assert.equal(F.ESTRELLAS.length,20);
assert.ok(Math.abs(F.separacion(359.8,.2)-.4)<1e-9);
assert.equal(F.orbePara({id:'sol',tipo:'planeta'}),1.5);
assert.equal(F.orbePara({id:'venus',tipo:'planeta'}),1);

const j2000=Date.UTC(2000,0,1,12),regulus=F.posicionEstrella(F.ESTRELLAS.find(x=>x.id==='regulus'),j2000,E),spica=F.posicionEstrella(F.ESTRELLAS.find(x=>x.id==='spica'),j2000,E);
assert.ok(Math.abs(regulus.lon-149.83)<.08,`Regulus J2000: ${regulus.lon}`);
assert.ok(Math.abs(spica.lon-203.84)<.08,`Spica J2000: ${spica.lon}`);
assert.ok(Math.abs(regulus.lat)<1);

const carta={ms:j2000,datos:{horaConocida:true},cuerpos:[{id:'sol',nombre:'Sol',glifo:'☉',lon:149.1},{id:'venus',nombre:'Venus',glifo:'♀',lon:203.3},{id:'marte',nombre:'Marte',glifo:'♂',lon:100}],ang:{asc:334.5,mc:20}};
const a=F.analizar(carta,E);
assert.ok(a.contactos.some(x=>x.estrella.id==='regulus'&&x.referencia.id==='sol'));
assert.ok(a.contactos.some(x=>x.estrella.id==='spica'&&x.referencia.id==='venus'));
assert.ok(a.contactos.some(x=>x.estrella.id==='fomalhaut'&&x.referencia.id==='asc'));
assert.ok(a.contactos.every(x=>x.diferencia<=x.orbe));
assert.equal(a.resumen.catalogo,20);
assert.ok(a.criterio.contacto.includes('1.5°'));

const fecha1990=Date.UTC(1990,2,21,12,30),cartaReal={ms:fecha1990,datos:{horaConocida:false},cuerpos:E.ORDEN.map(id=>({id,nombre:id,glifo:id,lon:E.lon(id,fecha1990)}))};
const real=F.analizar(cartaReal,E);
assert.equal(real.referencias.length,10);
assert.ok(real.estrellas.every(x=>Number.isFinite(x.lon)&&Number.isFinite(x.lat)));
assert.ok(real.estrellas.find(x=>x.id==='regulus').lon<regulus.lon,'la precesión lleva a Regulus a menor longitud en 1990');

console.log('natal-estrellas: pruebas correctas');

