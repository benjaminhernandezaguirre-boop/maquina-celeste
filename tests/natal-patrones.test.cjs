const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const contexto={};
vm.createContext(contexto);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..','app','natal-patrones.js'),'utf8'),contexto);
const P=contexto.NatalPatrones;
const ids=P.IDS;
const nombres={sol:'Sol',luna:'Luna',mercurio:'Mercurio',venus:'Venus',marte:'Marte',jupiter:'Júpiter',saturno:'Saturno',urano:'Urano',neptuno:'Neptuno',pluton:'Plutón'};
const carta=(longitudes,{hora=false}={})=>({
  datos:{horaConocida:hora},
  cuerpos:longitudes.map((lon,i)=>({id:ids[i],nombre:nombres[ids[i]],glifo:ids[i],lon})),
  cusp:hora?Object.assign(Array(13).fill(0),Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,i*30]))):null
});
const tipos=(longitudes)=>P.analizar(carta(longitudes)).patrones.map(x=>x.tipo);

assert.equal(P.separacion(359,1),2,'la separación debe cruzar 0° correctamente');
assert.ok(tipos([0,120,240]).includes('gran_trigono'));
assert.ok(tipos([0,180,90]).includes('cuadratura_t'));
assert.ok(tipos([0,90,180,270]).includes('gran_cruz'));
assert.ok(tipos([0,60,210]).includes('yod'));
assert.ok(tipos([0,120,240,180]).includes('cometa'));
assert.ok(tipos([0,60,180,240]).includes('rectangulo_mistico'));

const stellium=P.analizar(carta([1,5,9,120])).patrones.filter(x=>x.tipo==='stellium');
assert.equal(stellium.length,1,'un grupo debe producir un solo stellium máximo');
assert.equal(Array.from(stellium[0].ids).join(','),ids.slice(0,3).join(','));
assert.equal(P.analizar(carta([1,20,29])).patrones.some(x=>x.tipo==='stellium'),false,'un signo completo no basta si supera 10°');

const t=P.analizar(carta([0,180,90]));
assert.equal(Array.from(t.patrones.find(x=>x.tipo==='cuadratura_t').focales).join(','),ids[2]);
assert.equal(t.patrones.filter(x=>x.tipo==='cuadratura_t').length,1,'no duplica una configuración');

const aislada=P.analizar(carta([0,120,240,37]));
assert.ok(aislada.aislados.some(x=>x.id===ids[3]),'detecta un cuerpo sin aspectos mayores dentro del orbe');

const sinHora=P.analizar(carta([2,3,4,120]));
assert.equal(sinHora.concentraciones.conHora,false);
assert.equal(sinHora.concentraciones.casas.length,0,'no inventa casas sin hora natal');
assert.equal(sinHora.concentraciones.signos[0].cuerpos.length,3);

assert.equal(P.formaCarta(carta([0,20,40]).cuerpos).id,'haz');
assert.equal(P.formaCarta(carta([0,40,80,120,160]).cuerpos).id,'cuenco');
assert.equal(P.formaCarta(carta([0,40,80,120,160,200]).cuerpos).id,'locomotora');
const cubo=P.formaCarta(carta([0,15,30,45,60,75,90,105,120,240]).cuerpos);
assert.equal(cubo.id,'cubo');
assert.equal(cubo.asa.id,ids[9]);

console.log('natal-patrones: pruebas correctas');
