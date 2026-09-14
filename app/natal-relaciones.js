(function(root){
"use strict";

const IDS=["sol","luna","mercurio","venus","marte","jupiter","saturno","urano","neptuno","pluton"];
const ASPECTOS=[
  {id:"conjuncion",nombre:"Conjunción",glifo:"☌",angulo:0,orbe:8},
  {id:"oposicion",nombre:"Oposición",glifo:"☍",angulo:180,orbe:8},
  {id:"trigono",nombre:"Trígono",glifo:"△",angulo:120,orbe:7},
  {id:"cuadratura",nombre:"Cuadratura",glifo:"□",angulo:90,orbe:7},
  {id:"sextil",nombre:"Sextil",glifo:"✳",angulo:60,orbe:5}
];
const ORBE_DECLINACION=1,ORBE_ANTISCIO=1.5,ORBE_PUNTO_MEDIO=1.5;
const mod=n=>((n%360)+360)%360;
function separacion(a,b){let d=Math.abs(mod(a)-mod(b));return d>180?360-d:d}
function diferenciaDirigida(a,b){let d=mod(b)-mod(a);if(d>180)d-=360;if(d<=-180)d+=360;return d}
function gradoMin(n){const a=Math.abs(n),g=Math.floor(a),m=Math.round((a-g)*60);return m===60?`${g+1}°00′`:`${g}°${String(m).padStart(2,"0")}′`}
function declinacionTexto(n){return`${n<0?'S':'N'} ${gradoMin(n)}`}
function fuerza(dif,orbe,velRel){
  const proporcion=orbe?dif/orbe:1;
  const nivel=dif<=1?"Partil":proporcion<=.25?"Muy fuerte":proporcion<=.5?"Fuerte":"Moderado";
  const ritmo=Math.abs(velRel)>=8?"rápido":Math.abs(velRel)>=1?"medio":"lento";
  return{nivel,ritmo,proporcion};
}
function cuerposDe(carta,E){
  if(!E||typeof E.posGeo!=="function"||typeof E.ecuatorial!=="function"||typeof E.velocidad!=="function"||typeof E.sigTT!=="function")
    throw new TypeError("El motor astronómico no ofrece longitud, latitud, declinación y velocidad.");
  const porId=Object.fromEntries((carta.cuerpos||[]).filter(c=>c&&Number.isFinite(c.lon)).map(c=>[c.id,c])),T=E.sigTT(carta.ms);
  return IDS.filter(id=>porId[id]).map(id=>{
    const base=porId[id],pos=E.posGeo(id,T),eq=E.ecuatorial(pos.lon,pos.lat,T),velocidad=E.velocidad(id,carta.ms);
    return{id,nombre:base.nombre||id,glifo:base.glifo||"",color:base.color||"#8A6A22",lon:mod(base.lon),latitud:pos.lat,declinacion:eq.dec,velocidad};
  });
}
function aspectoEntre(a,b,factor=1){
  const d=separacion(a.lon,b.lon),luminaria=["sol","luna"].includes(a.id)||["sol","luna"].includes(b.id);
  for(const asp of ASPECTOS){const orbe=(asp.orbe+(luminaria?2:0))*factor,dif=Math.abs(d-asp.angulo);if(dif<=orbe)return{...asp,orbe,dif}}
  return null;
}
function estadoAspecto(a,b,asp){
  const delta=diferenciaDirigida(a.lon,b.lon),signo=delta<0?-1:1,objetivo=asp.angulo===0?0:asp.angulo===180?signo*180:signo*asp.angulo;
  const error=delta-objetivo,velRel=b.velocidad-a.velocidad;
  if(asp.dif<=1/60)return{estado:"Exacto",velocidadRelativa:velRel,error};
  if(Math.abs(velRel)<.01)return{estado:"Casi estacionario",velocidadRelativa:velRel,error};
  return{estado:error*velRel<0?"Aplicativo":"Separativo",velocidadRelativa:velRel,error};
}
function aspectosDinamicos(cuerpos,factor=1){
  const salida=[];
  for(let i=0;i<cuerpos.length;i++)for(let j=i+1;j<cuerpos.length;j++){
    const A=cuerpos[i],B=cuerpos[j],asp=aspectoEntre(A,B,factor);if(!asp)continue;
    const estado=estadoAspecto(A,B,asp),potencia=fuerza(asp.dif,asp.orbe,estado.velocidadRelativa);
    salida.push({A,B,aspecto:asp,estado:estado.estado,velocidadRelativa:estado.velocidadRelativa,fuerza:potencia});
  }
  const orden={Exacto:0,Aplicativo:1,"Casi estacionario":2,Separativo:3};
  return salida.sort((x,y)=>orden[x.estado]-orden[y.estado]||x.aspecto.dif-y.aspecto.dif);
}
function relacionesDeclinacion(cuerpos,oblicuidad){
  const contactos=[];
  for(let i=0;i<cuerpos.length;i++)for(let j=i+1;j<cuerpos.length;j++){
    const A=cuerpos[i],B=cuerpos[j],mismo=A.declinacion*B.declinacion>=0,dif=mismo?Math.abs(A.declinacion-B.declinacion):Math.abs(Math.abs(A.declinacion)-Math.abs(B.declinacion));
    if(dif<=ORBE_DECLINACION)contactos.push({A,B,tipo:mismo?"Paralelo":"Contraparalelo",orbe:dif});
  }
  const fueraLimites=cuerpos.filter(c=>Math.abs(c.declinacion)>oblicuidad).map(c=>({...c,exceso:Math.abs(c.declinacion)-oblicuidad,limitrofe:Math.abs(c.declinacion)-oblicuidad<=.25})).sort((a,b)=>b.exceso-a.exceso);
  return{contactos:contactos.sort((a,b)=>a.orbe-b.orbe),fueraLimites,oblicuidad};
}
function relacionesAntiscios(cuerpos){
  const salida=[];
  for(let i=0;i<cuerpos.length;i++)for(let j=i+1;j<cuerpos.length;j++){
    const A=cuerpos[i],B=cuerpos[j],anti=mod(180-A.lon),contra=mod(360-A.lon),da=separacion(B.lon,anti),dc=separacion(B.lon,contra);
    if(da<=ORBE_ANTISCIO)salida.push({A,B,tipo:"Antiscio",punto:anti,orbe:da});
    if(dc<=ORBE_ANTISCIO)salida.push({A,B,tipo:"Contraantiscio",punto:contra,orbe:dc});
  }
  return salida.sort((a,b)=>a.orbe-b.orbe);
}
function puntoMedio(a,b){const d=diferenciaDirigida(a,b),directo=mod(a+d/2);return{directo,opuesto:mod(directo+180)}}
function cuadrosPuntoMedio(cuerpos){
  const salida=[];
  for(let i=0;i<cuerpos.length;i++)for(let j=i+1;j<cuerpos.length;j++){
    const A=cuerpos[i],B=cuerpos[j],p=puntoMedio(A.lon,B.lon);
    for(let k=0;k<cuerpos.length;k++){
      if(k===i||k===j)continue;const C=cuerpos[k],directo=separacion(C.lon,p.directo),opuesto=separacion(C.lon,p.opuesto),orbe=Math.min(directo,opuesto);
      if(orbe<=ORBE_PUNTO_MEDIO)salida.push({A,B,C,punto:p.directo,tipo:directo<=opuesto?"Conjunción":"Oposición",orbe});
    }
  }
  return salida.sort((a,b)=>a.orbe-b.orbe);
}
function conexionesClave(carta,cuerpos,factor=1){
  const porId=Object.fromEntries(cuerpos.map(c=>[c.id,c])),referencias=[];
  for(const id of ["sol","luna"])if(porId[id])referencias.push({...porId[id],tipo:"luminaria"});
  if(carta.datos?.horaConocida&&carta.ang){
    referencias.push({id:"asc",nombre:"Ascendente",glifo:"AC",lon:mod(carta.ang.asc),tipo:"angulo"});
    referencias.push({id:"mc",nombre:"Medio Cielo",glifo:"MC",lon:mod(carta.ang.mc),tipo:"angulo"});
  }
  const salida=[],vistos=new Set();
  for(const ref of referencias)for(const cuerpo of cuerpos){
    if(ref.id===cuerpo.id)continue;const ids=[ref.id,cuerpo.id].sort(),clave=ids.join("|");if(vistos.has(clave))continue;vistos.add(clave);
    const asp=aspectoEntre(ref,cuerpo,factor);if(asp)salida.push({referencia:ref,cuerpo,aspecto:asp});
  }
  return salida.sort((a,b)=>a.aspecto.dif-b.aspecto.dif);
}
function analizar(carta,E=root.Efem){
  if(!carta||!Array.isArray(carta.cuerpos)||!Number.isFinite(carta.ms))throw new TypeError("Falta una carta natal calculada.");
  const cuerpos=cuerposDe(carta,E),factor=Number.isFinite(carta.datos?.factorOrbe)?carta.datos.factorOrbe:1,T=E.sigTT(carta.ms),oblicuidad=E.oblicuidad(T)+E.nutacion(T).deps;
  const dinamicos=aspectosDinamicos(cuerpos,factor),declinacion=relacionesDeclinacion(cuerpos,oblicuidad),antiscios=relacionesAntiscios(cuerpos),puntosMedios=cuadrosPuntoMedio(cuerpos),conexiones=conexionesClave(carta,cuerpos,factor);
  const cuentaEstado=estado=>dinamicos.filter(x=>x.estado===estado).length;
  return{cuerpos,factor,dinamicos,declinacion,antiscios,puntosMedios,conexiones,resumen:{aplicativos:cuentaEstado("Aplicativo"),separativos:cuentaEstado("Separativo"),exactos:cuentaEstado("Exacto"),partiles:dinamicos.filter(x=>x.fuerza.nivel==="Partil").length,paralelos:declinacion.contactos.length,fueraLimites:declinacion.fueraLimites.length,limitrofes:declinacion.fueraLimites.filter(x=>x.limitrofe).length,antiscios:antiscios.length,puntosMedios:puntosMedios.length},criterio:{
    dinamica:"Aplicativo o separativo se obtiene del error angular y de la velocidad geocéntrica relativa en el instante natal. Exacto: diferencia de hasta 0°01′.",
    fuerza:"La fuerza compara el orbe real con el máximo configurado: partil hasta 1°; muy fuerte hasta 25 %, fuerte hasta 50 % y moderado después. El ritmo usa la velocidad relativa.",
    declinacion:`Paralelo o contraparalelo con orbe máximo de ${ORBE_DECLINACION}°. Fuera de límites cuando la declinación supera la oblicuidad verdadera de la fecha (${gradoMin(oblicuidad)}). Un exceso de hasta 0°15′ se marca limítrofe por la precisión aproximada del motor.`,
    antiscios:`Antiscio y contraantiscio con orbe fijo de ${ORBE_ANTISCIO}°, reflejados sobre el eje solsticial Cáncer-Capricornio.`,
    puntosMedios:`Sólo se muestran cuadros relevantes: un tercer cuerpo en conjunción u oposición al eje de un punto medio, con orbe máximo de ${ORBE_PUNTO_MEDIO}°.`, 
    alcance:"Son relaciones geométricas de apoyo. No añaden dignidad esencial, no prueban por sí solas un resultado y se interpretan dentro del conjunto de la carta."
  }};
}

root.NatalRelaciones={IDS,ASPECTOS,ORBE_DECLINACION,ORBE_ANTISCIO,ORBE_PUNTO_MEDIO,mod,separacion,diferenciaDirigida,gradoMin,declinacionTexto,fuerza,cuerposDe,aspectoEntre,estadoAspecto,aspectosDinamicos,relacionesDeclinacion,relacionesAntiscios,puntoMedio,cuadrosPuntoMedio,conexionesClave,analizar};
})(typeof window!=="undefined"?window:globalThis);

