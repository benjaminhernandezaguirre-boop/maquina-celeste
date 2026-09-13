(function(root){
"use strict";

const RAD=Math.PI/180,DEG=180/Math.PI,DIA=86400000,ORBE_PLANETA=1,ORBE_LUMINARIA_ANGULO=1.5;
const SIGNOS=["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"];
/* Coordenadas ICRS J2000 y magnitudes visuales del catálogo IAU/Hipparcos.
   pmRa es mu_alpha*cos(delta); los movimientos propios se expresan en mas/año. */
const ESTRELLAS=[
  {id:"algol",nombre:"Algol",constelacion:"Perseo",ra:47.042218,dec:40.955647,pmRa:2.99,pmDec:-1.66,mag:2.12,naturaleza:"Saturno · Júpiter"},
  {id:"aldebaran",nombre:"Aldebarán",constelacion:"Tauro",ra:68.980163,dec:16.509302,pmRa:63.45,pmDec:-188.94,mag:.86,naturaleza:"Marte",real:true},
  {id:"rigel",nombre:"Rigel",constelacion:"Orión",ra:78.634467,dec:-8.201638,pmRa:1.31,pmDec:.50,mag:.13,naturaleza:"Júpiter · Saturno"},
  {id:"capella",nombre:"Capella",constelacion:"Auriga",ra:79.172328,dec:45.997991,pmRa:75.52,pmDec:-427.11,mag:.08,naturaleza:"Marte · Mercurio"},
  {id:"betelgeuse",nombre:"Betelgeuse",constelacion:"Orión",ra:88.792939,dec:7.407064,pmRa:27.54,pmDec:10.86,mag:.50,naturaleza:"Marte · Mercurio"},
  {id:"canopus",nombre:"Canopus",constelacion:"Carina",ra:95.987877,dec:-52.695661,pmRa:19.93,pmDec:23.24,mag:-.74,naturaleza:"Saturno · Júpiter"},
  {id:"sirius",nombre:"Sirius",constelacion:"Can Mayor",ra:101.287155,dec:-16.716116,pmRa:-546.01,pmDec:-1223.07,mag:-1.46,naturaleza:"Júpiter · Marte"},
  {id:"procyon",nombre:"Procyon",constelacion:"Can Menor",ra:114.825493,dec:5.224993,pmRa:-714.59,pmDec:-1036.80,mag:.34,naturaleza:"Mercurio · Marte"},
  {id:"castor",nombre:"Castor",constelacion:"Géminis",ra:113.649429,dec:31.888275,pmRa:-206.33,pmDec:-148.18,mag:1.58,naturaleza:"Mercurio"},
  {id:"pollux",nombre:"Pollux",constelacion:"Géminis",ra:116.328958,dec:28.026183,pmRa:-625.69,pmDec:-45.95,mag:1.14,naturaleza:"Marte"},
  {id:"regulus",nombre:"Regulus",constelacion:"Leo",ra:152.092962,dec:11.967209,pmRa:-249.40,pmDec:4.91,mag:1.35,naturaleza:"Marte · Júpiter",real:true},
  {id:"denebola",nombre:"Denebola",constelacion:"Leo",ra:177.264910,dec:14.572060,pmRa:-497.68,pmDec:-114.67,mag:2.14,naturaleza:"Saturno · Venus"},
  {id:"spica",nombre:"Spica",constelacion:"Virgo",ra:201.298247,dec:-11.161322,pmRa:-42.50,pmDec:-31.73,mag:.98,naturaleza:"Venus · Marte"},
  {id:"arcturus",nombre:"Arcturus",constelacion:"Boyero",ra:213.915300,dec:19.182409,pmRa:-1093.39,pmDec:-1999.85,mag:-.05,naturaleza:"Marte · Júpiter"},
  {id:"alphecca",nombre:"Alphecca",constelacion:"Corona Boreal",ra:233.671950,dec:26.714693,pmRa:120.27,pmDec:-89.58,mag:2.23,naturaleza:"Venus · Mercurio"},
  {id:"antares",nombre:"Antares",constelacion:"Escorpio",ra:247.351915,dec:-26.432002,pmRa:-12.11,pmDec:-23.30,mag:.96,naturaleza:"Marte · Júpiter",real:true},
  {id:"vega",nombre:"Vega",constelacion:"Lira",ra:279.234735,dec:38.783689,pmRa:200.94,pmDec:286.23,mag:.03,naturaleza:"Venus · Mercurio"},
  {id:"altair",nombre:"Altair",constelacion:"Águila",ra:297.695827,dec:8.868322,pmRa:536.82,pmDec:385.29,mag:.77,naturaleza:"Marte · Júpiter"},
  {id:"deneb_algedi",nombre:"Deneb Algedi",constelacion:"Capricornio",ra:326.759521,dec:-16.127287,pmRa:261.70,pmDec:-296.70,mag:2.85,naturaleza:"Saturno · Júpiter"},
  {id:"fomalhaut",nombre:"Fomalhaut",constelacion:"Piscis Austrinus",ra:344.412750,dec:-29.622236,pmRa:329.95,pmDec:-164.67,mag:1.16,naturaleza:"Venus · Mercurio",real:true}
];
const mod=n=>((n%360)+360)%360;
function separacion(a,b){let d=Math.abs(mod(a)-mod(b));return d>180?360-d:d}
function gradoZodiacal(lon){const l=mod(lon),signo=Math.floor(l/30);return{lon:l,signo,signoNombre:SIGNOS[signo],grado:l-signo*30}}
function rotaX(v,a){const c=Math.cos(a),s=Math.sin(a);return{x:v.x,y:c*v.y-s*v.z,z:s*v.y+c*v.z}}
function posicionEstrella(estrella,ms,E){
  if(!E||typeof E.sigTT!=="function"||typeof E.marcoEcliptico!=="function"||typeof E.oblicuidad!=="function")throw new TypeError("El motor no ofrece precesión y oblicuidad para las estrellas fijas.");
  const anios=(ms-Date.UTC(2000,0,1,12))/DIA/365.25,dec=estrella.dec+(estrella.pmDec||0)*anios/3600000,cosDec=Math.max(.01,Math.cos(dec*RAD)),ra=estrella.ra+(estrella.pmRa||0)*anios/3600000/cosDec;
  const a=ra*RAD,d=dec*RAD,q={x:Math.cos(d)*Math.cos(a),y:Math.cos(d)*Math.sin(a),z:Math.sin(d)},eclJ2000=rotaX(q,-E.oblicuidad(0)*RAD),T=E.sigTT(ms),v=E.marcoEcliptico(eclJ2000,T),nut=typeof E.nutacion==="function"?E.nutacion(T).dpsi:0;
  const lon=mod(Math.atan2(v.y,v.x)*DEG+nut),lat=Math.atan2(v.z,Math.hypot(v.x,v.y))*DEG,z=gradoZodiacal(lon);
  return{...estrella,raFecha:mod(ra),decFecha:dec,lon,lat,signo:z.signo,signoNombre:z.signoNombre,gradoSigno:z.grado};
}
function referenciasDe(carta){
  const r=(carta.cuerpos||[]).filter(x=>Number.isFinite(x.lon)).map(x=>({id:x.id,nombre:x.nombre||x.id,glifo:x.glifo||"",lon:mod(x.lon),tipo:"planeta"}));
  if(carta.datos?.horaConocida&&carta.ang)r.push({id:"asc",nombre:"Ascendente",glifo:"AC",lon:mod(carta.ang.asc),tipo:"angulo"},{id:"mc",nombre:"Medio Cielo",glifo:"MC",lon:mod(carta.ang.mc),tipo:"angulo"});
  return r;
}
function orbePara(ref){return ref.tipo==="angulo"||ref.id==="sol"||ref.id==="luna"?ORBE_LUMINARIA_ANGULO:ORBE_PLANETA}
function contactosDe(estrellas,referencias){
  const contactos=[],aproximaciones=[];
  for(const estrella of estrellas)for(const referencia of referencias){const diferencia=separacion(estrella.lon,referencia.lon),orbe=orbePara(referencia),x={estrella,referencia,diferencia,orbe,partil:diferencia<=1/6};if(diferencia<=orbe)contactos.push(x);else aproximaciones.push(x)}
  contactos.sort((a,b)=>a.diferencia-b.diferencia||a.estrella.mag-b.estrella.mag);aproximaciones.sort((a,b)=>a.diferencia-b.diferencia||a.estrella.mag-b.estrella.mag);
  return{contactos,aproximaciones:aproximaciones.slice(0,3)};
}
function analizar(carta,E=root.Efem){
  if(!carta||!Number.isFinite(carta.ms)||!Array.isArray(carta.cuerpos))throw new TypeError("Falta una carta natal calculada.");
  const estrellas=ESTRELLAS.map(x=>posicionEstrella(x,carta.ms,E)).sort((a,b)=>a.lon-b.lon),referencias=referenciasDe(carta),relaciones=contactosDe(estrellas,referencias),porAngulo=relaciones.contactos.filter(x=>x.referencia.tipo==="angulo"),porLuminaria=relaciones.contactos.filter(x=>["sol","luna"].includes(x.referencia.id));
  return{estrellas,referencias,...relaciones,resumen:{catalogo:estrellas.length,contactos:relaciones.contactos.length,partiles:relaciones.contactos.filter(x=>x.partil).length,angulos:porAngulo.length,luminarias:porLuminaria.length,reales:estrellas.filter(x=>x.real).length},criterio:{
    catalogo:"Selección de 20 estrellas brillantes y de uso histórico, con nombres IAU y coordenadas ICRS J2000; se aplica movimiento propio y precesión al momento natal.",
    coordenadas:"La longitud y latitud se obtienen al transformar el vector ecuatorial al ecuador y eclíptica de la fecha. Se añade la nutación del motor para compararlo con las posiciones aparentes natales.",
    contacto:`Sólo conjunción por longitud eclíptica: orbe máximo ${ORBE_PLANETA}° con planetas y ${ORBE_LUMINARIA_ANGULO}° con Sol, Luna, Ascendente y Medio Cielo. Partil: hasta 0°10′.`,
    naturaleza:"Las naturalezas planetarias se presentan como atribuciones tradicionales de referencia; no son propiedades físicas de las estrellas ni una interpretación completa.",
    limite:"Este módulo no calcula paranes, ascensiones simultáneas ni ocultaciones. Esos métodos requieren una capa separada de astronomía local."
  }};
}

root.NatalEstrellas={RAD,DEG,DIA,ORBE_PLANETA,ORBE_LUMINARIA_ANGULO,SIGNOS,ESTRELLAS,mod,separacion,gradoZodiacal,rotaX,posicionEstrella,referenciasDe,orbePara,contactosDe,analizar};
})(typeof window!=="undefined"?window:globalThis);

