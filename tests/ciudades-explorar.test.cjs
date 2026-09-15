'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {crear}=require('../app/ciudades-motor.js');
const Geo=require('../app/astrocartografia.js');
const raiz=path.join(__dirname,'..');
const linea={lonMC:0,dec:20};
function muestra(){
  const regiones=['Norte, México (MX)','Sur, México (MX)','Municipio, Norte, México (MX) · GeoNames 901','Comunidad, España (ES)','Hokkaidō, Japón (JP)','Canadá (CA)','China (CN)','China','Sonora, MX','Isla, Región de Hong Kong (China) (HK)'];
  const filas=[];
  for(let i=0;i<30;i++)filas.push([i+1,'México '+String(i).padStart(2,'0'),i<15?0:1,0,(i+1)/100,0,100,'']);
  for(let i=0;i<20;i++)filas.push([101+i,'España '+i,3,0,(i+1)/100+.001,0,100,'']);
  for(let i=0;i<4;i++)filas.push([201+i,'Japón '+i,4,0,(i+1)/100+.002,0,100,'']);
  filas.push([901,'Norte desambiguado',2,0,.5,0,1,''],[902,'Canadá distante',5,0,90,0,1,''],[903,'China actual',6,0,1,0,1,''],[904,'China heredada',7,0,2,0,1,''],[905,'Sonora heredada',8,0,3,0,1,''],[906,'Hong Kong',9,0,4,0,1,'']);
  return {version:'prueba',regiones,zonas:['UTC'],filas};
}

test('la exploración mundial intercala países y pagina todas las localidades sin duplicar',()=>{
  const d=muestra(),m=crear(d),opciones={radioKm:null,limite:7};
  const primera=m.explorarLinea(linea,'MC',opciones,Geo);
  assert.equal(primera.total,d.filas.length);assert.equal(primera.pagina,1);assert.equal(primera.paginas,Math.ceil(d.filas.length/7));
  assert.deepEqual(primera.filas.slice(0,6).map(f=>f.c.pais),['MX','ES','JP','CN','HK','CA']);
  assert.equal(primera.regiones.length,0);
  const todas=[];
  for(let pagina=1;pagina<=primera.paginas;pagina++)todas.push(...m.explorarLinea(linea,'MC',{...opciones,pagina},Geo).filas);
  assert.equal(new Set(todas.map(f=>f.c.id)).size,d.filas.length);
  assert.deepEqual(todas.map(f=>f.c.id).sort((a,b)=>a-b),d.filas.map(f=>f[0]).sort((a,b)=>a-b));
  for(const pais of primera.paises){
    const grupo=todas.filter(f=>f.c.pais===pais.codigo);
    assert.equal(grupo.length,pais.total);
    assert.ok(grupo.every((f,i)=>!i||f.km>=grupo[i-1].km),'cada país mantiene su orden por distancia');
  }
});

test('país, región y radio filtran con recuentos independientes y conservan países sin coincidencias',()=>{
  const m=crear(muestra()),opciones={pais:'mx',radioKm:100,limite:100};
  const r=m.explorarLinea(linea,'MC',opciones,Geo);
  assert.equal(r.pais,'MX');assert.equal(r.total,31);
  assert.ok(r.filas.every(f=>f.c.pais==='MX'&&f.km<=100));
  assert.ok(r.filas.every((f,i)=>!i||f.km>=r.filas[i-1].km));
  assert.equal(r.paises.find(p=>p.codigo==='CA').total,0);
  assert.equal(r.paises.find(p=>p.codigo==='JP').total,4);
  assert.equal(r.regiones.find(p=>p.nombre==='Sonora').total,0);
  const norte=r.regiones.find(p=>p.nombre==='Norte');assert.equal(norte.id,'0');assert.equal(norte.total,16);
  const region=m.explorarLinea(linea,'MC',{...opciones,region:'2'},Geo);
  assert.equal(region.region,'0','un índice con sufijo GeoNames normaliza a la región original');
  assert.equal(region.total,16);assert.deepEqual(region.paises,r.paises);assert.deepEqual(region.regiones,r.regiones);
  assert.equal(region.filas.filter(f=>f.c.id===901).length,1);
  assert.ok(region.filas.find(f=>f.c.id===901).c.etiqueta.includes('Municipio, Norte'),'la agrupación preserva la identidad completa de la ciudad');
});

