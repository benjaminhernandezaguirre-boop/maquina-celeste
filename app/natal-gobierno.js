/* ===================== Gobierno de la carta =====================
   Seis lecturas SEPARADAS que la práctica confunde a menudo:

     1. Regente del Ascendente   — quién rige el signo que asciende
     2. Conjunciones al AC        — quién está pegado al grado
     3. Angularidad               — quién está cerca de los cuatro ángulos
     4. Dispositores              — quién manda sobre quién, y dónde acaba
     5. Almutén figuris           — regente general por puntuación
     6. Prioridad o dominancia    — síntesis por criterios declarados

   Regir, estar conjunto, ser dispositor y dominar son cosas distintas.
   Un planeta pegado al Ascendente NO se vuelve regente ni dispositor por
   estarlo: solo gana angularidad. Este módulo existe para que eso no se
   mezcle nunca en una sola tarjeta.

   Se expone como window.NatalGobierno. */
(function(root){
"use strict";

const mod = (n,m) => ((n%m)+m)%m;
const signoDe = lon => Math.floor(mod(lon,360)/30);
const sep = (a,b) => { const d = Math.abs(mod(a,360)-mod(b,360)); return d > 180 ? 360-d : d; };
const SIGNOS = ["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio",
                "Sagitario","Capricornio","Acuario","Piscis"];
const ANGULOS = [
  {id:"asc", nombre:"Ascendente", corto:"AC"},
  {id:"mc",  nombre:"Medio Cielo", corto:"MC"},
  {id:"dc",  nombre:"Descendente", corto:"DC"},
  {id:"ic",  nombre:"Fondo del Cielo", corto:"FC"}
];
const ORBE_CONJUNCION_AC = 10;   // orbe declarado, no escondido
const ORBE_ANGULAR = 10;

const Esc = () => root.Escuelas;
const nombreDe = id => (Esc() && Esc().NOMBRE_DE_ID[id]) || id;
const idDe = nombre => (Esc() && Esc().ID_DE_NOMBRE[nombre]) || null;

/* Los cuerpos que entran en el análisis según el marco. carta.cuerpos es
   el arreglo del astroplanetario: [{id, nombre, lon, ...}]. */
function cuerposDe(carta, cfg){
  const e = Esc().resuelve(cfg);
  const porId = {};
  (carta.cuerpos||[]).forEach(c => { porId[c.id] = c; });
  return e.cuerpos.map(id => porId[id]).filter(Boolean);
}
function excluidosDe(carta, cfg){
  const e = Esc().resuelve(cfg);
  const porId = {};
  (carta.cuerpos||[]).forEach(c => { porId[c.id] = c; });
  return e.fuera.map(id => porId[id]).filter(Boolean);
}
const casaDe = (lon, cusp) => root.Casas ? root.Casas.casaDe(lon, cusp) : null;

/* ---------- 1. Regente del Ascendente ---------- */
function regenteAscendente(carta, cfg){
  if(!carta.ang) return {aplica:false, motivo:"Sin hora de nacimiento no hay Ascendente."};
  const e = Esc().resuelve(cfg);
  const signo = signoDe(carta.ang.asc);
  const nombre = e.regentes[signo];
  const id = idDe(nombre);
  const cuerpo = (carta.cuerpos||[]).find(c => c.id === id);
  return {
    aplica:true,
    signoAscendente: SIGNOS[signo],
    regente: nombre,
    id,
    lon: cuerpo ? cuerpo.lon : null,
    signo: cuerpo ? SIGNOS[signoDe(cuerpo.lon)] : null,
    casa: (cuerpo && carta.cusp) ? casaDe(cuerpo.lon, carta.cusp) : null,
    regencias: e.regencias,
    nota: e.regencias === "modernas"
      ? "Regencias modernas: Escorpio a Plutón, Acuario a Urano y Piscis a Neptuno."
      : "Regencias tradicionales: cada planeta rige dos signos y las luminarias uno."
  };
}

/* ---------- 2. Conjunciones al Ascendente ----------
   Estar pegado al grado del Ascendente NO es regir. Se informa aparte,
   con el orbe a la vista y diciendo de qué lado cae. */
function conjuncionesAscendente(carta, cfg, orbe){
  if(!carta.ang) return {aplica:false, motivo:"Sin hora de nacimiento no hay Ascendente."};
  const tope = Number(orbe) || ORBE_CONJUNCION_AC;
  const e = Esc().resuelve(cfg);
  const mira = cuerposDe(carta, cfg).concat(e.complementaria ? excluidosDe(carta, cfg) : []);
  const lista = mira.map(c => {
    const d = sep(c.lon, carta.ang.asc);
    const dirigida = ((mod(c.lon - carta.ang.asc, 360) + 180) % 360) - 180;
    return {
      id:c.id, nombre:c.nombre || nombreDe(c.id), lon:c.lon, orbe:d,
      lado: dirigida < 0 ? "casa XII" : "casa I",
      complementario: e.fuera.includes(c.id)
    };
  }).filter(x => x.orbe <= tope).sort((a,b) => a.orbe - b.orbe);
  return {
    aplica:true, orbeMaximo:tope, lista,
    nota:"Una conjunción al Ascendente da protagonismo y angularidad. No convierte al planeta en regente del Ascendente ni en dispositor de nada."
  };
}

/* ---------- 3. Proximidad a los cuatro ángulos ---------- */
function angularidad(carta, cfg, orbe){
  if(!carta.ang || !carta.cusp) return {aplica:false, motivo:"Se necesita hora de nacimiento para situar los ángulos."};
  const tope = Number(orbe) || ORBE_ANGULAR;
  const e = Esc().resuelve(cfg);
  const puntos = {
    asc: carta.ang.asc, mc: carta.ang.mc,
    dc: mod(carta.ang.asc + 180, 360), ic: mod(carta.ang.mc + 180, 360)
  };
  const mira = cuerposDe(carta, cfg).concat(e.complementaria ? excluidosDe(carta, cfg) : []);
  const lista = [];
  mira.forEach(c => {
    ANGULOS.forEach(a => {
      const d = sep(c.lon, puntos[a.id]);
      if(d <= tope) lista.push({
        id:c.id, nombre:c.nombre || nombreDe(c.id), angulo:a.nombre, corto:a.corto,
        distancia:d, complementario: e.fuera.includes(c.id)
      });
    });
  });
  lista.sort((a,b) => a.distancia - b.distancia);
  return {aplica:true, orbeMaximo:tope, lista,
    nota:"La angularidad mide protagonismo por posición, no autoridad sobre otros planetas."};
}

/* ---------- 4. Dispositores ----------
   Cada planeta es dispuesto por el regente del signo que ocupa. Se sigue
   la cadena hasta un planeta en su propio domicilio (dispositor final) o
   hasta un circuito cerrado. */
function dispositores(carta, cfg){
  const e = Esc().resuelve(cfg);
  const cuerpos = cuerposDe(carta, cfg);
  const porId = {}; cuerpos.forEach(c => { porId[c.id] = c; });

  const disponeA = {};
  cuerpos.forEach(c => {
    const regente = e.regentes[signoDe(c.lon)];
    const rid = idDe(regente);
    disponeA[c.id] = (rid && porId[rid]) ? rid : null;
  });

  const cadenas = {}, finales = new Set(), circuitos = [];
  cuerpos.forEach(c => {
    const visto = [], vistos = new Set();
    let actual = c.id;
    while(actual && !vistos.has(actual)){
      vistos.add(actual); visto.push(actual);
      const siguiente = disponeA[actual];
      if(siguiente === actual){ finales.add(actual); break; }   // en su domicilio
      actual = siguiente;
    }
    const cierra = actual && vistos.has(actual) && disponeA[actual] !== actual;
    cadenas[c.id] = {
      camino: visto,
      final: (disponeA[visto[visto.length-1]] === visto[visto.length-1]) ? visto[visto.length-1] : null,
      enCircuito: !!cierra
    };
    if(cierra){
      const desde = visto.indexOf(actual);
      const ciclo = visto.slice(desde);
      if(ciclo.length > 1){
        const firma = ciclo.slice().sort().join(">");
        if(!circuitos.some(x => x.firma === firma))
          circuitos.push({firma, miembros:ciclo.slice(), nombres:ciclo.map(nombreDe)});
      }
    }
  });

  return {
    aplica:true,
    disponeA,
    cadenas,
    finales: [...finales].map(id => ({id, nombre:nombreDe(id),
      signo: SIGNOS[signoDe(porId[id].lon)]})),
    circuitos,
    regencias: e.regencias,
    nota:"El dispositor de un planeta es el regente del signo que ese planeta ocupa. No depende de conjunciones ni de la casa."
  };
}

/* ---------- 5. Almutén figuris ----------
   Solo donde el marco lo admite, y diciendo siempre con qué método. */
function almuten(carta, cfg){
  if(!Esc().permite(cfg, "almutenFiguris")){
    return {aplica:false,
      motivo: Esc().motivoVeto(cfg, "almutenFiguris") ||
        "El almutén figuris no está activado en este marco de lectura.",
      opcional: Esc().esOpcional(cfg, "almutenFiguris")};
  }
  const D = root.Dignidades;
  if(!D || !D.almutenFiguris) return {aplica:false, motivo:"No se pudo cargar el módulo de dignidades."};
  if(!carta.ang) return {aplica:false, motivo:"El almutén figuris necesita el Ascendente, y para eso hace falta la hora."};
  const cuerpos = {};
  (carta.cuerpos||[]).forEach(c => { cuerpos[c.id] = c.lon; });
  const adaptada = {datos:carta.datos, nacimiento:carta.ms, asc:carta.ang.asc,
                    mc:carta.ang.mc, cuerpos, diurna:carta.diurna};
  let r;
  try { r = D.almutenFiguris(adaptada, {E:root.Efem}); }
  catch(err){ return {aplica:false, motivo:"No se pudo calcular el almutén: " + err.message}; }
  return {
    aplica:true,
    metodo:"Ibn Ezra · cinco puntos hylegiacales, posición por casa y regentes del día y de la hora",
    ganador:r.ganador, tabla:r.tabla, puntos:r.puntos,
    nota:"El almutén es un resultado de puntuación. No es el regente del Ascendente ni tiene por qué coincidir con él."
  };
}

/* ---------- 6. Prioridad o dominancia ----------
   Criterios explícitos y verificables. Admite empates y ausencia de
   resultado: si nada destaca, se dice. */
const CRITERIOS = [
  {id:"regenteAsc",  puntos:3, texto:"Rige el signo del Ascendente"},
  {id:"angular",     puntos:2, texto:"A menos de 5° de un ángulo"},
  {id:"cercaAngulo", puntos:1, texto:"Entre 5° y 10° de un ángulo"},
  {id:"final",       puntos:2, texto:"Dispositor final de alguna cadena"},
  {id:"almuten",     puntos:2, texto:"Almutén figuris"},
  {id:"luminaria",   puntos:1, texto:"Luminaria de la secta"}
];
function dominancia(carta, cfg){
  const e = Esc().resuelve(cfg);
  const cuerpos = cuerposDe(carta, cfg);
  if(!cuerpos.length) return {aplica:false, motivo:"No hay cuerpos en el marco elegido."};
  const marcador = {};
  cuerpos.forEach(c => { marcador[c.id] = {id:c.id, nombre:c.nombre || nombreDe(c.id), puntos:0, razones:[]}; });
  const suma = (id, crit) => {
    if(!marcador[id]) return;
    const k = CRITERIOS.find(x => x.id === crit);
    marcador[id].puntos += k.puntos;
    marcador[id].razones.push({criterio:k.texto, puntos:k.puntos});
  };

  const reg = regenteAscendente(carta, cfg);
  if(reg.aplica && reg.id) suma(reg.id, "regenteAsc");

  const ang = angularidad(carta, cfg, ORBE_ANGULAR);
  if(ang.aplica){
    const mejor = {};
    ang.lista.filter(x => !x.complementario).forEach(x => {
      if(mejor[x.id] == null || x.distancia < mejor[x.id]) mejor[x.id] = x.distancia;
    });
    Object.keys(mejor).forEach(id => suma(id, mejor[id] <= 5 ? "angular" : "cercaAngulo"));
  }

  const disp = dispositores(carta, cfg);
  disp.finales.forEach(f => suma(f.id, "final"));

  const alm = almuten(carta, cfg);
  if(alm.aplica && alm.ganador) suma(idDe(alm.ganador.planeta), "almuten");

  if(carta.diurna != null) suma(carta.diurna ? "sol" : "luna", "luminaria");

  const orden = Object.values(marcador).sort((a,b) => b.puntos - a.puntos);
  const techo = orden.length ? orden[0].puntos : 0;
  const ganadores = orden.filter(x => x.puntos === techo && techo > 0);

  return {
    aplica:true,
    criterios: CRITERIOS,
    marcador: orden,
    ganadores,
    empate: ganadores.length > 1,
    sinResultado: techo === 0,
    nota: techo === 0
      ? "Ningún planeta reúne criterios de prioridad en este marco. No se fuerza un ganador."
      : (ganadores.length > 1
        ? "Hay empate. Se muestran todos los planetas que lo alcanzan, sin desempatar de forma arbitraria."
        : "Prioridad según los criterios listados, que son los únicos que intervienen."),
    marco: e.nombrePerfil
  };
}

function analizar(carta, cfg){
  return {
    configuracion: Esc().resuelve(cfg),
    regenteAscendente: regenteAscendente(carta, cfg),
    conjuncionesAscendente: conjuncionesAscendente(carta, cfg),
    angularidad: angularidad(carta, cfg),
    dispositores: dispositores(carta, cfg),
    almuten: almuten(carta, cfg),
    dominancia: dominancia(carta, cfg)
  };
}

root.NatalGobierno = {
  SIGNOS, ANGULOS, CRITERIOS, ORBE_CONJUNCION_AC, ORBE_ANGULAR,
  mod, signoDe, sep, cuerposDe, excluidosDe,
  regenteAscendente, conjuncionesAscendente, angularidad,
  dispositores, almuten, dominancia, analizar
};
})(typeof window !== "undefined" ? window : globalThis);
