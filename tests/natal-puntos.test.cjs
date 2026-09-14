const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','app','natal-puntos.js'),'utf8'),sandbox);
const P=sandbox.NatalPuntos;
const cusp={c:[null,0,30,60,90,120,150,180,210,240,270,300,330]};
const cuerpos=[
  {id:'sol',nombre:'Sol',glifo:'☉',lon:2},
  {id:'luna',nombre:'Luna',glifo:'☽',lon:118},
  {id:'marte',nombre:'Marte',glifo:'♂',lon:187},
  {id:'saturno',nombre:'Saturno',glifo:'♄',lon:271}
];
const carta={datos:{horaConocida:true},ang:{asc:0,mc:270},cusp,cuerpos,puntos:[
  {id:'nodoN',lon:120},{id:'nodoS',lon:300},{id:'fortuna',lon:45},{id:'lilith',lon:225}
]};

assert.equal(P.casaDe(0,cusp.c),1);
assert.equal(P.casaDe(359.9,cusp.c),12);
assert.equal(P.casaDe(45,cusp.c),2);
const r=P.analizar(carta);
assert.equal(r.conHora,true);
assert.equal(r.puntos.length,8);
assert.equal(r.ejes.length,3);
assert.equal(r.puntos.find(x=>x.id==='dc').lon,180);
assert.equal(r.puntos.find(x=>x.id==='fortuna').casa,2);
assert.equal(r.puntos.find(x=>x.id==='fortuna').regente.id,'venus');
assert.ok(r.contactos.some(x=>x.punto.id==='asc'&&x.cuerpo.id==='sol'&&x.aspecto.id==='conjuncion'));
assert.ok(r.contactos.some(x=>x.punto.id==='nodoN'&&x.cuerpo.id==='luna'&&x.partil===false));
assert.ok(r.criterio.nodos.includes('medios'));
assert.ok(r.criterio.alcance.includes('no añaden dignidad'));

const rCuspidesDirectas=P.analizar({...carta,cusp:cusp.c});
assert.equal(rCuspidesDirectas.conHora,true);
assert.equal(rCuspidesDirectas.puntos.find(x=>x.id==='fortuna').casa,2);

const sinHora=P.analizar({...carta,datos:{horaConocida:false},ang:null,cusp:null,puntos:carta.puntos.filter(x=>x.id!=='fortuna')});
assert.equal(sinHora.conHora,false);
assert.deepEqual(Array.from(sinHora.puntos,x=>x.id),['nodoN','nodoS','lilith']);
assert.equal(sinHora.ejes.length,1);
assert.ok(!sinHora.puntos.some(x=>['asc','dc','mc','ic','fortuna'].includes(x.id)));

console.log('natal-puntos: pruebas correctas');

