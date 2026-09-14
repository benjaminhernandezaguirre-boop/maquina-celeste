/* ===================== Escuelas y marcos de interpretación =====================
   Una sola fuente de verdad para la configuración de lectura: qué planetas
   entran en el análisis, qué regencias se usan, en qué zodiaco, con qué
   casas y qué métodos son legítimos dentro de cada marco.

   Pantalla y PDF leen de aquí. Si discrepan, es un error.

   ADVERTENCIA DE ENCUADRE
   Estos perfiles son CONVENCIONES DE CONFIGURACIÓN, no retratos de lo que
   hacía todo el mundo en una época. En cada periodo convivieron criterios
   distintos: hubo helenistas que usaban casas de cuadrante, y medievales
   que trabajaban con signos enteros. Lo que estos perfiles fijan es un
   conjunto coherente y declarado, no una verdad histórica única.

   Por eso cada perfil declara explícitamente qué métodos admite. En
   particular, la puntuación de Lilly (siglo XVII) y el almutén figuris
   (desarrollo árabe y medieval) NO se ofrecen dentro del perfil
   helenístico, porque son posteriores.

   Se expone como window.Escuelas. */
(function(root){
"use strict";

const LLAVE = "astroplanetario-lectura";

/* ---------- población planetaria ---------- */
const SIETE = ["sol","luna","mercurio","venus","marte","jupiter","saturno"];
const TRANSATURNINOS = ["urano","neptuno","pluton"];
const DIEZ = SIETE.concat(TRANSATURNINOS);

/* ---------- regencias ---------- */
const REGENTES_TRADICIONALES = ["Marte","Venus","Mercurio","Luna","Sol","Mercurio",
  "Venus","Marte","Júpiter","Saturno","Saturno","Júpiter"];
const REGENTES_MODERNOS = ["Marte","Venus","Mercurio","Luna","Sol","Mercurio",
  "Venus","Plutón","Júpiter","Saturno","Urano","Neptuno"];
const ID_DE_NOMBRE = {Sol:"sol",Luna:"luna",Mercurio:"mercurio",Venus:"venus",Marte:"marte",
  "Júpiter":"jupiter",Saturno:"saturno",Urano:"urano",Neptuno:"neptuno","Plutón":"pluton"};
const NOMBRE_DE_ID = Object.keys(ID_DE_NOMBRE).reduce((a,n)=>{a[ID_DE_NOMBRE[n]]=n;return a},{});

/* ---------- zodiacos ---------- */
/* El valor es la ayanamsa en J2000; quien calcula le suma la precesión
   acumulada hasta la fecha de la carta. */
const ZODIACOS = [
  {id:"trop",   nombre:"Tropical",                 aya:null},
  {id:"lahiri", nombre:"Sideral · Lahiri",         aya:23.85306},
  {id:"fagan",  nombre:"Sideral · Fagan-Bradley",  aya:24.74000},
  {id:"kp",     nombre:"Sideral · Krishnamurti",   aya:23.78583},
  {id:"raman",  nombre:"Sideral · Raman",          aya:22.46389}
];
const zodiacoDe = id => ZODIACOS.find(z => z.id === id) || ZODIACOS[0];

/* ---------- casas ---------- */
const CASAS = [
  {id:"placidio",    nombre:"Plácidus",       nota:"Cuadrante. Difundido desde el siglo XVII; hoy el más usado en Occidente."},
  {id:"signos",      nombre:"Signos enteros", nota:"Cada signo es una casa. El reparto más antiguo documentado."},
  {id:"alcabitius",  nombre:"Alcabitius",     nota:"Cuadrante. Triseca los semiarcos del Ascendente. Habitual en la astrología árabe y medieval."},
  {id:"regiomontano",nombre:"Regiomontanus",  nota:"Cuadrante. Divide el ecuador en doce. Dominante en el Renacimiento y en la horaria de Lilly."},
  {id:"igual",       nombre:"Casas iguales",  nota:"Doce tramos de 30° desde el grado del Ascendente."},
  {id:"porfirio",    nombre:"Porfirio",       nota:"Cuadrante. Cada cuadrante partido en tres partes iguales."}
];

/* ---------- métodos y su procedencia ----------
   'origen' dice de dónde viene el método, no quién puede usarlo.
   'estado' distingue lo que el sitio calcula hoy de lo que todavía no.
   Nada con estado "futura" debe anunciarse como disponible. */
const METODOS = {
  secta:            {nombre:"Secta diurna y nocturna", origen:"helenistica", estado:"disponible"},
  dignidadesEsenciales:{nombre:"Dignidades esenciales", origen:"helenistica", estado:"disponible"},
  triplicidades:    {nombre:"Regentes de triplicidad", origen:"helenistica", estado:"disponible"},
  lotes:            {nombre:"Lotes de Fortuna y Espíritu", origen:"helenistica", estado:"disponible"},
  profecciones:     {nombre:"Profecciones anuales", origen:"helenistica", estado:"disponible"},
  liberacion:       {nombre:"Liberación zodiacal", origen:"helenistica", estado:"disponible"},
  dispositores:     {nombre:"Dispositores y circuitos", origen:"compartida", estado:"disponible"},
  regenteAscendente:{nombre:"Regente del Ascendente", origen:"compartida", estado:"disponible"},
  angularidad:      {nombre:"Proximidad a los ángulos", origen:"compartida", estado:"disponible"},
  estrellasFijas:   {nombre:"Estrellas fijas", origen:"compartida", estado:"disponible"},
  lunacionPrenatal: {nombre:"Lunación prenatal", origen:"compartida", estado:"disponible"},
  antiscios:        {nombre:"Antiscios y contraantiscios", origen:"medieval", estado:"disponible"},
  almutenFiguris:   {nombre:"Almutén figuris", origen:"medieval", estado:"disponible",
                     nota:"Método de Ibn Ezra, siglo XII. No pertenece al repertorio helenístico."},
  dignidadesAccidentales:{nombre:"Dignidades accidentales", origen:"medieval", estado:"disponible"},
  puntuacionLilly:  {nombre:"Puntuación de Lilly", origen:"renacentista", estado:"disponible",
                     nota:"Reparto de puntos de la Christian Astrology, 1647."},
  patrones:         {nombre:"Patrones de carta", origen:"moderna", estado:"disponible"},
  puntosMedios:     {nombre:"Puntos medios", origen:"moderna", estado:"disponible"},
  declinaciones:    {nombre:"Paralelos de declinación", origen:"moderna", estado:"disponible"},
  transaturninos:   {nombre:"Urano, Neptuno y Plutón", origen:"moderna", estado:"disponible"},
  /* Todavía no calculadas. No deben ofrecerse como disponibles. */
  recepciones:      {nombre:"Recepciones planetarias", origen:"medieval", estado:"futura"},
  firdaria:         {nombre:"Firdaria", origen:"medieval", estado:"futura"},
  decenios:         {nombre:"Decenios helenísticos", origen:"helenistica", estado:"futura"},
  direccionesPrimarias:{nombre:"Direcciones primarias", origen:"renacentista", estado:"futura"},
  hyleg:            {nombre:"Hyleg y alcocoden", origen:"medieval", estado:"futura"},
  casasDerivadas:   {nombre:"Casas derivadas", origen:"medieval", estado:"futura"}
};

/* ---------- perfiles ---------- */
const PERFILES = [
  {
    id:"contemporanea",
    nombre:"Contemporánea occidental",
    resumen:"Diez planetas, zodiaco tropical, Plácidus y regencias modernas.",
    encuadre:"La configuración más extendida hoy en Occidente. Incorpora los tres transaturninos como regentes y trabaja con casas de cuadrante.",
    poblacion:"diez", regencias:"modernas", zodiaco:"trop", casas:"placidio",
    metodos:["patrones","puntosMedios","declinaciones","transaturninos","dispositores",
             "regenteAscendente","angularidad","estrellasFijas","lunacionPrenatal"],
    metodosOpcionales:["secta","dignidadesEsenciales","triplicidades","dignidadesAccidentales",
                       "almutenFiguris","puntuacionLilly","antiscios","lotes"],
    notaOpcionales:"El análisis tradicional se puede activar, pero aparece aparte y marcado como tal: no forma parte del marco contemporáneo."
  },
  {
    id:"helenistica",
    nombre:"Helenística",
    resumen:"Siete planetas, zodiaco tropical, signos enteros y regencias tradicionales.",
    encuadre:"Recoge el repertorio documentado entre los siglos II a.C. y VII d.C. No incluye el almutén figuris ni la puntuación de Lilly, que son posteriores en más de mil años.",
    poblacion:"siete", regencias:"tradicionales", zodiaco:"trop", casas:"signos",
    metodos:["secta","dignidadesEsenciales","triplicidades","lotes","profecciones",
             "liberacion","dispositores","regenteAscendente","angularidad","lunacionPrenatal","estrellasFijas"],
    metodosOpcionales:[],
    vedados:["almutenFiguris","puntuacionLilly","dignidadesAccidentales"],
    notaVedados:"Estos métodos existen en el sitio pero no se ofrecen aquí, porque atribuirlos a la astrología helenística sería un anacronismo."
  },
  {
    id:"medieval",
    nombre:"Medieval",
    resumen:"Siete planetas, zodiaco tropical, Alcabitius y regencias tradicionales.",
    encuadre:"La síntesis árabe y latina que hereda lo helenístico y le añade el almutén, las recepciones y las casas de cuadrante de Alcabitius.",
    poblacion:"siete", regencias:"tradicionales", zodiaco:"trop", casas:"alcabitius",
    metodos:["secta","dignidadesEsenciales","triplicidades","dignidadesAccidentales","almutenFiguris",
             "lotes","antiscios","dispositores","regenteAscendente","angularidad","lunacionPrenatal","estrellasFijas"],
    metodosOpcionales:["profecciones","liberacion"],
    vedados:["puntuacionLilly"],
    notaVedados:"La puntuación de Lilly es del siglo XVII; aquí se usa la valoración esencial sin ese reparto."
  },
  {
    id:"renacentista",
    nombre:"Renacentista",
    resumen:"Siete planetas, zodiaco tropical, Regiomontanus y regencias tradicionales.",
    encuadre:"El marco de la astrología europea de los siglos XVI y XVII, con las casas de Regiomontanus y el reparto de puntos que fija Lilly.",
    poblacion:"siete", regencias:"tradicionales", zodiaco:"trop", casas:"regiomontano",
    metodos:["secta","dignidadesEsenciales","triplicidades","dignidadesAccidentales","puntuacionLilly",
             "almutenFiguris","lotes","antiscios","dispositores","regenteAscendente","angularidad",
             "lunacionPrenatal","estrellasFijas"],
    metodosOpcionales:["profecciones"],
    vedados:[]
  },
  {
    id:"personalizada",
    nombre:"Personalizada",
    resumen:"Eliges población planetaria, regencias, zodiaco y casas por separado.",
    encuadre:"Para combinaciones que no encajan en ningún perfil: sideral con Plácidus, tropical con signos enteros y regencias modernas, lo que necesites. Lo que elijas se muestra siempre en pantalla.",
    poblacion:"diez", regencias:"tradicionales", zodiaco:"trop", casas:"signos",
    editable:true,
    metodos:["secta","dignidadesEsenciales","triplicidades","dispositores","regenteAscendente",
             "angularidad","lunacionPrenatal","estrellasFijas","patrones","puntosMedios","declinaciones"],
    metodosOpcionales:["almutenFiguris","puntuacionLilly","dignidadesAccidentales","antiscios",
                       "lotes","profecciones","liberacion","transaturninos"]
  }
];
const perfilDe = id => PERFILES.find(p => p.id === id) || PERFILES[0];

/* ---------- configuración efectiva ---------- */
/* Devuelve la configuración completa, aplicando el perfil y, si es
   personalizada o hay ajustes sueltos, las preferencias del usuario. */
function resuelve(config){
  const c = config || {};
  const p = perfilDe(c.perfil);
  const editable = !!p.editable;
  const poblacion = editable && c.poblacion ? c.poblacion : p.poblacion;
  const regencias = editable && c.regencias ? c.regencias : p.regencias;
  const zodiaco   = editable && c.zodiaco   ? c.zodiaco   : p.zodiaco;
  const casas     = editable && c.casas     ? c.casas     : p.casas;
  const z = zodiacoDe(zodiaco);
  const cuerpos = poblacion === "siete" ? SIETE.slice() : DIEZ.slice();
  const fuera = poblacion === "siete" ? TRANSATURNINOS.slice() : [];
  return {
    perfil:p.id, nombrePerfil:p.nombre, resumen:p.resumen, encuadre:p.encuadre, editable,
    poblacion, regencias, zodiaco, casas,
    nombreZodiaco:z.nombre, ayanamsaBase:z.aya, sideral:z.aya != null,
    nombreCasas:(CASAS.find(x=>x.id===casas)||{}).nombre || casas,
    notaCasas:(CASAS.find(x=>x.id===casas)||{}).nota || "",
    cuerpos, fuera,
    /* Capa complementaria: transaturninos visibles sin entrar en el cálculo. */
    complementaria: fuera.length ? !!c.complementaria : false,
    regentes: regencias === "modernas" ? REGENTES_MODERNOS.slice() : REGENTES_TRADICIONALES.slice(),
    opcionales: Object.assign({}, c.opcionales || {})
  };
}

/* ¿Este marco admite este método? */
function permite(config, metodo){
  const e = resuelve(config);
  const p = perfilDe(e.perfil);
  if((p.vedados||[]).includes(metodo)) return false;
  if((p.metodos||[]).includes(metodo)) return true;
  if((p.metodosOpcionales||[]).includes(metodo)) return !!e.opcionales[metodo];
  return false;
}
/* ¿Por qué no se ofrece? Para poder decirlo en pantalla en vez de callarlo. */
function motivoVeto(config, metodo){
  const p = perfilDe(resuelve(config).perfil);
  if(!(p.vedados||[]).includes(metodo)) return null;
  return p.notaVedados || "Este método no pertenece al marco seleccionado.";
}
const esOpcional = (config, metodo) =>
  (perfilDe(resuelve(config).perfil).metodosOpcionales||[]).includes(metodo);

/* Regente del signo (0-11) según las regencias del marco. */
function regenteDeSigno(signo, config){
  const e = resuelve(config);
  return e.regentes[((signo % 12) + 12) % 12];
}
/* El regente siempre debe existir dentro de la población elegida: con
   siete planetas las regencias tradicionales garantizan que sí. */
function regenteValido(config, nombre){
  const e = resuelve(config);
  return e.cuerpos.includes(ID_DE_NOMBRE[nombre]);
}

/* Métodos disponibles, agrupados por procedencia, para la página de
   herramientas. Nunca devuelve los que están en estado "futura". */
function catalogo(config){
  const e = resuelve(config);
  const p = perfilDe(e.perfil);
  const entra = id => METODOS[id] && METODOS[id].estado === "disponible";
  const mapa = id => Object.assign({id}, METODOS[id], {
    activo: permite(config, id),
    opcional: (p.metodosOpcionales||[]).includes(id),
    vedado: (p.vedados||[]).includes(id)
  });
  return {
    incluidos: (p.metodos||[]).filter(entra).map(mapa),
    opcionales: (p.metodosOpcionales||[]).filter(entra).map(mapa),
    vedados: (p.vedados||[]).filter(entra).map(mapa),
    futuras: Object.keys(METODOS).filter(id => METODOS[id].estado === "futura")
      .map(id => Object.assign({id}, METODOS[id]))
  };
}

/* ---------- persistencia ----------
   Se guarda SOLO la configuración de lectura. Los datos de nacimiento
   viven en otra llave y no se tocan. */
function carga(){
  try{
    const g = JSON.parse(localStorage.getItem(LLAVE) || "null");
    return (g && typeof g === "object") ? g : {perfil:"contemporanea"};
  }catch(e){ return {perfil:"contemporanea"}; }
}
function guarda(config){
  try{ localStorage.setItem(LLAVE, JSON.stringify(config || {})); }catch(e){}
  return config;
}

/* Una línea con todo lo que está actuando, para la banda de pantalla
   y para la cabecera del PDF. */
function firma(config, ayanamsaAplicada){
  const e = resuelve(config);
  const trozos = [e.nombrePerfil, e.nombreZodiaco];
  if(e.sideral && ayanamsaAplicada != null){
    const g = Math.floor(ayanamsaAplicada), mnt = Math.round((ayanamsaAplicada - g)*60);
    trozos.push("ayanamsa " + g + "° " + String(mnt).padStart(2,"0") + "′");
  }
  trozos.push("casas " + e.nombreCasas);
  trozos.push(e.poblacion === "siete" ? "siete planetas" : "diez planetas");
  trozos.push("regencias " + e.regencias);
  return trozos.join(" · ");
}

root.Escuelas = {
  LLAVE, SIETE, DIEZ, TRANSATURNINOS,
  REGENTES_TRADICIONALES, REGENTES_MODERNOS, ID_DE_NOMBRE, NOMBRE_DE_ID,
  ZODIACOS, CASAS, METODOS, PERFILES,
  perfilDe, zodiacoDe, resuelve, permite, motivoVeto, esOpcional,
  regenteDeSigno, regenteValido, catalogo, carga, guarda, firma
};
})(typeof window !== "undefined" ? window : globalThis);
