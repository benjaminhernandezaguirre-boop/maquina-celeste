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
  if(y >= 2005){ t = y - 2000; return 62.92 + 0.32217*t + 0.005589*t*t; }
  if(y >= 1986){ t = y - 2000; return 63.86 + 0.3345*t - 0.060374*t*t + 0.0017275*t*t*t
                                    + 0.000651814*Math.pow(t,4) + 0.00002373599*Math.pow(t,5); }
  if(y >= 1961){ t = y - 1975; return 45.45 + 1.067*t - t*t/260 - t*t*t/718; }
  if(y >= 1941){ t = y - 1950; return 29.07 + 0.407*t - t*t/233 + t*t*t/2547; }
  if(y >= 1920){ t = y - 1920; return 21.20 + 0.84493*t - 0.076100*t*t + 0.0020936*t*t*t; }
  if(y >= 1900){ t = y - 1900; return -2.79 + 1.494119*t - 0.0598939*t*t + 0.0061966*t*t*t - 0.000197*Math.pow(t,4); }
  t = y - 1860; return 7.62 + 0.5737*t - 0.251754*t*t + 0.01680668*t*t*t
                      - 0.0004473624*Math.pow(t,4) + Math.pow(t,5)/233174;
}
const jdTT  = ms => julian(ms) + deltaT(ms)/86400;   // día juliano en tiempo terrestre
const sigTT = ms => siglos(jdTT(ms));                // siglos julianos en TT

/* Precesión general en longitud desde J2000 (grados). */
const precesion = T => (5029.0966*T + 1.11113*T*T - 0.000006*T*T*T)/3600;

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
   sube la precisión del Sol de medio grado a un segundo de arco, y con ella la
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
    const r = km/149597870.7, l = lunaLon(T)*RAD;
    _ctV = {x: b.x + MU_LUNA*r*Math.cos(l), y: b.y + MU_LUNA*r*Math.sin(l), z: b.z};
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
function lonGeo(clave, T){
  const nut = nutacion(T).dpsi;
  if(clave === "luna") return mod360(lunaLon(T) + nut);      // Meeus ya va en la fecha
  const t = centroTierra(T);
  if(clave === "sol"){
    const R = Math.hypot(t.x, t.y, t.z);
    return mod360(tierraLonFina(T) + 180 - 0.09033/3600 + nut - 20.4898/R/3600);
  }
  let p = helio(clave, T);                                   // corrección por tiempo-luz
  for(let i = 0; i < 2; i++){
    const d = Math.hypot(p.x-t.x, p.y-t.y, p.z-t.z);
    p = helio(clave, T - (d/LUZ)/36525);
  }
  return mod360(Math.atan2(p.y - t.y, p.x - t.x)*DEG + precesion(T) + nut);
}
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

