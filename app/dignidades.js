/* ===================== Dignidades esenciales =====================
   Las cinco dignidades de la astrología tradicional: domicilio,
   exaltación, triplicidad, término y faz, con la puntuación
   ptolemaica y el almutén.
   Términos: tabla egipcia (Valente, Firmico) y tabla ptolemaica
   (Tetrabiblos I.21). Triplicidades: Dorotheo (tres regentes) y
   Ptolomeo (dos). Faces en orden caldeo.
   Se expone como window.Dignidades. */
(function(root){
"use strict";

const SIGNOS=["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"];
const GLIFOS=["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const ELEMENTOS=["fuego","tierra","aire","agua"];
const PLANETAS=["Sol","Luna","Mercurio","Venus","Marte","Júpiter","Saturno"];
const SIMBOLOS={Sol:"☉",Luna:"☾",Mercurio:"☿",Venus:"♀",Marte:"♂","Júpiter":"♃",Saturno:"♄",Urano:"♅",Neptuno:"♆","Plutón":"♇"};
const ID={Sol:"sol",Luna:"luna",Mercurio:"mercurio",Venus:"venus",Marte:"marte","Júpiter":"jupiter",Saturno:"saturno"};

/* --- 1. Domicilio y exilio --- */
const REGENTES=["Marte","Venus","Mercurio","Luna","Sol","Mercurio","Venus","Marte","Júpiter","Saturno","Saturno","Júpiter"];
const REGENTES_MODERNOS=["Marte","Venus","Mercurio","Luna","Sol","Mercurio","Venus","Plutón","Júpiter","Saturno","Urano","Neptuno"];
const mod=(n,m)=>((n%m)+m)%m;
const exilioDe=s=>REGENTES[mod(s+6,12)];

/* --- 2. Exaltación y caída (grado exacto de la exaltación) --- */
const EXALTACIONES={0:{planeta:"Sol",grado:19},1:{planeta:"Luna",grado:3},3:{planeta:"Júpiter",grado:15},
  5:{planeta:"Mercurio",grado:15},6:{planeta:"Saturno",grado:21},9:{planeta:"Marte",grado:28},11:{planeta:"Venus",grado:27}};
const caidaDe=s=>{const e=EXALTACIONES[mod(s+6,12)];return e?e.planeta:null};

/* --- 3. Triplicidad --- */
/* Dorotheo de Sidón: regente diurno, nocturno y participante. */
const TRIPLICIDAD_DOROTEO={
  fuego :{dia:"Sol",   noche:"Júpiter",  participante:"Saturno"},
  tierra:{dia:"Venus", noche:"Luna",     participante:"Marte"},
  aire  :{dia:"Saturno",noche:"Mercurio",participante:"Júpiter"},
  agua  :{dia:"Venus", noche:"Marte",    participante:"Luna"}
};
/* Ptolomeo: dos regentes; el agua queda en manos de Marte. */
const TRIPLICIDAD_PTOLOMEO={
  fuego :{dia:"Sol",    noche:"Júpiter"},
  tierra:{dia:"Venus",  noche:"Luna"},
  aire  :{dia:"Saturno",noche:"Mercurio"},
  agua  :{dia:"Marte",  noche:"Marte"}
};
const elementoDe=s=>ELEMENTOS[mod(s,4)];

/* --- 4. Términos --- */
/* Tabla egipcia: la de Valente y Firmico, la más usada en la tradición. */
const TERMINOS_EGIPCIOS=[
  [["Júpiter",6],["Venus",12],["Mercurio",20],["Marte",25],["Saturno",30]],
  [["Venus",8],["Mercurio",14],["Júpiter",22],["Saturno",27],["Marte",30]],
  [["Mercurio",6],["Júpiter",12],["Venus",17],["Marte",24],["Saturno",30]],
  [["Marte",7],["Venus",13],["Mercurio",19],["Júpiter",26],["Saturno",30]],
  [["Júpiter",6],["Venus",11],["Saturno",18],["Mercurio",24],["Marte",30]],
  [["Mercurio",7],["Venus",17],["Júpiter",21],["Marte",28],["Saturno",30]],
  [["Saturno",6],["Mercurio",14],["Júpiter",21],["Venus",28],["Marte",30]],
  [["Marte",7],["Venus",11],["Mercurio",19],["Júpiter",24],["Saturno",30]],
  [["Júpiter",12],["Venus",17],["Mercurio",21],["Saturno",26],["Marte",30]],
  [["Mercurio",7],["Júpiter",14],["Venus",22],["Saturno",26],["Marte",30]],
  [["Mercurio",7],["Venus",13],["Júpiter",20],["Marte",25],["Saturno",30]],
  [["Venus",12],["Júpiter",16],["Mercurio",19],["Marte",28],["Saturno",30]]
];
/* Tabla ptolemaica: Tetrabiblos I.21. */
const TERMINOS_PTOLEMAICOS=[
  [["Júpiter",6],["Venus",14],["Mercurio",21],["Marte",26],["Saturno",30]],
  [["Venus",8],["Mercurio",15],["Júpiter",22],["Saturno",26],["Marte",30]],
  [["Mercurio",7],["Júpiter",14],["Venus",21],["Saturno",25],["Marte",30]],
  [["Marte",6],["Júpiter",13],["Mercurio",20],["Venus",27],["Saturno",30]],
  [["Saturno",6],["Mercurio",13],["Venus",19],["Júpiter",25],["Marte",30]],
  [["Mercurio",7],["Venus",13],["Júpiter",18],["Saturno",24],["Marte",30]],
  [["Saturno",6],["Venus",11],["Júpiter",19],["Mercurio",24],["Marte",30]],
  [["Marte",6],["Júpiter",14],["Venus",21],["Mercurio",27],["Saturno",30]],
  [["Júpiter",8],["Venus",14],["Mercurio",19],["Saturno",25],["Marte",30]],
  [["Venus",6],["Mercurio",12],["Júpiter",19],["Marte",25],["Saturno",30]],
  [["Saturno",6],["Mercurio",12],["Venus",20],["Júpiter",25],["Marte",30]],
  [["Venus",8],["Júpiter",14],["Mercurio",20],["Marte",26],["Saturno",30]]
];

/* --- 5. Faces o decanatos, en orden caldeo --- */
const CALDEO=["Marte","Sol","Venus","Mercurio","Luna","Saturno","Júpiter"];
const fazDe=(signo,decano)=>CALDEO[mod(signo*3+decano,7)];

/* --- Puntuación ptolemaica --- */
const PUNTOS={domicilio:5,exaltacion:4,triplicidad:3,termino:2,faz:1,exilio:-5,caida:-4};

const signoDe=lon=>Math.floor(mod(lon,360)/30);
const gradoDe=lon=>mod(lon,360)-signoDe(lon)*30;

function terminoDe(signo,grado,tabla){
  const fila=tabla[signo];
  let desde=0;
  for(let i=0;i<fila.length;i++){
    const[planeta,hasta]=fila[i];
    if(grado<hasta)return{planeta,desde,hasta,orden:i+1};
    desde=hasta;
  }
  return{planeta:fila[4][0],desde:fila[3][1],hasta:30,orden:5};
}

/* Quién manda en un grado concreto y con cuántos puntos. */
function dignidadesDe(lon,esDia,op={}){
  const terminos=op.terminos==="ptolemaicos"?TERMINOS_PTOLEMAICOS:TERMINOS_EGIPCIOS;
  const trip=op.triplicidad==="ptolomeo"?TRIPLICIDAD_PTOLOMEO:TRIPLICIDAD_DOROTEO;
  const signo=signoDe(lon),grado=gradoDe(lon),elemento=elementoDe(signo);
  const t=trip[elemento],regenteTrip=esDia?t.dia:t.noche;
  const exalt=EXALTACIONES[signo]||null;
  return{
    signo,grado,glifo:GLIFOS[signo],nombreSigno:SIGNOS[signo],elemento,
    domicilio:REGENTES[signo],
    domicilioModerno:REGENTES_MODERNOS[signo],
    exaltacion:exalt,
    triplicidad:t,regenteTriplicidad:regenteTrip,
    termino:terminoDe(signo,grado,terminos),
    faz:{planeta:fazDe(signo,Math.floor(grado/10)),decano:Math.floor(grado/10)+1},
    exilio:exilioDe(signo),
    caida:caidaDe(signo)
  };
}

/* Estado esencial de UN planeta situado en esa longitud. */
function estadoDe(planeta,lon,esDia,op={}){
  const d=dignidadesDe(lon,esDia,op),lista=[];let total=0;
  if(d.domicilio===planeta){lista.push({tipo:"domicilio",puntos:PUNTOS.domicilio});total+=PUNTOS.domicilio}
  if(d.exaltacion&&d.exaltacion.planeta===planeta){lista.push({tipo:"exaltacion",puntos:PUNTOS.exaltacion,grado:d.exaltacion.grado});total+=PUNTOS.exaltacion}
  if(d.regenteTriplicidad===planeta){lista.push({tipo:"triplicidad",puntos:PUNTOS.triplicidad});total+=PUNTOS.triplicidad}
  if(d.termino.planeta===planeta){lista.push({tipo:"termino",puntos:PUNTOS.termino});total+=PUNTOS.termino}
  if(d.faz.planeta===planeta){lista.push({tipo:"faz",puntos:PUNTOS.faz});total+=PUNTOS.faz}
  const debilidades=[];
  if(d.exilio===planeta){debilidades.push({tipo:"exilio",puntos:PUNTOS.exilio});total+=PUNTOS.exilio}
  if(d.caida===planeta){debilidades.push({tipo:"caida",puntos:PUNTOS.caida});total+=PUNTOS.caida}
  const peregrino=lista.length===0&&debilidades.length===0;
  let resumen="Peregrino";
  if(lista.length){const orden=["domicilio","exaltacion","triplicidad","termino","faz"];
    const mejor=orden.find(o=>lista.some(l=>l.tipo===o));
    resumen={domicilio:"En domicilio",exaltacion:"En exaltación",triplicidad:"Por triplicidad",termino:"Por término",faz:"Por faz"}[mejor];}
  if(debilidades.length)resumen=debilidades[0].tipo==="exilio"?"En exilio":"En caída";
  if(debilidades.length&&lista.length)resumen+=" (con dignidad menor)";
  return{planeta,lon,dignidades:lista,debilidades,puntuacion:total,peregrino,resumen,detalle:d};
}

/* Almutén de un grado: el planeta con más puntos ahí. */
function almutenDeGrado(lon,esDia,op={}){
  const marcador=PLANETAS.map(p=>({planeta:p,...estadoDe(p,lon,esDia,op)}))
    .filter(x=>x.dignidades.length>0)
    .sort((a,b)=>b.puntuacion-a.puntuacion);
  return{ganador:marcador[0]||null,marcador};
}

/* ---------- salida y ocaso, para la hora planetaria ---------- */
function solEnHorizonte(ms,lat,lon,E){
  const T=E.sigTT(ms),s=E.posGeo("sol",T),eq=E.ecuatorial(s.lon,s.lat,T),
        H=((E.horaSidereaGw(ms)+lon-eq.ar+540)%360)-180,phi=lat*E.RAD,dec=eq.dec*E.RAD;
  return{alt:Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H*E.RAD))*E.DEG,dec:eq.dec};
}
/* Todos los cruces del horizonte en una ventana, con su sentido.
   subiendo=true es una salida del Sol; subiendo=false, un ocaso. */
function crucesHorizonte(desde,hasta,lat,lon,E){
  const f=t=>solEnHorizonte(t,lat,lon,E).alt+0.5667; // refracción + semidiámetro
  const paso=600000,salida=[];
  let a=desde,fa=f(a);
  for(let t=desde+paso;t<=hasta;t+=paso){
    const ft=f(t);
    if((fa<0)!==(ft<0)){
      let lo=t-paso,hi=t,flo=fa;
      for(let i=0;i<40&&hi-lo>1000;i++){const m=(lo+hi)/2,fm=f(m);if((flo<0)!==(fm<0))hi=m;else{lo=m;flo=fm}}
      salida.push({ms:(lo+hi)/2,subiendo:ft>=0});
    }
    fa=ft;
  }
  return salida;
}
const REGENTE_DIA=["Sol","Luna","Marte","Mercurio","Júpiter","Venus","Saturno"]; // domingo a sábado
const ORDEN_CALDEO=["Saturno","Júpiter","Marte","Sol","Venus","Mercurio","Luna"];

/* Regente del día astrológico (de salida a salida) y de la hora planetaria.
   Las horas son desiguales: el día y la noche se parten en doce cada uno. */
function horaPlanetaria(ms,lat,lon,E,tz){
  const DIA=86400000;
  const cruces=crucesHorizonte(ms-2*DIA,ms+2*DIA,lat,lon,E);
  const salidas=cruces.filter(c=>c.subiendo).map(c=>c.ms);
  const ocasos =cruces.filter(c=>!c.subiendo).map(c=>c.ms);
  if(salidas.length<2||ocasos.length<1)return null; // sol circumpolar: no aplica
  const salida=[...salidas].reverse().find(t=>t<=ms);
  if(salida===undefined)return null;
  const siguienteSalida=salidas.find(t=>t>salida);
  const ocaso=ocasos.find(t=>t>salida);
  if(siguienteSalida===undefined||ocaso===undefined)return null;

  /* El día astrológico corre de salida a salida, y lleva el nombre de
     la fecha civil local en el lugar de nacimiento. */
  const nombres=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const etiqueta=new Intl.DateTimeFormat("en-US",{timeZone:tz||"UTC",weekday:"short"}).format(new Date(salida));
  const dow=Math.max(0,nombres.indexOf(etiqueta));
  const regenteDia=REGENTE_DIA[dow];

  const esDia=ms<ocaso;
  const inicio=esDia?salida:ocaso,fin=esDia?ocaso:siguienteSalida;
  const indice=Math.min(11,Math.max(0,Math.floor((ms-inicio)/((fin-inicio)/12))));
  const base=ORDEN_CALDEO.indexOf(regenteDia);
  const regenteHora=ORDEN_CALDEO[mod(base+(esDia?indice:12+indice),7)];
  return{regenteDia,regenteHora,esDia,indice:indice+1,salida,ocaso,siguienteSalida,
         duracionHora:(fin-inicio)/12};
}

/* ---------- sicigia prenatal ---------- */
/* Última luna nueva o llena antes del nacimiento. */
function sicigiaPrenatal(ms,E){
  const DIA=86400000;
  const elong=t=>{const d=mod(E.lon("luna",t)-E.lon("sol",t),360);return d};
  // buscamos hacia atrás el último cruce por 0° o 180°
  let mejor=null;
  for(let t=ms;t>ms-32*DIA;t-=3600000){
    const a=elong(t-3600000),b=elong(t);
    const cruza=(x,y,meta)=>{const dx=mod(x-meta+180,360)-180,dy=mod(y-meta+180,360)-180;return(dx<0)!==(dy<0)&&Math.abs(dx)<40&&Math.abs(dy)<40};
    for(const meta of[0,180]){
      if(cruza(a,b,meta)){
        let lo=t-3600000,hi=t;
        const g=x=>mod(elong(x)-meta+180,360)-180;
        let glo=g(lo);
        for(let i=0;i<40&&hi-lo>1000;i++){const m=(lo+hi)/2,gm=g(m);if((glo<0)!==(gm<0))hi=m;else{lo=m;glo=gm}}
        mejor={ms:(lo+hi)/2,tipo:meta===0?"luna nueva":"luna llena",lon:meta===0?E.lon("sol",(lo+hi)/2):E.lon("luna",(lo+hi)/2)};
        break;
      }
    }
    if(mejor)break;
  }
  return mejor;
}

/* ---------- almutén figuris ---------- */
/* Método de Ibn Ezra: cinco puntos hylegiacales puntuados por
   dignidad esencial, más la posición accidental por casa y los
   regentes del día y de la hora. */
const PUNTOS_CASA=[12,6,4,9,7,2,10,3,5,11,8,1]; // casas I a XII
function almutenFiguris(carta,op={}){
  const E=op.E||root.Efem;
  const esDia=carta.diurna;
  const asc=carta.asc,ascSigno=signoDe(asc);
  const fortuna=mod(asc+(esDia?carta.cuerpos.luna-carta.cuerpos.sol:carta.cuerpos.sol-carta.cuerpos.luna),360);
  const sz=sicigiaPrenatal(carta.nacimiento,E);
  const puntos=[
    {nombre:"Sol",lon:carta.cuerpos.sol},
    {nombre:"Luna",lon:carta.cuerpos.luna},
    {nombre:"Ascendente",lon:asc},
    {nombre:"Lote de Fortuna",lon:fortuna},
    {nombre:"Sicigia prenatal",lon:sz?sz.lon:null,tipo:sz?sz.tipo:null}
  ].filter(p=>p.lon!==null);

  const marcador={};PLANETAS.forEach(p=>{marcador[p]={planeta:p,esencial:0,accidental:0,total:0,detalle:[]}});
  puntos.forEach(pt=>{
    PLANETAS.forEach(p=>{
      const e=estadoDe(p,pt.lon,esDia,op);
      if(e.dignidades.length){
        const suma=e.dignidades.reduce((a,d)=>a+d.puntos,0);
        marcador[p].esencial+=suma;
        marcador[p].detalle.push({punto:pt.nombre,tipos:e.dignidades.map(d=>d.tipo),puntos:suma});
      }
    });
  });
  // accidental: casa por signos enteros
  PLANETAS.forEach(p=>{
    const lon=carta.cuerpos[ID[p]],casa=mod(signoDe(lon)-ascSigno,12)+1,pts=PUNTOS_CASA[casa-1];
    marcador[p].accidental+=pts;
    marcador[p].detalle.push({punto:`Casa ${casa}`,tipos:["posición"],puntos:pts});
  });
  // regentes del día y de la hora
  const hp=op.sinHoraPlanetaria?null:horaPlanetaria(carta.nacimiento,carta.datos.lat,carta.datos.lon,E,carta.datos.tz);
  if(hp){
    marcador[hp.regenteDia].accidental+=7;
    marcador[hp.regenteDia].detalle.push({punto:"Regente del día",tipos:["secta"],puntos:7});
    marcador[hp.regenteHora].accidental+=6;
    marcador[hp.regenteHora].detalle.push({punto:"Regente de la hora",tipos:["secta"],puntos:6});
  }
  const tabla=PLANETAS.map(p=>{const m=marcador[p];m.total=m.esencial+m.accidental;return m})
    .sort((a,b)=>b.total-a.total);
  return{tabla,ganador:tabla[0],puntos,fortuna,sicigia:sz,horaPlanetaria:hp,esDia};
}

/* Tabla completa de la carta: cada planeta con sus cinco dignidades. */
function tablaCarta(carta,op={}){
  const esDia=carta.diurna;
  return PLANETAS.map(p=>{
    const lon=carta.cuerpos[ID[p]];
    const e=estadoDe(p,lon,esDia,op);
    return{...e,simbolo:SIMBOLOS[p],casa:mod(signoDe(lon)-signoDe(carta.asc),12)+1};
  });
}

root.Dignidades={SIGNOS,GLIFOS,PLANETAS,SIMBOLOS,ID,REGENTES,REGENTES_MODERNOS,EXALTACIONES,
  TRIPLICIDAD_DOROTEO,TRIPLICIDAD_PTOLOMEO,TERMINOS_EGIPCIOS,TERMINOS_PTOLEMAICOS,CALDEO,PUNTOS,PUNTOS_CASA,
  mod,signoDe,gradoDe,elementoDe,exilioDe,caidaDe,fazDe,terminoDe,
  dignidadesDe,estadoDe,almutenDeGrado,tablaCarta,almutenFiguris,
  horaPlanetaria,sicigiaPrenatal};
})(typeof window!=="undefined"?window:globalThis);
