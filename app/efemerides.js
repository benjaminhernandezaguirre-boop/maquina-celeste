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

/* longitud eclíptica geocéntrica de cualquier astro del catálogo */
function lonGeo(clave, T){
  if(clave === "luna") return lunaLon(T);
  const t = tierraEn(T);
  if(clave === "sol") return mod360(Math.atan2(-t.y, -t.x)*DEG);
  const p = helio(clave, T);
  return mod360(Math.atan2(p.y - t.y, p.x - t.x)*DEG);
}
function distGeo(clave, T){
  if(clave === "luna") return 0.00257;
  const t = tierraEn(T);
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


function nodoNorte(T){ return mod360(125.0445479 - 1934.1362891*T + 0.0020754*T*T + T*T*T/467441); }
function lilithMedia(T){ return mod360(83.3532465 + 4069.0137287*T - 0.0103200*T*T - T*T*T/80053 + 180); }

const lon = (id, ms) => id === "nodoN" ? nodoNorte(siglos(julian(ms))) : lonGeo(id, siglos(julian(ms)));
window.Efem = {
  RAD, DEG, mod360, julian, siglos, helio, lonGeo, distGeo, lunaLon,
  SIGNOS, posZod, CIUDADES,
  lon, velocidad, estaciones, cruce, nodoNorte,
  utcMs, desfaseZona, localAUTC, textoDesfase,
  ORDEN: ["sol","luna","mercurio","venus","marte","jupiter","saturno","urano","neptuno","pluton"]
};
})();