test('los países y subdivisiones se extraen también de códigos, nombres heredados y paréntesis internos',()=>{
  const m=crear(muestra()),china=m.explorarLinea(linea,'MC',{pais:'CN',radioKm:null},Geo);
  assert.equal(china.total,2);assert.equal(china.regiones.length,1);
  assert.equal(china.regiones[0].nombre,'Sin región especificada');
  assert.ok(china.filas.every(f=>f.c.paisNombre==='China'));
  const mexico=m.explorarLinea(linea,'MC',{pais:'MX',region:'8',radioKm:null},Geo);
  assert.equal(mexico.total,1);assert.equal(mexico.filas[0].c.id,905);
  const hk=m.explorarLinea(linea,'MC',{pais:'HK',radioKm:null},Geo);
  assert.equal(hk.filas[0].c.paisNombre,'Región de Hong Kong (China)');assert.equal(hk.regiones[0].nombre,'Isla');
});

test('las distancias publicadas conservan la medida esférica, no separación de longitudes',()=>{
  const d={regiones:['Canadá (CA)'],zonas:['UTC'],filas:[[1,'Punto alto',0,60,5,0,1,''],[2,'Otra rama',0,30,180,0,1,'']]};
  const r=crear(d).explorarLinea(linea,'MC',{radioKm:null},Geo);
  const primero=r.filas.find(f=>f.c.id===1),segundo=r.filas.find(f=>f.c.id===2);
  const esperado=Geo.RADIO_KM*Math.asin(Math.cos(Math.PI/3)*Math.sin(5*Math.PI/180));
  assert.ok(Math.abs(primero.km-esperado)<1e-7);
  assert.ok(Math.abs(segundo.grados-60)<1e-8);
});

test('paginación, tamaños y filtros inválidos se normalizan sin resultados no finitos',()=>{
  const d=muestra(),m=crear(d),r=m.explorarLinea(linea,'MC',{pais:'NOEXISTE',region:'999999',radioKm:null,pagina:1e9,limite:999999},Geo);
  assert.equal(r.pais,'');assert.equal(r.region,'');assert.equal(r.limite,100);assert.equal(r.pagina,1);
  const vacio=m.explorarLinea(linea,'MC',{pais:'MX',region:'4',radioKm:-8,pagina:-2,limite:0},Geo);
  assert.equal(vacio.radioKm,0);assert.equal(vacio.region,'');assert.equal(vacio.limite,1);assert.equal(vacio.total,0);assert.equal(vacio.pagina,1);assert.equal(vacio.paginas,0);
  const normal=m.explorarLinea(linea,'MC',{radioKm:NaN,limite:Infinity,pagina:{},pais:{}},Geo);
  assert.equal(normal.radioKm,300);assert.equal(normal.limite,24);assert.equal(normal.pagina,1);
  for(const o of [undefined,null,[],{radioKm:{},limite:false,pagina:'abc'}])assert.doesNotThrow(()=>m.explorarLinea(linea,'MC',o,Geo));
  const defectuosa={distancia:(a,e,lat,lon)=>lon<.02?{km:NaN,grados:1}:lon<.03?{km:1,grados:Infinity}:Geo.distancia(a,e,lat,lon)};
  const validas=m.explorarLinea(linea,'MC',{radioKm:null,limite:100},defectuosa);
  assert.ok(validas.total<d.filas.length);assert.ok(validas.filas.every(f=>Number.isFinite(f.km)&&Number.isFinite(f.grados)));
  assert.throws(()=>m.explorarLinea({lonMC:0,dec:91},'MC',{},Geo),/inválida/);
  assert.throws(()=>m.explorarLinea(linea,'XX',{},Geo),/inválida/);
});

