/* Fachada ligera GeoNames CC BY 4.0. El catálogo vive en el Worker.
   lista contiene sólo hasta 256 resultados recientes; resolverAsync resuelve
   entrada escrita contra el catálogo mundial, no contra esta caché parcial. */
(function(root){
'use strict';
const VERSION='20260915';
const normaliza=t=>String(t||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const base=new URL('.',document.currentScript?.src||new URL('/app/ciudades.js',document.baseURI));
const lista=[],etiquetas=new Map(),consultas=new Map(),pendientes=new Map();
let worker=null,secuencia=0,promesa=null,meta=null;
const vacio=()=>({ciudad:null,ambiguas:false,coincidencias:[],total:0});
function fallo(error){
  if(worker)worker.terminate();worker=null;promesa=null;meta=null;
  for(const p of pendientes.values()){clearTimeout(p.timer);p.reject(error);}pendientes.clear();
}
function canal(){
  if(worker)return worker;
  if(!root.Worker)throw Error('Este navegador no permite la búsqueda de ciudades. Puedes usar coordenadas y zona horaria manuales.');
  worker=new Worker(new URL('ciudades-worker.js?v='+VERSION,base));
  worker.onmessage=({data})=>{const p=pendientes.get(data.id);if(!p)return;pendientes.delete(data.id);clearTimeout(p.timer);data.error?p.reject(new Error(data.error)):p.resolve(data.resultado);};
  worker.onerror=()=>fallo(new Error('No se pudo iniciar el buscador de ciudades. Vuelve a intentarlo.'));
  worker.onmessageerror=()=>fallo(new Error('No se pudo leer la respuesta del buscador.'));
  return worker;
}
function peticion(tipo,datos={}){
  return new Promise((resolve,reject)=>{
    let w;try{w=canal();}catch(e){reject(e);return;}
    const id=++secuencia,timer=setTimeout(()=>fallo(new Error('La descarga de ciudades está tardando demasiado. Revisa tu conexión e inténtalo de nuevo.')),60000);
    pendientes.set(id,{resolve,reject,timer});w.postMessage({id,tipo,...datos});
  });
}
function carga(){
  if(meta)return Promise.resolve(meta);
  if(!promesa)promesa=peticion('carga').then(m=>(meta=m)).catch(e=>{promesa=null;throw e;});
  return promesa;
}
function recuerda(ciudades){
  for(const c of ciudades){const k=normaliza(c.etiqueta);etiquetas.delete(k);etiquetas.set(k,c);}
  while(etiquetas.size>256)etiquetas.delete(etiquetas.keys().next().value);
  lista.splice(0,lista.length,...etiquetas.values());
}
function resolver(texto){const k=normaliza(texto);if(consultas.has(k))return consultas.get(k);const c=etiquetas.get(k);return c?{ciudad:c,ambiguas:false,coincidencias:[c],total:1}:vacio();}
async function resolverAsync(texto){
  if(!normaliza(texto))return vacio();
  const guardada=resolver(texto);if(guardada.ciudad||guardada.ambiguas)return guardada;
  await carga();const r=await peticion('resolver',{texto:String(texto)});recuerda(r.coincidencias);
  consultas.set(normaliza(texto),r);while(consultas.size>64)consultas.delete(consultas.keys().next().value);return r;
}
async function buscar(texto){if(!normaliza(texto))return [];await carga();const r=await peticion('buscar',{texto:String(texto)});recuerda(r);return r;}
async function cercanasLinea(a,eje){await carga();const r=await peticion('cercanasLinea',{a:{lonMC:a.lonMC,dec:a.dec},eje});recuerda(r.map(x=>x.c));return r;}
root.Ciudades={lista,normaliza,resolver,resolverAsync,buscar,carga,cercanasLinea,listo:()=>!!meta,version:'2026-09-15',fuente:'GeoNames cities500'};
})(typeof window!=='undefined'?window:globalThis);
