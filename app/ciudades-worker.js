'use strict';
importScripts('ciudades-motor.js?v=20260915-localidades');
let carga=null;
function motor(){
  if(!carga)carga=fetch('datos/ciudades-manifest.json',{cache:'no-cache'}).then(r=>{
    if(!r.ok)throw Error('No se pudo consultar la versión del catálogo.');return r.json();
  }).then(m=>{
    if(!/^ciudades-\d{4}-\d{2}-\d{2}\.json$/.test(m.archivo))throw Error('Versión del catálogo inválida.');
    return fetch('datos/'+m.archivo);
  }).then(r=>{
    if(!r.ok)throw Error('No se pudo descargar el catálogo de ciudades.');return r.json();
  }).then(d=>CiudadesMotor.crear(d)).catch(e=>{carga=null;throw e;});
  return carga;
}
self.onmessage=async function({data}){
  const {id,tipo,texto,a,eje,opciones}=data;
  try{
    const m=await motor();let resultado;
    if(tipo==='carga')resultado=m.meta;
    else if(tipo==='buscar')resultado=m.buscar(texto);
    else if(tipo==='resolver')resultado=m.resolver(texto);
    else if(tipo==='cercanasLinea'||tipo==='explorarLinea'){
      if(!self.AstroGeo)importScripts('astrocartografia.js?v=20260915');
      resultado=tipo==='explorarLinea'?m.explorarLinea(a,eje,opciones,self.AstroGeo):m.cercanasLinea(a,eje,self.AstroGeo);
    }else throw Error('Consulta de ciudades no válida.');
    self.postMessage({id,resultado});
  }catch(e){self.postMessage({id,error:e.message||'No se pudo consultar el catálogo.'});}
};
