(function(root){
"use strict";

const SIGNOS=["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"];
const ELEMENTOS=["fuego","tierra","aire","agua"];
const PLANETAS={
  sol:{nombre:"Sol",glifo:"☉",secta:"diurna"},
  luna:{nombre:"Luna",glifo:"☽",secta:"nocturna"},
  mercurio:{nombre:"Mercurio",glifo:"☿",secta:"variable"},
  venus:{nombre:"Venus",glifo:"♀",secta:"nocturna"},
  marte:{nombre:"Marte",glifo:"♂",secta:"nocturna"},
  jupiter:{nombre:"Júpiter",glifo:"♃",secta:"diurna"},
  saturno:{nombre:"Saturno",glifo:"♄",secta:"diurna"}
};
const ORDEN=["sol","luna","mercurio","venus","marte","jupiter","saturno"];
const DOMICILIOS={sol:[4],luna:[3],mercurio:[2,5],venus:[1,6],marte:[0,7],jupiter:[8,11],saturno:[9,10]};
const EXALTACIONES={sol:0,luna:1,mercurio:5,venus:11,marte:9,jupiter:3,saturno:6};
const TRIPLICIDADES={
  fuego:{dia:"sol",noche:"jupiter",participante:"saturno"},
  tierra:{dia:"venus",noche:"luna",participante:"marte"},
  aire:{dia:"saturno",noche:"mercurio",participante:"jupiter"},
  agua:{dia:"venus",noche:"marte",participante:"luna"}
};
// Términos egipcios: [límite final del tramo, regente]. El inicio es el límite anterior.
const TERMINOS=[
  [[6,"jupiter"],[12,"venus"],[20,"mercurio"],[25,"marte"],[30,"saturno"]],
  [[8,"venus"],[14,"mercurio"],[22,"jupiter"],[27,"saturno"],[30,"marte"]],
  [[6,"mercurio"],[12,"jupiter"],[17,"venus"],[24,"marte"],[30,"saturno"]],
  [[7,"marte"],[13,"venus"],[19,"mercurio"],[26,"jupiter"],[30,"saturno"]],
  [[6,"jupiter"],[11,"venus"],[18,"saturno"],[24,"mercurio"],[30,"marte"]],
  [[7,"mercurio"],[17,"venus"],[21,"jupiter"],[28,"marte"],[30,"saturno"]],
  [[6,"saturno"],[14,"mercurio"],[21,"jupiter"],[28,"venus"],[30,"marte"]],
  [[7,"marte"],[11,"venus"],[19,"mercurio"],[24,"jupiter"],[30,"saturno"]],
  [[12,"jupiter"],[17,"venus"],[21,"mercurio"],[26,"saturno"],[30,"marte"]],
  [[7,"mercurio"],[14,"jupiter"],[22,"venus"],[26,"saturno"],[30,"marte"]],
  [[7,"mercurio"],[13,"venus"],[20,"jupiter"],[25,"marte"],[30,"saturno"]],
  [[12,"venus"],[16,"jupiter"],[19,"mercurio"],[28,"marte"],[30,"saturno"]]
];
const DECANOS=[
  ["marte","sol","venus"],["mercurio","luna","saturno"],["jupiter","marte","sol"],
  ["venus","mercurio","luna"],["saturno","jupiter","marte"],["sol","venus","mercurio"],
  ["luna","saturno","jupiter"],["marte","sol","venus"],["mercurio","luna","saturno"],
  ["jupiter","marte","sol"],["venus","mercurio","luna"],["saturno","jupiter","marte"]
];
const MOVIMIENTO_MEDIO={sol:59/60+8/3600,luna:13+10/60+35/3600,mercurio:59/60+8/3600,venus:59/60+8/3600,marte:31/60+27/3600,jupiter:4/60+59/3600,saturno:2/60+1/3600};
const CASA_PUNTOS={1:5,10:5,7:4,4:4,11:4,2:3,5:3,9:2,3:1,8:-2,6:-2,12:-5};
const mod=(n,m=360)=>((n%m)+m)%m;
const signoDe=lon=>Math.floor(mod(lon)/30);
const gradoEnSigno=lon=>mod(lon)-signoDe(lon)*30;
const opuesto=i=>mod(i+6,12);
const separacion=(a,b)=>{const d=Math.abs(mod(a-b));return d>180?360-d:d};
const nombrePlaneta=id=>PLANETAS[id]?.nombre||id;

function regenteTermino(signo,grado){return TERMINOS[signo].find(([fin])=>grado<fin)?.[1]||TERMINOS[signo][4][1]}
function regenteDecano(signo,grado){return DECANOS[signo][Math.min(2,Math.floor(grado/10))]}
function casaDe(lon,cuspides){
  const c=Array.isArray(cuspides)?cuspides:cuspides?.c;
  if(!c)return null;
  for(let i=1;i<=12;i++){const a=c[i],b=c[i===12?1:i+1];if(mod(lon-a)<mod(b-a))return i}
  return 1;
}
function agrega(lista,id,label,puntos,tipo="fortaleza",detalle=""){if(id)lista.push({id,label,puntos,tipo,detalle})}

function dignidadesEsenciales(id,lon,diurna){
  if(!PLANETAS[id])return null;
  const signo=signoDe(lon),grado=gradoEnSigno(lon),elemento=ELEMENTOS[signo%4],detalles=[];
  const domicilio=DOMICILIOS[id].includes(signo),exilio=DOMICILIOS[id].some(s=>opuesto(s)===signo);
  const exaltacion=EXALTACIONES[id]===signo,caida=opuesto(EXALTACIONES[id])===signo;
  const trip=TRIPLICIDADES[elemento],activo=diurna==null?null:(diurna?trip.dia:trip.noche);
  const termino=regenteTermino(signo,grado),decano=regenteDecano(signo,grado);
  agrega(detalles,domicilio,"Domicilio",5,"fortaleza","Gobierna el signo completo.");
  agrega(detalles,exaltacion,"Exaltación",4,"fortaleza","Recibe una dignidad mayor por signo.");
  agrega(detalles,activo===id,"Triplicidad",3,"fortaleza",`Regencia ${diurna?"diurna":"nocturna"} de ${elemento}.`);
  agrega(detalles,termino===id,"Término",2,"fortaleza",`Términos egipcios; gobierna este tramo del signo.`);
  agrega(detalles,decano===id,"Decano",1,"fortaleza","Decanos caldeos de diez grados.");
  agrega(detalles,exilio,"Exilio",-5,"debilidad","Está en el signo opuesto a un domicilio.");
  agrega(detalles,caida,"Caída",-4,"debilidad","Está en el signo opuesto a su exaltación.");
  const positivas=detalles.some(d=>d.puntos>0),peregrino=!positivas;
  if(peregrino)detalles.push({id:true,label:"Peregrino",puntos:0,tipo:"neutral",detalle:"No reúne domicilio, exaltación, triplicidad activa, término ni decano."});
  return{signo,signoNombre:SIGNOS[signo],grado,elemento,domicilio,exaltacion,exilio,caida,triplicidad:{...trip,activo},termino,decano,peregrino,detalles,puntos:detalles.reduce((s,d)=>s+d.puntos,0)};
}

function condicionSolar(id,lon,solLon){
  if(id==="sol")return{tipo:"luminaria",label:"Sol",puntos:0,separacion:0};
  const d=separacion(lon,solLon),mismoSigno=signoDe(lon)===signoDe(solLon);
  if(d<=17/60)return{tipo:"cazimi",label:"Cazimi",puntos:5,separacion:d};
  if(mismoSigno&&d<8.5)return{tipo:"combusto",label:"Combusto",puntos:-5,separacion:d};
  if(d<17)return{tipo:"rayos",label:"Bajo los rayos",puntos:-4,separacion:d};
  return{tipo:"libre",label:"Libre de los rayos",puntos:5,separacion:d};
}
function movimiento(id,ms,E,retroFallback=false){
  const v=E&&typeof E.velocidad==="function"?E.velocidad(id,ms):(retroFallback?-MOVIMIENTO_MEDIO[id]:MOVIMIENTO_MEDIO[id]);
  const retro=id!=="sol"&&id!=="luna"&&v<0,ratio=Math.abs(v)/MOVIMIENTO_MEDIO[id];
  return{velocidad:v,media:MOVIMIENTO_MEDIO[id],retro,ritmo:ratio>1.01?"rápido":ratio<.99?"lento":"medio"};
}
function dignidadesAccidentales(id,lon,{cuspides,solLon,ms,E,retro=false}){
  if(!PLANETAS[id])return null;
  const casa=casaDe(lon,cuspides),detalles=[],mov=movimiento(id,ms,E,retro),solar=condicionSolar(id,lon,solLon);
  if(casa){const p=CASA_PUNTOS[casa]||0,grupo=[1,4,7,10].includes(casa)?"angular":[2,5,8,11].includes(casa)?"sucedente":"cadente";agrega(detalles,true,`Casa ${casa} · ${grupo}`,p,p<0?"debilidad":"fortaleza","Ponderación de casas de la tabla de Lilly.")}
  if(id!=="sol"&&id!=="luna")agrega(detalles,true,mov.retro?"Retrógrado":"Directo",mov.retro?-5:4,mov.retro?"debilidad":"fortaleza","Estado del movimiento geocéntrico.");
  agrega(detalles,true,`Movimiento ${mov.ritmo}`,mov.ritmo==="rápido"?2:mov.ritmo==="lento"?-2:0,mov.ritmo==="lento"?"debilidad":mov.ritmo==="rápido"?"fortaleza":"neutral",`Comparado con el movimiento medio tradicional: ${mov.media.toFixed(3)}°/día.`);
  if(id!=="sol")agrega(detalles,true,solar.label,solar.puntos,solar.puntos<0?"debilidad":solar.puntos>0?"fortaleza":"neutral",`Separación del Sol: ${solar.separacion.toFixed(2)}°.`);
  return{casa,detalles,movimiento:mov,solar,puntos:detalles.reduce((s,d)=>s+d.puntos,0)};
}

function sectaDeMercurio(lon,solLon){const d=mod(lon-solLon+180)-180;return d<=0?{secta:"diurna",fase:"oriental · lucero matutino"}:{secta:"nocturna",fase:"occidental · lucero vespertino"}}
function sectaPlaneta(id,lon,solLon,diurna,casa){
  if(!PLANETAS[id]||diurna==null)return null;
  const propia=id==="mercurio"?sectaDeMercurio(lon,solLon):{secta:PLANETAS[id].secta,fase:null};
  const carta=diurna?"diurna":"nocturna",coincide=propia.secta===carta,arriba=casa==null?null:casa>=7&&casa<=12;
  const hemisferio=arriba==null?null:arriba===coincide;
  return{...propia,carta,coincide,arriba,hemisferio};
}

function analizar(carta,E=root.Efem){
  if(!carta||!Array.isArray(carta.cuerpos))throw new TypeError("Falta una carta natal calculada.");
  const porId=Object.fromEntries(carta.cuerpos.map(c=>[c.id,c])),sol=porId.sol;
  if(!sol)throw new TypeError("La carta no contiene el Sol.");
  const horaConocida=!!carta.datos?.horaConocida,diurna=horaConocida&&typeof carta.diurna==="boolean"?carta.diurna:null;
  const filas=ORDEN.map(id=>{
    const c=porId[id];if(!c)return null;
    const casa=horaConocida?casaDe(c.lon,carta.cusp):null;
    return{id,nombre:PLANETAS[id].nombre,glifo:PLANETAS[id].glifo,lon:c.lon,casa,
      esencial:dignidadesEsenciales(id,c.lon,diurna),
      accidental:dignidadesAccidentales(id,c.lon,{cuspides:horaConocida?carta.cusp:null,solLon:sol.lon,ms:carta.ms,E,retro:c.retro}),
      secta:sectaPlaneta(id,c.lon,sol.lon,diurna,casa)};
  }).filter(Boolean);
  const cartaSecta=diurna==null?null:{tipo:diurna?"diurna":"nocturna",luminaria:diurna?"Sol":"Luna",benefico:diurna?"Júpiter":"Venus",maleficoModerado:diurna?"Saturno":"Marte",maleficoContrario:diurna?"Marte":"Saturno"};
  return{filas,cartaSecta,horaConocida,excluidos:carta.cuerpos.filter(c=>!PLANETAS[c.id]).map(c=>c.nombre),criterio:{zodiaco:"Tropical",triplicidades:"Doroteanas",terminos:"Egipcios",decanos:"Caldeos",puntuacion:"William Lilly, mostrada por componentes",solar:"Cazimi ≤ 0°17′; combustión < 8°30′ en el mismo signo; bajo los rayos < 17°"}};
}

root.NatalProfesional={SIGNOS,ELEMENTOS,PLANETAS,ORDEN,DOMICILIOS,EXALTACIONES,TRIPLICIDADES,TERMINOS,DECANOS,MOVIMIENTO_MEDIO,CASA_PUNTOS,mod,signoDe,gradoEnSigno,regenteTermino,regenteDecano,casaDe,dignidadesEsenciales,condicionSolar,movimiento,dignidadesAccidentales,sectaDeMercurio,sectaPlaneta,analizar};
})(typeof window!=="undefined"?window:globalThis);

