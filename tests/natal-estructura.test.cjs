const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const code=fs.readFileSync(path.join(__dirname,"..","app","natal-estructura.js"),"utf8");
const sandbox={};vm.createContext(sandbox);vm.runInContext(code,sandbox);
const E=sandbox.NatalEstructura;
const cusp=[null,0,30,60,90,120,150,180,210,240,270,300,330];
const cuerpos=[
  ["sol",15],["luna",45],["mercurio",75],["venus",105],["marte",135],
  ["jupiter",165],["saturno",195],["urano",225],["neptuno",255],["pluton",285]
].map(([id,lon])=>({id,lon,nombre:id}));
const completa={datos:{horaConocida:true},ang:{asc:0},cusp,cuerpos};
const a=E.analizar(completa);
assert.equal(a.conHora,true);
assert.deepEqual(Array.from(a.cuadrantes,x=>x.cuerpos.length),[3,3,3,1]);
assert.deepEqual(Array.from(a.angularidad,x=>x.cuerpos.length),[4,3,3]);
assert.equal(a.hemisferios[0].cuerpos.length,4);
assert.equal(a.hemisferios[1].cuerpos.length,6);
assert.equal(a.temperamento.testigos.length,4);
assert.equal(a.temperamento.completo,true);
const parcial=E.analizar({datos:{horaConocida:false},cuerpos});
assert.equal(parcial.conHora,false);
assert.equal(parcial.cuadrantes[0].cuerpos.length,0);
assert.equal(parcial.temperamento.testigos.length,2);
assert.equal(parcial.temperamento.completo,false);
assert.equal(E.casaDe(359,cusp),12);
console.log("natal-estructura: ok");
