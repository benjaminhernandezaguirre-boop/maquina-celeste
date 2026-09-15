'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const {createHash}=require('node:crypto');
const raiz=path.resolve(__dirname,'..');
const archivo=path.join(raiz,'api/ciudades.js');
const requerir=createRequire(archivo);
const manifest=require('../app/datos/ciudades-manifest.json');
const fuente=fs.readFileSync(archivo,'utf8');
const datos=fs.readFileSync(path.join(raiz,'app/datos',manifest.archivo));
const catalogo=JSON.parse(datos);
const motor=require('../app/ciudades-motor.js').crear(catalogo);

function entorno(opciones={}){
  let lecturas=0,busquedas=0;
  const modulo={exports:{}};
  const contexto={module:modulo,URL,Buffer,process:{cwd:()=>raiz},require:n=>{
    if(n==='node:fs/promises')return{readFile:async ruta=>{
      lecturas++;assert.equal(ruta,path.join(raiz,'app/datos',manifest.archivo));
      if(opciones.fallaPrimera&&lecturas===1)throw Error('fallo simulado');
      return opciones.corrupto?Buffer.from('{}'):datos;
    }};
    if(n==='../app/ciudades-motor.js')return{normaliza:requerir(n).normaliza,crear:()=>({
      buscar:q=>{busquedas++;return motor.buscar(q);},resolver:q=>motor.resolver(q)
    })};
    return requerir(n);
  }};
  vm.runInNewContext(fuente,contexto,{filename:archivo});
  async function pedir(tipo='buscar',q='Tulum',extra={}){
    const headers={};let body='';
    const req={method:extra.method||'GET',url:extra.url||'/api/ciudades?'+new URLSearchParams({tipo,q,v:extra.version||manifest.sha256})};
    const res={setHeader:(k,v)=>headers[k.toLowerCase()]=v,end:s=>{body=s||'';}};
    await modulo.exports(req,res);
    return{status:res.statusCode,headers,body,json:body?JSON.parse(body):null};
  }
  return{pedir,lecturas:()=>lecturas,busquedas:()=>busquedas};
}

test('la API conserva nombres, alias, homónimos globales, coordenadas y zonas IANA del motor',async()=>{
  const e=entorno();
  for(const q of ['Tulum','Coatzacoalcos','São Paulo','Kathmandu','Mérida','Córdoba','San José','東京','a']){
    for(const tipo of ['buscar','resolver']){
      const r=await e.pedir(tipo,q);
      assert.equal(r.status,200);
      assert.deepEqual(r.json.resultado,motor[tipo](q));
      assert.equal(r.json.version,manifest.sha256);
      assert.ok(Buffer.byteLength(r.body)<30000,'la respuesta no contiene el catálogo');
    }
  }
  for(const [etiqueta] of catalogo.aliases.slice(0,30)){
    assert.deepEqual((await e.pedir('resolver',etiqueta)).json.resultado,motor.resolver(etiqueta));
  }
  const ambiguo=await e.pedir('resolver','San José');
  assert.ok(ambiguo.json.resultado.total>40);
  assert.equal(ambiguo.json.resultado.ciudad,null);
  assert.equal(ambiguo.json.resultado.coincidencias.length,40);
  assert.equal(e.lecturas(),1);
});

test('consultas vacías, inválidas y versiones antiguas no abren el catálogo',async()=>{
  const e=entorno();
  assert.deepEqual((await e.pedir('buscar',' ')).json.resultado,[]);
  assert.equal((await e.pedir('resolver','')).json.resultado.total,0);
  assert.equal((await e.pedir('buscar','X',{version:'anterior'})).status,409);
  assert.equal((await e.pedir('explorarLinea')).status,400);
  assert.equal((await e.pedir('buscar','x'.repeat(257))).status,400);
  for(const url of ['/api/ciudades','/api/ciudades?tipo=buscar&q=x&v='+manifest.sha256+'&q=y','/api/ciudades?tipo=buscar&q=x&v='+manifest.sha256+'&nombre=Persona']){
    assert.equal((await e.pedir('buscar','x',{url})).status,400);
  }
  const post=await e.pedir('buscar','X',{method:'POST'});
  assert.equal(post.status,405);assert.equal(post.headers.allow,'GET, HEAD');
  assert.equal(post.headers['cache-control'],'no-store');
  assert.equal(e.lecturas(),0);
});

test('carga concurrente única, normalización compartida y caché LRU acotada',async()=>{
  const e=entorno();
  await Promise.all([e.pedir('buscar','MÉRIDA'),e.pedir('resolver','Córdoba')]);
  assert.equal(e.lecturas(),1);
  const antes=e.busquedas();
  await e.pedir('buscar',' merida ');assert.equal(e.busquedas(),antes);
  for(let i=0;i<129;i++)await e.pedir('buscar','localidad inexistente '+i);
  const despues=e.busquedas();
  await e.pedir('buscar','Mérida');assert.equal(e.busquedas(),despues+1,'la entrada antigua salió de la LRU');
  assert.equal(e.lecturas(),1);
});

test('fallos de lectura permiten reintento y un catálogo corrupto no entrega resultados',async()=>{
  const e=entorno({fallaPrimera:true});
  const fallo=await e.pedir();
  assert.equal(fallo.status,503);assert.equal(fallo.headers['cache-control'],'no-store');
  assert.doesNotMatch(fallo.body,/simulado|Users|datos/);
  assert.equal((await e.pedir()).status,200);assert.equal(e.lecturas(),2);
  assert.equal((await entorno({corrupto:true}).pedir()).status,503);
  assert.equal(createHash('sha256').update(datos).digest('hex'),manifest.sha256);
});

test('respuestas públicas versionadas se cachean y HEAD conserva cabeceras sin cuerpo',async()=>{
  const e=entorno(),get=await e.pedir(),head=await e.pedir('buscar','Tulum',{method:'HEAD'});
  assert.equal(get.headers['cache-control'],'public, max-age=300, s-maxage=86400');
  assert.equal(get.headers['x-robots-tag'],'noindex');
  assert.equal(get.headers['content-length'],Buffer.byteLength(get.body));
  assert.deepEqual(head.headers,get.headers);assert.equal(head.status,200);assert.equal(head.body,'');
});
