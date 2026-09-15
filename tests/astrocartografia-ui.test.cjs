const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const CiudadesMotor=require('../app/ciudades-motor.js'),Geo=require('../app/astrocartografia.js');
// Subconjunto de registros reales repartidos por el mundo, con sus aliases,
// regiones y zonas reales. La suite de catálogo comprueba el archivo completo.
const datos=JSON.parse(fs.readFileSync(path.join(root,'app/datos/ciudades-2026-09-15.json'),'utf8'));
const ids=new Set([3530597,3117735,5128581,3860259,2519240,3530240,1850147,1283240,4035413,2179537,3369157,2147714,2988507,2643743,1816670,292223]);
const motor=CiudadesMotor.crear({...datos,filas:datos.filas.filter(f=>ids.has(f[0])||CiudadesMotor.normaliza(f[1])==='cordoba')});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function app(saved=[],config={}){
  const nodes=new Map(),ctx=new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
  const solicitudes=[],lineasPendientes=[];
  class WorkerMock{
    postMessage(peticion){
      solicitudes.push(peticion);
      const contesta=()=>{
        try{
          if(config.sinCatalogo)throw Error('No se pudo descargar el catálogo de ciudades.');
          let resultado;
          if(peticion.tipo==='carga')resultado=motor.meta;
          else if(peticion.tipo==='resolver')resultado=motor.resolver(peticion.texto);
          else if(peticion.tipo==='buscar')resultado=motor.buscar(peticion.texto);
          else if(peticion.tipo==='cercanasLinea')resultado=motor.cercanasLinea(peticion.a,peticion.eje,Geo);
          else throw Error('Tipo de consulta inesperado: '+peticion.tipo);
          this.onmessage({data:{id:peticion.id,resultado}});
        }catch(e){this.onmessage({data:{id:peticion.id,error:e.message}});}
      };
      if(config.demorarLineas&&peticion.tipo==='cercanasLinea')lineasPendientes.push({peticion,contesta});
      else queueMicrotask(contesta);
    }
    terminate(){}
  }
  function node(id){
    if(!nodes.has(id)){
      const n={id,value:({modo:'mundo',orbe:'550',lnAstro:'sol',lnEje:'MC',ocurrencia:'reject'})[id]||'',innerHTML:'',hidden:false,
        width:2160,height:1080,clientWidth:1080,clientHeight:540,clientLeft:1,clientTop:1,offsetWidth:1082,offsetHeight:542,
        options:[{}],listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},
        getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:1082,height:542}),scrollIntoView(){},
        appendChild(o){this.options.push(o);}};
      Object.defineProperty(n,'selectedIndex',{set(i){this.value=this.options[i].value;}});nodes.set(id,n);
    }return nodes.get(id);
  }
  const context={window:{addEventListener(){},Worker:WorkerMock},Worker:WorkerMock,Date,Intl,URL,
    setTimeout:(...args)=>{const t=setTimeout(...args);t.unref();return t;},clearTimeout,
    document:{baseURI:'https://astroplanetario.test/astrocarto.html',currentScript:{src:'https://astroplanetario.test/app/ciudades.js'},documentElement:{dataset:{studioTheme:'dark'}},getElementById:node,querySelector:node,createElement:()=>({})},localStorage:{getItem:()=>JSON.stringify(saved)}};
  vm.createContext(context);
  for(const file of ['app/ciudades.js','app/efemerides.js','app/astrocartografia.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  const html=fs.readFileSync(path.join(root,'astrocarto.html'),'utf8');
  vm.runInContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],context);
  await flush();
  return {node,solicitudes,lineasPendientes,async event(id,type,event={}){await node(id).listeners[type](event);await flush();},draw(){return this.event('dibujar','click');},fill(id,value){node(id).value=value;node(id).listeners.input({target:node(id)});},table:()=>node('#tablaLugar tbody').innerHTML,lineTable:()=>node('#tablaLinea tbody').innerHTML};
}
async function example(config){const a=await app([],config);a.fill('fecha','1990-03-21');a.fill('hora','06:30');a.fill('lugar','Ciudad de México, México');await a.draw();return a;}
const saved={id:'test1',datos:{nombre:'Prueba',anio:1990,mes:3,dia:21,hora:6,min:30,horaConocida:true,lat:19.4326,lon:-99.1332,tz:'America/Mexico_City',lugarTexto:'Ciudad de México, México'}};
test('map point remains selected after distance/mode and clears stale city field',async()=>{
  const a=await example();a.node('ciudad').value='Madrid';
  await a.event('mapa','click',{clientX:541,clientY:271});
  assert.ok(a.table().includes('El punto que tocaste · 0.00°, 0.00°'));assert.equal(a.node('ciudad').value,'');
  a.node('orbe').value='1100';await a.event('orbe','change');assert.ok(a.table().includes('0.00°, 0.00°'));
  a.node('modo').value='zodiacal';await a.event('modo','change',{target:a.node('modo')});assert.ok(a.table().includes('El punto que tocaste'));
});
test('planet and angle filters apply to nearby table as well as map',async()=>{
  const a=await example();await a.event('mapa','click',{clientX:541,clientY:271});a.node('orbe').value='1100';await a.event('orbe','change');
  assert.ok(a.table().includes('Mercurio'));
  await a.event('astros','click',{target:{closest:()=>({dataset:{id:'mercurio'},classList:{toggle(){}}})}});
  assert.ok(!a.table().includes('Mercurio'));
  await a.event('ejes','click',{target:{closest:()=>({dataset:{eje:'MC'},classList:{toggle(){}}})}});
  assert.ok(!a.table().includes(' MC'));
});
test('saved chart fills editor; editing hour changes resulting UTC',async()=>{
  const a=await app([saved]);assert.equal(a.node('hora').value,'06:30');assert.ok(a.node('resumen').innerHTML.includes('12:30:00Z'));
  a.fill('hora','07:30');await a.draw();assert.equal(a.node('guardada').value,'');assert.ok(a.node('resumen').innerHTML.includes('13:30:00Z'));
});
test('saved custom coordinates and timezone survive an unrelated hour edit',async()=>{
  const a=await app([{...saved,datos:{...saved.datos,lat:20,lon:-100,tz:'UTC'}}]);
  assert.ok(a.node('resumen').innerHTML.includes('06:30:00Z'));assert.ok(a.table().includes('20.00°, -100.00°'));
  a.fill('hora','07:30');await a.draw();assert.ok(a.node('resumen').innerHTML.includes('07:30:00Z'));
});
test('empty hour, duplicate city and invalid date invalidate old map with an explanation',async()=>{
  const a=await example();a.fill('hora','');await a.draw();assert.ok(a.node('aviso').textContent.includes('necesita la hora'));assert.equal(a.node('resumen').hidden,true);
  a.fill('hora','12:00');a.fill('lugar','Córdoba');await a.draw();assert.ok(a.node('aviso').textContent.includes('varias ciudades'));
  a.fill('lugar','Madrid, España');a.fill('fecha','1700-01-01');await a.draw();assert.ok(a.node('aviso').textContent.includes('1800'));
});
test('fold requires explicit occurrence and survives selection through editor',async()=>{
  const a=await app();a.fill('fecha','2024-11-03');a.fill('hora','01:30');a.fill('lugar','Nueva York');await a.draw();assert.ok(a.node('aviso').textContent.includes('dos veces'));
  a.fill('ocurrencia','later');await a.draw();assert.ok(a.node('resumen').innerHTML.includes('06:30:00Z'));
});
test('malformed saved data does not crash startup and names are HTML escaped',async()=>{
  await assert.doesNotReject(()=>app({bad:'shape'}));await assert.doesNotReject(()=>app([null,{id:'bad',datos:{anio:1990}}]));
  const a=await app([{...saved,datos:{...saved.datos,nombre:'<img src=x onerror="bad">'}}]);
  assert.ok(a.node('resumen').innerHTML.includes('&lt;img'));assert.ok(!a.node('resumen').innerHTML.includes('<img'));
});
test('manual coordinate edits override catalog; changing place clears stale coordinates',async()=>{
  const a=await app([saved]);a.fill('latManual','20');a.fill('zonaManual','UTC');await a.draw();
  assert.ok(a.table().includes('20.00°'));assert.ok(a.node('resumen').innerHTML.includes('06:30:00Z'));
  a.fill('lugar','Mi pueblo');await a.draw();assert.ok(a.node('aviso').textContent.includes('coordenadas'));
});
test('saving valid natal records preserves incompatible legacy records',()=>{
  const legacy={id:'legacy',datos:{anio:1750}}, raw=[saved,legacy,null];let stored=JSON.stringify(raw);
  const c={window:{},Date,Intl,localStorage:{getItem:()=>stored,setItem:(key,value)=>{stored=value;}}};vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root,'app/efemerides.js'),'utf8'),c);
  const html=fs.readFileSync(path.join(root,'astroplanetario.html'),'utf8');
  const code=html.slice(html.indexOf('const LLAVE_CARTAS ='),html.indexOf('const huellaCarta ='));
  vm.runInContext('const cartaValida=window.Efem.cartaValida;'+code+';this.api={leerCartas,escribirCartas};',c);
  assert.equal(c.api.leerCartas().length,1);c.api.escribirCartas(c.api.leerCartas());
  assert.deepEqual(JSON.parse(stored),raw);
});

