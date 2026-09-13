(function(root){
"use strict";

const SIGNOS=["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"];
const ELEMENTOS=["fuego","tierra","aire","agua"];
const ELEMENTO_DATOS={
  fuego:{temperamento:"Colérico",cualidades:["caliente","seco"]},
  tierra:{temperamento:"Melancólico",cualidades:["frío","seco"]},
  aire:{temperamento:"Sanguíneo",cualidades:["caliente","húmedo"]},
  agua:{temperamento:"Flemático",cualidades:["frío","húmedo"]}
};
const REGENTES=["marte","venus","mercurio","luna","sol","mercurio","venus","marte","jupiter","saturno","saturno","jupiter"];
const NOMBRES={sol:"Sol",luna:"Luna",mercurio:"Mercurio",venus:"Venus",marte:"Marte",jupiter:"Júpiter",saturno:"Saturno",urano:"Urano",neptuno:"Neptuno",pluton:"Plutón"};
const GLIFOS={sol:"☉",luna:"☽",mercurio:"☿",venus:"♀",marte:"♂",jupiter:"♃",saturno:"♄",urano:"♅",neptuno:"♆",pluton:"♇",asc:"AC"};
const mod=(n,m=360)=>((n%m)+m)%m;
const signoDe=lon=>Math.floor(mod(lon)/30);
function casaDe(lon,cuspides){
  const c=Array.isArray(cuspides)?cuspides:cuspides?.c;
  if(!c)return null;
  for(let i=1;i<=12;i++){const a=c[i],b=c[i===12?1:i+1];if(mod(lon-a)<mod(b-a))return i}
  return 1;
}
const mayor=(items,clave)=>{
  const m=Math.max(...items.map(x=>x[clave]));
  const ganadores=items.filter(x=>x[clave]===m);
  return{valor:m,ganadores,unico:ganadores.length===1?ganadores[0]:null};
};
function testigo(nombre,id,lon){
  const signo=signoDe(lon),elemento=ELEMENTOS[signo%4],datos=ELEMENTO_DATOS[elemento];
  return{nombre,id,glifo:GLIFOS[id]||"",lon,signo,signoNombre:SIGNOS[signo],elemento,temperamento:datos.temperamento,cualidades:datos.cualidades.slice()};
}
function temperamento(carta){
  const porId=Object.fromEntries((carta.cuerpos||[]).map(c=>[c.id,c]));
  const testigos=[];
  if(porId.sol)testigos.push(testigo("Sol","sol",porId.sol.lon));
  if(porId.luna)testigos.push(testigo("Luna","luna",porId.luna.lon));
  const conHora=!!carta.datos?.horaConocida&&!!carta.ang;
  let regente=null;
  if(conHora){
    testigos.push(testigo("Ascendente","asc",carta.ang.asc));
    regente=REGENTES[signoDe(carta.ang.asc)];
    if(porId[regente])testigos.push(testigo(`Regente de la carta · ${NOMBRES[regente]}`,regente,porId[regente].lon));
  }
  const grupos=Object.values(ELEMENTO_DATOS).map(x=>x.temperamento);
  const conteo=Object.fromEntries(grupos.map(x=>[x,0]));
  const cualidades={caliente:0,"frío":0,seco:0,"húmedo":0};
  for(const t of testigos){conteo[t.temperamento]++;for(const q of t.cualidades)cualidades[q]++}
  const lista=grupos.map(nombre=>({nombre,valor:conteo[nombre]})),dom=mayor(lista,"valor");
  return{testigos,conteo,cualidades,dominante:dom.unico?.nombre||null,empate:dom.ganadores.map(x=>x.nombre),completo:conHora&&testigos.length===4,regente,
    criterio:"Síntesis descriptiva simplificada: cuatro testigos con el mismo peso —Ascendente, Sol, Luna y regente de la carta—, traducidos por el elemento de su signo. No sustituye un juicio temperamental histórico completo."};
}
function analizar(carta){
  if(!carta||!Array.isArray(carta.cuerpos))throw new TypeError("Falta una carta natal calculada.");
  const conHora=!!carta.datos?.horaConocida&&!!carta.cusp&&!!carta.ang;
  const cuerpos=carta.cuerpos.filter(c=>Number.isFinite(c.lon)).map(c=>({id:c.id,nombre:c.nombre||NOMBRES[c.id]||c.id,glifo:c.glifo||GLIFOS[c.id]||"",lon:c.lon,casa:conHora?casaDe(c.lon,carta.cusp):null}));
  const cuadrantes=[
    {id:1,nombre:"Cuadrante I",casas:[1,2,3]},
    {id:2,nombre:"Cuadrante II",casas:[4,5,6]},
    {id:3,nombre:"Cuadrante III",casas:[7,8,9]},
    {id:4,nombre:"Cuadrante IV",casas:[10,11,12]}
  ].map(q=>({...q,cuerpos:conHora?cuerpos.filter(c=>q.casas.includes(c.casa)):[]}));
  const hemisferios=[
    {id:"superior",nombre:"Sobre el horizonte",casas:[7,8,9,10,11,12]},
    {id:"inferior",nombre:"Bajo el horizonte",casas:[1,2,3,4,5,6]},
    {id:"oriental",nombre:"Hemisferio oriental",casas:[10,11,12,1,2,3]},
    {id:"occidental",nombre:"Hemisferio occidental",casas:[4,5,6,7,8,9]}
  ].map(h=>({...h,cuerpos:conHora?cuerpos.filter(c=>h.casas.includes(c.casa)):[]}));
  const angularidad=[
    {id:"angular",nombre:"Angulares",casas:[1,4,7,10]},
    {id:"sucedente",nombre:"Sucedentes",casas:[2,5,8,11]},
    {id:"cadente",nombre:"Cadentes",casas:[3,6,9,12]}
  ].map(g=>({...g,cuerpos:conHora?cuerpos.filter(c=>g.casas.includes(c.casa)):[]}));
  const domCuadrante=conHora?mayor(cuadrantes.map(q=>({...q,valor:q.cuerpos.length})),"valor"):null;
  const domAngularidad=conHora?mayor(angularidad.map(g=>({...g,valor:g.cuerpos.length})),"valor"):null;
  const superior=hemisferios[0].cuerpos.length,inferior=hemisferios[1].cuerpos.length,oriental=hemisferios[2].cuerpos.length,occidental=hemisferios[3].cuerpos.length;
  return{conHora,cuerpos,cuadrantes,hemisferios,angularidad,temperamento:temperamento(carta),resumen:{
    cuadrante:domCuadrante?.unico?.nombre||null,cuadrantesEmpate:domCuadrante?.ganadores.map(x=>x.nombre)||[],
    angularidad:domAngularidad?.unico?.nombre||null,angularidadEmpate:domAngularidad?.ganadores.map(x=>x.nombre)||[],
    horizonte:!conHora?null:superior===inferior?"Equilibrado":superior>inferior?"Sobre el horizonte":"Bajo el horizonte",
    lateral:!conHora?null:oriental===occidental?"Equilibrado":oriental>occidental?"Oriental":"Occidental"
  },criterio:{poblacion:"Diez cuerpos: Sol, Luna y ocho planetas, sin nodos ni puntos calculados.",cuadrantes:"I: casas 1–3; II: 4–6; III: 7–9; IV: 10–12.",hemisferios:"Superior: casas 7–12; inferior: 1–6; oriental: 10–3; occidental: 4–9.",angularidad:"Angulares 1, 4, 7 y 10; sucedentes 2, 5, 8 y 11; cadentes 3, 6, 9 y 12."}};
}

root.NatalEstructura={SIGNOS,ELEMENTOS,ELEMENTO_DATOS,REGENTES,NOMBRES,GLIFOS,mod,signoDe,casaDe,temperamento,analizar};
})(typeof window!=="undefined"?window:globalThis);