const CIUDADES = `
Ciudad de México|México|19.4326|-99.1332|America/Mexico_City
Guadalajara|Jalisco, MX|20.6597|-103.3496|America/Mexico_City
Monterrey|Nuevo León, MX|25.6866|-100.3161|America/Monterrey
Puebla|Puebla, MX|19.0414|-98.2063|America/Mexico_City
Toluca|Estado de México, MX|19.2826|-99.6557|America/Mexico_City
Ecatepec|Estado de México, MX|19.6097|-99.0600|America/Mexico_City
Naucalpan|Estado de México, MX|19.4785|-99.2396|America/Mexico_City
Nezahualcóyotl|Estado de México, MX|19.4003|-99.0145|America/Mexico_City
Tijuana|Baja California, MX|32.5149|-117.0382|America/Tijuana
Mexicali|Baja California, MX|32.6245|-115.4523|America/Tijuana
Ensenada|Baja California, MX|31.8667|-116.5964|America/Tijuana
León|Guanajuato, MX|21.1250|-101.6860|America/Mexico_City
Guanajuato|Guanajuato, MX|21.0190|-101.2574|America/Mexico_City
Irapuato|Guanajuato, MX|20.6767|-101.3563|America/Mexico_City
Celaya|Guanajuato, MX|20.5230|-100.8156|America/Mexico_City
Salamanca|Guanajuato, MX|20.5700|-101.1900|America/Mexico_City
Ciudad Juárez|Chihuahua, MX|31.6904|-106.4245|America/Ciudad_Juarez
Chihuahua|Chihuahua, MX|28.6330|-106.0691|America/Chihuahua
Delicias|Chihuahua, MX|28.1900|-105.4700|America/Chihuahua
Querétaro|Querétaro, MX|20.5888|-100.3899|America/Mexico_City
Mérida|Yucatán, MX|20.9674|-89.5926|America/Merida
Valladolid|Yucatán, MX|20.6896|-88.2011|America/Merida
San Luis Potosí|San Luis Potosí, MX|22.1565|-100.9855|America/Mexico_City
Aguascalientes|Aguascalientes, MX|21.8853|-102.2916|America/Mexico_City
Hermosillo|Sonora, MX|29.0729|-110.9559|America/Hermosillo
Ciudad Obregón|Sonora, MX|27.4828|-109.9306|America/Hermosillo
Nogales|Sonora, MX|31.3186|-110.9458|America/Hermosillo
Saltillo|Coahuila, MX|25.4383|-100.9737|America/Monterrey
Torreón|Coahuila, MX|25.5428|-103.4068|America/Monterrey
Monclova|Coahuila, MX|26.9100|-101.4200|America/Monterrey
Piedras Negras|Coahuila, MX|28.7000|-100.5236|America/Matamoros
Culiacán|Sinaloa, MX|24.8091|-107.3940|America/Mazatlan
Mazatlán|Sinaloa, MX|23.2494|-106.4111|America/Mazatlan
Los Mochis|Sinaloa, MX|25.7935|-108.9963|America/Mazatlan
Morelia|Michoacán, MX|19.7060|-101.1950|America/Mexico_City
Uruapan|Michoacán, MX|19.4116|-102.0562|America/Mexico_City
Zamora|Michoacán, MX|19.9855|-102.2836|America/Mexico_City
Lázaro Cárdenas|Michoacán, MX|17.9583|-102.2000|America/Mexico_City
Veracruz|Veracruz, MX|19.1738|-96.1342|America/Mexico_City
Xalapa|Veracruz, MX|19.5438|-96.9102|America/Mexico_City
Coatzacoalcos|Veracruz, MX|18.1345|-94.4590|America/Mexico_City
Poza Rica|Veracruz, MX|20.5333|-97.4500|America/Mexico_City
Córdoba|Veracruz, MX|18.8833|-96.9333|America/Mexico_City
Orizaba|Veracruz, MX|18.8511|-97.0997|America/Mexico_City
Cancún|Quintana Roo, MX|21.1619|-86.8515|America/Cancun
Playa del Carmen|Quintana Roo, MX|20.6296|-87.0739|America/Cancun
Chetumal|Quintana Roo, MX|18.5002|-88.2961|America/Cancun
Cozumel|Quintana Roo, MX|20.5083|-86.9458|America/Cancun
Villahermosa|Tabasco, MX|17.9892|-92.9475|America/Mexico_City
Tuxtla Gutiérrez|Chiapas, MX|16.7516|-93.1029|America/Mexico_City
San Cristóbal de las Casas|Chiapas, MX|16.7370|-92.6376|America/Mexico_City
Tapachula|Chiapas, MX|14.9089|-92.2625|America/Mexico_City
Oaxaca de Juárez|Oaxaca, MX|17.0732|-96.7266|America/Mexico_City
Salina Cruz|Oaxaca, MX|16.1667|-95.2000|America/Mexico_City
Acapulco|Guerrero, MX|16.8531|-99.8237|America/Mexico_City
Chilpancingo|Guerrero, MX|17.5514|-99.5006|America/Mexico_City
Iguala|Guerrero, MX|18.3447|-99.5397|America/Mexico_City
Zihuatanejo|Guerrero, MX|17.6383|-101.5514|America/Mexico_City
Cuernavaca|Morelos, MX|18.9186|-99.2342|America/Mexico_City
Cuautla|Morelos, MX|18.8125|-98.9542|America/Mexico_City
Pachuca|Hidalgo, MX|20.1011|-98.7591|America/Mexico_City
Tulancingo|Hidalgo, MX|20.0833|-98.3667|America/Mexico_City
Tepic|Nayarit, MX|21.5042|-104.8946|America/Mazatlan
Puerto Vallarta|Jalisco, MX|20.6534|-105.2253|America/Mexico_City
Zapopan|Jalisco, MX|20.7214|-103.3918|America/Mexico_City
Tlaquepaque|Jalisco, MX|20.6409|-103.2938|America/Mexico_City
Colima|Colima, MX|19.2433|-103.7240|America/Mexico_City
Manzanillo|Colima, MX|19.1138|-104.3383|America/Mexico_City
Durango|Durango, MX|24.0277|-104.6532|America/Monterrey
Gómez Palacio|Durango, MX|25.5611|-103.4989|America/Monterrey
Zacatecas|Zacatecas, MX|22.7709|-102.5832|America/Mexico_City
Fresnillo|Zacatecas, MX|23.1769|-102.8686|America/Mexico_City
Campeche|Campeche, MX|19.8301|-90.5349|America/Merida
Ciudad del Carmen|Campeche, MX|18.6500|-91.8167|America/Merida
La Paz|Baja California Sur, MX|24.1426|-110.3128|America/Mazatlan
San José del Cabo|Baja California Sur, MX|23.0631|-109.7020|America/Mazatlan
Tampico|Tamaulipas, MX|22.2331|-97.8611|America/Monterrey
Ciudad Victoria|Tamaulipas, MX|23.7369|-99.1411|America/Monterrey
Reynosa|Tamaulipas, MX|26.0808|-98.2880|America/Matamoros
Matamoros|Tamaulipas, MX|25.8797|-97.5045|America/Matamoros
Nuevo Laredo|Tamaulipas, MX|27.4761|-99.5164|America/Matamoros
Tlaxcala|Tlaxcala, MX|19.3139|-98.2404|America/Mexico_City
Tehuacán|Puebla, MX|18.4617|-97.3928|America/Mexico_City
Cholula|Puebla, MX|19.0633|-98.3061|America/Mexico_City
Buenos Aires|Argentina|-34.6037|-58.3816|America/Argentina/Buenos_Aires
Córdoba|Argentina|-31.4201|-64.1888|America/Argentina/Cordoba
Rosario|Argentina|-32.9442|-60.6505|America/Argentina/Cordoba
Mendoza|Argentina|-32.8895|-68.8458|America/Argentina/Mendoza
La Plata|Argentina|-34.9215|-57.9545|America/Argentina/Buenos_Aires
Santiago|Chile|-33.4489|-70.6693|America/Santiago
Valparaíso|Chile|-33.0472|-71.6127|America/Santiago
Concepción|Chile|-36.8201|-73.0444|America/Santiago
Lima|Perú|-12.0464|-77.0428|America/Lima
Arequipa|Perú|-16.4090|-71.5375|America/Lima
Trujillo|Perú|-8.1090|-79.0215|America/Lima
Cusco|Perú|-13.5320|-71.9675|America/Lima
Bogotá|Colombia|4.7110|-74.0721|America/Bogota
Medellín|Colombia|6.2442|-75.5812|America/Bogota
Cali|Colombia|3.4516|-76.5320|America/Bogota
Barranquilla|Colombia|10.9685|-74.7813|America/Bogota
Cartagena|Colombia|10.3910|-75.4794|America/Bogota
Bucaramanga|Colombia|7.1193|-73.1227|America/Bogota
Caracas|Venezuela|10.4806|-66.9036|America/Caracas
Maracaibo|Venezuela|10.6317|-71.6406|America/Caracas
Valencia|Venezuela|10.1620|-68.0077|America/Caracas
Quito|Ecuador|-0.1807|-78.4678|America/Guayaquil
Guayaquil|Ecuador|-2.1710|-79.9224|America/Guayaquil
Cuenca|Ecuador|-2.9001|-79.0059|America/Guayaquil
La Paz|Bolivia|-16.4897|-68.1193|America/La_Paz
Santa Cruz de la Sierra|Bolivia|-17.7833|-63.1821|America/La_Paz
Cochabamba|Bolivia|-17.3895|-66.1568|America/La_Paz
Asunción|Paraguay|-25.2637|-57.5759|America/Asuncion
Montevideo|Uruguay|-34.9011|-56.1645|America/Montevideo
San José|Costa Rica|9.9281|-84.0907|America/Costa_Rica
Ciudad de Panamá|Panamá|8.9824|-79.5199|America/Panama
Managua|Nicaragua|12.1149|-86.2362|America/Managua
San Salvador|El Salvador|13.6929|-89.2182|America/El_Salvador
Tegucigalpa|Honduras|14.0723|-87.1921|America/Tegucigalpa
San Pedro Sula|Honduras|15.5042|-88.0250|America/Tegucigalpa
Ciudad de Guatemala|Guatemala|14.6349|-90.5069|America/Guatemala
Quetzaltenango|Guatemala|14.8347|-91.5180|America/Guatemala
La Habana|Cuba|23.1136|-82.3666|America/Havana
Santo Domingo|República Dominicana|18.4861|-69.9312|America/Santo_Domingo
Santiago de los Caballeros|República Dominicana|19.4517|-70.6970|America/Santo_Domingo
San Juan|Puerto Rico|18.4655|-66.1057|America/Puerto_Rico
São Paulo|Brasil|-23.5505|-46.6333|America/Sao_Paulo
Río de Janeiro|Brasil|-22.9068|-43.1729|America/Sao_Paulo
Brasilia|Brasil|-15.7939|-47.8828|America/Sao_Paulo
Madrid|España|40.4168|-3.7038|Europe/Madrid
Barcelona|España|41.3874|2.1686|Europe/Madrid
Valencia|España|39.4699|-0.3763|Europe/Madrid
Sevilla|España|37.3891|-5.9845|Europe/Madrid
Zaragoza|España|41.6488|-0.8891|Europe/Madrid
Málaga|España|36.7213|-4.4214|Europe/Madrid
Murcia|España|37.9922|-1.1307|Europe/Madrid
Palma de Mallorca|España|39.5696|2.6502|Europe/Madrid
Bilbao|España|43.2630|-2.9350|Europe/Madrid
Alicante|España|38.3452|-0.4810|Europe/Madrid
Granada|España|37.1773|-3.5986|Europe/Madrid
Valladolid|España|41.6523|-4.7245|Europe/Madrid
Vigo|España|42.2406|-8.7207|Europe/Madrid
A Coruña|España|43.3623|-8.4115|Europe/Madrid
Santander|España|43.4623|-3.8100|Europe/Madrid
Pamplona|España|42.8125|-1.6458|Europe/Madrid
Salamanca|España|40.9701|-5.6635|Europe/Madrid
Toledo|España|39.8628|-4.0273|Europe/Madrid
Las Palmas de Gran Canaria|España|28.1235|-15.4363|Atlantic/Canary
Santa Cruz de Tenerife|España|28.4636|-16.2518|Atlantic/Canary
Los Ángeles|Estados Unidos|34.0522|-118.2437|America/Los_Angeles
San Diego|Estados Unidos|32.7157|-117.1611|America/Los_Angeles
San Francisco|Estados Unidos|37.7749|-122.4194|America/Los_Angeles
Las Vegas|Estados Unidos|36.1699|-115.1398|America/Los_Angeles
Phoenix|Estados Unidos|33.4484|-112.0740|America/Phoenix
Denver|Estados Unidos|39.7392|-104.9903|America/Denver
Houston|Estados Unidos|29.7604|-95.3698|America/Chicago
San Antonio|Estados Unidos|29.4241|-98.4936|America/Chicago
Dallas|Estados Unidos|32.7767|-96.7970|America/Chicago
El Paso|Estados Unidos|31.7619|-106.4850|America/Denver
Chicago|Estados Unidos|41.8781|-87.6298|America/Chicago
Nueva York|Estados Unidos|40.7128|-74.0060|America/New_York
Miami|Estados Unidos|25.7617|-80.1918|America/New_York
Atlanta|Estados Unidos|33.7490|-84.3880|America/New_York
Washington|Estados Unidos|38.9072|-77.0369|America/New_York
Boston|Estados Unidos|42.3601|-71.0589|America/New_York
Seattle|Estados Unidos|47.6062|-122.3321|America/Los_Angeles
Toronto|Canadá|43.6532|-79.3832|America/Toronto
Montreal|Canadá|45.5019|-73.5674|America/Toronto
Londres|Reino Unido|51.5074|-0.1278|Europe/London
París|Francia|48.8566|2.3522|Europe/Paris
Roma|Italia|41.9028|12.4964|Europe/Rome
Berlín|Alemania|52.5200|13.4050|Europe/Berlin
Lisboa|Portugal|38.7223|-9.1393|Europe/Lisbon
Ámsterdam|Países Bajos|52.3676|4.9041|Europe/Amsterdam
Bruselas|Bélgica|50.8503|4.3517|Europe/Brussels
Zúrich|Suiza|47.3769|8.5417|Europe/Zurich
Viena|Austria|48.2082|16.3738|Europe/Vienna
Atenas|Grecia|37.9838|23.7275|Europe/Athens
Estambul|Turquía|41.0082|28.9784|Europe/Istanbul
Moscú|Rusia|55.7558|37.6173|Europe/Moscow
El Cairo|Egipto|30.0444|31.2357|Africa/Cairo
Casablanca|Marruecos|33.5731|-7.5898|Africa/Casablanca
Lagos|Nigeria|6.5244|3.3792|Africa/Lagos
Johannesburgo|Sudáfrica|-26.2041|28.0473|Africa/Johannesburg
Dubái|Emiratos Árabes Unidos|25.2048|55.2708|Asia/Dubai
Bombay|India|19.0760|72.8777|Asia/Kolkata
Nueva Delhi|India|28.6139|77.2090|Asia/Kolkata
Bangkok|Tailandia|13.7563|100.5018|Asia/Bangkok
Pekín|China|39.9042|116.4074|Asia/Shanghai
Shanghái|China|31.2304|121.4737|Asia/Shanghai
Hong Kong|China|22.3193|114.1694|Asia/Hong_Kong
Tokio|Japón|35.6762|139.6503|Asia/Tokyo
Seúl|Corea del Sur|37.5665|126.9780|Asia/Seoul
Sídney|Australia|-33.8688|151.2093|Australia/Sydney
Melbourne|Australia|-37.8136|144.9631|Australia/Melbourne
Auckland|Nueva Zelanda|-36.8485|174.7633|Pacific/Auckland
`.trim().split("\n").map(l => {
  const p = l.split("|");
  return {n:p[0], r:p[1], lat:+p[2], lon:+p[3], tz:p[4], etiqueta:`${p[0]}, ${p[1]}`};
});


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
function localAUTC(y,mo,d,h,mi,tz){
  const base = utcMs(y,mo,d,h,mi);
  let t = base;
  for(let i=0;i<4;i++) t = base - desfaseZona(tz, t);
  return t;
}
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

