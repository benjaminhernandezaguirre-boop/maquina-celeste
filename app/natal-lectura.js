(function(root){
"use strict";
const mod=x=>((x%360)+360)%360, RAD=Math.PI/180;
function ayanamsa(carta,cfg){
  const e=root.Escuelas.resuelve(cfg);
  if(!e.sideral)return 0;
  const T=Number.isFinite(carta.jd)?(carta.jd-2451545)/36525:root.Efem.sigTT(carta.ms);
  return e.ayanamsaBase+root.Efem.precesion(T);
}
function longitud(carta,lon,cfg){return mod(lon-ayanamsa(carta,cfg||carta.lectura));}
function regente(carta,lon,cfg){const e=root.Escuelas.resuelve(cfg||carta.lectura);return root.Escuelas.ID_DE_NOMBRE[e.regentes[Math.floor(longitud(carta,lon,cfg)/30)]];}
// Geocentric apparent centre, geometric horizon (no refraction or solar radius).
// The horizon never depends on zodiac or house system.
function altura(carta,id,E=root.Efem){
  if(!carta.datos?.horaConocida||!Number.isFinite(carta.ms)||!Number.isFinite(carta.datos.lat)||!Number.isFinite(carta.datos.lon))return null;
  const T=E.sigTT(carta.ms),p=E.posGeo(id,T),q=E.ecuatorial(p.lon,p.lat,T);
  const H=(E.horaSidereaGw(carta.ms)+carta.datos.lon-q.ar)*RAD,phi=carta.datos.lat*RAD,dec=q.dec*RAD;
  return Math.asin(Math.max(-1,Math.min(1,Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H))))/RAD;
}
function secta(carta,E=root.Efem){const h=altura(carta,'sol',E);return h==null?null:h>=0;}
function preparar(carta,cfg){
  if(!carta)return null;
  const e=root.Escuelas.resuelve(cfg),ids=new Set(e.cuerpos),fuera=new Set(e.fuera);
  const ang=carta.datos?.horaConocida?carta.ang:null;
  const aya=ayanamsa(carta,cfg),r=ang?root.Casas.cuspides(e.casas,ang,{ayanamsa:aya}):null;
  const diurna=secta(carta),cuerpos=carta.cuerpos.filter(c=>ids.has(c.id));
  const puntos=(carta.puntos||[]).filter(p=>ang||p.id!=='fortuna').map(p=>({...p}));
  const sol=carta.cuerpos.find(c=>c.id==='sol'),luna=carta.cuerpos.find(c=>c.id==='luna');
  if(carta.ang&&diurna!=null&&sol&&luna){const f=puntos.find(p=>p.id==='fortuna');if(f)f.lon=mod(carta.ang.asc+(diurna?luna.lon-sol.lon:sol.lon-luna.lon));}
  return {...carta,ang,datos:{...carta.datos,sistemaReal:r?.sistema},lectura:{...cfg},ayanamsa:aya,
    cuerpos,puntos,diurna,cusp:r?.c||null,casasReal:r,aviso:r?.aviso||null,
    aspectos:(carta.aspectos||[]).filter(a=>!fuera.has(a.A.id)&&!fuera.has(a.B.id))};
}
root.NatalLectura={mod,ayanamsa,longitud,regente,altura,secta,preparar};
})(typeof window!=='undefined'?window:globalThis);
