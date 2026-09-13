(function(root){
"use strict";

const SIGNOS=["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"];
const REGENTES=["marte","venus","mercurio","luna","sol","mercurio","venus","marte","jupiter","saturno","saturno","jupiter"];
const PLANETAS={
  sol:{nombre:"Sol",glifo:"☉"},luna:{nombre:"Luna",glifo:"☽"},mercurio:{nombre:"Mercurio",glifo:"☿"},
  venus:{nombre:"Venus",glifo:"♀"},marte:{nombre:"Marte",glifo:"♂"},jupiter:{nombre:"Júpiter",glifo:"♃"},saturno:{nombre:"Saturno",glifo:"♄"}
};
const ORDEN=Object.keys(PLANETAS);
const NOMBRE_A_ID={Sol:"sol",Luna:"luna",Mercurio:"mercurio",Venus:"venus",Marte:"marte","Júpiter":"jupiter",Saturno:"saturno"};
const mod=(n,m=360)=>((n%m)+m)%m;
const signoDe=lon=>Math.floor(mod(lon)/30);
const regenteDe=lon=>REGENTES[signoDe(lon)];

function cuerposDe(carta){return Object.fromEntries((carta?.cuerpos||[]).filter(c=>PLANETAS[c.id]).map(c=>[c.id,c]));}

function cadenaDe(inicio,dispositores){
  const recorrido=[inicio];let actual=inicio;
  for(let guardia=0;guardia<20;guardia++){
    const siguiente=dispositores[actual];
    if(!siguiente)return{inicio,recorrido,tipo:"incompleta",final:null,ciclo:[]};
    if(siguiente===actual)return{inicio,recorrido,tipo:"final",final:actual,ciclo:[actual]};
    const visto=recorrido.indexOf(siguiente);
    if(visto>=0)return{inicio,recorrido,tipo:"ciclo",final:null,ciclo:recorrido.slice(visto)};
    recorrido.push(siguiente);actual=siguiente;
  }
  return{inicio,recorrido,tipo:"incompleta",final:null,ciclo:[]};
}

function almutenDe(carta,D,E){
  if(!D||typeof D.almutenFiguris!=="function"||!carta?.datos?.horaConocida||!carta.ang)return null;
  const preparada={
    nacimiento:carta.ms,diurna:carta.diurna,asc:carta.ang.asc,datos:carta.datos,
    cuerpos:Object.fromEntries(carta.cuerpos.map(c=>[c.id,c.lon]))
  };
  try{
    const a=D.almutenFiguris(preparada,{E});
    const g=a?.ganador,id=NOMBRE_A_ID[g?.planeta];
    return id?{id,nombre:PLANETAS[id].nombre,glifo:PLANETAS[id].glifo,total:g.total,esencial:g.esencial,accidental:g.accidental}:null;
  }catch(_){return null}
}

function analizar(carta,{D=root.Dignidades,E=root.Efem}={}){
  if(!carta||!Array.isArray(carta.cuerpos))throw new TypeError("Falta una carta natal calculada.");
  const cuerpos=cuerposDe(carta),dispositores={};
  for(const id of ORDEN)if(cuerpos[id])dispositores[id]=regenteDe(cuerpos[id].lon);
  const filas=ORDEN.filter(id=>cuerpos[id]).map(id=>{
    const signo=signoDe(cuerpos[id].lon),dispositor=dispositores[id],cadena=cadenaDe(id,dispositores);
    return{id,nombre:PLANETAS[id].nombre,glifo:PLANETAS[id].glifo,lon:cuerpos[id].lon,signo,signoNombre:SIGNOS[signo],
      dispositor,dispositorNombre:PLANETAS[dispositor].nombre,dispositorGlifo:PLANETAS[dispositor].glifo,
      domicilio:dispositor===id,cadena};
  });
  const recepciones=[];
  for(let i=0;i<filas.length;i++)for(let j=i+1;j<filas.length;j++){
    const a=filas[i].id,b=filas[j].id;
    if(dispositores[a]===b&&dispositores[b]===a)recepciones.push({a,b,nombreA:PLANETAS[a].nombre,nombreB:PLANETAS[b].nombre,glifoA:PLANETAS[a].glifo,glifoB:PLANETAS[b].glifo,tipo:"domicilio"});
  }
  const finales=filas.filter(f=>f.domicilio).map(f=>f.id);
  const ciclos=[];
  for(const f of filas.filter(f=>f.cadena.tipo==="ciclo")){
    const clave=[...f.cadena.ciclo].sort().join("|");
    if(!ciclos.some(c=>c.clave===clave))ciclos.push({clave,ids:f.cadena.ciclo,nombres:f.cadena.ciclo.map(id=>PLANETAS[id].nombre)});
  }
  const autoridad=filas.map(f=>{
    const directos=filas.filter(x=>x.id!==f.id&&x.dispositor===f.id).map(x=>x.id);
    const alcance=filas.filter(x=>x.id!==f.id&&x.cadena.recorrido.slice(1).includes(f.id)).map(x=>x.id);
    return{id:f.id,nombre:f.nombre,glifo:f.glifo,directos,alcance};
  }).sort((a,b)=>b.alcance.length-a.alcance.length||b.directos.length-a.directos.length||ORDEN.indexOf(a.id)-ORDEN.indexOf(b.id));
  const asc=carta.datos?.horaConocida&&carta.ang?regenteDe(carta.ang.asc):null;
  const sol=cuerpos.sol?dispositores.sol:null,luna=cuerpos.luna?dispositores.luna:null;
  return{
    filas,dispositores,recepciones,finales,ciclos,autoridad,
    regenteCarta:asc?{id:asc,...PLANETAS[asc],signo:SIGNOS[signoDe(carta.ang.asc)]}:null,
    luminarias:{sol:sol?{id:sol,...PLANETAS[sol]}:null,luna:luna?{id:luna,...PLANETAS[luna]}:null},
    almuten:almutenDe(carta,D,E),horaConocida:!!carta.datos?.horaConocida,
    criterio:{regencias:"Regencias tradicionales",recepcion:"Recepción mutua únicamente por domicilio",cadena:"Se sigue el regente del signo hasta un domicilio propio o un circuito",almuten:"Almutén figuris calculado por el módulo de dignidades"}
  };
}

root.NatalRegencias={SIGNOS,REGENTES,PLANETAS,ORDEN,NOMBRE_A_ID,mod,signoDe,regenteDe,cadenaDe,almutenDe,analizar};
})(typeof window!=="undefined"?window:globalThis);

