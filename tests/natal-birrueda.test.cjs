const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const B = require('../app/natal-birrueda.js');
const cerca = (a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} ≈ ${b}`);

// UMD funciona también como script sin CommonJS.
const navegador={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app/natal-birrueda.js'),'utf8'),navegador);
assert.equal(typeof navegador.window.NatalBirrueda.pintar,'function');

// Ascendente a la izquierda; sentido zodiacal y cruce de 0° coherentes.
cerca(B.punto(0,100).x,-100);cerca(B.punto(360,100).x,-100);
cerca(B.punto(90,100).y,100);cerca(B.punto(270,100).y,-100);
cerca(B.punto(359,100,0,0,359).x,-100);
cerca(B.punto(1,100,0,0,359).y,100*Math.sin(178*Math.PI/180));
cerca(B.aPant(25,25),Math.PI);

const ticks=B.graduacion(24.5);
assert.equal(ticks.length,360);
assert.equal(new Set(ticks.map(t=>t.lon)).size,360);
assert.equal(ticks[0].lon,24.5);assert.equal(ticks[359].lon,23.5);
assert.equal(ticks.filter(t=>t.nivel===1).length,288);
assert.equal(ticks[5].nivel,5);assert.equal(ticks[10].etiqueta,'10°');
assert.equal(ticks[20].etiqueta,'20°');assert.equal(ticks[30].etiqueta,'0°/30°');
assert.equal(B.graduacion(-5)[0].lon,355);

const cuspA=[null,...Array.from({length:12},(_,i)=>i*30)];
const cuspB=[null,...Array.from({length:12},(_,i)=>(15+i*30)%360)];
const a=B.casas(cuspA,{asc:17,mc:283}),b=B.casas(cuspB,{asc:28,mc:291});
assert.equal(a.sectores[0].lon,0);assert.equal(a.ejes.find(e=>e.id==='asc').lon,17);
assert.equal(a.ejes.find(e=>e.id==='mc').lon,283);
assert.equal(b.sectores[0].lon,15);assert.equal(b.ejes.find(e=>e.id==='asc').lon,28);
assert.equal(a.ejes.find(e=>e.id==='dsc').lon,197);
assert.equal(a.ejes.find(e=>e.id==='ic').lon,103);
assert.deepEqual(B.casas(null,null),{sectores:[],ejes:[]});
assert.equal(B.casas(cuspA,null).ejes.length,0,'no se infiere ASC de casa I');
assert.equal(B.casas(null,{asc:null,mc:undefined}).ejes.length,0,'null no se convierte a cero');
assert.equal(B.casas(cuspB.slice(1),null).sectores[0].lon,15);

const geo=B.geometria(320,400,400);
assert.ok(geo.centro<geo.base.min && geo.base.max<geo.exterior.min && geo.exterior.max<geo.zodiaco.min);
function verificaPuestos(lista,banda){
  const puestos=B.colocacion(lista,banda,{huella:geo.huella});
  assert.equal(puestos.length,lista.length);
  for(const p of puestos){
    assert.equal(p.radio,banda.planetas,'el grupo no se desliza radialmente');
    assert.ok(p.radio-p.huella>=banda.min && p.radio+p.huella<=banda.max,'la huella queda dentro de su banda');
    assert.ok(Math.abs(p.desplazamiento)<=120+1e-6,'desplazamiento angular acotado');
    assert.equal(p.lon,B.mod(p.cuerpo.lon),'longitud real intacta');
  }
  for(let i=0;i<puestos.length;i++) for(let j=i+1;j<puestos.length;j++){
    const p=puestos[i],q=puestos[j],u=B.punto(p.lonVisible,p.radio),v=B.punto(q.lonVisible,q.radio);
    assert.ok(Math.hypot(u.x-v.x,u.y-v.y)>=p.huella+q.huella-1e-6,'glifos separados incluso al cruzar 0°');
  }
  return puestos;
}
const cluster=Array.from({length:15},(_,i)=>({id:`p${i}`,lon:0,glifo:'☉'}));
for(const banda of [geo.base,geo.exterior]){
  verificaPuestos(cluster,banda);
  verificaPuestos(cluster.map((c,i)=>({...c,lon:i%2 ? 359.9 : .1})),banda);
  verificaPuestos(cluster.map((c,i)=>({...c,lon:i*24})),banda);
}
const solitario=B.colocacion([{id:'sol',lon:123}],geo.base,{huella:geo.huella});
assert.equal(solitario[0].lonVisible,123);
// Una muestra determinista ejercita cortes circulares y grupos no simétricos.
let semilla=41021;
const azar=()=>{semilla=(Math.imul(1664525,semilla)+1013904223)>>>0;return semilla/4294967296;};
for(let i=0;i<80;i++) verificaPuestos(cluster.map(c=>({...c,lon:azar()*360})),i%2 ? geo.base : geo.exterior);

function canvasFalso(){
  const lineas=[],textos=[],circulos=[], pila=[];
  let camino=[];
  return {lineas,textos,circulos,
    save(){pila.push({globalAlpha:this.globalAlpha});},restore(){Object.assign(this,pila.pop());},
    beginPath(){camino=[];},closePath(){},moveTo(x,y){camino.push({x,y});},lineTo(x,y){camino.push({x,y});},
    arc(x,y,r){assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&r>=0);circulos.push({x,y,r});},
    fill(){},stroke(){if(camino.length===2)lineas.push({a:camino[0],b:camino[1],tinta:this.strokeStyle});},
    fillText(s,x,y){textos.push({s,x,y,tinta:this.fillStyle});},setLineDash(){},globalAlpha:1
  };
}
const g=canvasFalso(), movidos=cluster.concat([{id:'asc',glifo:'ASC',lon:28}]);
const antes=JSON.stringify({cuspA,cuspB,cluster,movidos});
const blancos=B.pintar(g,{cx:400,cy:400,R:320,vivo:true,seleccion:'exterior:p1',desfase:24.5,
  base:{ang:{asc:17,mc:283},cusp:cuspA,cuerpos:cluster,puntos:[]},
  capa:{movidos,cerca:[{P:{lon:340},N:{lon:90},asp:{cl:'a-rojo'}}],arco:40,casas:{ang:{asc:28,mc:291},cusp:cuspB},etiqueta:'Sinastría'},
  posicion:()=> '12°03′'
});
assert.equal(JSON.stringify({cuspA,cuspB,cluster,movidos}),antes,'el renderer no muta cartas ni cúspides');
assert.equal(blancos.length,38,'15 planetas y cuatro ejes de cada carta, sin ASC duplicado');
assert.equal(blancos.filter(x=>x.cuerpo.id==='asc').length,2);
assert.ok(blancos.some(x=>x.seleccionId==='base:p1'));
assert.ok(blancos.some(x=>x.seleccionId==='exterior:p1'));
assert.equal(blancos.find(x=>x.seleccionId==='exterior:asc').cuerpo.lon,28);
assert.ok(g.textos.some(t=>t.s==='A · Carta base' && t.y>400+320));
assert.ok(g.textos.some(t=>t.s==='B · Sinastría' && t.y>400+320));
assert.ok(g.textos.every(t=>Math.hypot(t.x-400,t.y-400)>geo.centro),'centro reservado a aspectos');
const aspecto=g.lineas.find(l=>l.tinta==='#CA6249');
assert.ok(aspecto);
const P=B.punto(20,geo.centro,400,400,17),N=B.punto(90,geo.centro,400,400,17);
cerca(aspecto.a.x,P.x);cerca(aspecto.a.y,P.y);cerca(aspecto.b.x,N.x);cerca(aspecto.b.y,N.y);

const sinHora=B.pintar(canvasFalso(),{cx:0,cy:0,R:160,oscuro:true,base:{ang:null,cusp:null,cuerpos:[{id:'sol',lon:10}]},capa:{movidos:[{id:'luna',lon:12}],cerca:[]}});
assert.equal(sinHora.length,2,'sin hora y tránsitos no se inventan casas ni ángulos');
assert.ok(sinHora.every(c=>c.cuerpo.tipo!=='angulo'));
assert.throws(()=>B.geometria(0),RangeError);
console.log('natal-birrueda: orientación, graduación, casas, colisiones y renderer correctos');
