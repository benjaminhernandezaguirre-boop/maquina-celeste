const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','app','natal-relaciones.js'),'utf8'),sandbox);
const R=sandbox.NatalRelaciones;
assert.equal(R.separacion(359,1),2);
assert.deepEqual(JSON.parse(JSON.stringify(R.puntoMedio(350,10))),{directo:0,opuesto:180});

const datos={
  sol:{lon:0,lat:0,dec:0,vel:1},luna:{lon:119,lat:0,dec:4,vel:13},mercurio:{lon:61,lat:0,dec:5,vel:1.4},venus:{lon:180,lat:0,dec:-4.5,vel:1.2},marte:{lon:90,lat:0,dec:23.5,vel:.6},
  jupiter:{lon:270,lat:0,dec:-23.6,vel:.1},saturno:{lon:45,lat:0,dec:15,vel:.05},urano:{lon:225,lat:0,dec:-15.5,vel:.02},neptuno:{lon:300,lat:0,dec:-20,vel:.01},pluton:{lon:330,lat:0,dec:-19.4,vel:-.01}
};
const ids=R.IDS,cuerpos=ids.map(id=>({id,nombre:id,glifo:id,lon:datos[id].lon}));
const E={
  sigTT:()=>0,oblicuidad:()=>23.44,nutacion:()=>({deps:0}),
  posGeo:id=>({lon:datos[id].lon,lat:datos[id].lat}),
  ecuatorial:lon=>({ar:lon,dec:Object.values(datos).find(x=>x.lon===lon).dec}),
  velocidad:id=>datos[id].vel
};
const carta={ms:1,datos:{horaConocida:true,factorOrbe:1},cuerpos,ang:{asc:0,mc:90}};
const a=R.analizar(carta,E);
const solLuna=a.dinamicos.find(x=>x.A.id==='sol'&&x.B.id==='luna');
assert.equal(solLuna.aspecto.id,'trigono');
assert.equal(solLuna.estado,'Aplicativo','la Luna se acerca al trígono exacto');
assert.ok(a.declinacion.contactos.some(x=>x.A.id==='luna'&&x.B.id==='venus'&&x.tipo==='Contraparalelo'));
assert.deepEqual(Array.from(a.declinacion.fueraLimites,x=>x.id),['jupiter','marte']);
assert.ok(a.declinacion.fueraLimites.every(x=>x.limitrofe));
assert.ok(a.antiscios.some(x=>x.A.id==='sol'&&x.B.id==='venus'&&x.tipo==='Antiscio'));
assert.ok(a.puntosMedios.some(x=>x.A.id==='sol'&&x.B.id==='venus'&&x.C.id==='marte'));
assert.ok(a.conexiones.some(x=>x.referencia.id==='asc'&&x.cuerpo.id==='sol'));
assert.ok(a.criterio.puntosMedios.includes('1.5°'));

sandbox.window=sandbox;
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','app','efemerides.js'),'utf8'),sandbox);
const EF=sandbox.Efem,ms=Date.UTC(1990,2,21,12,30),T=EF.sigTT(ms);
const cartaReal={ms,datos:{horaConocida:false,factorOrbe:1},cuerpos:EF.ORDEN.map(id=>({id,nombre:id,glifo:id,lon:EF.lonGeo(id,T)}))};
const real=R.analizar(cartaReal,EF);
assert.equal(real.cuerpos.length,10);
assert.ok(real.cuerpos.every(x=>Number.isFinite(x.declinacion)&&Number.isFinite(x.velocidad)));
assert.ok(Math.abs(real.cuerpos.find(x=>x.id==='luna').latitud)>.1,'se conserva la latitud eclíptica lunar');
assert.ok(real.dinamicos.every(x=>['Exacto','Aplicativo','Separativo','Casi estacionario'].includes(x.estado)));

console.log('natal-relaciones: pruebas correctas');

