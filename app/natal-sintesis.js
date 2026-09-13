(function(root){
"use strict";

const ORDEN=["sol","luna","mercurio","venus","marte","jupiter","saturno","urano","neptuno","pluton"];
function unico(items){return[...new Set(items.filter(Boolean))]}
function maximos(items,valor){if(!items.length)return[];const m=Math.max(...items.map(valor));return items.filter(x=>valor(x)===m)}
function nombres(items){return items.map(x=>`${x.glifo} ${x.nombre}`).join(" · ")}
function agregaRol(mapa,cuerpo,rol,peso,detalle){
  if(!cuerpo)return;const actual=mapa.get(cuerpo.id)||{id:cuerpo.id,nombre:cuerpo.nombre,glifo:cuerpo.glifo,roles:[],peso:0};
  if(!actual.roles.some(x=>x.rol===rol)){actual.roles.push({rol,peso,detalle});actual.peso+=peso}mapa.set(cuerpo.id,actual);
}
function analizar(carta,{profesional=root.NatalProfesional,regencias=root.NatalRegencias,estructura=root.NatalEstructura,patrones=root.NatalPatrones,relaciones=root.NatalRelaciones,D=root.Dignidades,E=root.Efem}={}){
  if(!carta||!Array.isArray(carta.cuerpos))throw new TypeError("Falta una carta natal calculada.");
  if(!profesional||!regencias||!estructura||!patrones||!relaciones)throw new TypeError("Faltan módulos profesionales para construir la síntesis.");
  const condicion=profesional.analizar(carta,E),gobierno=regencias.analizar(carta,{D,E}),forma=estructura.analizar(carta),geometria=patrones.analizar(carta),avanzadas=relaciones.analizar(carta,E);
  const porId=Object.fromEntries(carta.cuerpos.map(c=>[c.id,c])),roles=new Map();
  const cuerpo=id=>{const c=porId[id],p=profesional.PLANETAS?.[id]||regencias.PLANETAS?.[id];return c&&{id,nombre:c.nombre||p?.nombre||id,glifo:c.glifo||p?.glifo||""}};
  agregaRol(roles,cuerpo(gobierno.regenteCarta?.id),"Regente de la carta",4,"Gobierna el signo del Ascendente.");
  agregaRol(roles,cuerpo(gobierno.almuten?.id),"Almutén figuris",4,"Reúne la mayor puntuación de los lugares hilegíacos calculados.");
  const alcance=gobierno.autoridad[0]?.alcance.length||0,directos=gobierno.autoridad[0]?.directos.length||0;
  for(const x of gobierno.autoridad.filter(x=>x.alcance.length===alcance&&x.directos.length===directos&&(alcance>0||directos>0)))
    agregaRol(roles,cuerpo(x.id),"Mayor alcance como dispositor",3,`Recibe ${x.alcance.length} cadenas y ${x.directos.length} dependencias directas.`);
  const angulares=forma.angularidad.find(x=>x.id==="angular")?.cuerpos||[];
  for(const x of angulares)agregaRol(roles,cuerpo(x.id),"Planeta angular",2,`Ocupa la casa ${x.casa}.`);
  for(const x of geometria.focales)agregaRol(roles,cuerpo(x.cuerpo.id),x.rol,2,"Punto focal de una configuración o de la forma geométrica.");
  const prioridades=[...roles.values()].sort((a,b)=>b.peso-a.peso||b.roles.length-a.roles.length||ORDEN.indexOf(a.id)-ORDEN.indexOf(b.id));
  const totales=condicion.filas.map(f=>({...f,total:f.esencial.puntos+f.accidental.puntos}));
  const masSostenidos=maximos(totales,x=>x.total),masExigidos=maximos(totales,x=>-x.total);
  const elementos=geometria.concentraciones.elementos,elementosMax=maximos(elementos,x=>x.cuerpos.length),elementoDominante=elementosMax.length===1?elementosMax[0]:null;
  const temp=forma.temperamento,temperamento=temp.dominante||`Equilibrio entre ${temp.empate.join(" y ")}`;
  const patronesTexto=geometria.patrones.length?unico(geometria.patrones.map(x=>x.nombre)).join(" · "):"Sin configuraciones cerradas dentro de los orbes definidos";
  const gobiernoTexto=gobierno.regenteCarta
    ?`La lectura comienza con ${gobierno.regenteCarta.nombre}, regente de la carta${gobierno.almuten?`, y contrasta su función con ${gobierno.almuten.nombre}, almutén figuris`:""}. ${gobierno.autoridad[0]?`${gobierno.autoridad[0].nombre} tiene el mayor alcance en las cadenas de dispositores.`:""}`
    :`Sin hora natal no se establecen regente de la carta ni almutén figuris. ${gobierno.autoridad[0]?`${gobierno.autoridad[0].nombre} conserva el mayor alcance entre las cadenas por signo.`:""}`;
  const condicionTexto=`Entre los siete planetas tradicionales, ${nombres(masSostenidos)} obtiene ${masSostenidos[0]?.total??0} puntos combinados y ${nombres(masExigidos)} ${masExigidos[0]?.total??0}. Los totales ordenan testimonios; no equivalen por sí solos a resultados favorables o desfavorables.`;
  const estructuraTexto=forma.conHora
    ?`La carta se orienta hacia ${forma.resumen.horizonte?.toLowerCase()||"un equilibrio del horizonte"} y ${forma.resumen.lateral?.toLowerCase()||"un equilibrio lateral"}. ${forma.resumen.cuadrante?`${forma.resumen.cuadrante} reúne la mayor concentración.`:"Los cuadrantes quedan equilibrados."}`
    :"La estructura por casas, cuadrantes, hemisferios y angularidad permanece abierta porque falta una hora natal fiable.";
  const geometriaTexto=`La distribución adopta una forma ${geometria.forma.nombre.toLowerCase()} aproximada, con ${geometria.forma.arco.toFixed(1)}° ocupados. ${patronesTexto}.${geometria.aislados.length?` ${nombres(geometria.aislados)} queda sin aspectos mayores dentro de estos orbes.`:" Todos los cuerpos participan en al menos un aspecto mayor."}`;
  const relacionesTexto=`Se registran ${avanzadas.resumen.aplicativos} aspectos aplicativos, ${avanzadas.resumen.separativos} separativos y ${avanzadas.resumen.partiles} partiles. La declinación aporta ${avanzadas.resumen.paralelos} contactos y ${avanzadas.resumen.fueraLimites} cuerpos fuera de límites; además aparecen ${avanzadas.resumen.antiscios} contactos por antiscio y ${avanzadas.resumen.puntosMedios} cuadros de puntos medios dentro de los orbes declarados.`;
  const balanceTexto=`${elementoDominante?`${elementoDominante.nombre} concentra ${elementoDominante.cuerpos.length} de ${geometria.cuerpos.length} cuerpos.`:`No existe un único elemento dominante.`} La síntesis temperamental indica ${temperamento.toLowerCase()} con ${temp.testigos.length} de cuatro testigos disponibles.`;
  const fortalezas=totales.filter(x=>x.total>0).sort((a,b)=>b.total-a.total).map(x=>({cuerpo:cuerpo(x.id),total:x.total,detalle:`Esencial ${x.esencial.puntos>=0?"+":""}${x.esencial.puntos} · accidental ${x.accidental.puntos>=0?"+":""}${x.accidental.puntos}`}));
  const revisar=totales.filter(x=>x.total<0).sort((a,b)=>a.total-b.total).map(x=>({cuerpo:cuerpo(x.id),total:x.total,detalle:`Esencial ${x.esencial.puntos>=0?"+":""}${x.esencial.puntos} · accidental ${x.accidental.puntos>=0?"+":""}${x.accidental.puntos}`}));
  for(const x of geometria.aislados)if(!revisar.some(y=>y.cuerpo.id===x.id))revisar.push({cuerpo:cuerpo(x.id),total:null,detalle:"Aislado de aspectos mayores con los orbes del módulo."});
  const pasos=[];
  if(gobierno.regenteCarta)pasos.push(`Estudiar primero a ${gobierno.regenteCarta.nombre} como regente del Ascendente.`);
  if(gobierno.almuten)pasos.push(`Contrastar al regente con ${gobierno.almuten.nombre}, almutén figuris.`);
  if(prioridades[0])pasos.push(`Seguir los testimonios reunidos por ${prioridades[0].nombre}: ${prioridades[0].roles.map(x=>x.rol).join(", ")}.`);
  if(geometria.patrones.length)pasos.push(`Leer las configuraciones desde sus planetas focales y después el patrón completo.`);
  pasos.push("Contrastar los aspectos aplicativos y separativos con declinación, antiscios y puntos medios relevantes.");
  if(forma.conHora)pasos.push("Integrar casas, cuadrantes y angularidad al juicio final.");else pasos.push("Completar la hora natal antes de formular conclusiones sobre casas y angularidad.");
  return{horaConocida:!!carta.datos?.horaConocida,condicion,gobierno,estructura:forma,geometria,avanzadas,prioridades,masSostenidos,masExigidos,fortalezas,revisar,pasos,lecturas:[
    {id:"gobierno",titulo:"Gobierno de la carta",texto:gobiernoTexto},
    {id:"condicion",titulo:"Condición planetaria",texto:condicionTexto},
    {id:"estructura",titulo:"Estructura",texto:estructuraTexto},
    {id:"geometria",titulo:"Geometría y aspectos",texto:geometriaTexto},
    {id:"relaciones",titulo:"Relaciones avanzadas",texto:relacionesTexto},
    {id:"balance",titulo:"Balance y temperamento",texto:balanceTexto}
  ],criterio:"La síntesis cruza testimonios independientes ya calculados y conserva sus límites. Las ponderaciones de prioridad organizan la lectura: regente y almutén 4, autoridad dispositora 3, angularidad y foco geométrico 2. Las relaciones avanzadas aportan geometría y dinámica sin sumar dignidad. No sustituyen la interpretación del astrólogo."};
}

root.NatalSintesis={ORDEN,unico,maximos,analizar};
})(typeof window!=="undefined"?window:globalThis);

