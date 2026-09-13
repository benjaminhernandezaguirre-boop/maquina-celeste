/* ===================== Efemérides compartidas =====================
   Motor de cálculo para las páginas de planeta (Mercurio, Luna, …).
   Es el mismo que usa astroplanetario.html: elementos orbitales aproximados de
   la NASA para 1800-2050 y teoría lunar abreviada de Meeus.
   Se expone como window.Efem. */
(() => {
"use strict";
const RAD = Math.PI/180, DEG = 180/Math.PI;
const mod360 = x => ((x%360)+360)%360;

/* ===================== Datos astronómicos =====================
   Elementos keplerianos aproximados (J2000, válidos ~1800-2050).
   a[UA], e, I[°], L[°] longitud media, w[°] longitud del perihelio,
   N[°] longitud del nodo ascendente; cada uno con su variación por siglo. */
const ELEM = {
  mercurio:[0.38709927,0.20563593,7.00497902,252.25032350,77.45779628,48.33076593,
            0.00000037,0.00001906,-0.00594749,149472.67411175,0.16047689,-0.12534081],
  venus:   [0.72333566,0.00677672,3.39467605,181.97909950,131.60246718,76.67984255,
            0.00000390,-0.00004107,-0.00078890,58517.81538729,0.00268329,-0.27769418],
  tierra:  [1.00000261,0.01671123,-0.00001531,100.46457166,102.93768193,0.0,
            0.00000562,-0.00004392,-0.01294668,35999.37244981,0.32327364,0.0],
  marte:   [1.52371034,0.09339410,1.84969142,-4.55343205,-23.94362959,49.55953891,
            0.00001847,0.00007882,-0.00813131,19140.30268499,0.44441088,-0.29257343],
  jupiter: [5.20288700,0.04838624,1.30439695,34.39644051,14.72847983,100.47390909,
            -0.00011607,-0.00013253,-0.00183714,3034.74612775,0.21252668,0.20469106],
  saturno: [9.53667594,0.05386179,2.48599187,49.95424423,92.59887831,113.66242448,
            -0.00125060,-0.00050991,0.00193609,1222.49362201,-0.41897216,-0.28867794],
  urano:   [19.18916464,0.04725744,0.77263783,313.23810451,170.95427630,74.01692503,
            -0.00196176,-0.00004397,-0.00242939,428.48202785,0.40805281,0.04240589],
  neptuno: [30.06992276,0.00859048,1.77004347,-55.12002969,44.96476227,131.78422574,
            0.00026291,0.00005105,0.00035372,218.45945325,-0.32241464,-0.00508664],
  pluton:  [39.48211675,0.24882730,17.14001206,238.92903833,224.06891629,110.30393684,
            -0.00031596,0.00005170,0.00004818,145.20780515,-0.04062942,-0.01183482]
};

const julian = ms => ms/86400000 + 2440587.5;
const siglos = jd => (jd - 2451545.0)/36525;

/* ===================== Marco de referencia y escala de tiempo =====================
   Dos correcciones que cambian todas las posiciones y que conviene entender:

   1. Precesión. Los elementos orbitales de arriba están referidos al equinoccio
      de J2000, pero el zodiaco tropical se mide desde el punto vernal del día
      que se calcula. Entre uno y otro hay la precesión de los equinoccios: hoy
      pasa de los veintidós minutos de arco y crece unos 50″ al año. Sin ella un
      planeta lento entra en signo con días o semanas de retraso.
      La Luna, los nodos y Lilith salen de las fórmulas de Meeus, que ya vienen
      referidas al equinoccio de la fecha: a ésas no se les suma nada.

   2. ΔT. Los astros se calculan en tiempo terrestre (TT) y la hora sidérea —y
      con ella el Ascendente y las casas— en tiempo universal (UT). La
      diferencia ronda hoy los 69 segundos; en la Luna son casi 40″ de arco.

   Encima van la nutación, la aberración de la luz y el tiempo que tarda la luz
   en llegar, que es lo que hace falta para dar posiciones aparentes, que son
   las que publican las efemérides. */

/* ΔT = TT − UT en segundos (polinomios de Espenak y Meeus). */
function deltaT(ms){
  const f = new Date(ms), y = f.getUTCFullYear() + (f.getUTCMonth() + 0.5)/12;
  let t;
  if(y >= 2150){ t=(y-1820)/100; return -20+32*t*t; }
  if(y >= 2050){ t=(y-1820)/100; return -20+32*t*t-0.5628*(2150-y); }
  if(y >= 2005){ t = y - 2000; return 62.92 + 0.32217*t + 0.005589*t*t; }
  if(y >= 1986){ t = y - 2000; return 63.86 + 0.3345*t - 0.060374*t*t + 0.0017275*t*t*t
                                    + 0.000651814*Math.pow(t,4) + 0.00002373599*Math.pow(t,5); }
  if(y >= 1961){ t = y - 1975; return 45.45 + 1.067*t - t*t/260 - t*t*t/718; }
  if(y >= 1941){ t = y - 1950; return 29.07 + 0.407*t - t*t/233 + t*t*t/2547; }
  if(y >= 1920){ t = y - 1920; return 21.20 + 0.84493*t - 0.076100*t*t + 0.0020936*t*t*t; }
  if(y >= 1900){ t = y - 1900; return -2.79 + 1.494119*t - 0.0598939*t*t + 0.0061966*t*t*t - 0.000197*Math.pow(t,4); }
  if(y < 1700) throw new RangeError('El modelo admite fechas de 1800 a 2050.');
  // Margen para UTC de nacimientos al inicio de 1800 y diferencias centradas.
  if(y < 1800){ t=y-1700; return 8.83+0.1603*t-0.0059285*t*t+0.00013336*t*t*t-t**4/1174000; }
  if(y < 1860){ t=y-1800; return 13.72-0.332447*t+0.0068612*t*t+0.0041116*t**3
    -0.00037436*t**4+0.0000121272*t**5-0.0000001699*t**6+0.000000000875*t**7; }
  t = y - 1860; return 7.62 + 0.5737*t - 0.251754*t*t + 0.01680668*t*t*t
                      - 0.0004473624*Math.pow(t,4) + Math.pow(t,5)/233174;
}
const jdTT  = ms => julian(ms) + deltaT(ms)/86400;   // día juliano en tiempo terrestre
const sigTT = ms => siglos(jdTT(ms));                // siglos julianos en TT

/* Precesión general en longitud desde J2000 (grados). */
const precesion = T => (5029.0966*T + 1.11113*T*T - 0.000006*T*T*T)/3600;


function rotaX(v,a){ const c=Math.cos(a),s=Math.sin(a); return {x:v.x,y:c*v.y-s*v.z,z:s*v.y+c*v.z}; }
function rotaY(v,a){ const c=Math.cos(a),s=Math.sin(a); return {x:c*v.x+s*v.z,y:v.y,z:-s*v.x+c*v.z}; }
function rotaZ(v,a){ const c=Math.cos(a),s=Math.sin(a); return {x:c*v.x-s*v.y,y:s*v.x+c*v.y,z:v.z}; }
function marcoEcliptico(v,T,inversa=false){
  const zeta=(2306.2181*T+0.30188*T*T+0.017998*T*T*T)/3600*RAD;
  const z=(2306.2181*T+1.09468*T*T+0.018203*T*T*T)/3600*RAD;
  const theta=(2004.3109*T-0.42665*T*T-0.041833*T*T*T)/3600*RAD;
  if(inversa){
    v=rotaX(v,oblicuidad(T)*RAD);
    v=rotaZ(rotaY(rotaZ(v,-z),theta),-zeta);
    return rotaX(v,-oblicuidad(0)*RAD);
  }
  v=rotaX(v,oblicuidad(0)*RAD);
  v=rotaZ(rotaY(rotaZ(v,zeta),-theta),z);
  return rotaX(v,-oblicuidad(T)*RAD);
}

/* Nutación en longitud y en oblicuidad (grados), términos principales. */
let _nutT = NaN, _nutV = null;
function nutacion(T){
  if(T !== _nutT){
    _nutT = T;
    const O  = (125.04452 - 1934.136261*T)*RAD;
    const L  = (280.46650 + 36000.7698*T)*RAD;
    const Lp = (218.31650 + 481267.8813*T)*RAD;
    const s = Math.sin, c = Math.cos;
    _nutV = {
      dpsi: (-17.20*s(O) - 1.32*s(2*L) - 0.23*s(2*Lp) + 0.21*s(2*O))/3600,
      deps: (  9.20*c(O) + 0.57*c(2*L) + 0.10*c(2*Lp) - 0.09*c(2*O))/3600
    };
  }
  return _nutV;
}

/* Longitud heliocéntrica de la Tierra por serie periódica (VSOP87D, sólo la
   longitud), ya referida a la eclíptica y el equinoccio de la fecha. Es lo que
   mejora la longitud solar; la precisión final requiere validación externa, incluida la
   hora exacta de una revolución solar. Coeficientes en 1e-8 rad. */
const VS_L0 = [
[175347046,0,0],[3341656,4.6692568,6283.0758500],[34894,4.62610,12566.15170],
[3497,2.7441,5753.3849],[3418,2.8289,3.5231],[3136,3.6277,77713.7715],
[2676,4.4181,7860.4194],[2343,6.1352,3930.2097],[1324,0.7425,11506.7698],
[1273,2.0371,529.6910],[1199,1.1096,1577.3435],[990,5.233,5884.927],
[902,2.045,26.298],[857,3.508,398.149],[780,1.179,5223.694],
[753,2.533,5507.553],[505,4.583,18849.228],[492,4.205,775.523],
[357,2.920,0.067],[317,5.849,11790.629],[284,1.899,796.298],
[271,0.315,10977.079],[243,0.345,5486.778],[206,4.806,2544.314],
[205,1.869,5573.143],[202,2.458,6069.777],[156,0.833,213.299],
[132,3.411,2942.463],[126,1.083,20.775],[115,0.645,0.980],
[103,0.636,4694.003],[102,0.976,15720.839],[102,4.267,7.114],
[99,6.21,2146.17],[98,0.68,155.42],[86,5.98,161000.69],
[85,1.30,6275.96],[85,3.67,71430.70],[80,1.81,17260.15],
[79,3.04,12036.46],[75,1.76,5088.63],[74,3.50,3154.69],
[74,4.68,801.82],[70,0.83,9437.76],[62,3.98,8827.39],
[61,1.82,7084.90],[57,2.78,6286.60],[56,4.39,14143.50],
[56,3.47,6279.55],[52,0.19,12139.55],[52,1.33,1748.02],
[51,0.28,5856.48],[49,0.49,1194.45],[41,5.37,8429.24],
[41,2.40,19651.05],[39,6.17,10447.39],[37,6.04,10213.29],
[37,2.57,1059.38],[36,1.71,2352.87],[36,1.78,6812.77],
[33,0.59,17789.85],[30,0.44,83996.85],[30,2.74,1349.87],[25,3.16,4690.48]];
const VS_L1 = [
[628331966747,0,0],[206059,2.678235,6283.075850],[4303,2.6351,12566.1517],
[425,1.590,3.523],[119,5.796,26.298],[109,2.966,1577.344],
[93,2.59,18849.23],[72,1.14,529.69],[68,1.87,398.15],
[67,4.41,5507.55],[59,2.89,5223.69],[56,2.17,155.42],
[45,0.40,796.30],[36,0.47,775.52],[29,2.65,7.11],
[21,5.34,0.98],[19,1.85,5486.78],[19,4.97,213.30],
[17,2.99,6275.96],[16,0.03,2544.31],[16,1.43,2146.17],
[15,1.21,10977.08],[12,2.83,1748.02],[12,3.26,5088.63],
[12,5.27,1194.45],[12,2.08,4694.00],[11,0.77,553.57],
[10,1.30,6286.60],[10,4.24,1349.87],[9,2.70,242.73],
[9,5.64,951.72],[8,5.30,2352.87],[6,2.65,9437.76],[6,4.67,4690.48]];
const VS_L2 = [
[52919,0,0],[8720,1.0721,6283.0758],[309,0.867,12566.152],
[27,0.05,3.52],[16,5.19,26.30],[16,3.68,155.42],
[10,0.76,18849.23],[9,2.06,77713.77],[7,0.83,775.52],
[5,4.66,1577.34],[4,1.03,7.11],[4,3.44,5573.14],
[3,5.14,796.30],[3,6.05,5507.55],[3,1.19,242.73],
[3,6.12,529.69],[3,0.31,398.15],[3,2.28,553.57],
[2,4.38,5223.69],[2,3.75,0.98]];
const VS_L3 = [[289,5.844,6283.076],[35,0,0],[17,5.49,12566.15],
[3,5.20,155.42],[1,4.72,3.52],[1,5.30,18849.23],[1,5.97,242.73]];
const VS_L4 = [[114,3.142,0],[8,4.13,6283.08],[1,3.84,12566.15]];
const VS_L5 = [[1,3.14,0]];
function serieVS(tabla, tau){
  let s = 0;
  for(let i = 0; i < tabla.length; i++) s += tabla[i][0]*Math.cos(tabla[i][1] + tabla[i][2]*tau);
  return s;
}
function tierraLonFina(T){                       // grados, equinoccio de la fecha
  const tau = T/10;                              // milenios julianos
  const L = (serieVS(VS_L0,tau) + serieVS(VS_L1,tau)*tau + serieVS(VS_L2,tau)*tau*tau
           + serieVS(VS_L3,tau)*tau*tau*tau + serieVS(VS_L4,tau)*Math.pow(tau,4)
           + serieVS(VS_L5,tau)*Math.pow(tau,5))/1e8;
  return L*DEG;
}

/* La Tierra no está en el baricentro Tierra-Luna: se aparta hasta 4700 km, que
   son seis segundos de arco en la posición del Sol. */
const MU_LUNA = 0.0121505, LUZ = 173.144632674;   // masa relativa · UA por día
let _ctT = NaN, _ctV = null;
function centroTierra(T){
  if(T !== _ctT){
    _ctT = T;
    const b = tierraEn(T);
    const D  = (297.8501921 + 445267.1114034*T - 0.0018819*T*T)*RAD;
    const M  = (357.5291092 + 35999.0502909*T)*RAD;
    const Mp = (134.9633964 + 477198.8675055*T + 0.0087414*T*T)*RAD;
    const c = Math.cos;
    const km = 385000.56 - 20905.355*c(Mp) - 3699.111*c(2*D-Mp) - 2955.968*c(2*D)
             - 569.925*c(2*Mp) + 246.158*c(2*D-2*Mp) - 152.138*c(2*D-M-Mp);
    const r = km/149597870.7, l = lunaLon(T)*RAD, lat = lunaLat(T)*RAD;
    const m = marcoEcliptico({x:r*Math.cos(lat)*Math.cos(l),y:r*Math.cos(lat)*Math.sin(l),z:r*Math.sin(lat)},T,true);
    _ctV = {x:b.x-MU_LUNA*m.x,y:b.y-MU_LUNA*m.y,z:b.z-MU_LUNA*m.z};
  }
  return _ctV;
}


function helio(clave, T){                       // vector heliocéntrico eclíptico [UA]
  const e0 = ELEM[clave];
  const a = e0[0]+e0[6]*T, e = e0[1]+e0[7]*T, I = (e0[2]+e0[8]*T)*RAD;
  const L = e0[3]+e0[9]*T, wb = e0[4]+e0[10]*T, N = (e0[5]+e0[11]*T)*RAD;
  const w = wb*RAD - N;
  let M = mod360(L - wb); if(M > 180) M -= 360;
  M *= RAD;
  let E = M + e*Math.sin(M);
  for(let i=0;i<8;i++){ const d = (E - e*Math.sin(E) - M)/(1 - e*Math.cos(E)); E -= d; if(Math.abs(d)<1e-10) break; }
  const xp = a*(Math.cos(E)-e), yp = a*Math.sqrt(1-e*e)*Math.sin(E);
  const cw=Math.cos(w), sw=Math.sin(w), cN=Math.cos(N), sN=Math.sin(N), cI=Math.cos(I), sI=Math.sin(I);
  return {
    x:(cw*cN - sw*sN*cI)*xp + (-sw*cN - cw*sN*cI)*yp,
    y:(cw*sN + sw*cN*cI)*xp + (-sw*sN + cw*cN*cI)*yp,
    z:(sw*sI)*xp + (cw*sI)*yp
  };
}

function lunaLon(T){                             // longitud eclíptica geocéntrica de la Luna
  const Lp = 218.3164477 + 481267.88123421*T - 0.0015786*T*T;
  const D  = (297.8501921 + 445267.1114034*T - 0.0018819*T*T)*RAD;
  const M  = (357.5291092 + 35999.0502909*T)*RAD;
  const Mp = (134.9633964 + 477198.8675055*T + 0.0087414*T*T)*RAD;
  const F  = (93.2720950 + 483202.0175233*T - 0.0036539*T*T)*RAD;
  const s = Math.sin;
  const dl = 6.288774*s(Mp) + 1.274027*s(2*D-Mp) + 0.658314*s(2*D) + 0.213618*s(2*Mp)
           - 0.185116*s(M) - 0.114332*s(2*F) + 0.058793*s(2*D-2*Mp) + 0.057066*s(2*D-M-Mp)
           + 0.053322*s(2*D+Mp) + 0.045758*s(2*D-M) - 0.040923*s(M-Mp) - 0.034720*s(D)
           - 0.030383*s(M+Mp) + 0.015327*s(2*D-2*F) - 0.012528*s(Mp+2*F) + 0.010980*s(Mp-2*F);
  return mod360(Lp + dl);
}

/* la Tierra es la misma para todos los astros de un mismo instante: se memoriza */
let _tierraT = NaN, _tierraV = null;
function tierraEn(T){
  if(T !== _tierraT){ _tierraT = T; _tierraV = helio("tierra", T); }
  return _tierraV;
}

/* longitud eclíptica geocéntrica aparente, referida al equinoccio de la fecha */
function lonGeo(clave,T){ return posGeo(clave,T).lon; }
function distGeo(clave, T){
  if(clave === "luna") return 0.00257;
  const t = centroTierra(T);
  if(clave === "sol") return Math.hypot(t.x,t.y,t.z);
  const p = helio(clave, T);
  return Math.hypot(p.x-t.x, p.y-t.y, p.z-t.z);
}

const SIGNOS = [
  {n:"Aries",g:"♈\uFE0E",el:"fuego"},{n:"Tauro",g:"♉\uFE0E",el:"tierra"},{n:"Géminis",g:"♊\uFE0E",el:"aire"},
  {n:"Cáncer",g:"♋\uFE0E",el:"agua"},{n:"Leo",g:"♌\uFE0E",el:"fuego"},{n:"Virgo",g:"♍\uFE0E",el:"tierra"},
  {n:"Libra",g:"♎\uFE0E",el:"aire"},{n:"Escorpio",g:"♏\uFE0E",el:"agua"},{n:"Sagitario",g:"♐\uFE0E",el:"fuego"},
  {n:"Capricornio",g:"♑\uFE0E",el:"tierra"},{n:"Acuario",g:"♒\uFE0E",el:"aire"},{n:"Piscis",g:"♓\uFE0E",el:"agua"}
];
const COLOR_EL = {fuego:"#C4653F",tierra:"#8E9463",aire:"#9AA7C4",agua:"#5F7EA8"};

function posZod(lon){
  const i = Math.floor(mod360(lon)/30);
  const dentro = mod360(lon) - i*30;
  const gr = Math.floor(dentro);
  const mi = Math.floor((dentro-gr)*60);
  const dosD = n => String(n).padStart(2,"0");
  return {signo:SIGNOS[i], grado:gr, minuto:mi,
          texto:`${dosD(gr)}° ${dosD(mi)}′`, corto:`${dosD(gr)}°${dosD(mi)}′`};
}

const CIUDADES = window.Ciudades?.lista || [];


/* --- velocidad, estaciones y cruces de grado --- */
function velocidad(id, ms){                       // grados por día, negativo si retrograda
  let d = lon(id, ms + 43200000) - lon(id, ms - 43200000);
  if(d > 180) d -= 360; if(d < -180) d += 360;
  return d;
}
function afinaEstacion(id, t0, t1){               // bisección sobre la velocidad
  let a = t0, b = t1, va = velocidad(id, a);
  for(let i = 0; i < 44; i++){
    if(b - a < 60000) break;
    const m = (a + b)/2, vm = velocidad(id, m);
    if(vm === 0) return m;
    if((va < 0) !== (vm < 0)) b = m; else { a = m; va = vm; }
  }
  return (a + b)/2;
}
function estaciones(id, msIni, msFin){            // [{tipo:"R"|"D", ms, lon}]
  const paso = 86400000, out = [];
  let tPrev = msIni, vPrev = velocidad(id, tPrev);
  for(let t = msIni + paso; t <= msFin; t += paso){
    const v = velocidad(id, t);
    if((vPrev < 0) !== (v < 0)){
      const ms = afinaEstacion(id, tPrev, t);
      out.push({tipo: v < 0 ? "R" : "D", ms, lon: lon(id, ms)});
    }
    tPrev = t; vPrev = v;
  }
  return out;
}
function cruce(id, objetivo, msIni, msFin, paso){  // cuándo pasa por un grado
  paso = paso || 43200000;
  const dif = t => { let d = mod360(lon(id, t) - objetivo); return d > 180 ? d - 360 : d; };
  let tPrev = msIni, fPrev = dif(tPrev);
  for(let t = msIni + paso; t <= msFin; t += paso){
    const f = dif(t);
    if(Math.abs(fPrev) < 30 && Math.abs(f) < 30 && (fPrev < 0) !== (f < 0)){
      let a = tPrev, b = t, fa = fPrev;
      for(let i = 0; i < 44; i++){
        if(b - a < 60000) break;
        const m = (a + b)/2, fm = dif(m);
        if((fa < 0) !== (fm < 0)) b = m; else { a = m; fa = fm; }
      }
      return (a + b)/2;
    }
    tPrev = t; fPrev = f;
  }
  return null;
}

function utcMs(y,mo,d,h,mi){
  const t = Date.UTC(y, mo-1, d, h, mi, 0);
  if(y >= 0 && y < 100){ const f = new Date(t); f.setUTCFullYear(y); return f.getTime(); }
  return t;
}
function desfaseZona(tz, ms){
  const dtf = new Intl.DateTimeFormat("en-US",{timeZone:tz, hourCycle:"h23",
    year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit"});
  const p = Object.fromEntries(dtf.formatToParts(new Date(ms)).map(o => [o.type, o.value]));
  return utcMs(+p.year, +p.month, +p.day, +p.hour, +p.minute) + (+p.second)*1000 - ms;
}
function localAUTC(y,mo,d,h,mi,tz,desambiguacion="reject"){
  const base=utcMs(y,mo,d,h,mi), f=new Date(base);
  if(![y,mo,d,h,mi].every(Number.isInteger) || f.getUTCFullYear()!==y || f.getUTCMonth()!==mo-1 || f.getUTCDate()!==d || h<0 || h>23 || mi<0 || mi>59)
    throw new RangeError("La fecha o la hora no es válida.");
  if(typeof tz!=="string" || !tz) throw new RangeError("Falta una zona horaria válida.");
  if(!["reject","earlier","later"].includes(desambiguacion)) throw new RangeError("Elige una ocurrencia de la hora válida.");
  const offsets=new Set();
  for(let horas=-48;horas<=48;horas+=6) offsets.add(desfaseZona(tz,base+horas*3600000));
  const candidatos=[...offsets].map(o=>base-o).filter(t=>t+desfaseZona(tz,t)===base).sort((a,b)=>a-b);
  if(!candidatos.length) throw new RangeError("Esa hora local no existió por un cambio de horario. Revisa la hora de nacimiento.");
  if(candidatos.length>1 && desambiguacion==="reject") throw new RangeError("Esa hora local ocurrió dos veces. Elige la primera o la segunda ocurrencia.");
  return desambiguacion==="later" ? candidatos[candidatos.length-1] : candidatos[0];
}

// La validación de estructura no resuelve una hora ambigua: se pide al abrirla.
function validaCarta(d){
  if(!d || typeof d!=="object") throw new RangeError("La carta no contiene datos válidos.");
  if(![d.anio,d.mes,d.dia,d.hora,d.min].every(Number.isInteger) || d.anio<1800 || d.anio>2050)
    throw new RangeError("Introduce una fecha entre 1800 y 2050 y una hora válida.");
  const f=new Date(utcMs(d.anio,d.mes,d.dia,d.hora,d.min));
  if(f.getUTCFullYear()!==d.anio || f.getUTCMonth()!==d.mes-1 || f.getUTCDate()!==d.dia || d.hora<0 || d.hora>23 || d.min<0 || d.min>59)
    throw new RangeError("La fecha o la hora no es válida.");
  if(typeof d.horaConocida!=="boolean" || !Number.isFinite(d.lat) || Math.abs(d.lat)>90 || !Number.isFinite(d.lon) || Math.abs(d.lon)>180)
    throw new RangeError("Revisa la hora conocida, latitud y longitud de la carta.");
  if(typeof d.tz!=="string" || !d.tz) throw new RangeError("Falta la zona horaria.");
  new Intl.DateTimeFormat("es",{timeZone:d.tz});
  for(const k of ["nombre","lugarTexto","resumenFecha","husoTexto"])
    if(d[k]!=null && (typeof d[k]!=="string" || d[k].length>500)) throw new RangeError("El texto de la carta no es válido.");
  if(d.desambiguacion!=null && !["reject","earlier","later"].includes(d.desambiguacion)) throw new RangeError("Ocurrencia horaria inválida.");
  if(d.sistema!=null && !["placidio","signos","igual","porfirio"].includes(d.sistema)) throw new RangeError("Sistema de casas inválido.");
  if(d.factorOrbe!=null && (!Number.isFinite(d.factorOrbe) || d.factorOrbe<=0 || d.factorOrbe>3)) throw new RangeError("Orbe inválido.");
  return d;
}
function cartaValida(d){ try { validaCarta(d); return true; } catch(e){ return false; } }
const escaparHTML = s => String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function textoDesfase(tz, ms){
  const min = Math.round(desfaseZona(tz, ms)/60000);
  const s = min < 0 ? "−" : "+", a = Math.abs(min);
  return `UTC${s}${String(Math.floor(a/60)).padStart(2,"0")}:${String(a%60).padStart(2,"0")}`;
}



/* ===================== Coordenadas ecuatoriales =====================
   Para la astrocartografía no basta la longitud: hacen falta la ascensión
   recta y la declinación, y para eso la latitud eclíptica, que es la que dice
   cuánto se aparta el astro del plano del zodiaco. La Luna llega a 5° y
   Plutón a 17°, así que ignorarla movería las líneas cientos de kilómetros. */

const oblicuidad = T => 23.4392911 - 0.0130042*T - 1.64e-7*T*T + 5.04e-7*T*T*T;

/* latitud eclíptica de la Luna (Meeus abreviado, grados) */
function lunaLat(T){
  const D  = (297.8501921 + 445267.1114034*T - 0.0018819*T*T)*RAD;
  const M  = (357.5291092 + 35999.0502909*T)*RAD;
  const Mp = (134.9633964 + 477198.8675055*T + 0.0087414*T*T)*RAD;
  const F  = (93.2720950 + 483202.0175233*T - 0.0036539*T*T)*RAD;
  const s = Math.sin;
  return 5.128122*s(F) + 0.280602*s(Mp+F) + 0.277693*s(Mp-F) + 0.173237*s(2*D-F)
       + 0.055413*s(2*D-Mp+F) + 0.046271*s(2*D-Mp-F) + 0.032573*s(2*D+F)
       + 0.017198*s(2*Mp+F) + 0.009266*s(2*D+Mp-F) + 0.008822*s(2*Mp-F)
       + 0.008216*s(2*D-M-F) + 0.004324*s(2*D-2*Mp-F) + 0.004200*s(2*D+Mp+F)
       - 0.003359*s(2*D+M-F) + 0.002463*s(2*D-M-Mp+F) + 0.002211*s(2*D-M+F)
       + 0.002065*s(2*D-M-Mp-F) - 0.001870*s(M-Mp-F) + 0.001828*s(4*D-Mp-F)
       - 0.001794*s(M+F) - 0.001749*s(3*F) - 0.001565*s(M-Mp+F);
}

/* posición geocéntrica aproximada: longitud y latitud en la eclíptica de fecha */
function posGeo(clave, T){
  const nut = nutacion(T).dpsi;
  if(clave === "luna") return {lon:mod360(lunaLon(T)+nut),lat:lunaLat(T)};
  const t = centroTierra(T);
  if(clave === "sol"){
    const R = Math.hypot(t.x,t.y,t.z);
    // VSOP87D abreviado sólo en longitud; beta solar se aproxima a cero.
    return {lon:mod360(tierraLonFina(T)+180-0.09033/3600+nut-20.4898/R/3600),lat:0};
  }
  let p = helio(clave,T);
  for(let i=0;i<2;i++){
    const d = Math.hypot(p.x-t.x,p.y-t.y,p.z-t.z);
    p = helio(clave,T-(d/LUZ)/36525);
  }
  const v = {x:p.x-t.x,y:p.y-t.y,z:p.z-t.z}, r = Math.hypot(v.x,v.y,v.z);
  // Aberración del observador a primer orden v/c, en el mismo marco J2000.
  const dt=0.01, antes=centroTierra(T-dt/36525), despues=centroTierra(T+dt/36525);
  const u={x:v.x/r,y:v.y/r,z:v.z/r};
  const vel={x:(despues.x-antes.x)/(2*dt*LUZ),y:(despues.y-antes.y)/(2*dt*LUZ),z:(despues.z-antes.z)/(2*dt*LUZ)};
  const uv=u.x*vel.x+u.y*vel.y+u.z*vel.z;
  const q=marcoEcliptico({x:u.x+vel.x-uv*u.x,y:u.y+vel.y-uv*u.y,z:u.z+vel.z-uv*u.z},T);
  return {lon:mod360(Math.atan2(q.y,q.x)*DEG+nut),lat:Math.atan2(q.z,Math.hypot(q.x,q.y))*DEG};
}

/* de eclíptica a ecuatorial: ascensión recta y declinación, en grados */
function ecuatorial(lon, lat, T){
  const eps = (oblicuidad(T) + nutacion(T).deps)*RAD, l = lon*RAD, b = lat*RAD;
  return {
    ar:  mod360(Math.atan2(Math.sin(l)*Math.cos(eps) - Math.tan(b)*Math.sin(eps), Math.cos(l))*DEG),
    dec: Math.asin(Math.sin(b)*Math.cos(eps) + Math.cos(b)*Math.sin(eps)*Math.sin(l))*DEG
  };
}

/* hora sidérea media y aparente en Greenwich, en grados. Ojo: en tiempo
   universal, no terrestre, porque mide el giro de la Tierra. */
function gmst(jdUT){
  const T = (jdUT - 2451545)/36525;
  return mod360(280.46061837 + 360.98564736629*(jdUT - 2451545) + 0.000387933*T*T - T*T*T/38710000);
}
function horaSidereaGw(ms){
  const jdUT = julian(ms), T = sigTT(ms), n = nutacion(T);
  return mod360(gmst(jdUT) + n.dpsi*Math.cos((oblicuidad(T) + n.deps)*RAD));
}

function nodoNorte(T){ return mod360(125.0445479 - 1934.1362891*T + 0.0020754*T*T + T*T*T/467441); }
function lilithMedia(T){ return mod360(83.3532465 + 4069.0137287*T - 0.0103200*T*T - T*T*T/80053 + 180); }

const lon = (id, ms) => id === "nodoN" ? nodoNorte(sigTT(ms)) : lonGeo(id, sigTT(ms));
window.Efem = {
  RAD, DEG, mod360, julian, siglos, helio, lonGeo, distGeo, lunaLon, ELEM, marcoEcliptico,
  SIGNOS, posZod, CIUDADES,
  lon, velocidad, estaciones, cruce, nodoNorte,
  deltaT, jdTT, sigTT, precesion, nutacion, centroTierra,
  posGeo, lunaLat, ecuatorial, oblicuidad, gmst, horaSidereaGw,
  utcMs, desfaseZona, localAUTC, textoDesfase, validaCarta, cartaValida, escaparHTML,
  ORDEN: ["sol","luna","mercurio","venus","marte","jupiter","saturno","urano","neptuno","pluton"]
};
})();

