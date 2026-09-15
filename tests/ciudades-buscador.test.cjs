'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {createHash,webcrypto}=require('node:crypto');
const lee=n=>fs.readFileSync(path.join(__dirname,'../app/',n),'utf8');
const turno=()=>new Promise(resolve=>setImmediate(resolve));
const diferida=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const ciudad=i=>({id:i,n:'Ciudad '+i,r:'Región, País',lat:10,lon:20,tz:'Asia/Kathmandu',etiqueta:'Ciudad '+i+', Región, País'});
const resuelta=c=>({ciudad:c,ambiguas:false,coincidencias:[c],total:1});

function facade(){
  const workers=[],timers=new Map();let reloj=0;
  class Worker{
    constructor(url){this.url=String(url);this.messages=[];this.terminated=false;this.versions=new Map();workers.push(this);}
    postMessage(message){this.messages.push(message);}
    terminate(){this.terminated=true;}
    respond(message,resultado,error,version=VERSION_WORKER,revision){
      if(!this.versions.has(version))this.versions.set(version,this.versions.size+1);
      this.onmessage({data:{id:message.id,resultado,error,version,revision:revision??this.versions.get(version)}});
    }
  }
  const c={console,URL,Worker,document:{baseURI:'https://prueba.test/carta-natal',currentScript:{src:'https://prueba.test/app/ciudades.js?v=20260915'}},
    setTimeout:(fn,ms)=>{const id=++reloj;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
  c.window=c;c.globalThis=c;
  vm.createContext(c);vm.runInContext(lee('ciudades.js'),c);
  return{c,C:c.Ciudades,workers,timers};
}

test('la fachada inicia vacía y comparte una sola carga entre primeras consultas simultáneas',async()=>{
  const {c,C,workers,timers}=facade();
  vm.runInContext(lee('efemerides.js'),c);
  assert.equal(workers.length,0,'abrir la calculadora no inicia Worker ni descarga catálogo');
  assert.equal(C.lista.length,0);
  assert.equal(c.Efem.CIUDADES,C.lista,'Efem utiliza la colección viva de resultados');
  const listaOriginal=C.lista;
  const busqueda=C.buscar('Ciudad'),resolucion=C.resolverAsync('Ciudad 8'),carga=C.carga();
  assert.equal(workers.length,1);
  const w=workers[0];assert.match(w.url,/\/app\/ciudades-worker\.js\?v=/);
  assert.equal(w.messages.length,1);assert.equal(w.messages[0].tipo,'carga');
  w.respond(w.messages[0],{total:235810,version:'2026-09-15'});
  await turno();
  assert.equal(w.messages.length,3);
  w.respond(w.messages.find(m=>m.tipo==='buscar'),[ciudad(7)]);
  w.respond(w.messages.find(m=>m.tipo==='resolver'),resuelta(ciudad(8)));
  assert.equal((await busqueda)[0].id,7);
  assert.equal((await resolucion).ciudad.id,8);
  assert.equal((await carga).total,235810);
  assert.equal(C.listo(),true);
  assert.equal(C.lista,listaOriginal,'los consumidores conservan la misma referencia');
  assert.equal(C.lista.length,2);assert.equal(timers.size,0);
});

test('explorar una línea carga bajo demanda y conserva filtros, paginación y metadatos del Worker',async()=>{
  const {C,workers,timers}=facade();
  assert.equal(workers.length,0);
  const opciones={pais:'ES',region:'2855',radioKm:null,pagina:2,limite:24};
  const exploracion=C.explorarLinea({lonMC:-5.69,dec:0.3},'MC',opciones);
  assert.equal(workers.length,1);
  const w=workers[0];assert.equal(w.messages[0].tipo,'carga');
  w.respond(w.messages[0],{total:235810});await turno();
  const peticion=w.messages.find(m=>m.tipo==='explorarLinea');
  assert.ok(peticion);
  assert.deepEqual(JSON.parse(JSON.stringify(peticion.opciones)),opciones);
  assert.deepEqual(JSON.parse(JSON.stringify(peticion.a)),{lonMC:-5.69,dec:0.3});
  assert.equal(peticion.eje,'MC');
  const c=ciudad(70),resultado={filas:[{c,grados:0.05,km:5.6}],total:25,pagina:2,paginas:2,limite:24,
    paises:[{codigo:'ES',nombre:'España',total:25}],regiones:[{id:'2855',nombre:'Madrid',total:25}],radioKm:null};
  w.respond(peticion,resultado);
  assert.equal(await exploracion,resultado,'la fachada conserva filas y metadatos de navegación');
  assert.equal(C.resolver(c.etiqueta).ciudad.id,70,'una localidad mostrada queda disponible para elegirla');
  assert.equal(C.lista.length,1,'la fachada recuerda la página recibida, no todo el catálogo');
  assert.equal(timers.size,0);
});

test('un fallo de descarga rechaza todas las consultas iniciales y permite reintento',async()=>{
  const {C,workers,timers}=facade();
  const a=C.buscar('A'),b=C.resolverAsync('B');
  const falloA=assert.rejects(a,/descargar/),falloB=assert.rejects(b,/descargar/);
  workers[0].respond(workers[0].messages[0],null,'No se pudo descargar el catálogo.');
  await Promise.all([falloA,falloB]);
  assert.equal(C.listo(),false);assert.equal(C.lista.length,0);assert.equal(timers.size,0);
  const carga=C.carga(),w=workers.at(-1),mensaje=w.messages.at(-1);
  assert.equal(mensaje.tipo,'carga');w.respond(mensaje,{total:235810});
  await carga;assert.equal(C.listo(),true);
});

test('el fallo del Worker y el timeout liberan consultas pendientes y permiten reiniciar',async()=>{
  for(const evento of ['error','timeout']){
    const {C,workers,timers}=facade();
    const carga=C.carga(),w=workers[0];w.respond(w.messages[0],{total:235810});await carga;
    const a=C.buscar('A'),b=C.buscar('B');await turno();
    const errores=[assert.rejects(a),assert.rejects(b)];
    if(evento==='error')w.onerror();else [...timers.values()][0].fn();
    await Promise.all(errores);
    assert.equal(w.terminated,true);assert.equal(C.listo(),false);assert.equal(timers.size,0);
    const nueva=C.carga(),w2=workers.at(-1);assert.notEqual(w,w2);
    w2.respond(w2.messages[0],{total:235810});await nueva;
    assert.equal(C.listo(),true);
  }
});

test('el resultado seleccionado se resuelve en caché y el historial visible tiene un límite',async()=>{
  const {C,workers,timers}=facade();
  const carga=C.carga(),w=workers[0];w.respond(w.messages[0],{total:235810});await carga;
  const listaOriginal=C.lista;
  for(let pagina=0;pagina<8;pagina++){
    const p=C.buscar('pagina '+pagina);await turno();
    w.respond(w.messages.at(-1),Array.from({length:40},(_,i)=>ciudad(pagina*40+i)));
    await p;
  }
  assert.equal(C.lista.length,256);assert.equal(C.lista,listaOriginal);
  assert.equal(C.resolver(ciudad(0).etiqueta).ciudad,null,'los resultados antiguos se expulsan');
  const ultimo=ciudad(319),antes=w.messages.length;
  assert.equal((await C.resolverAsync(ultimo.etiqueta)).ciudad.id,ultimo.id);
  assert.equal(w.messages.length,antes,'elegir una sugerencia no necesita otra descarga');
  assert.equal(C.resolver('Ciudad 319').ciudad,null,'un nombre parcial no se acepta desde caché de etiquetas');
  const ambigua=C.resolverAsync('Nombre repetido');await turno();
  w.respond(w.messages.at(-1),{ciudad:null,ambiguas:true,coincidencias:[ciudad(1),ciudad(2)],total:2});
  assert.equal((await ambigua).ambiguas,true);
  assert.equal((await C.resolverAsync('Nombre repetido')).ciudad,null);
  assert.equal(timers.size,0);
});

test('cambiar de SHA vacía todas las cachés de la fachada y descarta respuestas tardías',async()=>{
  const {C,workers}=facade(),lista=C.lista,nueva='b'.repeat(64);
  const inicio=C.carga(),w=workers[0];w.respond(w.messages[0],{total:1});await inicio;
  const recordada=C.resolverAsync('Ciudad');await turno();
  w.respond(w.messages.at(-1),resuelta(ciudad(1)));await recordada;
  assert.equal(C.resolver('Ciudad').ciudad.id,1);assert.equal(C.lista.length,1);
  const vieja=C.buscar('Pendiente'),rechazo=assert.rejects(vieja,/actualizado/),actual=C.buscar('Nueva');await turno();
  const pendiente=w.messages.find(m=>m.texto==='Pendiente'),reciente=w.messages.find(m=>m.texto==='Nueva');
  w.respond(reciente,[ciudad(2)],undefined,nueva);await actual;
  assert.equal(C.lista,lista);assert.deepEqual(Array.from(C.lista,c=>c.id),[2]);
  assert.equal(C.resolver('Ciudad').ciudad,null);assert.equal(C.resolver(ciudad(1).etiqueta).ciudad,null);
  w.respond(pendiente,[ciudad(1)],undefined,VERSION_WORKER);await rechazo;
  assert.deepEqual(Array.from(C.lista,c=>c.id),[2]);
  const repetida=C.resolverAsync('Ciudad');await turno();
  assert.equal(w.messages.at(-1).tipo,'carga');w.respond(w.messages.at(-1),{total:2},undefined,nueva);await turno();
  const ambigua={ciudad:null,ambiguas:true,coincidencias:[ciudad(2),ciudad(3)],total:2};
  w.respond(w.messages.at(-1),ambigua,undefined,nueva);assert.equal((await repetida).ambiguas,true);
  assert.equal((await C.resolverAsync('Ciudad')).total,2,'no conserva la antigua ciudad única');
});

test('la fachada no recuerda respuestas cuya versión cambia antes de continuar la promesa',async()=>{
  const {C,workers}=facade(),inicio=C.carga(),w=workers[0];w.respond(w.messages[0],{total:2});await inicio;
  const vieja=C.buscar('Vieja'),rechazo=assert.rejects(vieja,/actualizado/),nueva=C.buscar('Nueva');await turno();
  w.respond(w.messages.find(m=>m.texto==='Vieja'),[ciudad(1)]);
  w.respond(w.messages.find(m=>m.texto==='Nueva'),[ciudad(2)],undefined,'b'.repeat(64));
  await Promise.all([rechazo,nueva]);assert.deepEqual(Array.from(C.lista,c=>c.id),[2]);
});

function workerReal(){
  const fetches=[],messages=[],imports=[];
  const ctx={console,crypto:webcrypto,TextDecoder,CiudadesMotor:require('../app/ciudades-motor.js'),fetch:(url,options)=>{const d=diferida();fetches.push({url,options,...d});return d.promise;},
    importScripts:url=>{imports.push(url);if(url.startsWith('astrocartografia'))ctx.AstroGeo=require('../app/astrocartografia.js');},postMessage:m=>messages.push(m)};
  ctx.self=ctx;vm.createContext(ctx);vm.runInContext(lee('ciudades-worker.js'),ctx);
  return{ctx,fetches,messages,imports};
}
const VERSION_WORKER='a'.repeat(64);
const manifiestoWorker=(extra={})=>({archivo:'ciudades-2026-09-15.json',version:'2026-09-15',sha256:VERSION_WORKER,total:235810,fuente:'GeoNames cities500',zonas:394,...extra});
const jsonRespuesta=datos=>({ok:true,json:async()=>datos});
const bytesDatos=datos=>Buffer.from(JSON.stringify(datos));
const hashDatos=datos=>createHash('sha256').update(bytesDatos(datos)).digest('hex');
const archivoRespuesta=datos=>({ok:true,arrayBuffer:async()=>{const b=bytesDatos(datos);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}});
const apiRespuesta=(resultado,version=VERSION_WORKER)=>jsonRespuesta({version,resultado});
async function preparaWorker(extra={}){
  const w=workerReal(),carga=w.ctx.onmessage({data:{id:0,tipo:'carga'}});
  w.fetches[0].resolve(jsonRespuesta(manifiestoWorker(extra)));await carga;return w;
}

test('el Worker carga solo metadatos y comparte consultas normalizadas sin descargar el catálogo',async()=>{
  const {ctx,fetches,messages,imports}=workerReal();
  const a=ctx.onmessage({data:{id:1,tipo:'carga'}}),b=ctx.onmessage({data:{id:2,tipo:'buscar',texto:'  São—PAULO '}}),
    duplicada=ctx.onmessage({data:{id:3,tipo:'buscar',texto:'sao paulo'}});
  assert.equal(fetches.length,1);
  assert.equal(fetches[0].url,'datos/ciudades-manifest.json');
  assert.equal(fetches[0].options.cache,'no-cache','el manifiesto se revalida para descubrir actualizaciones');
  fetches[0].resolve(jsonRespuesta(manifiestoWorker()));await turno();
  assert.equal(fetches.length,2,'consultas equivalentes comparten la misma petición');
  const url=new URL(fetches[1].url,'https://prueba.test');
  assert.equal(url.pathname,'/api/ciudades');assert.equal(url.searchParams.get('tipo'),'buscar');
  assert.equal(url.searchParams.get('q'),'sao paulo');assert.equal(url.searchParams.get('v'),VERSION_WORKER);
  fetches[1].resolve(apiRespuesta([ciudad(1)]));await Promise.all([a,b,duplicada]);
  assert.equal(messages.find(m=>m.id===1).resultado.total,235810);
  assert.deepEqual(messages.find(m=>m.id===2).resultado,messages.find(m=>m.id===3).resultado);
  await ctx.onmessage({data:{id:4,tipo:'buscar',texto:'SÃO PAULO'}});
  assert.equal(fetches.length,2,'la misma búsqueda usa caché después de completarse');
  const corta=ctx.onmessage({data:{id:5,tipo:'buscar',texto:'北'}});await turno();
  assert.equal(new URL(fetches[2].url,'https://prueba.test').searchParams.get('q'),'北','se conserva Unicode y mínimo de un carácter');
  fetches[2].resolve(apiRespuesta([]));await corta;
  assert.ok(fetches.every(f=>!/^datos\/ciudades-\d/.test(f.url)));
  assert.equal(imports.filter(url=>url.startsWith('ciudades-motor')).length,1);
  assert.ok(!imports.some(url=>url.startsWith('astrocartografia')));
});

test('el Worker conserva la ambigüedad mundial aunque transfiera solo cuarenta coincidencias',async()=>{
  const w=await preparaWorker(),resultado={ciudad:null,ambiguas:true,coincidencias:Array.from({length:40},(_,i)=>ciudad(i+1)),total:127};
  const a=w.ctx.onmessage({data:{id:1,tipo:'resolver',texto:'San José'}}),b=w.ctx.onmessage({data:{id:2,tipo:'resolver',texto:'SAN JOSE'}});await turno();
  assert.equal(w.fetches.length,2);w.fetches[1].resolve(apiRespuesta(resultado));await Promise.all([a,b]);
  assert.deepEqual(w.messages.find(m=>m.id===1).resultado,resultado);
  await w.ctx.onmessage({data:{id:3,tipo:'resolver',texto:'San José'}});
  assert.equal(w.fetches.length,2);assert.equal(w.messages.at(-1).resultado.total,127);
});

test('fallar la API permite reintentar y nunca activa la descarga mundial como alternativa',async()=>{
  const w=await preparaWorker();
  for(const respuesta of [{ok:false,status:503},{ok:true,json:async()=>{throw Error('JSON inválido');}}]){
    const a=w.ctx.onmessage({data:{id:1,tipo:'buscar',texto:'Ciudad'}}),b=w.ctx.onmessage({data:{id:2,tipo:'buscar',texto:'Ciudad'}});await turno();
    w.fetches.at(-1).resolve(respuesta);await Promise.all([a,b]);
    assert.ok(w.messages.slice(-2).every(m=>m.error));
  }
  const retry=w.ctx.onmessage({data:{id:3,tipo:'buscar',texto:'Ciudad'}});await turno();
  w.fetches.at(-1).resolve(apiRespuesta([ciudad(1)]));await retry;
  assert.equal(w.messages.at(-1).resultado[0].id,1);
  assert.equal(w.fetches.filter(f=>f.url==='datos/ciudades-manifest.json').length,1);
  assert.ok(w.fetches.every(f=>f.url.includes('manifest')||f.url.startsWith('/api/ciudades?')));
});

test('el Worker rechaza respuestas API con versión, identidad o ambigüedad inválidas',async()=>{
  const casos=[
    ['buscar',{version:'b'.repeat(64),resultado:[ciudad(1)]}],
    ['buscar',{version:VERSION_WORKER,resultado:Array.from({length:41},(_,i)=>ciudad(i+1))}],
    ['buscar',{version:VERSION_WORKER,resultado:[{...ciudad(1),lat:91}]}],
    ['buscar',{version:VERSION_WORKER,resultado:[ciudad(1),ciudad(1)]}],
    ['resolver',{version:VERSION_WORKER,resultado:{ciudad:ciudad(1),ambiguas:false,coincidencias:[ciudad(1)],total:2}}],
    ['resolver',{version:VERSION_WORKER,resultado:{ciudad:ciudad(2),ambiguas:false,coincidencias:[ciudad(1)],total:1}}],
    ['resolver',{version:VERSION_WORKER,resultado:null}]
  ];
  for(const [tipo,respuesta] of casos){
    const w=await preparaWorker(),consulta=w.ctx.onmessage({data:{id:1,tipo,texto:'Ciudad'}});await turno();
    w.fetches[1].resolve(jsonRespuesta(respuesta));await consulta;
    assert.match(w.messages.at(-1).error,/respuesta.*no es válida/);
    assert.equal(w.fetches.length,2);
  }
});

test('dos respuestas 409 comparten la actualización y reintentan una vez con la nueva versión',async()=>{
  const w=await preparaWorker(),nueva='b'.repeat(64);
  const a=w.ctx.onmessage({data:{id:1,tipo:'buscar',texto:'Madrid'}}),b=w.ctx.onmessage({data:{id:2,tipo:'resolver',texto:'Córdoba'}});await turno();
  w.fetches[1].resolve({ok:false,status:409});w.fetches[2].resolve({ok:false,status:409});await turno();
  assert.equal(w.fetches.length,4);assert.equal(w.fetches[3].url,'datos/ciudades-manifest.json');
  assert.equal(w.fetches[3].options.cache,'no-cache');
  w.fetches[3].resolve(jsonRespuesta(manifiestoWorker({sha256:nueva,archivo:'ciudades-2026-10-01.json',version:'2026-10-01'})));await turno();
  assert.equal(w.fetches.length,6);
  for(const f of w.fetches.slice(4)){
    const u=new URL(f.url,'https://prueba.test');assert.equal(u.searchParams.get('v'),nueva);
    f.resolve(apiRespuesta(u.searchParams.get('tipo')==='buscar'?[ciudad(1)]:resuelta(ciudad(2)),nueva));
  }
  await Promise.all([a,b]);assert.ok(w.messages.slice(-2).every(m=>!m.error));
  await w.ctx.onmessage({data:{id:3,tipo:'buscar',texto:'Madrid'}});
  assert.equal(w.fetches.length,6,'la respuesta reintentada se guarda bajo la nueva versión');
  const agotada=w.ctx.onmessage({data:{id:4,tipo:'buscar',texto:'Otra'}});await turno();
  w.fetches[6].resolve({ok:false,status:409});await turno();
  w.fetches[7].resolve(jsonRespuesta(manifiestoWorker({sha256:nueva})));await turno();
  w.fetches[8].resolve({ok:false,status:409});await agotada;
  assert.match(w.messages.at(-1).error,/actualizando/);assert.equal(w.fetches.length,9,'no hay un ciclo de reintentos');
});

test('las cachés buscar y resolver son independientes, LRU y están limitadas a 64 consultas',async()=>{
  const w=await preparaWorker();let id=0;
  async function consulta(tipo,texto,red){
    const antes=w.fetches.length,p=w.ctx.onmessage({data:{id:++id,tipo,texto}});await turno();
    assert.equal(w.fetches.length,antes+(red?1:0),tipo+' '+texto);
    if(red)w.fetches.at(-1).resolve(apiRespuesta(tipo==='buscar'?[]:{ciudad:null,ambiguas:false,coincidencias:[],total:0}));
    await p;assert.equal(w.messages.at(-1).error,undefined);
  }
  for(let i=0;i<64;i++)await consulta('buscar','Lugar '+i,true);
  await consulta('buscar','Lugar 0',false); // Reciente aunque fue la primera insertada.
  await consulta('buscar','Lugar 64',true);
  await consulta('buscar','Lugar 0',false);await consulta('buscar','Lugar 1',true);
  for(let i=0;i<65;i++)await consulta('resolver','Lugar '+i,true);
  await consulta('resolver','Lugar 64',false);await consulta('resolver','Lugar 0',true);
  await consulta('buscar','Lugar 64',false); // Resolver no expulsa la caché de buscar.
});

test('una respuesta API antigua que llega después del refresco no se devuelve como datos nuevos',async()=>{
  const w=await preparaWorker(),nueva='b'.repeat(64);
  const vieja=w.ctx.onmessage({data:{id:1,tipo:'buscar',texto:'Antigua'}}),actual=w.ctx.onmessage({data:{id:2,tipo:'buscar',texto:'Nueva'}});await turno();
  w.fetches[2].resolve({ok:false,status:409});await turno();
  w.fetches[3].resolve(jsonRespuesta(manifiestoWorker({sha256:nueva})));await turno();
  w.fetches[4].resolve(apiRespuesta([ciudad(2)],nueva));await actual;
  w.fetches[1].resolve(apiRespuesta([ciudad(1)]));await vieja;
  assert.equal(w.messages.find(m=>m.id===2).version,nueva);
  assert.equal(w.messages.find(m=>m.id===2).revision,2);
  const rechazada=w.messages.find(m=>m.id===1);
  assert.match(rechazada.error,/actualizado/);assert.equal(rechazada.resultado,undefined);
  assert.equal(rechazada.version,nueva);
});

test('el catálogo geográfico usa el SHA nuevo en la URL y rechaza bytes viejos bajo el mismo nombre',async()=>{
  const viejo={regiones:['Nepal (NP)'],zonas:['Asia/Kathmandu'],filas:[[1,'Kathmandu',0,27.7,85.3,0,1000,'']]};
  const nuevo={...viejo,filas:[[1,'Kathmandu',0,27.8,85.4,0,1000,'']]};
  const hashViejo=hashDatos(viejo),hashNuevo=hashDatos(nuevo),w=await preparaWorker({sha256:hashViejo});
  const actualiza=w.ctx.onmessage({data:{id:1,tipo:'buscar',texto:'Kath'}});await turno();
  w.fetches[1].resolve({ok:false,status:409});await turno();
  w.fetches[2].resolve(jsonRespuesta(manifiestoWorker({sha256:hashNuevo})));await turno();
  w.fetches[3].resolve(apiRespuesta([],hashNuevo));await actualiza;
  const peticion={tipo:'cercanasLinea',a:{lonMC:0,dec:0},eje:'MC'};
  const geo=w.ctx.onmessage({data:{id:2,...peticion}});await turno();
  assert.equal(w.fetches[4].url,'datos/ciudades-2026-09-15.json?v='+hashNuevo);
  w.fetches[4].resolve(archivoRespuesta(viejo));await geo;
  assert.match(w.messages.at(-1).error,/no coincide/);
  const retry=w.ctx.onmessage({data:{id:3,...peticion}});await turno();
  w.fetches[5].resolve(archivoRespuesta(nuevo));await retry;
  assert.equal(w.messages.at(-1).resultado[0].c.lat,27.8);
  assert.equal(w.messages.at(-1).version,hashNuevo);
  await w.ctx.onmessage({data:{id:4,tipo:'resolver',texto:'Kathmandu'}});
  assert.equal(w.messages.at(-1).resultado.ciudad.lon,85.4);
  assert.equal(w.fetches.length,6,'los bytes viejos nunca llegan al motor local');
});

test('solo explorar líneas carga el catálogo; un fallo geográfico se reintenta y luego reutiliza el motor',async()=>{
  const a={lonMC:0,dec:0},datos={version:'2026-09-15',regiones:['Nepal (NP)'],zonas:['Asia/Kathmandu'],filas:[[1,'Kathmandu',0,27.7,85.3,0,1000,'']]};
  const hash=hashDatos(datos),w=await preparaWorker({sha256:hash});
  const consulta=w.ctx.onmessage({data:{id:1,tipo:'cercanasLinea',a,eje:'MC'}});await turno();
  assert.equal(w.fetches[1].url,'datos/ciudades-2026-09-15.json?v='+hash);
  w.fetches[1].resolve({ok:false});await consulta;assert.match(w.messages.at(-1).error,/descargar/);
  const retry=w.ctx.onmessage({data:{id:2,tipo:'cercanasLinea',a,eje:'MC'}}),otra=w.ctx.onmessage({data:{id:3,tipo:'explorarLinea',a,eje:'MC',opciones:{radioKm:null}}});await turno();
  assert.equal(w.fetches.length,3,'las dos acciones comparten una descarga geográfica');
  w.fetches[2].resolve(archivoRespuesta(datos));await Promise.all([retry,otra]);
  assert.equal(w.messages.find(m=>m.id===2).resultado[0].c.id,1);
  assert.equal(w.messages.find(m=>m.id===3).resultado.total,1);
  await w.ctx.onmessage({data:{id:4,tipo:'buscar',texto:'Kath'}});
  await w.ctx.onmessage({data:{id:5,tipo:'resolver',texto:'Kathmandu'}});
  assert.equal(w.messages.find(m=>m.id===4).resultado[0].id,1);
  assert.equal(w.messages.find(m=>m.id===5).resultado.ciudad.tz,'Asia/Kathmandu');
  assert.equal(w.fetches.length,3,'el motor geográfico ya cargado también resuelve búsquedas locales');
  assert.equal(w.imports.filter(url=>url.startsWith('astrocartografia')).length,1);
});

test('el Worker informa errores del manifiesto y rechaza rutas ajenas al catálogo',async()=>{
  for(const [respuesta,esperado] of [
    [{ok:false},/consultar la versión/],
    [{ok:true,json:async()=>{throw new SyntaxError('JSON de manifiesto inválido');}},/JSON de manifiesto inválido/],
    [{ok:true,json:async()=>({})},/Versión del catálogo inválida/],
    [jsonRespuesta(manifiestoWorker({archivo:'../ciudades-2026-09-15.json'})),/Versión del catálogo inválida/],
    [jsonRespuesta(manifiestoWorker({archivo:'https://otro.test/ciudades-2026-09-15.json'})),/Versión del catálogo inválida/],
    [jsonRespuesta(manifiestoWorker({sha256:'../ajeno'})),/Versión del catálogo inválida/],
    [jsonRespuesta(manifiestoWorker({sha256:[VERSION_WORKER]})),/Versión del catálogo inválida/],
    [jsonRespuesta(manifiestoWorker({archivo:['ciudades-2026-09-15.json']})),/Versión del catálogo inválida/],
    [jsonRespuesta(manifiestoWorker({total:-1})),/Versión del catálogo inválida/]
  ]){
    const {ctx,fetches,messages}=workerReal();
    const carga=ctx.onmessage({data:{id:1,tipo:'carga'}});
    fetches[0].resolve(respuesta);await carga;
    assert.match(messages[0].error,esperado);
    assert.equal(fetches.length,1,'un manifiesto inválido no inicia descarga del catálogo');
    const retry=ctx.onmessage({data:{id:2,tipo:'carga'}});
    assert.equal(fetches.length,2,'el error no deja la promesa de carga bloqueada');
    fetches[1].resolve({ok:false});await retry;
    assert.match(messages[1].error,/consultar la versión/);
  }
});

function datalist(){
  const listeners=new Map(),timers=new Map(),statuses=[],consultas=[];let reloj=0,cargas=0;
  class Node{
    constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.style={};this.textContent='';this.value='';}
    setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}
    appendChild(n){this.children.push(n);}
    replaceChildren(...nodes){this.children=nodes.flatMap(n=>n.tag==='fragment'?n.children:[n]);}
  }
  const dl=new Node('datalist');
  function input(valor){const n=new Node('input');n.value=valor;n.matches=selector=>selector==='input[list="ciudades"]';n.insertAdjacentElement=(pos,s)=>{statuses.push(s);n.status=s;};return n;}
  const document={createElement:tag=>new Node(tag),createDocumentFragment:()=>new Node('fragment'),getElementById:id=>id==='ciudades'?dl:null,
    querySelectorAll:()=>statuses,addEventListener:(tipo,fn)=>{if(!listeners.has(tipo))listeners.set(tipo,[]);listeners.get(tipo).push(fn);}};
  const C={normaliza:t=>t.trim().toLowerCase(),listo:()=>true,carga:async()=>{cargas++;},buscar:texto=>{const d=diferida();consultas.push({texto,...d});return d.promise;}};
  const c={console,document,Ciudades:C,setTimeout:(fn,ms)=>{const id=++reloj;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
  c.window=c;vm.createContext(c);vm.runInContext(lee('ciudades-buscador.js'),c);c.CiudadesBuscador.conecta();
  return{c,dl,input,consultas,timers,cargas:()=>cargas,emit:(tipo,target)=>{for(const fn of listeners.get(tipo)||[])fn({target});},
    tick:()=>{const pendientes=[...timers.values()];timers.clear();for(const t of pendientes)t.fn();}};
}

test('el datalist descarta respuestas antiguas y ofrece sólo cuarenta resultados',async()=>{
  const d=datalist(),i=d.input('San');
  assert.equal(d.cargas(),0,'conectar controles no carga el catálogo');
  d.emit('focusin',i);await turno();assert.equal(d.consultas.length,1);
  i.value='Santiago';d.emit('input',i);assert.equal(d.consultas.length,1,'las pulsaciones se agrupan');
  d.tick();await turno();assert.equal(d.consultas.length,2);
  d.consultas[1].resolve(Array.from({length:55},(_,j)=>ciudad(100+j)));await turno();
  assert.equal(d.dl.children.length,40);assert.equal(d.dl.children[0].value,ciudad(100).etiqueta);
  d.consultas[0].resolve([ciudad(999)]);await turno();
  assert.equal(d.dl.children[0].value,ciudad(100).etiqueta,'respuesta vieja no reemplaza la búsqueda actual');
  assert.equal(i.attrs['aria-busy'],'false');
  assert.match(i.status.textContent,/región y país/);
});

test('dos inputs comparten datalist sin mezclar resultados ni dejar estados ocupados',async()=>{
  const d=datalist(),primero=d.input('Madrid'),segundo=d.input('Tokyo');
  d.c.CiudadesBuscador.conecta(); // Conexión idempotente.
  d.emit('focusin',primero);await turno();
  d.emit('focusin',segundo);await turno();
  assert.equal(d.consultas.length,2);
  d.consultas[1].resolve([ciudad(2)]);await turno();
  d.consultas[0].resolve([ciudad(1)]);await turno();
  assert.equal(d.dl.children[0].value,ciudad(2).etiqueta);
  assert.equal(segundo.attrs['aria-busy'],'false');
  assert.equal(primero.attrs['aria-busy'],'false','el input abandonado no sigue anunciando una búsqueda pendiente');
  assert.notEqual(primero.status.id,segundo.status.id,'cada input tiene una descripción accesible propia');
});

test('el datalist muestra error recuperable y limpia opciones al borrar el campo',async()=>{
  const d=datalist(),i=d.input('Ciudad');
  d.emit('focusin',i);await turno();
  d.consultas[0].reject(Error('Sin conexión.'));await turno();
  assert.match(i.status.textContent,/Sin conexión.*reintentar/);assert.equal(i.attrs['aria-busy'],'false');
  d.emit('focusin',i);await turno();d.consultas[1].resolve([ciudad(1)]);await turno();
  assert.equal(d.dl.children.length,1);
  i.value='';d.emit('input',i);d.tick();await turno();
  assert.equal(d.dl.children.length,0);assert.equal(d.consultas.length,2);
  assert.match(i.status.textContent,/Escribe una ciudad/);
});