/* posición geocéntrica aparente completa: longitud y latitud eclípticas */
function posGeo(clave, T){
  const nut = nutacion(T).dpsi;
  if(clave === "luna") return {lon: mod360(lunaLon(T) + nut), lat: lunaLat(T)};
  const t = centroTierra(T);
  if(clave === "sol"){
    const R = Math.hypot(t.x, t.y, t.z);
    return {lon: mod360(tierraLonFina(T) + 180 - 0.09033/3600 + nut - 20.4898/R/3600),
            lat: -Math.asin(t.z/R)*DEG};
  }
  let p = helio(clave, T);
  for(let i = 0; i < 2; i++){
    const d = Math.hypot(p.x-t.x, p.y-t.y, p.z-t.z);
    p = helio(clave, T - (d/LUZ)/36525);
  }
  const x = p.x-t.x, y = p.y-t.y, z = p.z-t.z;
  return {lon: mod360(Math.atan2(y, x)*DEG + precesion(T) + nut),
          lat: Math.atan2(z, Math.hypot(x, y))*DEG};
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
  const jdUT = julian(ms), T = (jdUT - 2451545)/36525, n = nutacion(T);
  return mod360(gmst(jdUT) + n.dpsi*Math.cos((oblicuidad(T) + n.deps)*RAD));
}

function nodoNorte(T){ return mod360(125.0445479 - 1934.1362891*T + 0.0020754*T*T + T*T*T/467441); }
function lilithMedia(T){ return mod360(83.3532465 + 4069.0137287*T - 0.0103200*T*T - T*T*T/80053 + 180); }

const lon = (id, ms) => id === "nodoN" ? nodoNorte(sigTT(ms)) : lonGeo(id, sigTT(ms));
window.Efem = {
  RAD, DEG, mod360, julian, siglos, helio, lonGeo, distGeo, lunaLon,
  SIGNOS, posZod, CIUDADES,
  lon, velocidad, estaciones, cruce, nodoNorte,
  deltaT, jdTT, sigTT, precesion, nutacion, centroTierra,
  posGeo, lunaLat, ecuatorial, oblicuidad, gmst, horaSidereaGw,
  utcMs, desfaseZona, localAUTC, textoDesfase,
  ORDEN: ["sol","luna","mercurio","venus","marte","jupiter","saturno","urano","neptuno","pluton"]
};
})();
