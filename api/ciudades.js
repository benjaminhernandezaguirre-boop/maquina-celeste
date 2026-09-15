'use strict';
// Public GeoNames search. Birth dates, names of chart owners and chart data
// never enter this endpoint. The exact same engine also serves the map Worker.
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {crear,normaliza}=require('../app/ciudades-motor.js');
const manifest=require('../app/datos/ciudades-manifest.json');
const VERSION=manifest.sha256,TOPE_CACHE=128;
const cache=new Map();
let motorPendiente=null;

function motor(){
  if(!motorPendiente)motorPendiente=(async()=>{
    if(!/^ciudades-\d{4}-\d{2}-\d{2}\.json$/.test(manifest.archivo)||!/^[a-f0-9]{64}$/.test(VERSION))throw Error('Catálogo no válido.');
    const bytes=await readFile(path.join(process.cwd(),'app','datos',manifest.archivo));
    if(createHash('sha256').update(bytes).digest('hex')!==VERSION)throw Error('Versión del catálogo no válida.');
    return crear(JSON.parse(bytes.toString('utf8')));
  })().catch(error=>{motorPendiente=null;throw error;});
  return motorPendiente;
}

function respuesta(req,res,status,datos,publica=false){
  res.statusCode=status;
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Robots-Tag','noindex');
  res.setHeader('Cache-Control',publica?'public, max-age=300, s-maxage=86400':'no-store');
  res.setHeader('X-Ciudades-Version',VERSION);
  const body=typeof datos==='string'?datos:JSON.stringify(datos);
  res.setHeader('Content-Length',Buffer.byteLength(body));
  res.end(req.method==='HEAD'?undefined:body);
}

module.exports=async function ciudades(req,res){
  if(!['GET','HEAD'].includes(req.method)){
    res.setHeader('Allow','GET, HEAD');
    return respuesta(req,res,405,{error:'Método no permitido.'});
  }
  let params;
  try{params=new URL(req.url,'https://astroplanetario.com').searchParams;}catch{
    return respuesta(req,res,400,{error:'Consulta no válida.'});
  }
  if([...params.keys()].some(k=>!['tipo','q','v'].includes(k))||['tipo','q','v'].some(k=>params.getAll(k).length!==1)){
    return respuesta(req,res,400,{error:'Consulta no válida.'});
  }
  const tipo=params.get('tipo'),texto=params.get('q');
  if(!['buscar','resolver'].includes(tipo)||texto.length>256){
    return respuesta(req,res,400,{error:'Escribe una ciudad con su región o país (hasta 256 caracteres).'});
  }
  if(params.get('v')!==VERSION){
    return respuesta(req,res,409,{error:'El catálogo se ha actualizado. Vuelve a buscar.',version:VERSION});
  }
  const q=normaliza(texto);
  if(!q)return respuesta(req,res,200,{version:VERSION,resultado:tipo==='buscar'?[]:{ciudad:null,ambiguas:false,coincidencias:[],total:0}},true);
  const clave=tipo+'|'+q;
  let body=cache.get(clave);
  if(body){cache.delete(clave);cache.set(clave,body);return respuesta(req,res,200,body,true);}
  try{
    const m=await motor();
    // Resolver keeps the global ambiguity count, even when more than 40 places
    // share a name. Never choose a city merely from the visible suggestions.
    body=JSON.stringify({version:VERSION,resultado:m[tipo](q)});
    cache.set(clave,body);
    while(cache.size>TOPE_CACHE)cache.delete(cache.keys().next().value);
    return respuesta(req,res,200,body,true);
  }catch{
    return respuesta(req,res,503,{error:'No se pudo consultar el buscador de ciudades. Inténtalo de nuevo.'});
  }
};
