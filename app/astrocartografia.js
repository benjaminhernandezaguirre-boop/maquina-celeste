/* Geometría esférica geocéntrica. Longitudes positivas al este; horizonte h=0.
   Las distancias se miden a la semicircunferencia AC/DC/MC/IC, incluidos sus
   extremos, no a su intersección con el paralelo del lugar. Sin refracción. */
(function(root){
"use strict";
const R = Math.PI/180, D = 180/Math.PI, RADIO_KM = 6371.0088;
const clamp = x => Math.max(-1, Math.min(1, x));
const env180 = x => ((x + 180)%360 + 360)%360 - 180;
const dot = (a,b) => a.reduce((s,x,i) => s+x*b[i],0);
const vector = (lat,lon) => [Math.cos(lat*R)*Math.cos(lon*R),Math.cos(lat*R)*Math.sin(lon*R),Math.sin(lat*R)];
function base(a,eje){
  const l = a.lonMC*R, d = a.dec*R;
  if(eje === 'MC' || eje === 'IC'){
    const s = eje === 'MC' ? 1 : -1;
    return [[s*Math.cos(l),s*Math.sin(l),0],[0,0,1]];
  }
  const s = eje === 'AC' ? -1 : 1;
  return [[-s*Math.sin(l),s*Math.cos(l),0],[-Math.sin(d)*Math.cos(l),-Math.sin(d)*Math.sin(l),Math.cos(d)]];
}
function distancia(a,eje,lat,lon){
  const u = vector(lat,lon), [v,w] = base(a,eje), x = dot(u,v), y = dot(u,w);
  const angulo = Math.acos(clamp(x >= 0 ? Math.hypot(x,y) : Math.abs(y)));
  return {grados:angulo*D, km:angulo*RADIO_KM};
}
function longitud(a,eje,lat){
  if(eje === 'MC') return env180(a.lonMC);
  if(eje === 'IC') return env180(a.lonMC+180);
  if(Math.abs(lat) >= 90) return null; // el azimut de salida no se define en el polo
  const c = -Math.tan(lat*R)*Math.tan(a.dec*R);
  if(Math.abs(c)>1+1e-12) return null;
  return env180(a.lonMC+(eje==='AC'?-1:1)*Math.acos(clamp(c))*D);
}
function curva(a,eje){
  const [v,w] = base(a,eje), tramos = []; let tramo = [], previo = null;
  for(let i=0;i<=720;i++){
    const t = Math.PI*i/720, u = v.map((x,k)=>x*Math.sin(t)+w[k]*Math.cos(t));
    let lon = Math.atan2(u[1],u[0])*D;
    const lat = Math.atan2(u[2],Math.hypot(u[0],u[1]))*D;
    if(Math.hypot(u[0],u[1])<1e-12){
      const q = i===0 ? 1e-8 : Math.PI-1e-8;
      lon = Math.atan2(v[1]*Math.sin(q)+w[1]*Math.cos(q),v[0]*Math.sin(q)+w[0]*Math.cos(q))*D;
    }
    // +180 y -180 son el mismo meridiano: conservar su borde evita 0/0.
    if(previo && Math.abs(Math.abs(lon)-180)<1e-10) lon=previo.lon<0?-180:180;
    if(previo && Math.abs(lon-previo.lon)>180){
      const f = -previo.u[1]/(u[1]-previo.u[1]);
      const cruce = u.map((x,k)=>previo.u[k]+f*(x-previo.u[k]));
      const la = Math.atan2(cruce[2],Math.hypot(cruce[0],cruce[1]))*D;
      const borde = previo.lon>0 ? 180 : -180;
      tramo.push([borde,la]); tramos.push(tramo); tramo=[[-borde,la]];
    }
    tramo.push([lon,lat]); previo={lon,u};
  }
  if(tramo.length>1) tramos.push(tramo);
  return tramos;
}
const api = {RADIO_KM,distancia,longitud,curva};
if(typeof module === 'object' && module.exports) module.exports = api;
else root.AstroGeo = api;
})(typeof window === 'object' ? window : this);
