(function(root){
"use strict";

const IDS=["sol","luna","mercurio","venus","marte","jupiter","saturno","urano","neptuno","pluton"];
const SIGNOS=["Aries","Tauro","Géminis","Cáncer","Leo","Virgo","Libra","Escorpio","Sagitario","Capricornio","Acuario","Piscis"];
const ELEMENTOS=["Fuego","Tierra","Aire","Agua"];
const ORBES={conjuncion:6,sextil:4,cuadratura:6,trigono:6,quincuncio:3,oposicion:6};
const ANGULOS={conjuncion:0,sextil:60,cuadratura:90,trigono:120,quincuncio:150,oposicion:180};
const NOMBRES={
  stellium:"Stellium",gran_trigono:"Gran trígono",cuadratura_t:"Cuadratura T",gran_cruz:"Gran cruz",
  yod:"Yod",cometa:"Cometa",rectangulo_mistico:"Rectángulo místico"
};
const DESCRIPCIONES={
  stellium:"Tres o más cuerpos concentrados en un mismo signo y dentro de un arco de 10°.",
  gran_trigono:"Tres cuerpos unidos por tres trígonos.",
  cuadratura_t:"Una oposición recibe dos cuadraturas desde un planeta ápice.",
  gran_cruz:"Cuatro cuerpos forman dos oposiciones y cuatro cuadraturas.",
  yod:"Dos cuerpos en sextil convergen por quincuncios en un ápice.",
  cometa:"Un gran trígono se organiza alrededor de una oposición y dos sextiles.",
  rectangulo_mistico:"Dos oposiciones quedan enlazadas por dos trígonos y dos sextiles."
};
const mod=n=>((n%360)+360)%360;
function separacion(a,b){let d=Math.abs(mod(a)-mod(b));return d>180?360-d:d}
function aspecto(a,b,tipo){const diferencia=Math.abs(separacion(a.lon,b.lon)-ANGULOS[tipo]);return{cumple:diferencia<=ORBES[tipo],tipo,angulo:ANGULOS[tipo],orbe:ORBES[tipo],diferencia}}
function combinaciones(lista,n){const salida=[];function rec(inicio,actual){if(actual.length===n){salida.push(actual.slice());return}for(let i=inicio;i<=lista.length-(n-actual.length);i++){actual.push(lista[i]);rec(i+1,actual);actual.pop()}}rec(0,[]);return salida}
function casaDe(lon,cuspides){const c=Array.isArray(cuspides)?cuspides:cuspides?.c;if(!c)return null;for(let i=1;i<=12;i++){const a=c[i],b=c[i===12?1:i+1];if(mod(lon-a)<mod(b-a))return i}return 1}
function cuerposDe(carta){
  const porId=Object.fromEntries((carta?.cuerpos||[]).filter(c=>c&&IDS.includes(c.id)&&Number.isFinite(c.lon)).map(c=>[c.id,c]));
  const conHora=!!carta?.datos?.horaConocida&&!!carta?.cusp;
  return IDS.filter(id=>porId[id]).map(id=>{const c=porId[id];return{id,nombre:c.nombre||id,glifo:c.glifo||"",color:c.color||"#8A6A22",lon:mod(c.lon),casa:conHora?casaDe(c.lon,carta.cusp):null}});
}
function aristas(items,pares){return pares.map(([i,j,tipo])=>{const a=aspecto(items[i],items[j],tipo);return{a:items[i].id,b:items[j].id,tipo,diferencia:a.diferencia,orbe:a.orbe}})}
function patron(tipo,items,pares,focales=[]){
  const conexiones=aristas(items,pares),desviacion=Math.max(0,...conexiones.map(x=>x.diferencia));
  return{tipo,nombre:NOMBRES[tipo],descripcion:DESCRIPCIONES[tipo],ids:items.map(x=>x.id),cuerpos:items,conexiones,desviacion,focales};
}
function deduplica(items){const vistos=new Set();return items.filter(x=>{const k=x.tipo+":"+x.ids.slice().sort().join("|");if(vistos.has(k))return false;vistos.add(k);return true})}
function detectarPatrones(cuerpos){
  const salida=[];
  for(let signo=0;signo<12;signo++){
    const grupo=cuerpos.filter(c=>Math.floor(c.lon/30)===signo).sort((a,b)=>a.lon-b.lon);
    let encontrado=null;
    busca:for(let n=grupo.length;n>=3;n--)for(const items of combinaciones(grupo,n)){
      const arco=items[items.length-1].lon-items[0].lon;
      if(arco<=10){encontrado={...patron("stellium",items,[]),signo,signoNombre:SIGNOS[signo],arco};break busca}
    }
    if(encontrado)salida.push(encontrado);
  }
  for(const items of combinaciones(cuerpos,3)){
    const todos=(tipo)=>[[0,1],[0,2],[1,2]].every(([i,j])=>aspecto(items[i],items[j],tipo).cumple);
    if(todos("trigono"))salida.push(patron("gran_trigono",items,[[0,1,"trigono"],[0,2,"trigono"],[1,2,"trigono"]]));
    for(let a=0;a<3;a++)for(let b=a+1;b<3;b++){
      const k=3-a-b;
      if(aspecto(items[a],items[b],"oposicion").cumple&&aspecto(items[k],items[a],"cuadratura").cumple&&aspecto(items[k],items[b],"cuadratura").cumple)
        salida.push(patron("cuadratura_t",items,[[a,b,"oposicion"],[k,a,"cuadratura"],[k,b,"cuadratura"]],[items[k].id]));
      if(aspecto(items[a],items[b],"sextil").cumple&&aspecto(items[k],items[a],"quincuncio").cumple&&aspecto(items[k],items[b],"quincuncio").cumple)
        salida.push(patron("yod",items,[[a,b,"sextil"],[k,a,"quincuncio"],[k,b,"quincuncio"]],[items[k].id]));
    }
  }
  for(const items of combinaciones(cuerpos,4)){
    const pares=[];for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)pares.push([i,j]);
    const tipos=pares.map(([i,j])=>["oposicion","cuadratura","trigono","sextil"].find(t=>aspecto(items[i],items[j],t).cumple)||null);
    const conteo=t=>tipos.filter(x=>x===t).length;
    if(conteo("oposicion")===2&&conteo("cuadratura")===4)
      salida.push(patron("gran_cruz",items,pares.map((p,i)=>[p[0],p[1],tipos[i]])));
    if(conteo("oposicion")===2&&conteo("trigono")===2&&conteo("sextil")===2)
      salida.push(patron("rectangulo_mistico",items,pares.map((p,i)=>[p[0],p[1],tipos[i]])));
    for(let fuera=0;fuera<4;fuera++){
      const tri=[0,1,2,3].filter(i=>i!==fuera);
      if(![[tri[0],tri[1]],[tri[0],tri[2]],[tri[1],tri[2]]].every(([i,j])=>aspecto(items[i],items[j],"trigono").cumple))continue;
      for(const opuesto of tri){const otros=tri.filter(i=>i!==opuesto);if(aspecto(items[fuera],items[opuesto],"oposicion").cumple&&otros.every(i=>aspecto(items[fuera],items[i],"sextil").cumple)){
        salida.push(patron("cometa",items,[[tri[0],tri[1],"trigono"],[tri[0],tri[2],"trigono"],[tri[1],tri[2],"trigono"],[fuera,opuesto,"oposicion"],[fuera,otros[0],"sextil"],[fuera,otros[1],"sextil"]],[items[fuera].id]));
      }}
    }
  }
  return deduplica(salida).sort((a,b)=>a.tipo.localeCompare(b.tipo,"es")||a.desviacion-b.desviacion);
}
function arcoMinimo(cuerpos){
  if(cuerpos.length<2)return{arco:0,hueco:360,indice:0};const orden=cuerpos.slice().sort((a,b)=>a.lon-b.lon),huecos=orden.map((c,i)=>mod(orden[(i+1)%orden.length].lon-c.lon));let indice=0;for(let i=1;i<huecos.length;i++)if(huecos[i]>huecos[indice])indice=i;return{arco:360-huecos[indice],hueco:huecos[indice],indice,orden};
}
function formaCarta(cuerpos){
  if(cuerpos.length<3)return{id:"insuficiente",nombre:"Datos insuficientes",descripcion:"Se necesitan al menos tres cuerpos.",arco:0,hueco:360,asa:null,aproximada:true};
  const cubos=[];
  if(cuerpos.length>=8)for(const candidato of cuerpos){const resto=cuerpos.filter(c=>c.id!==candidato.id),m=arcoMinimo(resto),aislamiento=Math.min(...resto.map(c=>separacion(candidato.lon,c.lon)));if(m.arco<=180&&aislamiento>=30)cubos.push({candidato,aislamiento,arco:m.arco})}
  if(cubos.length){const mejor=cubos.sort((a,b)=>b.aislamiento-a.aislamiento)[0],m=arcoMinimo(cuerpos);return{id:"cubo",nombre:"Cubo",descripcion:`Nueve cuerpos ocupan ${mejor.arco.toFixed(1)}° y ${mejor.candidato.nombre} actúa como asa separada.`,arco:m.arco,hueco:m.hueco,asa:mejor.candidato,aproximada:true}}
  const m=arcoMinimo(cuerpos);let id,nombre,descripcion;
  if(m.arco<=120){id="haz";nombre="Haz";descripcion="Concentración muy compacta dentro de 120°."}
  else if(m.arco<=180){id="cuenco";nombre="Cuenco";descripcion="Todos los cuerpos caben dentro de un semicírculo."}
  else if(m.arco<=240){id="locomotora";nombre="Locomotora";descripcion="La distribución ocupa hasta 240° y deja un sector amplio vacío."}
  else{id="dispersa";nombre="Dispersa";descripcion="Los cuerpos se reparten por más de 240° del círculo."}
  return{id,nombre,descripcion,arco:m.arco,hueco:m.hueco,asa:null,aproximada:true};
}
function concentraciones(carta,cuerpos){
  const signos=SIGNOS.map((nombre,i)=>({id:i,nombre,cuerpos:cuerpos.filter(c=>Math.floor(c.lon/30)===i)})).filter(x=>x.cuerpos.length>=3);
  const conHora=!!carta?.datos?.horaConocida&&!!carta?.cusp;
  const casas=conHora?Array.from({length:12},(_,i)=>({id:i+1,nombre:`Casa ${i+1}`,cuerpos:cuerpos.filter(c=>c.casa===i+1)})).filter(x=>x.cuerpos.length>=3):[];
  const elementos=ELEMENTOS.map((nombre,i)=>({id:nombre.toLowerCase(),nombre,cuerpos:cuerpos.filter(c=>Math.floor(c.lon/30)%4===i)}));
  return{conHora,signos,casas,elementos};
}
function analizar(carta){
  if(!carta||!Array.isArray(carta.cuerpos))throw new TypeError("Falta una carta natal calculada.");
  const cuerpos=cuerposDe(carta),patrones=detectarPatrones(cuerpos),conectados=new Set();
  for(const a of cuerpos)for(const b of cuerpos)if(a.id<b.id&&["conjuncion","sextil","cuadratura","trigono","oposicion"].some(t=>aspecto(a,b,t).cumple)){conectados.add(a.id);conectados.add(b.id)}
  const aislados=cuerpos.filter(c=>!conectados.has(c.id));
  const focales=[];for(const p of patrones)for(const id of p.focales){const cuerpo=cuerpos.find(c=>c.id===id);if(cuerpo&&!focales.some(x=>x.cuerpo.id===id&&x.rol===p.nombre))focales.push({cuerpo,rol:p.tipo==="cuadratura_t"||p.tipo==="yod"?`Ápice de ${p.nombre}`:`Punto focal de ${p.nombre}`})}
  const forma=formaCarta(cuerpos);if(forma.asa)focales.push({cuerpo:forma.asa,rol:"Asa del cubo"});
  return{cuerpos,patrones,focales,aislados,concentraciones:concentraciones(carta,cuerpos),forma,criterio:{
    poblacion:"Diez cuerpos: Sol, Luna y ocho planetas. Se excluyen nodos, ángulos y puntos calculados.",
    orbes:`Conjunción ${ORBES.conjuncion}° · sextil ${ORBES.sextil}° · cuadratura ${ORBES.cuadratura}° · trígono ${ORBES.trigono}° · quincuncio ${ORBES.quincuncio}° · oposición ${ORBES.oposicion}°.`,
    stellium:"Stellium estricto: tres o más cuerpos en el mismo signo y dentro de 10°.",
    forma:"La forma es una clasificación geométrica aproximada por arco ocupado; no reemplaza el juicio visual de una escuela concreta."
  }};
}

root.NatalPatrones={IDS,SIGNOS,ELEMENTOS,ORBES,ANGULOS,NOMBRES,mod,separacion,aspecto,casaDe,cuerposDe,detectarPatrones,formaCarta,concentraciones,analizar};
})(typeof window!=="undefined"?window:globalThis);
