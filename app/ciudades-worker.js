'use strict';
importScripts('ciudades-motor.js?v=20260915-localidades');
let manifiesto=null,cargaManifiesto=null,refresco=null,cargaGeo=null,geo=null;
let revision=0,ultimaVersion=null;
const caches={buscar:new Map(),resolver:new Map()},consultas=new Map();
const versionObsoleta=()=>Error('El catálogo de ciudades se ha actualizado. Vuelve a intentarlo.');

function validarManifiesto(m){
  if(!m||typeof m.archivo!=='string'||!/^ciudades-\d{4}-\d{2}-\d{2}\.json$/.test(m.archivo)||
    typeof m.sha256!=='string'||!/^[a-f0-9]{64}$/.test(m.sha256)||typeof m.version!=='string'||
    !Number.isSafeInteger(m.total)||m.total<0||typeof m.fuente!=='string')throw Error('Versión del catálogo inválida.');
  return m;
}
function manifest(){
  if(manifiesto)return Promise.resolve(manifiesto);
  if(!cargaManifiesto)cargaManifiesto=fetch('datos/ciudades-manifest.json',{cache:'no-cache'}).then(r=>{
    if(!r.ok)throw Error('No se pudo consultar la versión del catálogo.');return r.json();
  }).then(m=>{
    manifiesto=validarManifiesto(m);
    if(ultimaVersion!==m.sha256){ultimaVersion=m.sha256;revision++;}
    return manifiesto;
  }).finally(()=>{cargaManifiesto=null;});
  return cargaManifiesto;
}
function actualizarManifest(version){
  if(manifiesto&&manifiesto.sha256!==version)return Promise.resolve(manifiesto);
  if(!refresco){
    manifiesto=null;
    refresco=manifest().then(m=>{
      if(m.sha256!==version){caches.buscar.clear();caches.resolver.clear();}
      return m;
    }).finally(()=>{refresco=null;});
  }
  return refresco;
}
function ciudadValida(c){
  return c&&Number.isSafeInteger(c.id)&&c.id!==0&&typeof c.n==='string'&&!!c.n&&
    typeof c.r==='string'&&typeof c.tz==='string'&&!!c.tz&&
    Number.isFinite(c.lat)&&Math.abs(c.lat)<=90&&Number.isFinite(c.lon)&&Math.abs(c.lon)<=180&&
    c.etiqueta===c.n+', '+c.r;
}
function validarRespuesta(datos,tipo,version){
  const r=datos?.resultado;
  const lista=tipo==='buscar'?r:r?.coincidencias;
  let valida=datos?.version===version&&Array.isArray(lista)&&lista.length<=40&&lista.every(ciudadValida)&&new Set(lista.map(c=>c.id)).size===lista.length;
  if(tipo==='resolver')valida=valida&&Number.isSafeInteger(r.total)&&r.total>=0&&
    lista.length===Math.min(r.total,40)&&r.ambiguas===(r.total>1)&&
    (r.total===1?ciudadValida(r.ciudad)&&r.ciudad.id===lista[0].id:r.ciudad===null);
  if(!valida)throw Error('La respuesta del buscador de ciudades no es válida. Vuelve a intentarlo.');
  return r;
}
function recuerda(cache,clave,resultado){
  cache.delete(clave);cache.set(clave,resultado);
  while(cache.size>64)cache.delete(cache.keys().next().value);
}
async function consultarAPI(tipo,q,m,reintento=false){
  const ruta='/api/ciudades?tipo='+tipo+'&q='+encodeURIComponent(q)+'&v='+m.sha256;
  const r=await fetch(ruta);
  if(r.status===409){
    if(reintento)throw Error('El catálogo de ciudades se está actualizando. Vuelve a intentarlo.');
    return consultarAPI(tipo,q,await actualizarManifest(m.sha256),true);
  }
  if(!r.ok)throw Error('No se pudo consultar el buscador de ciudades. Vuelve a intentarlo o usa coordenadas manuales.');
  const resultado=validarRespuesta(await r.json(),tipo,m.sha256);
  if((await manifest()).sha256!==m.sha256)throw versionObsoleta();
  recuerda(caches[tipo],m.sha256+'|'+q,resultado);
  return{version:m.sha256,resultado};
}
async function consultar(tipo,texto){
  const q=CiudadesMotor.normaliza(texto);
  const m=await manifest();
  if(!q)return{version:m.sha256,resultado:tipo==='buscar'?[]:{ciudad:null,ambiguas:false,coincidencias:[],total:0}};
  if(geo?.version===m.sha256)return{version:m.sha256,resultado:geo.motor[tipo](q)};
  const clave=m.sha256+'|'+q,cache=caches[tipo];
  if(cache.has(clave)){const r=cache.get(clave);recuerda(cache,clave,r);return{version:m.sha256,resultado:r};}
  const id=tipo+'|'+clave;
  if(!consultas.has(id)){
    const promesa=consultarAPI(tipo,q,m).finally(()=>{consultas.delete(id);});
    consultas.set(id,promesa);
  }
  return consultas.get(id);
}

// La exploración mundial necesita todas las coordenadas. Solo esa acción
// descarga el catálogo; buscar/resolver reutilizan el motor una vez disponible.
async function motorGeografico(){
  const m=await manifest();
  if(geo?.version===m.sha256)return geo;
  if(!cargaGeo)cargaGeo=fetch('datos/'+m.archivo+'?v='+m.sha256).then(async r=>{
    if(!r.ok)throw Error('No se pudo descargar el catálogo de ciudades.');
    const bytes=await r.arrayBuffer();
    const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
    if(hash!==m.sha256)throw Error('La versión del catálogo descargado no coincide. Vuelve a intentarlo.');
    return JSON.parse(new TextDecoder().decode(bytes));
  }).then(d=>({version:m.sha256,motor:CiudadesMotor.crear(d)})).then(cargado=>{
    geo=cargado;return cargado;
  }).finally(()=>{cargaGeo=null;});
  const cargado=await cargaGeo;
  if(cargado.version!==manifiesto?.sha256)return motorGeografico();
  return cargado;
}
self.onmessage=async function({data}){
  const {id,tipo,texto,a,eje,opciones}=data;
  try{
    let paquete;
    if(tipo==='carga'){
      const m=await manifest();paquete={version:m.sha256,resultado:{total:m.total,version:m.version,fuente:m.fuente,zonas:m.zonas}};
    }else if(tipo==='buscar'||tipo==='resolver')paquete=await consultar(tipo,texto);
    else if(tipo==='cercanasLinea'||tipo==='explorarLinea'){
      const cargado=await motorGeografico(),m=cargado.motor;
      if(!self.AstroGeo)importScripts('astrocartografia.js?v=20260915');
      paquete={version:cargado.version,resultado:tipo==='explorarLinea'?m.explorarLinea(a,eje,opciones,self.AstroGeo):m.cercanasLinea(a,eje,self.AstroGeo)};
    }else throw Error('Consulta de ciudades no válida.');
    await manifest();
    if(paquete.version!==manifiesto?.sha256)throw versionObsoleta();
    self.postMessage({id,...paquete,revision});
  }catch(e){self.postMessage({id,version:manifiesto?.sha256,revision,error:e.message||'No se pudo consultar el catálogo.'});}
};