test('saved coordinates draw even when the catalog download fails',async()=>{
  const a=await app([saved],{sinCatalogo:true});
  assert.ok(a.node('resumen').innerHTML.includes('12:30:00Z'));
  assert.equal(a.node('resumen').hidden,false);
  assert.ok(a.table().includes('19.43°, -99.13°'));
  assert.ok(a.lineTable().includes('No se pudo descargar'));
  assert.equal(a.solicitudes.filter(p=>p.tipo==='resolver').length,0,'la carta usa los datos guardados');
});

test('a city outside the previous regional priorities resolves through the worker with its IANA zone',async()=>{
  const ciudad=motor.buscar('Kathmandu').find(c=>c.id===1283240);
  assert.ok(ciudad,'Kathmandu existe en los registros reales de la prueba');
  const a=await app();
  a.fill('fecha','2024-01-01');a.fill('hora','00:00');a.fill('lugar',ciudad.etiqueta);
  await a.draw();
  assert.equal(a.node('resumen').hidden,false);
  assert.ok(a.node('resumen').innerHTML.includes('2023-12-31T18:15:00Z'));
  assert.ok(a.node('resumen').innerHTML.includes(ciudad.tz));
  assert.ok(a.table().includes(ciudad.lat.toFixed(2)+'°, '+ciudad.lon.toFixed(2)+'°'));
  assert.equal(a.solicitudes.filter(p=>p.tipo==='resolver').length,1);
});

test('a delayed line result cannot overwrite a more recent angle selection',async()=>{
  const a=await example({demorarLineas:true});
  assert.equal(a.lineasPendientes.length,1);
  a.node('lnEje').value='IC';
  const cambio=a.event('lnEje','change');await flush();
  assert.equal(a.lineasPendientes.length,2);
  assert.equal(a.lineasPendientes[0].peticion.eje,'MC');
  assert.equal(a.lineasPendientes[1].peticion.eje,'IC');
  a.lineasPendientes[1].contesta();await cambio;
  const reciente=a.lineTable();assert.ok(reciente.includes('Sol IC'));
  a.lineasPendientes[0].contesta();await flush();
  assert.equal(a.lineTable(),reciente);
});
