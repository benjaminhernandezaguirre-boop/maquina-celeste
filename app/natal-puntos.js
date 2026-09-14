(function(root){
"use strict";

const SIGNOS=["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"];
const REGENTES=["marte","venus","mercurio","luna","sol","mercurio","venus","marte","jupiter","saturno","saturno","jupiter"];
const NOMBRES={sol:"Sol",luna:"Luna",mercurio:"Mercurio",venus:"Venus",marte:"Marte",jupiter:"Júpiter",saturno:"Saturno",urano:"Urano",neptuno:"Neptuno",pluton:"Plutón"};
const GLIFOS={sol:"☉",luna:"☽",mercurio:"☿",venus:"♀",marte:"♂",jupiter:"♃",saturno:"♄",urano:"♅",neptuno:"♆",pluton:"♇"};
const ASPECTOS=[
  {id:"conjuncion",nombre:"Conjunción",glifo:"☌",angulo:0},
  {id:"sextil",nombre:"Sextil",glifo:"⚹",angulo:60},
  {id:"cuadratura",nombre:"Cuadratura",glifo:"□",angulo:90},
  {id:"trigono",nombre:"Trígono",glifo:"△",angulo:120},
  {id:"oposicion",nombre:"Oposición",glifo:"☍",angulo:180}
];
const DEFINICIONES={
  asc:{nombre:"Ascendente",abre:"AC",tipo:"ángulo",tema:"Inicio del eje del horizonte y cúspide de la casa I.",requiereHora:true},
  dc:{nombre:"Descendente",abre:"DC",tipo:"ángulo",tema:"Polo opuesto del horizonte y cúspide de la casa VII.",requiereHora:true},
  mc:{nombre:"Medio Cielo",abre:"MC",tipo:"ángulo",tema:"Intersección superior del meridiano con la eclíptica.",requiereHora:true},
  ic:{nombre:"Fondo del Cielo",abre:"IC",tipo:"ángulo",tema:"Polo opuesto del meridiano y cúspide de la casa IV.",requiereHora:true},
  nodoN:{nombre:"Nodo Norte medio",abre:"☊",tipo:"nodo",tema:"Intersección ascendente de la órbita lunar con la eclíptica."},
  nodoS:{nombre:"Nodo Sur medio",abre:"☋",tipo:"nodo",tema:"Polo opuesto del eje nodal medio."},
  fortuna:{nombre:"Parte de la Fortuna",abre:"⊗",tipo:"lote",tema:"Lote calculado con Sol, Luna y Ascendente según la secta.",requiereHora:true},
  lilith:{nombre:"Lilith media",abre:"⚸",tipo:"apogeo",tema:"Posición media del apogeo de la órbita lunar."}
};

const mod=x=>((x%360)+360)%360;
const separacion=(a,b)=>{const d=Math.abs(mod(a)-mod(b));return Math.min(d,360-d)};
const signoDe=lon=>Math.floor(mod(lon)/30);
function casaDe(lon,cuspides){
  cuspides=Array.isArray(cuspides)?cuspides:cuspides?.c;
  if(!Array.isArray(cuspides)||cuspides.length<13)return null;
  for(let casa=1;casa<=12;casa++){
    const inicio=mod(cuspides[casa]),fin=mod(cuspides[casa===12?1:casa+1]),arco=mod(fin-inicio),d=mod(lon-inicio);
    if(d<arco||casa===12&&Math.abs(d-arco)<1e-9)return casa;
  }
  return null;
}
function orbeMaximo(tipo,aspecto){
  if(tipo==="ángulo")return aspecto.angulo===0||aspecto.angulo===180?5:aspecto.angulo===60?2:3;
  if(tipo==="nodo")return aspecto.angulo===0||aspecto.angulo===180?3:2;
  return 2;
}
function contacto(punto,cuerpo){
  const sep=separacion(punto.lon,cuerpo.lon);
  let mejor=null;
  for(const aspecto of ASPECTOS){
    const diferencia=Math.abs(sep-aspecto.angulo),orbe=orbeMaximo(punto.tipo,aspecto);
    if(diferencia<=orbe&&(!mejor||diferencia<mejor.diferencia))mejor={aspecto,diferencia,orbe,separacion:sep};
  }
  return mejor&&{punto,cuerpo,aspecto:mejor.aspecto,diferencia:mejor.diferencia,orbe:mejor.orbe,separacion:mejor.separacion,partil:mejor.diferencia<=1};
}
function crea(id,lon,cuspides){
  const d=DEFINICIONES[id],signo=signoDe(lon),regente=REGENTES[signo];
  return{id,...d,lon:mod(lon),signo,signoNombre:SIGNOS[signo],grado:mod(lon)%30,casa:casaDe(lon,cuspides),regente:{id:regente,nombre:NOMBRES[regente],glifo:GLIFOS[regente]}};
}
function analizar(carta){
  if(!carta||!Array.isArray(carta.cuerpos))throw new TypeError("Falta una carta natal calculada.");
  const cuspides=Array.isArray(carta.cusp)?carta.cusp:carta.cusp?.c;
  const conHora=!!(carta.datos?.horaConocida&&carta.ang&&Array.isArray(cuspides)),cuspidesActivas=conHora?cuspides:null;
  const porId=Object.fromEntries((carta.puntos||[]).map(p=>[p.id,p]));
  const puntos=[];
  if(conHora){
    puntos.push(crea("asc",carta.ang.asc,cuspidesActivas),crea("dc",carta.ang.asc+180,cuspidesActivas),crea("mc",carta.ang.mc,cuspidesActivas),crea("ic",carta.ang.mc+180,cuspidesActivas));
  }
  if(porId.nodoN)puntos.push(crea("nodoN",porId.nodoN.lon,cuspidesActivas));
  if(porId.nodoS)puntos.push(crea("nodoS",porId.nodoS.lon,cuspidesActivas));
  if(conHora&&porId.fortuna)puntos.push(crea("fortuna",porId.fortuna.lon,cuspidesActivas));
  if(porId.lilith)puntos.push(crea("lilith",porId.lilith.lon,cuspidesActivas));
  const contactos=[];
  for(const punto of puntos)for(const cuerpo of carta.cuerpos){const c=contacto(punto,cuerpo);if(c)contactos.push(c)}
  contactos.sort((a,b)=>a.diferencia-b.diferencia||a.punto.id.localeCompare(b.punto.id));
  const ejes=[
    {id:"horizonte",nombre:"Eje del horizonte",primero:puntos.find(p=>p.id==="asc"),segundo:puntos.find(p=>p.id==="dc")},
    {id:"meridiano",nombre:"Eje meridiano",primero:puntos.find(p=>p.id==="mc"),segundo:puntos.find(p=>p.id==="ic")},
    {id:"nodos",nombre:"Eje nodal",primero:puntos.find(p=>p.id==="nodoN"),segundo:puntos.find(p=>p.id==="nodoS")}
  ].filter(e=>e.primero&&e.segundo);
  return{conHora,puntos,ejes,contactos,resumen:{puntos:puntos.length,ejes:ejes.length,contactos:contactos.length,partiles:contactos.filter(c=>c.partil).length},criterio:{
    coordenadas:"Longitud tropical de la fecha natal. AC, DC, MC, IC y Fortuna requieren hora y lugar fiables.",
    nodos:"Se muestran los nodos lunares medios; no se presentan como nodos verdaderos.",
    lilith:"Lilith es el apogeo lunar medio. No representa un cuerpo físico.",
    fortuna:"Fortuna reutiliza la fórmula diurna o nocturna ya aplicada por la carta según la posición del Sol respecto del horizonte.",
    aspectos:"Aspectos mayores geométricos. Orbes: ángulos 5° para conjunción/oposición, 3° para cuadratura/trígono y 2° para sextil; nodos 3° para conjunción/oposición y 2° para los demás; Fortuna y Lilith 2°.",
    alcance:"Los contactos organizan la inspección y no añaden dignidad, puntuación ni una interpretación automática."
  }};
}

root.NatalPuntos={SIGNOS,REGENTES,NOMBRES,GLIFOS,ASPECTOS,DEFINICIONES,mod,separacion,signoDe,casaDe,orbeMaximo,contacto,analizar};
})(typeof window!=="undefined"?window:globalThis);

