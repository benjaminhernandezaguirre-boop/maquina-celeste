/* ===================== Profecciones anuales =====================
   Técnica de tiempo helenística: cada año cumplido la carta avanza
   un signo completo desde el Ascendente. El regente tradicional del
   signo profectado es el señor del año.
   Fuentes: Vetio Valente (Antologías IV), Ptolomeo (Tetrabiblos IV),
   Olimpiodoro, y la práctica helenística contemporánea.
   Se expone como window.Profecciones. */
(function(root){
"use strict";

const DAY=86400000;
const SIGNOS=["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"];
const GLIFOS=["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const REGENTES=["Marte","Venus","Mercurio","Luna","Sol","Mercurio","Venus","Marte","Júpiter","Saturno","Saturno","Júpiter"];
const PUNTOS=["sol","luna","mercurio","venus","marte","jupiter","saturno"];
const NOMBRES={sol:"Sol",luna:"Luna",mercurio:"Mercurio",venus:"Venus",marte:"Marte",jupiter:"Júpiter",saturno:"Saturno",urano:"Urano",neptuno:"Neptuno",pluton:"Plutón",nodoN:"Nodo Norte"};
const SIMBOLOS={Sol:"☉",Luna:"☾",Mercurio:"☿",Venus:"♀",Marte:"♂","Júpiter":"♃",Saturno:"♄"};

const CASAS=[
  {n:"I",  titulo:"Cuerpo y persona",        tema:"el cuerpo, la vitalidad, el carácter y cómo te presentas"},
  {n:"II", titulo:"Recursos",                tema:"el dinero propio, los bienes muebles y los apoyos materiales"},
  {n:"III",titulo:"Hermanos y trayectos",    tema:"hermanos, vecinos, escritos, viajes cortos y aprendizaje diario"},
  {n:"IV", titulo:"Casa y raíces",           tema:"el hogar, la familia de origen, los padres, la tierra y lo heredado"},
  {n:"V",  titulo:"Hijos y disfrute",        tema:"hijos, creatividad, amores, juego y lo que se produce con gusto"},
  {n:"VI", titulo:"Trabajo y cuerpo",        tema:"el trabajo cotidiano, la salud del cuerpo, los subordinados y los animales"},
  {n:"VII",titulo:"Pareja y otros",          tema:"la pareja, los socios, los contratos y también los adversarios abiertos"},
  {n:"VIII",titulo:"Lo compartido",          tema:"los bienes de otros, deudas, herencias, crisis y lo que se transforma"},
  {n:"IX", titulo:"Viajes y estudio",        tema:"los viajes largos, los estudios mayores, lo extranjero y lo sagrado"},
  {n:"X",  titulo:"Oficio y reputación",     tema:"la carrera, la posición pública, los superiores y lo que se ve de ti"},
  {n:"XI", titulo:"Amigos y apoyos",         tema:"amigos, aliados, grupos, protectores y las buenas esperanzas"},
  {n:"XII",titulo:"Lo que se sostiene solo", tema:"el retiro, lo oculto, el desgaste, los enemigos secretos y el encierro"}
];

const TEMAS_SENOR={
  Sol:"visibilidad, autoridad, padre, salud y dirección de la voluntad",
  Luna:"cuerpo, casa, madre, público, y cambios que se sienten mes a mes",
  Mercurio:"estudios, trámites, escritos, comercio, hermanos y conversaciones",
  Venus:"vínculos, acuerdos, dinero, belleza, placer y todo lo que se pacta",
  Marte:"esfuerzo, conflicto, cirugías, competencia, separaciones y decisiones filosas",
  "Júpiter":"crecimiento, apoyo, permisos, viajes, enseñanza y reconocimiento",
  Saturno:"responsabilidad, límites, pérdidas, trabajo duro, tiempo y consolidación"
};

const mod=(n,m)=>((n%m)+m)%m;
const signoDe=lon=>Math.floor(mod(lon,360)/30);
const bisiesto=a=>(a%4===0&&a%100!==0)||a%400===0;

/* ---------- aniversarios ---------- */
/* El año profectado corre de cumpleaños a cumpleaños en la hora y la
   zona del nacimiento. El 29 de febrero se traslada al 28 en los años
   comunes, que es lo que hace el calendario civil. */
function aniversario(datos,n,E){
  const anio=datos.anio+n;
  let mes=datos.mes,dia=datos.dia;
  if(mes===2&&dia===29&&!bisiesto(anio))dia=28;
  return E.localAUTC(anio,mes,dia,datos.hora,datos.min,datos.tz,"earlier");
}
function edadEn(datos,ms,E){
  if(ms<aniversario(datos,0,E))throw new RangeError("La fecha estudiada es anterior al nacimiento.");
  let n=Math.floor((ms-aniversario(datos,0,E))/(365.2425*DAY));
  n=Math.max(0,n-2);
  while(aniversario(datos,n+1,E)<=ms)n++;
  while(n>0&&aniversario(datos,n,E)>ms)n--;
  return n;
}
/* Alineación opcional al momento exacto de la revolución solar. */
function revolucionSolar(datos,solNatal,n,E){
  const centro=aniversario(datos,n,E);
  const hallado=E.cruce("sol",solNatal,centro-3*DAY,centro+3*DAY,21600000);
  return Number.isFinite(hallado)?hallado:centro;
}

/* ---------- carta ---------- */
function ascendente(ms,lat,lon,E){
  const jd=E.julian(ms),T=E.sigTT(ms),n=E.nutacion(T),eps=(E.oblicuidad(T)+n.deps)*E.RAD,phi=lat*E.RAD;
  const ramc=E.mod360(E.gmst(jd)+n.dpsi*Math.cos(eps)+lon)*E.RAD;
  const mc=E.mod360(Math.atan2(Math.sin(ramc),Math.cos(ramc)*Math.cos(eps))*E.DEG);
  let asc=E.mod360(Math.atan2(Math.cos(ramc),-(Math.sin(ramc)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps)))*E.DEG);
  if(E.mod360(asc-mc)>180)asc=E.mod360(asc+180);
  return{asc,mc};
}
function esDiurna(ms,lat,lon,E){
  const T=E.sigTT(ms),sol=E.posGeo("sol",T),eq=E.ecuatorial(sol.lon,sol.lat,T),
        H=((E.horaSidereaGw(ms)+lon-eq.ar+540)%360)-180,phi=lat*E.RAD,dec=eq.dec*E.RAD;
  return Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H*E.RAD)>=0;
}
function prepararCarta(datos,E=root.Efem){
  if(!E)throw new Error("No se pudo cargar el motor astronómico.");
  E.validaCarta(datos);
  if(!datos.horaConocida)throw new Error("Las profecciones necesitan una hora de nacimiento conocida: todo se cuenta desde el Ascendente.");
  const nacimiento=E.localAUTC(datos.anio,datos.mes,datos.dia,datos.hora,datos.min,datos.tz,datos.desambiguacion||"reject");
  const{asc,mc}=ascendente(nacimiento,datos.lat,datos.lon,E);
  const cuerpos={};
  ["sol","luna","mercurio","venus","marte","jupiter","saturno","urano","neptuno","pluton"].forEach(id=>{cuerpos[id]=E.lon(id,nacimiento)});
  const ascSigno=signoDe(asc);
  return{datos,nacimiento,asc,mc,ascSigno,cuerpos,diurna:esDiurna(nacimiento,datos.lat,datos.lon,E)};
}
/* Casa por signos enteros contada desde el signo del Ascendente. */
const casaDe=(lon,ascSigno)=>mod(signoDe(lon)-ascSigno,12)+1;

/* ---------- profecciones ---------- */
function anual(carta,edad,E,alinear){
  const d=carta.datos;
  const inicio=alinear?revolucionSolar(d,carta.cuerpos.sol,edad,E):aniversario(d,edad,E);
  const fin   =alinear?revolucionSolar(d,carta.cuerpos.sol,edad+1,E):aniversario(d,edad+1,E);
  const signo=mod(carta.ascSigno+edad,12),casa=mod(edad,12)+1,senor=REGENTES[signo];
  return{nivel:"anual",edad,signo,casa,senor,inicio,fin};
}
function mensuales(a){
  const paso=(a.fin-a.inicio)/12,salida=[];
  for(let k=0;k<12;k++)salida.push({nivel:"mensual",indice:k,signo:mod(a.signo+k,12),
    casa:mod(a.casa-1+k,12)+1,senor:REGENTES[mod(a.signo+k,12)],
    inicio:a.inicio+k*paso,fin:a.inicio+(k+1)*paso});
  return salida;
}
function diarias(m){
  const paso=(m.fin-m.inicio)/12,salida=[];
  for(let k=0;k<12;k++)salida.push({nivel:"diaria",indice:k,signo:mod(m.signo+k,12),
    casa:mod(m.casa-1+k,12)+1,senor:REGENTES[mod(m.signo+k,12)],
    inicio:m.inicio+k*paso,fin:m.inicio+(k+1)*paso});
  return salida;
}
const enVigor=(lista,ms)=>lista.find(p=>ms>=p.inicio&&ms<p.fin)||lista[lista.length-1];

/* Aspectos por signos enteros: la configuración que usa la técnica. */
const ASPECTOS={0:"conjunción",1:"semisextil (no ve)",2:"sextil",3:"cuadratura",4:"trígono",5:"quincuncio (no ve)",6:"oposición"};
function configuracion(signoA,signoB){
  const d=Math.min(mod(signoA-signoB,12),mod(signoB-signoA,12));
  return{aspecto:ASPECTOS[d],ve:[0,2,3,4,6].includes(d),distancia:d};
}

function calcular(carta,ms,opciones={}){
  const E=opciones.E||root.Efem,alinear=!!opciones.alinearRevolucion;
  const edad=edadEn(carta.datos,ms,E);
  const a=anual(carta,edad,E,alinear);
  const listaM=mensuales(a),m=enVigor(listaM,ms);
  const listaD=diarias(m),dia=enVigor(listaD,ms);

  const senorId=Object.keys(NOMBRES).find(k=>NOMBRES[k]===a.senor);
  const lonSenor=carta.cuerpos[senorId];
  const senorNatal={
    id:senorId,nombre:a.senor,simbolo:SIMBOLOS[a.senor]||"",lon:lonSenor,
    signo:signoDe(lonSenor),casa:casaDe(lonSenor,carta.ascSigno),
    enProfectado:signoDe(lonSenor)===a.signo,
    tema:TEMAS_SENOR[a.senor]
  };
  /* Planetas natales que caen en el signo profectado: se activan ese año. */
  const activados=Object.keys(carta.cuerpos)
    .filter(id=>signoDe(carta.cuerpos[id])===a.signo)
    .map(id=>({id,nombre:NOMBRES[id],lon:carta.cuerpos[id],casa:casaDe(carta.cuerpos[id],carta.ascSigno)}));
  /* Planetas que ven al signo profectado por configuración de signos enteros. */
  const testigos=Object.keys(carta.cuerpos).filter(id=>PUNTOS.includes(id)).map(id=>{
    const c=configuracion(signoDe(carta.cuerpos[id]),a.signo);
    return{id,nombre:NOMBRES[id],signo:signoDe(carta.cuerpos[id]),...c};
  }).filter(t=>t.ve&&t.distancia!==0);

  return{carta,fecha:ms,edad,anual:a,mensual:m,diaria:dia,meses:listaM,dias:listaD,
         senorNatal,activados,testigos,alineado:alinear,
         casaInfo:CASAS[a.casa-1],casaMensual:CASAS[m.casa-1]};
}

/* Tabla de una vida: un renglón por año cumplido. */
function tablaDeVida(carta,desde=0,hasta=90,E=root.Efem,alinear=false){
  const salida=[];
  for(let n=desde;n<=hasta;n++){
    const a=anual(carta,n,E,alinear);
    salida.push({...a,titulo:CASAS[a.casa-1].titulo,tema:CASAS[a.casa-1].tema,
                 glifo:GLIFOS[a.signo],nombreSigno:SIGNOS[a.signo]});
  }
  return salida;
}

root.Profecciones={DAY,SIGNOS,GLIFOS,REGENTES,CASAS,TEMAS_SENOR,NOMBRES,SIMBOLOS,
  mod,signoDe,casaDe,aniversario,edadEn,revolucionSolar,prepararCarta,
  anual,mensuales,diarias,enVigor,configuracion,calcular,tablaDeVida};
})(typeof window!=="undefined"?window:globalThis);
