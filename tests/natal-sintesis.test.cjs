const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','app','natal-sintesis.js'),'utf8'),sandbox);
const S=sandbox.NatalSintesis;
const ids=S.ORDEN,nombres={sol:'Sol',luna:'Luna',mercurio:'Mercurio',venus:'Venus',marte:'Marte',jupiter:'Júpiter',saturno:'Saturno',urano:'Urano',neptuno:'Neptuno',pluton:'Plutón'};
const cuerpos=ids.map((id,i)=>({id,nombre:nombres[id],glifo:id,lon:i*31}));
const carta={datos:{horaConocida:true},cuerpos};
const planeta=id=>({id,nombre:nombres[id],glifo:id});
const profesional={PLANETAS:Object.fromEntries(ids.slice(0,7).map(id=>[id,planeta(id)])),analizar:()=>({filas:ids.slice(0,7).map((id,i)=>({id,nombre:nombres[id],glifo:id,esencial:{puntos:i===0?6:i===6?-3:1},accidental:{puntos:i===0?4:i===6?-2:0}}))})};
const regencias={PLANETAS:profesional.PLANETAS,analizar:()=>({regenteCarta:{...planeta('marte'),signo:'Aries'},almuten:{...planeta('sol')},autoridad:[{...planeta('mercurio'),alcance:['sol','luna'],directos:['sol']},{...planeta('venus'),alcance:[],directos:[]} ]})};
const estructura={analizar:c=>({conHora:c.datos.horaConocida,resumen:{horizonte:'Sobre el horizonte',lateral:'Oriental',cuadrante:'Cuadrante IV'},angularidad:[{id:'angular',cuerpos:c.datos.horaConocida?[{...planeta('marte'),casa:1}]:[]}],temperamento:{dominante:'Colérico',empate:['Colérico'],testigos:[1,2,3,4]}})};
const patrones={analizar:()=>({cuerpos,patrones:[{nombre:'Cuadratura T'}],focales:[{cuerpo:planeta('marte'),rol:'Ápice de Cuadratura T'}],aislados:[planeta('urano')],forma:{nombre:'Locomotora',arco:210,hueco:150},concentraciones:{elementos:[{nombre:'Fuego',cuerpos:cuerpos.slice(0,4)},{nombre:'Tierra',cuerpos:cuerpos.slice(4,7)},{nombre:'Aire',cuerpos:cuerpos.slice(7,9)},{nombre:'Agua',cuerpos:cuerpos.slice(9)}]}})};
const relaciones={analizar:()=>({resumen:{aplicativos:3,separativos:4,exactos:0,partiles:1,paralelos:2,fueraLimites:1,limitrofes:1,antiscios:2,puntosMedios:3}})};
const luminarias={analizar:()=>({fase:{nombre:'Cuarto creciente',iluminacion:50,edadDias:7.4},sizigia:{tipo:'Luna nueva',diasAntes:7.4,gradoSigno:12.5,signoNombre:'Aries',casa:1,aspectos:[1,2]}})};

const r=S.analizar(carta,{profesional,regencias,estructura,patrones,relaciones,luminarias});
assert.equal(r.prioridades[0].id,'marte');
assert.equal(r.prioridades[0].peso,8,'suma regente, angularidad y foco sin mezclarlo con dignidad');
assert.equal(r.masSostenidos[0].id,'sol');
assert.equal(r.masSostenidos[0].total,10);
assert.equal(r.masExigidos[0].id,'saturno');
assert.ok(r.revisar.some(x=>x.cuerpo.id==='urano'&&x.total===null));
assert.equal(r.lecturas.length,7);
assert.equal(r.avanzadas.resumen.aplicativos,3);
assert.equal(r.luminarias.sizigia.tipo,'Luna nueva');
assert.ok(r.lecturas.some(x=>x.id==='luminarias'&&x.texto.includes('12.5° de Aries')));
assert.ok(r.criterio.includes('regente y almutén 4'));

const parcial=S.analizar({datos:{horaConocida:false},cuerpos},{profesional,regencias,estructura,patrones,relaciones,luminarias});
assert.equal(parcial.estructura.conHora,false);
assert.ok(parcial.pasos.some(x=>x.includes('Completar la hora natal')));

console.log('natal-sintesis: pruebas correctas');