test('caché acotado conserva solo la última línea y reutiliza sus distancias entre páginas y filtros',()=>{
  const d=muestra(),m=crear(d);let calculos=0;
  const geo={distancia:(...args)=>{calculos++;return Geo.distancia(...args);}};
  m.explorarLinea(linea,'MC',{radioKm:null},geo);assert.equal(calculos,d.filas.length);
  for(const o of [{pagina:2},{pais:'MX'},{pais:'MX',region:'0'},{radioKm:1000},{radioKm:null}])m.explorarLinea(linea,'MC',o,geo);
  assert.equal(calculos,d.filas.length);
  m.explorarLinea({...linea,lonMC:360},'MC',{},geo);assert.equal(calculos,d.filas.length,'meridianos equivalentes usan la misma línea');
  m.explorarLinea(linea,'AC',{},geo);assert.equal(calculos,2*d.filas.length);
  m.explorarLinea(linea,'MC',{},geo);assert.equal(calculos,3*d.filas.length,'la línea anterior fue expulsada');
});

test('el Worker enruta filtros y paginación y devuelve solo la página con sus metadatos',async()=>{
  const d=muestra(),mensajes=[],importados=[];
  const context={console,fetch:async url=>({ok:true,json:async()=>url.includes('manifest')?{archivo:'ciudades-2026-09-15.json'}:d})};
  context.self=context;context.globalThis=context;context.postMessage=m=>mensajes.push(m);
  vm.createContext(context);
  context.importScripts=(...nombres)=>{for(const n of nombres){importados.push(n);vm.runInContext(fs.readFileSync(path.join(raiz,'app',n.split('?')[0]),'utf8'),context);}};
  vm.runInContext(fs.readFileSync(path.join(raiz,'app/ciudades-worker.js'),'utf8'),context);
  await context.onmessage({data:{id:7,tipo:'explorarLinea',a:linea,eje:'MC',opciones:{pais:'MX',radioKm:null,pagina:2,limite:10}}});
  assert.equal(mensajes[0].error,undefined);assert.equal(mensajes[0].resultado.pais,'MX');assert.equal(mensajes[0].resultado.pagina,2);assert.equal(mensajes[0].resultado.filas.length,10);
  assert.ok(importados.includes('ciudades-motor.js?v=20260915-localidades'));
  assert.equal(mensajes[0].resultado.paises.length,6);assert.equal(mensajes[0].resultado.total,32);
  assert.ok(!('zonas' in mensajes[0].resultado),'no se transfiere el catálogo al hilo principal');
});

test('el catálogo real ofrece sus 246 países y diversifica Sol MC entre Canadá, México y Estados Unidos',()=>{
  const d=JSON.parse(fs.readFileSync(path.join(raiz,'app/datos/ciudades-2026-09-15.json'),'utf8')),m=crear(d);
  const a={lonMC:-101.74719345947449,dec:11.912633979657139};
  const r=m.explorarLinea(a,'MC',{radioKm:300},Geo);
  assert.equal(r.paises.length,246);assert.equal(r.total,8397);assert.equal(r.filas.length,24);
  const counts=Object.fromEntries(r.paises.filter(p=>p.total).map(p=>[p.codigo,p.total]));
  assert.deepEqual(counts,{CA:110,US:897,MX:7390});
  assert.equal(new Set(r.filas.slice(0,3).map(f=>f.c.pais)).size,3);
  assert.equal(r.paises.find(p=>p.codigo==='JP').total,0);
  const mexico=m.explorarLinea(a,'MC',{pais:'MX',radioKm:300,pagina:2},Geo);
  assert.equal(mexico.total,7390);assert.equal(mexico.pagina,2);assert.ok(mexico.filas.every(f=>f.c.pais==='MX'));
  assert.equal(mexico.regiones.filter(p=>p.nombre==='Sonora').length,1,'la etiqueta heredada se agrupa con la región moderna');
  assert.equal(mexico.regiones.length,32,'los municipios de desambiguación pertenecen a su estado');
  const canada=m.explorarLinea(a,'MC',{pais:'CA',radioKm:300,limite:100},Geo);
  const sk=canada.regiones.find(p=>p.nombre==='Saskatchewan');assert.ok(sk);assert.equal(sk.total,77);
  const provincia=m.explorarLinea(a,'MC',{pais:'CA',region:sk.id,radioKm:300,limite:100},Geo);
  assert.equal(provincia.total,77);assert.ok(provincia.filas.some(f=>f.c.r.startsWith('Regina, Saskatchewan')));
});
