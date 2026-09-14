/* ===================== Sistemas de casas =====================
   Una sola implementación para pantalla, PDF y pruebas.

   Sistemas: signos enteros (tropical y sideral), casas iguales,
   Porfirio, Plácidus, Alcabitius y Regiomontanus.

   Convención interna: todas las cúspides se devuelven en longitud
   ECLÍPTICA TROPICAL. Cuando la lectura es sideral, quien pinta resta
   la ayanamsa igual que a los planetas. La excepción está declarada en
   signosEnteros(): ahí las casas se construyen desde el signo del
   Ascendente ya sideral y se vuelven a expresar en tropical, porque
   desplazar cúspides tropicales daría un signo distinto.

   Se expone como window.Casas. */
(function(root){
"use strict";

const RAD = Math.PI/180, DEG = 180/Math.PI;
const mod360 = x => ((x % 360) + 360) % 360;
const NOMBRES = {
  signos:"Signos enteros", igual:"Casas iguales", porfirio:"Porfirio",
  placidio:"Plácidus", alcabitius:"Alcabitius", regiomontano:"Regiomontanus"
};
/* Sistemas de cuadrante: dependen de la latitud y fallan cerca de los polos. */
const CUADRANTE = ["placidio","alcabitius","regiomontano"];

/* ---------- utilidades esféricas ---------- */
/* Longitud eclíptica del punto del zodiaco cuya ascensión recta es alfa.
   Es la intersección del círculo horario con la eclíptica. */
const lonDesdeAR = (alfa, eps) =>
  mod360(Math.atan2(Math.sin(alfa*RAD), Math.cos(alfa*RAD)*Math.cos(eps*RAD))*DEG);
/* Ascensión recta del punto de la eclíptica de longitud lambda. */
const arDesdeLon = (lam, eps) =>
  mod360(Math.atan2(Math.sin(lam*RAD)*Math.cos(eps*RAD), Math.cos(lam*RAD))*DEG);

/* ---------- Regiomontanus, por geometría vectorial ----------
   Los doce círculos de casa pasan por los puntos Norte y Sur del
   HORIZONTE y por los puntos del ecuador separados 30° desde el RAMC.
   La cúspide es donde ese círculo corta la eclíptica.
   Se resuelve como intersección de dos planos, sin fórmula heredada. */
function regiomontanoVector(ramc, lat, eps){
  const phi = lat*RAD, e = eps*RAD, R = ramc*RAD;
  /* Punto Norte del horizonte en coordenadas ecuatoriales. */
  const N = [-Math.sin(phi)*Math.cos(R), -Math.sin(phi)*Math.sin(R), Math.cos(phi)];
  /* Normal del plano de la eclíptica. */
  const nEcl = [0, -Math.sin(e), Math.cos(e)];
  /* Ejes del marco eclíptico para leer la longitud. */
  const ex = [1,0,0], ey = [0, Math.cos(e), Math.sin(e)];
  const cruz = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const punto = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];

  function cuspide(alfa){
    const A = alfa*RAD;
    const P = [Math.cos(A), Math.sin(A), 0];        // punto del ecuador
    const nCasa = cruz(N, P);                        // normal del círculo de casa
    if(Math.hypot(nCasa[0],nCasa[1],nCasa[2]) < 1e-12) return null; // degenerado
    const d = cruz(nCasa, nEcl);                     // línea de intersección
    if(Math.hypot(d[0],d[1],d[2]) < 1e-12) return null;
    let lam = mod360(Math.atan2(punto(d,ey), punto(d,ex))*DEG);
    /* La recta de intersección corta la eclíptica en dos puntos opuestos.
       Se elige el que cae del mismo lado que el punto del ecuador que
       define la casa: su ascensión recta debe quedar a menos de 90°. */
    const ar = arDesdeLon(lam, eps);
    if(Math.abs(((ar - alfa + 540) % 360) - 180) > 90) lam = mod360(lam + 180);
    return lam;
  }
  return {cuspide};
}

/* ---------- Regiomontanus, segunda derivación ----------
   Mismo criterio geométrico resuelto de otra manera: en vez de cortar
   dos planos algebraicamente, se recorre la eclíptica buscando por
   bisección el punto que cae sobre el plano del círculo de casa.
   Solo sirve para comprobar la primera; no se usa en producción. */
function regiomontanoNumerico(ramc, lat, eps, alfa){
  const phi = lat*RAD, e = eps*RAD, R = ramc*RAD, A = alfa*RAD;
  const N = [-Math.sin(phi)*Math.cos(R), -Math.sin(phi)*Math.sin(R), Math.cos(phi)];
  const P = [Math.cos(A), Math.sin(A), 0];
  const n = [N[1]*P[2]-N[2]*P[1], N[2]*P[0]-N[0]*P[2], N[0]*P[1]-N[1]*P[0]];
  /* Vector ecuatorial del punto de la eclíptica de longitud lam. */
  const v = lam => {
    const L = lam*RAD;
    return [Math.cos(L), Math.sin(L)*Math.cos(e), Math.sin(L)*Math.sin(e)];
  };
  const f = lam => { const u = v(lam); return n[0]*u[0] + n[1]*u[1] + n[2]*u[2]; };
  /* Buscar el cruce por cero más cercano al punto del ecuador. */
  const cerca = lonDesdeAR(alfa, eps);
  let a = cerca - 90, fa = f(a);
  for(let k = -90; k <= 90; k += 0.5){
    const b = cerca + k, fb = f(b);
    if(fa === 0) return mod360(a);
    if((fa < 0) !== (fb < 0)){
      let lo = a, hi = b, flo = fa;
      for(let i = 0; i < 80 && hi - lo > 1e-11; i++){
        const m = (lo + hi)/2, fm = f(m);
        if((flo < 0) !== (fm < 0)) hi = m; else { lo = m; flo = fm; }
      }
      return mod360((lo + hi)/2);
    }
    a = b; fa = fb;
  }
  return null;
}

/* ---------- Alcabitius ----------
   Se trisecan en ascensión recta los semiarcos diurno y nocturno del
   grado del Ascendente. Cada valor se lleva a la eclíptica por su
   círculo horario. */
function alcabitius(ramc, asc, eps){
  const arAsc = arDesdeLon(asc, eps);
  const sad = mod360(arAsc - ramc);              // semiarco diurno del Ascendente
  const san = mod360(ramc + 180 - arAsc);        // semiarco nocturno
  if(sad < 1e-6 || san < 1e-6) return null;      // el Ascendente no tiene arco: no hay solución
  return {
    c11: lonDesdeAR(mod360(arAsc - 2*sad/3), eps),
    c12: lonDesdeAR(mod360(arAsc -   sad/3), eps),
    c2 : lonDesdeAR(mod360(arAsc +   san/3), eps),
    c3 : lonDesdeAR(mod360(arAsc + 2*san/3), eps),
    sad, san
  };
}

/* ---------- Plácidus ----------
   Trisección de los semiarcos por iteración. Portado tal cual del que
   ya estaba en producción, para no reintroducir errores en un cálculo
   que lleva meses dando resultados correctos.
   Sin solución más allá del círculo polar. */
function placidio(ramcDeg, latDeg, epsDeg){
  const eps = epsDeg*RAD, phi = latDeg*RAD;
  const lonDeRA = a => mod360(Math.atan2(Math.sin(a*RAD), Math.cos(a*RAD)*Math.cos(eps))*DEG);
  function cuspide(inicio, f, nocturna){
    let alpha = ramcDeg + inicio;
    for(let i=0;i<30;i++){
      const lam = lonDeRA(alpha)*RAD;
      const dec = Math.asin(Math.sin(eps)*Math.sin(lam));
      const x = -Math.tan(phi)*Math.tan(dec);
      if(Math.abs(x) >= 1) return null;                 // círculo polar: sin solución
      const D = Math.acos(x)*DEG;                       // semiarco diurno
      const nuevo = nocturna ? ramcDeg + 180 - f*(180-D) : ramcDeg + f*D;
      if(Math.abs(nuevo-alpha) < 1e-9){ alpha = nuevo; break; }
      alpha = nuevo;
    }
    return lonDeRA(alpha);
  }
  const c11 = cuspide(30,1/3,false), c12 = cuspide(60,2/3,false);
  const c2 = cuspide(120,2/3,true),  c3 = cuspide(150,1/3,true);
  return [c11,c12,c2,c3].some(v => v === null) ? null : {c11,c12,c2,c3};
}

/* ---------- ensamblado ---------- */
function desdeCuatro(asc, mc, p){
  const c = new Array(13);
  c[1]=asc; c[10]=mc; c[4]=mod360(mc+180); c[7]=mod360(asc+180);
  c[11]=p.c11; c[12]=p.c12; c[2]=p.c2; c[3]=p.c3;
  c[5]=mod360(p.c11+180); c[6]=mod360(p.c12+180);
  c[8]=mod360(p.c2+180);  c[9]=mod360(p.c3+180);
  return c;
}

/* ang: {asc, mc, ramc, eps, lat, lon}
   opciones: {ayanamsa} solo la usa "signos". */
function cuspides(sistema, ang, opciones){
  const op = opciones || {};
  const {asc, mc, ramc, eps, lat} = ang;
  const aya = Number(op.ayanamsa) || 0;

  if(sistema === "signos"){
    /* Las casas nacen del signo del Ascendente en el zodiaco de lectura.
       Con ayanamsa se toma el signo SIDERAL y luego se devuelve a tropical,
       porque restar la ayanamsa a cúspides tropicales deja el Ascendente
       en un signo y la casa I empezando en otro. */
    const ascLectura = mod360(asc - aya);
    const base = Math.floor(ascLectura/30)*30;
    const c = new Array(13);
    for(let i=1;i<=12;i++) c[i] = mod360(base + (i-1)*30 + aya);
    return {c, sistema:"signos", nombre:NOMBRES.signos, sideral: aya !== 0, ayanamsa: aya};
  }
  if(sistema === "igual"){
    const c = new Array(13);
    for(let i=1;i<=12;i++) c[i] = mod360(asc + (i-1)*30);
    return {c, sistema:"igual", nombre:NOMBRES.igual};
  }
  if(sistema === "porfirio"){
    const c = new Array(13);
    c[1]=asc; c[10]=mc; c[4]=mod360(mc+180); c[7]=mod360(asc+180);
    const q1 = mod360(asc - mc)/3, q2 = mod360(mod360(mc+180) - asc)/3;
    c[11]=mod360(mc+q1); c[12]=mod360(mc+2*q1);
    c[2]=mod360(asc+q2); c[3]=mod360(asc+2*q2);
    c[5]=mod360(c[11]+180); c[6]=mod360(c[12]+180);
    c[8]=mod360(c[2]+180);  c[9]=mod360(c[3]+180);
    return {c, sistema:"porfirio", nombre:NOMBRES.porfirio};
  }
  if(sistema === "alcabitius"){
    const p = alcabitius(ramc, asc, eps);
    if(!p) return sinSolucion("alcabitius", ang, op,
      "El grado del Ascendente no tiene semiarco en esta latitud, así que Alcabitius no puede trisecarlo.");
    return {c: desdeCuatro(asc, mc, p), sistema:"alcabitius", nombre:NOMBRES.alcabitius, semiarcos:{diurno:p.sad, nocturno:p.san}};
  }
  if(sistema === "regiomontano"){
    if(Math.abs(lat) >= 89.999) return sinSolucion("regiomontano", ang, op,
      "Regiomontanus no está definido exactamente sobre el polo.");
    const R = regiomontanoVector(ramc, lat, eps);
    const c11 = R.cuspide(mod360(ramc + 30)), c12 = R.cuspide(mod360(ramc + 60));
    const c2  = R.cuspide(mod360(ramc + 120)), c3 = R.cuspide(mod360(ramc + 150));
    if([c11,c12,c2,c3].some(x => x === null)) return sinSolucion("regiomontano", ang, op,
      "Los círculos de casa degeneran en esta latitud.");
    return {c: desdeCuatro(asc, mc, {c11,c12,c2,c3}), sistema:"regiomontano", nombre:NOMBRES.regiomontano};
  }
  if(sistema === "placidio"){
    const p = placidio(ramc, lat, eps);
    if(!p) return sinSolucion("placidio", ang, op,
      "Plácidus no tiene solución más allá del círculo polar: el grado del Ascendente no sale o no se pone.");
    return {c: desdeCuatro(asc, mc, p), sistema:"placidio", nombre:NOMBRES.placidio};
  }
  return cuspides("signos", ang, op);
}

/* Cuando un sistema de cuadrante no tiene solución NO se sustituye en
   silencio: se devuelve el reemplazo marcado y con su explicación. */
function sinSolucion(pedido, ang, op, motivo){
  const alterno = cuspides("signos", ang, op);
  return Object.assign(alterno, {
    sistemaPedido: pedido,
    nombrePedido: NOMBRES[pedido],
    sustituido: true,
    aviso: motivo + " Se muestran signos enteros en su lugar, y así queda indicado en pantalla y en el PDF."
  });
}

/* En qué casa cae una longitud, con cúspides en el mismo marco. */
function casaDe(lon, c){
  const L = mod360(lon);
  for(let i=1;i<=12;i++){
    const a = c[i], b = c[i===12 ? 1 : i+1];
    const ancho = mod360(b - a), dentro = mod360(L - a);
    if(ancho > 1e-9 && dentro < ancho) return i;
  }
  return 1;
}

root.Casas = {
  RAD, DEG, mod360, NOMBRES, CUADRANTE,
  lonDesdeAR, arDesdeLon, cuspides, casaDe,
  alcabitius, placidio, regiomontanoVector, regiomontanoNumerico
};
})(typeof window !== "undefined" ? window : globalThis);
