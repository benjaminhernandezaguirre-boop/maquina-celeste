(function(root){
"use strict";

const DAY=86400000;
const SIGNOS=["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"];
const GLIFOS=["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const REGENTES=["Marte","Venus","Mercurio","Luna","Sol","Mercurio","Venus","Marte","Júpiter","Saturno","Saturno","Júpiter"];
const PERIODOS=[15,8,20,25,19,20,8,15,12,27,30,12];
const UNIDADES=[360*DAY,30*DAY,2.5*DAY,5*60*60*1000];
const TEMAS_SIGNO=[
  "iniciativa, decisión y apertura de caminos","consolidación, recursos y estabilidad","aprendizaje, intercambio y movimiento","cuidado, pertenencia y cambios internos","visibilidad, creatividad y dirección","orden, servicio y discernimiento","acuerdos, relaciones y equilibrio","intensidad, estrategia y transformación","expansión, búsqueda y nuevos horizontes","responsabilidad, estructura y metas duraderas","redes, independencia y renovación","sensibilidad, cierre e integración"
];
const TEMAS_REGENTE={
  Sol:"visibilidad, voluntad y autoridad",Luna:"cuerpo, hogar, cuidado y fluctuación",Mercurio:"ideas, decisiones, estudio y comunicación",Venus:"vínculos, acuerdos, placer y valores",Marte:"acción, esfuerzo, competencia y conflicto",Júpiter:"expansión, apoyo, reconocimiento y confianza",Saturno:"límites, responsabilidad, tiempo y consolidación"
};
const mod=(n,m)=>((n%m)+m)%m;
const signoDe=lon=>Math.floor(mod(lon,360)/30);
const loteDesdePosiciones=(asc,sol,luna,diurna)=>({
  fortuna:mod(asc+(diurna?luna-sol:sol-luna),360),
  espiritu:mod(asc+(diurna?sol-luna:luna-sol),360)
});
const esCulminante=(signo,fortunaSigno)=>signo===mod(fortunaSigno+9,12);
const esAngular=(signo,fortunaSigno)=>[0,3,6,9].includes(mod(signo-fortunaSigno,12));

function periodo(signo,nivel,inicio,finLimite,liberacion=false){
  const finTeorico=inicio+PERIODOS[signo]*UNIDADES[nivel-1];
  return{nivel,signo,inicio,fin:Math.min(finTeorico,finLimite??Infinity),finTeorico,duracion:PERIODOS[signo],liberacion};
}

function principales(nacimiento,signoInicial,hasta){
  if(!Number.isFinite(nacimiento)||!Number.isFinite(hasta)||hasta<nacimiento)throw new RangeError("La fecha a estudiar debe ser posterior al nacimiento.");
  const salida=[];let inicio=nacimiento,i=0;
  const limite=Math.max(hasta+31*DAY,nacimiento+120*365.2422*DAY);
  while(inicio<=limite&&i<120){const signo=mod(signoInicial+i,12),p=periodo(signo,1,inicio);salida.push(p);inicio=p.fin;i++}
  return salida;
}

function hijos(padre,nivel){
  if(nivel<2||nivel>4)throw new RangeError("El nivel debe estar entre 2 y 4.");
  const salida=[];let inicio=padre.inicio,i=0;
  while(inicio<padre.fin-1&&i<36){
    const liberacion=i===12;
    const signo=i<12?mod(padre.signo+i,12):mod(padre.signo+6+i-12,12);
    const p=periodo(signo,nivel,inicio,padre.fin,liberacion);
    salida.push(p);inicio=p.fin;i++;
  }
  return salida;
}

function contiene(p,ms,ultimo=false){return ms>=p.inicio&&(ms<p.fin||(ultimo&&ms===p.fin))}
function activo(lista,ms){return lista.find((p,i)=>contiene(p,ms,i===lista.length-1))||lista[lista.length-1]}
function pilaEn(nacimiento,signoInicial,ms){
  const l1s=principales(nacimiento,signoInicial,ms),pila=[activo(l1s,ms)];
  for(let nivel=2;nivel<=4;nivel++){const lista=hijos(pila[pila.length-1],nivel);pila.push(activo(lista,ms))}
  return{pila,principales:l1s,niveles:{2:hijos(pila[0],2),3:hijos(pila[1],3),4:hijos(pila[2],4)}};
}

function ascendente(ms,lat,lon,E){
  const jd=E.julian(ms),T=E.sigTT(ms),n=E.nutacion(T),eps=(E.oblicuidad(T)+n.deps)*E.RAD,phi=lat*E.RAD;
  const ramc=E.mod360(E.gmst(jd)+n.dpsi*Math.cos(eps)+lon)*E.RAD;
  const mc=E.mod360(Math.atan2(Math.sin(ramc),Math.cos(ramc)*Math.cos(eps))*E.DEG);
  let asc=E.mod360(Math.atan2(Math.cos(ramc),-(Math.sin(ramc)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps)))*E.DEG);
  if(E.mod360(asc-mc)>180)asc=E.mod360(asc+180);
  return asc;
}
function diurna(ms,lat,lon,E){
  const T=E.sigTT(ms),sol=E.posGeo("sol",T),eq=E.ecuatorial(sol.lon,sol.lat,T),H=((E.horaSidereaGw(ms)+lon-eq.ar+540)%360)-180,phi=lat*E.RAD,dec=eq.dec*E.RAD;
  return Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H*E.RAD)>=0;
}
function prepararCarta(datos,E=root.Efem){
  if(!E)throw new Error("No se pudo cargar el motor astronómico.");
  E.validaCarta(datos);
  if(!datos.horaConocida)throw new Error("La liberación zodiacal necesita una hora de nacimiento conocida.");
  const nacimiento=E.localAUTC(datos.anio,datos.mes,datos.dia,datos.hora,datos.min,datos.tz,datos.desambiguacion||"reject");
  const asc=ascendente(nacimiento,datos.lat,datos.lon,E),sol=E.lon("sol",nacimiento),luna=E.lon("luna",nacimiento),esDia=diurna(nacimiento,datos.lat,datos.lon,E);
  const lotes=loteDesdePosiciones(asc,sol,luna,esDia);
  return{datos,nacimiento,asc,sol,luna,diurna:esDia,lotes,signos:{fortuna:signoDe(lotes.fortuna),espiritu:signoDe(lotes.espiritu)}};
}
function calcular(carta,lote,ms){
  if(!["fortuna","espiritu"].includes(lote))throw new RangeError("Elige Fortuna o Espíritu.");
  const signoInicial=carta.signos[lote],cronologia=pilaEn(carta.nacimiento,signoInicial,ms);
  return{...cronologia,carta,lote,fecha:ms,signoInicial,fortunaSigno:carta.signos.fortuna};
}
function describir(p,fortunaSigno){
  const angular=esAngular(p.signo,fortunaSigno),culminante=esCulminante(p.signo,fortunaSigno),regente=REGENTES[p.signo];
  return{signo:SIGNOS[p.signo],glifo:GLIFOS[p.signo],regente,tema:TEMAS_SIGNO[p.signo],temaRegente:TEMAS_REGENTE[regente],angular,culminante};
}

root.LiberacionZodiacal={DAY,SIGNOS,GLIFOS,REGENTES,PERIODOS,UNIDADES,TEMAS_SIGNO,TEMAS_REGENTE,mod,signoDe,loteDesdePosiciones,esCulminante,esAngular,principales,hijos,pilaEn,prepararCarta,calcular,describir};
})(typeof window!=="undefined"?window:globalThis);
