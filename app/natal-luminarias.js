(function(root){
"use strict";

const DIA=86400000,SINODICO=29.530588853;
const SIGNOS=["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"];
const FASES=[
  {id:"nueva",nombre:"Luna nueva",inicio:337.5,fin:22.5},
  {id:"creciente",nombre:"Creciente inicial",inicio:22.5,fin:67.5},
  {id:"cuarto_creciente",nombre:"Cuarto creciente",inicio:67.5,fin:112.5},
  {id:"gibosa_creciente",nombre:"Gibosa creciente",inicio:112.5,fin:157.5},
  {id:"llena",nombre:"Luna llena",inicio:157.5,fin:202.5},
  {id:"gibosa_menguante",nombre:"Gibosa menguante",inicio:202.5,fin:247.5},
  {id:"cuarto_menguante",nombre:"Cuarto menguante",inicio:247.5,fin:292.5},
  {id:"menguante",nombre:"Menguante final",inicio:292.5,fin:337.5}
];
const ASPECTOS=[
  {id:"conjuncion",nombre:"Conjunción",glifo:"☌",angulo:0,orbe:3},
  {id:"oposicion",nombre:"Oposición",glifo:"☍",angulo:180,orbe:3},
  {id:"trigono",nombre:"Trígono",glifo:"△",angulo:120,orbe:2},
  {id:"cuadratura",nombre:"Cuadratura",glifo:"□",angulo:90,orbe:2},
  {id:"sextil",nombre:"Sextil",glifo:"✳",angulo:60,orbe:1.5}
];
const mod=(n,m=360)=>((n%m)+m)%m;
const firmado=n=>{const x=mod(n+180)-180;return x===-180?180:x};
function separacion(a,b){let d=Math.abs(mod(a)-mod(b));return d>180?360-d:d}
function casaDe(lon,cuspides){const c=Array.isArray(cuspides)?cuspides:cuspides?.c;if(!c)return null;for(let i=1;i<=12;i++){const a=c[i],b=c[i===12?1:i+1];if(mod(lon-a)<mod(b-a))return i}return 1}
function faseDe(angulo){const a=mod(angulo);return FASES.find(f=>f.inicio<f.fin?a>=f.inicio&&a<f.fin:a>=f.inicio||a<f.fin)||FASES[0]}
function aspectoDe(a,b){const d=separacion(a,b);for(const x of ASPECTOS){const orbe=Math.abs(d-x.angulo);if(orbe<=x.orbe)return{...x,diferencia:orbe,separacion:d}}return null}

function elongacion(ms,E){return mod(E.lon("luna",ms)-E.lon("sol",ms))}
function errorFase(ms,objetivo,E){return firmado(elongacion(ms,E)-objetivo)}
function afinaFase(semilla,objetivo,E){
  let t=semilla;
  for(let i=0;i<14;i++){
    const error=errorFase(t,objetivo,E);if(Math.abs(error)<1e-7)break;
    let ritmo=E.velocidad("luna",t)-E.velocidad("sol",t);
    if(!Number.isFinite(ritmo)||Math.abs(ritmo)<5)ritmo=12.19075;
    const correccion=Math.max(-3,Math.min(3,error/ritmo));t-=correccion*DIA;
  }
  return t;
}
function fasePrevia(ms,objetivo,E){
  const desde=mod(elongacion(ms,E)-objetivo)/360*SINODICO;
  let t=afinaFase(ms-desde*DIA,objetivo,E);
  if(t>ms+1000)t=afinaFase(t-SINODICO*DIA,objetivo,E);
  return t;
}
function faseSiguiente(ms,objetivo,E){
  let t=afinaFase(ms+(mod(objetivo-elongacion(ms,E))/360||1)*SINODICO*DIA,objetivo,E);
  if(t<ms-1000)t=afinaFase(t+SINODICO*DIA,objetivo,E);
  return t;
}
function distanciaNodos(lon,nodoN){const norte=separacion(lon,nodoN),sur=separacion(lon,mod(nodoN+180));return norte<=sur?{distancia:norte,nodo:"Nodo norte",lonNodo:nodoN}:{distancia:sur,nodo:"Nodo sur",lonNodo:mod(nodoN+180)}}
function gradoZodiacal(lon){const l=mod(lon),signo=Math.floor(l/30),grado=l-signo*30;return{lon:l,signo,signoNombre:SIGNOS[signo],grado}}
function aspectosSizigia(carta,lon){
  const referencias=(carta.cuerpos||[]).filter(x=>Number.isFinite(x.lon)).map(x=>({id:x.id,nombre:x.nombre||x.id,glifo:x.glifo||"",lon:x.lon,tipo:"cuerpo"}));
  if(carta.datos?.horaConocida&&carta.ang){referencias.push({id:"asc",nombre:"Ascendente",glifo:"AC",lon:carta.ang.asc,tipo:"angulo"},{id:"mc",nombre:"Medio Cielo",glifo:"MC",lon:carta.ang.mc,tipo:"angulo"})}
  return referencias.map(x=>{const aspecto=aspectoDe(lon,x.lon);return aspecto?{referencia:x,aspecto}:null}).filter(Boolean).sort((a,b)=>a.aspecto.diferencia-b.aspecto.diferencia||a.aspecto.orbe-b.aspecto.orbe);
}
function analizaSizigia(carta,E,R,nueva,llena){
  const tipo=nueva>=llena?"Luna nueva":"Luna llena",ms=Math.max(nueva,llena),T=E.sigTT(ms),sol=E.posGeo("sol",T),luna=E.posGeo("luna",T);
  /* En luna llena se conserva el polo lunar como referencia y se declara el eje opuesto solar. */
  const referenciaLon=mod(luna.lon),z=gradoZodiacal(referenciaLon),nodoN=E.nodoNorte(T),nodos=distanciaNodos(referenciaLon,nodoN),latAbs=Math.abs(luna.lat);
  const proximidadNodal=latAbs<=.5?"Muy cercana al eje nodal":latAbs<=1.5?"Cercana al eje nodal":"Fuera del umbral de proximidad";
  const regenteId=R&&typeof R.regenteDe==="function"?R.regenteDe(referenciaLon):null,planeta=regenteId&&R.PLANETAS?.[regenteId];
  return{tipo,ms,diasAntes:(carta.ms-ms)/DIA,solLon:mod(sol.lon),lunaLon:referenciaLon,referenciaLon,ejeOpuesto:mod(referenciaLon+180),latitudLunar:luna.lat,
    signo:z.signo,signoNombre:z.signoNombre,gradoSigno:z.grado,casa:carta.datos?.horaConocida?casaDe(referenciaLon,carta.cusp):null,
    regente:planeta?{id:regenteId,nombre:planeta.nombre,glifo:planeta.glifo}:null,nodo:nodos.nodo,lonNodo:nodos.lonNodo,distanciaNodo:nodos.distancia,proximidadNodal,
    aspectos:aspectosSizigia(carta,referenciaLon)};
}
function analizar(carta,E=root.Efem,R=root.NatalRegencias){
  if(!carta||!Number.isFinite(carta.ms)||!Array.isArray(carta.cuerpos))throw new TypeError("Falta una carta natal calculada.");
  if(!E||typeof E.lon!=="function"||typeof E.velocidad!=="function"||typeof E.posGeo!=="function"||typeof E.sigTT!=="function"||typeof E.nodoNorte!=="function")throw new TypeError("El motor astronómico no ofrece los datos necesarios para las luminarias.");
  const angulo=elongacion(carta.ms,E),faseDef=faseDe(angulo),nueva=fasePrevia(carta.ms,0,E),llena=fasePrevia(carta.ms,180,E),siguienteNueva=faseSiguiente(carta.ms+1000,0,E),edadDias=(carta.ms-nueva)/DIA;
  const luna=E.posGeo("luna",E.sigTT(carta.ms)),eq=typeof E.ecuatorial==="function"?E.ecuatorial(luna.lon,luna.lat,E.sigTT(carta.ms)):null;
  return{
    fase:{id:faseDef.id,nombre:faseDef.nombre,angulo,creciente:angulo<180,iluminacion:(1-Math.cos(angulo*Math.PI/180))/2*100,edadDias,diasHastaNueva:(siguienteNueva-carta.ms)/DIA,nuevaPrevia:nueva,nuevaSiguiente:siguienteNueva},
    lunaNatal:{lon:mod(luna.lon),lat:luna.lat,declinacion:eq?.dec??null},
    sizigia:analizaSizigia(carta,E,R,nueva,llena),
    criterio:{
      fase:"La fase usa la diferencia de longitud eclíptica aparente Luna−Sol. Las ocho fases se dividen en sectores de 45°; la iluminación es una aproximación geométrica.",
      tiempo:"La edad lunar se mide desde la conjunción exacta anterior, refinada con la velocidad geocéntrica relativa; no se deduce sólo por proporción del ciclo medio.",
      sizigia:"Sizigia prenatal: la Luna nueva o llena exacta más reciente antes del nacimiento. En Luna llena se muestra el polo lunar y su eje solar opuesto.",
      nodos:"La proximidad nodal usa la latitud eclíptica lunar: hasta 0.5° muy cercana y hasta 1.5° cercana. Es un indicador aproximado y no certifica por sí solo un eclipse.",
      aspectos:"Aspectos del polo lunar de la sizigia a planetas natales y, con hora fiable, Ascendente y Medio Cielo. Orbes: 3° conjunción/oposición; 2° trígono/cuadratura; 1.5° sextil.",
      alcance:"El módulo describe geometría astronómica y criterios tradicionales verificables; la interpretación requiere integrarlo con el resto de la carta."
    }
  };
}

root.NatalLuminarias={DIA,SINODICO,SIGNOS,FASES,ASPECTOS,mod,firmado,separacion,casaDe,faseDe,aspectoDe,elongacion,errorFase,afinaFase,fasePrevia,faseSiguiente,distanciaNodos,gradoZodiacal,aspectosSizigia,analizar};
})(typeof window!=="undefined"?window:globalThis);

