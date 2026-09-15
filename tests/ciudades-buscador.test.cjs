'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const lee=n=>fs.readFileSync(path.join(__dirname,'../app/',n),'utf8');
const turno=()=>new Promise(resolve=>setImmediate(resolve));
const diferida=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const ciudad=i=>({id:i,n:'Ciudad '+i,r:'Región, País',lat:10,lon:20,tz:'Asia/Kathmandu',etiqueta:'Ciudad '+i+', Región, País'});
const resuelta=c=>({ciudad:c,ambiguas:false,coincidencias:[c],total:1});

function facade(){
  const workers=[],timers=new Map();let reloj=0;
  class Worker{
    constructor(url){this.url=String(url);this.messages=[];this.terminated=false;workers.push(this);}
    postMessage(message){this.messages.push(message);}
    terminate(){this.terminated=true;}
    respond(message,resultado,error){this.onmessage({data:{id:message.id,resultado,error}});}
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

function workerReal(){
  const fetches=[],messages=[],imports=[];
  const ctx={console,CiudadesMotor:require('../app/ciudades-motor.js'),fetch:(url,options)=>{const d=diferida();fetches.push({url,options,...d});return d.promise;},
    importScripts:url=>imports.push(url),postMessage:m=>messages.push(m)};
  ctx.self=ctx;vm.createContext(ctx);vm.runInContext(lee('ciudades-worker.js'),ctx);
  return{ctx,fetches,messages,imports};
}

test('el Worker real comparte manifiesto y catálogo, y reconsulta la versión tras una descarga fallida',async()=>{
  const {ctx,fetches,messages,imports}=workerReal();
  const datos={regiones:['Nepal (NP)'],zonas:['Asia/Kathmandu'],filas:[[1,'Kathmandu',0,27.7,85.3,0,1000,'']]};
  const a=ctx.onmessage({data:{id:1,tipo:'carga'}}),b=ctx.onmessage({data:{id:2,tipo:'buscar',texto:'Kath'}});
  assert.equal(fetches.length,1);
  assert.equal(fetches[0].url,'datos/ciudades-manifest.json');
  assert.equal(fetches[0].options.cache,'no-cache','el manifiesto se revalida para descubrir actualizaciones');
  fetches[0].resolve({ok:true,json:async()=>({archivo:'ciudades-2026-09-15.json'})});await turno();
  assert.equal(fetches.length,2,'las consultas paralelas comparten una sola descarga de datos');
  assert.equal(fetches[1].url,'datos/ciudades-2026-09-15.json');
  fetches[1].resolve({ok:false});await Promise.all([a,b]);
  assert.equal(messages.length,2);assert.ok(messages.every(m=>/descargar/.test(m.error)));
  const c=ctx.onmessage({data:{id:3,tipo:'resolver',texto:'Kathmandu'}}),d=ctx.onmessage({data:{id:4,tipo:'buscar',texto:'Kath'}});
  assert.equal(fetches.length,3);assert.equal(fetches[2].url,'datos/ciudades-manifest.json');
  assert.equal(fetches[2].options.cache,'no-cache');
  // Otra fecha se sirve sin modificar ciudades-worker.js.
  fetches[2].resolve({ok:true,json:async()=>({archivo:'ciudades-2026-10-01.json'})});await turno();
  assert.equal(fetches.length,4);assert.equal(fetches[3].url,'datos/ciudades-2026-10-01.json');
  fetches[3].resolve({ok:true,json:async()=>datos});await Promise.all([c,d]);
  assert.equal(messages.find(m=>m.id===3).resultado.ciudad.tz,'Asia/Kathmandu');
  assert.equal(messages.find(m=>m.id===4).resultado[0].id,1);
  await ctx.onmessage({data:{id:5,tipo:'carga'}});
  assert.equal(fetches.length,4,'el motor cargado se reutiliza durante la misma sesión');
  assert.equal(imports.filter(url=>url.startsWith('ciudades-motor')).length,1);
});

test('el Worker informa errores del manifiesto y rechaza rutas ajenas al catálogo',async()=>{
  for(const [respuesta,esperado] of [
    [{ok:false},/consultar la versión/],
    [{ok:true,json:async()=>{throw new SyntaxError('JSON de manifiesto inválido');}},/JSON de manifiesto inválido/],
    [{ok:true,json:async()=>({})},/Versión del catálogo inválida/],
    [{ok:true,json:async()=>({archivo:'../ciudades-2026-09-15.json'})},/Versión del catálogo inválida/],
    [{ok:true,json:async()=>({archivo:'https://otro.test/ciudades-2026-09-15.json'})},/Versión del catálogo inválida/]
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
