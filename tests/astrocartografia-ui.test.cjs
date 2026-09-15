const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const CiudadesMotor=require('../app/ciudades-motor.js'),Geo=require('../app/astrocartografia.js');
// Subconjunto de registros reales repartidos por el mundo, con sus aliases,
// regiones y zonas reales. La suite de catálogo comprueba el archivo completo.
const datos=JSON.parse(fs.readFileSync(path.join(root,'app/datos/ciudades-2026-09-15.json'),'utf8'));
const ids=new Set([3530597,3117735,5128581,3860259,2519240,3530240,1850147,1283240,4035413,2179537,3369157,2147714,2988507,2643743,1816670,292223]);
// Dos subdivisiones reales con más de una página de localidades cada una.
for(const region of ['Madrid, España (ES)','Andalusia, España (ES)']){
  const muestra=datos.filas.filter(f=>datos.regiones[f[2]]===region).sort((a,b)=>b[6]-a[6]).slice(0,40);
  for(const fila of muestra)ids.add(fila[0]);
}
const motor=CiudadesMotor.crear({...datos,filas:datos.filas.filter(f=>ids.has(f[0])||CiudadesMotor.normaliza(f[1])==='cordoba')});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function app(saved=[],config={}){
  const nodes=new Map(),ctx=new Proxy({measureText:text=>({width:String(text).length*8})},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
  const solicitudes=[],lineasPendientes=[],resolucionesPendientes=[],resultadosLineas=[];
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
          else if(peticion.tipo==='explorarLinea'){
            resultado=motor.explorarLinea(peticion.a,peticion.eje,peticion.opciones,Geo);
            resultadosLineas.push({peticion,resultado});
          }
          else throw Error('Tipo de consulta inesperado: '+peticion.tipo);
          this.onmessage({data:{id:peticion.id,resultado}});
        }catch(e){this.onmessage({data:{id:peticion.id,error:e.message}});}
      };
      if(config.demorarLineas&&['cercanasLinea','explorarLinea'].includes(peticion.tipo))lineasPendientes.push({peticion,contesta});
      else if(config.demorarResoluciones&&peticion.tipo==='resolver')resolucionesPendientes.push({peticion,contesta});
      else queueMicrotask(contesta);
    }
    terminate(){}
  }
  function node(id){
    if(!nodes.has(id)){
      const handlers=new Map(),attributes=new Map(),classes=new Set(),captures=new Set();
      const n={id,value:({modo:'mundo',orbe:'550',lnAstro:'sol',lnEje:'MC',ocurrencia:'reject',localidadesRadio:'300'})[id]||'',innerHTML:'',hidden:false,
        width:2160,height:1080,clientWidth:1080,clientHeight:540,clientLeft:1,clientTop:1,offsetWidth:1082,offsetHeight:542,
        options:[{}],listeners:{},dataset:{},style:{},
        addEventListener(type,fn){
          if(!handlers.has(type))handlers.set(type,[]);
          handlers.get(type).push(fn);
          this.listeners[type]=event=>Promise.all(handlers.get(type).map(listener=>listener(event)));
        },
        removeEventListener(type,fn){handlers.set(type,(handlers.get(type)||[]).filter(listener=>listener!==fn));},
        setAttribute(key,value){attributes.set(key,String(value));},getAttribute:key=>attributes.get(key)??null,
        removeAttribute:key=>attributes.delete(key),hasAttribute:key=>attributes.has(key),
        classList:{toggle(key,force){const on=force??!classes.has(key);if(on)classes.add(key);else classes.delete(key);return on;},add:key=>classes.add(key),remove:key=>classes.delete(key),contains:key=>classes.has(key)},
        setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),focus(){},
        getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:1082,height:542}),scrollIntoView(){},
        appendChild(o){this.options.push(o);}};
      let value=String(n.value);
      Object.defineProperty(n,'value',{get:()=>value,set:v=>{value=String(v??'');}});
      Object.defineProperty(n,'selectedIndex',{set(i){this.value=this.options[i].value;}});nodes.set(id,n);
    }return nodes.get(id);
  }
  let created=0;
  class ResizeObserverMock{observe(){}unobserve(){}disconnect(){}}
  const requestFrame=fn=>{queueMicrotask(()=>fn(Date.now()));return 1;};
  const context={window:{addEventListener(){},Worker:WorkerMock,devicePixelRatio:1,ResizeObserver:ResizeObserverMock,requestAnimationFrame:requestFrame},Worker:WorkerMock,Date,Intl,URL,
    devicePixelRatio:1,ResizeObserver:ResizeObserverMock,requestAnimationFrame:requestFrame,cancelAnimationFrame(){},
    setTimeout:(...args)=>{const t=setTimeout(...args);t.unref();return t;},clearTimeout,
    document:{baseURI:'https://astroplanetario.test/astrocarto.html',currentScript:{src:'https://astroplanetario.test/app/ciudades.js'},documentElement:{dataset:{studioTheme:'dark'}},body:node('body'),getElementById:node,querySelector:node,querySelectorAll:()=>[],createElement:tag=>node(`created-${tag}-${++created}`),addEventListener(){}},localStorage:{getItem:()=>JSON.stringify(saved)}};
  vm.createContext(context);
  for(const file of ['app/ciudades.js','app/efemerides.js','app/astrocartografia.js','app/astrocarto-vista.js','app/astrocarto-pintor.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  const html=fs.readFileSync(path.join(root,'astrocarto.html'),'utf8');
  vm.runInContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],context);
  await flush();
  return {node,solicitudes,lineasPendientes,resolucionesPendientes,resultadosLineas,async event(id,type,event={}){await node(id).listeners[type](event);await flush();},
    change(id,value){node(id).value=value;return this.event(id,'change',{target:node(id)});},
    async tap(x,y){const event={pointerId:1,button:0,clientX:x,clientY:y,preventDefault(){}};await this.event('mapa','pointerdown',event);await this.event('mapa','pointerup',event);},
    draw(){return this.event('dibujar','click');},fill(id,value){node(id).value=value;node(id).listeners.input({target:node(id)});},table:()=>node('#tablaLugar tbody').innerHTML,lineTable:()=>node('#tablaLinea tbody').innerHTML};
}
async function example(config){const a=await app([],config);a.fill('fecha','1990-03-21');a.fill('hora','06:30');a.fill('lugar','Ciudad de México, México');await a.draw();return a;}
async function mostrarSoloSol(a){
  for(const id of ['luna','mercurio','venus','marte','jupiter','saturno','urano','neptuno','pluton']){
    const boton=a.node('filtro-'+id);boton.dataset.id=id;
    await a.event('astros','click',{target:{closest:()=>boton}});
  }
}
const saved={id:'test1',datos:{nombre:'Prueba',anio:1990,mes:3,dia:21,hora:6,min:30,horaConocida:true,lat:19.4326,lon:-99.1332,tz:'America/Mexico_City',lugarTexto:'Ciudad de México, México'}};
test('a point in free map space remains selected after distance/mode and clears stale city field',async()=>{
  const a=await example();a.node('ciudad').value='Madrid';
  // El Sol MC está a unos −5.69°: 17 px de separación en vista mundo.
  // Así 0°, 0° es espacio libre y no una pulsación sobre otra línea.
  await mostrarSoloSol(a);
  await a.event('mundo','click');
  await a.tap(541,271);
  assert.ok(a.table().includes('El punto que tocaste · 0.00°, 0.00°'));assert.equal(a.node('ciudad').value,'');
  a.node('orbe').value='1100';await a.event('orbe','change');assert.ok(a.table().includes('0.00°, 0.00°'));
  a.node('modo').value='zodiacal';await a.event('modo','change',{target:a.node('modo')});assert.ok(a.table().includes('El punto que tocaste'));
});
test('tapping a map line selects it without replacing the previously chosen city with pointer coordinates',async()=>{
  const a=await example();await mostrarSoloSol(a);
  a.node('ciudad').value='Madrid, España';
  await a.event('ciudad','change',{target:a.node('ciudad')});
  const ciudad=a.node('ciudad').value,lat=a.node('latDestino').value,lon=a.node('lonDestino').value,tabla=a.table();
  assert.ok(tabla.includes('Madrid'));
  await a.event('mundo','click');
  // En el nacimiento de ejemplo, Sol MC cruza el ecuador a unos −5.69°,
  // junto al píxel CSS 523 del mapa; +1 px corresponde al borde del lienzo.
  await a.tap(524,271);
  assert.equal(a.node('seleccionLinea').value,'sol|MC');
  assert.ok(a.node('detalleLinea').innerHTML.includes('Sol · MC'));
  assert.ok(a.node('detalleLinea').innerHTML.includes('Madrid'));
  assert.equal(a.node('ciudad').value,ciudad);
  assert.equal(a.node('latDestino').value,lat);
  assert.equal(a.node('lonDestino').value,lon);
  assert.equal(a.table(),tabla,'seleccionar una línea conserva el lugar sobre el que se consulta');
});
test('planet and angle filters apply to nearby table as well as map',async()=>{
  const a=await example();await a.event('mundo','click');await a.tap(541,271);a.node('orbe').value='1100';await a.event('orbe','change');
  assert.ok(a.table().includes('Mercurio'));
  const mercurio=a.node('boton-mercurio');mercurio.dataset.id='mercurio';
  await a.event('astros','click',{target:{closest:()=>mercurio}});
  assert.ok(!a.table().includes('Mercurio'));
  const mc=a.node('boton-MC');mc.dataset.eje='MC';
  await a.event('ejes','click',{target:{closest:()=>mc}});
  assert.ok(!a.table().includes(' MC'));
});

test('manual destination coordinates accept zero and reject invalid input without replacing the last valid place',async()=>{
  const a=await example(),natal=a.node('resumen').innerHTML;
  a.node('latDestino').value='0';a.node('lonDestino').value='0';
  await a.event('consultarCoordenadas','click');
  const tabla=a.table();
  assert.ok(tabla.includes('Coordenadas elegidas · 0.00°, 0.00°'));
  assert.equal(a.node('avisoDestino').hidden,true);
  assert.equal(a.node('resumen').innerHTML,natal,'el destino no altera el instante natal');
  for(const [lat,lon] of [['91','0'],['0','181'],['','0'],['0',''],['NaN','0'],['0','Infinity']]){
    a.node('latDestino').value=lat;a.node('lonDestino').value=lon;
    await a.event('consultarCoordenadas','click');
    assert.equal(a.node('avisoDestino').hidden,false,`${lat}, ${lon}`);
    assert.ok(a.node('avisoDestino').textContent.includes('latitud'));
    assert.equal(a.table(),tabla,'un valor inválido conserva el destino identificado en la tabla');
  }
});

test('selected line survives zoom but clears when its angle is filtered out',async()=>{
  const a=await example();
  a.node('seleccionLinea').value='sol|MC';await a.event('seleccionLinea','change',{target:a.node('seleccionLinea')});
  const ficha=a.node('detalleLinea').innerHTML;
  assert.ok(ficha.includes('Sol · MC'));
  assert.ok(ficha.includes('Punto más cercano'));
  await a.event('acercar','click');await a.event('alejar','click');
  assert.equal(a.node('seleccionLinea').value,'sol|MC');
  assert.equal(a.node('detalleLinea').innerHTML,ficha);
  const mc=a.node('boton-filtrar-MC');mc.dataset.eje='MC';
  await a.event('ejes','click',{target:{closest:()=>mc}});
  assert.equal(mc.getAttribute('aria-pressed'),'false');
  assert.equal(a.node('seleccionLinea').value,'');
  assert.ok(!a.node('seleccionLinea').innerHTML.includes('value="sol|MC"'));
  assert.ok(!a.node('detalleLinea').innerHTML.includes('Sol · MC'));
  assert.equal(a.node('cantidadLineas').textContent,'30 visibles');
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
test('pending birth edits stay explicit while another city or distance is consulted',async()=>{
  const a=await app([saved]);
  a.fill('hora','07:30');
  assert.equal(a.node('datosPendientes').hidden,false);
  assert.ok(a.node('datosPendientes').textContent.includes('datos anteriores de «Prueba»'));
  a.node('ciudad').value='Madrid, España';
  await a.event('ciudad','change',{target:a.node('ciudad')});
  assert.equal(a.node('aviso').hidden,true,'la consulta de ciudad puede despejar sus propios mensajes');
  assert.equal(a.node('datosPendientes').hidden,false,'el aviso del mapa anterior tiene un estado independiente');
  assert.ok(a.table().includes('Madrid'));
  assert.ok(a.node('resumen').innerHTML.includes('12:30:00Z'),'el resumen identifica el instante que todavía representa el mapa');
  a.node('orbe').value='1100';await a.event('orbe','change');
  assert.equal(a.node('datosPendientes').hidden,false);
  await a.draw();
  assert.equal(a.node('datosPendientes').hidden,true);
  assert.ok(a.node('resumen').innerHTML.includes('13:30:00Z'));
});

test('choosing the empty saved option starts a new chart without inheriting its name or coordinates',async()=>{
  const a=await app([saved]);
  assert.equal(a.node('nombre').value,'Prueba');
  assert.equal(a.node('manualLugar').open,false,'los datos guardados no abren el editor manual por un caché de ciudades vacío');
  a.node('guardada').value='';await a.event('guardada','change');
  for(const id of ['nombre','fecha','hora','lugar','latManual','lonManual','zonaManual','ciudad'])assert.equal(a.node(id).value,'',id);
  assert.equal(a.node('resumen').hidden,true);
  assert.equal(a.node('resumen').innerHTML,'');
  assert.equal(a.node('datosPendientes').hidden,true);
  a.fill('fecha','1990-03-21');a.fill('hora','06:30');a.fill('lugar','Madrid, España');
  await a.draw();
  assert.ok(a.node('resumen').innerHTML.includes('Esta carta'));
  assert.ok(!a.node('resumen').innerHTML.includes('Prueba'));
  assert.ok(a.node('resumen').innerHTML.includes('Europe/Madrid'));
  assert.ok(!a.table().includes('19.43°, -99.13°'));
});

test('new-chart button resets destination and manual overrides while keeping saved records available',async()=>{
  const a=await app([saved]);
  a.fill('latManual','20');a.fill('zonaManual','UTC');await a.draw();
  a.node('ciudad').value='Madrid, España';await a.event('ciudad','change',{target:a.node('ciudad')});
  a.fill('nombre','Nombre editado');
  await a.event('nuevaCarta','click');
  assert.equal(a.node('guardada').options.length,2);
  assert.equal(a.node('guardada').value,'');
  assert.equal(a.node('nombre').value,'');
  assert.equal(a.node('ciudad').value,'');
  assert.equal(a.node('ocurrencia').value,'reject');
  assert.equal(a.node('manualLugar').open,false);
  assert.equal(a.node('datosPendientes').hidden,true);
  assert.equal(a.node('resumen').hidden,true);
  a.node('guardada').value='test1';await a.event('guardada','change');
  assert.equal(a.node('nombre').value,'Prueba');
  assert.ok(a.node('resumen').innerHTML.includes('12:30:00Z'));
  assert.ok(a.table().includes('19.43°, -99.13°'),'volver a cargar usa el nacimiento, no el destino de la carta anterior');
});

test('editing the chart name changes the current identity only after recalculation and escapes HTML',async()=>{
  const a=await app([saved]);
  a.fill('nombre','<b>Otra persona</b>');
  assert.ok(a.node('resumen').innerHTML.includes('Prueba'));
  assert.ok(a.node('datosPendientes').textContent.includes('«Prueba»'));
  await a.draw();
  assert.ok(a.node('resumen').innerHTML.includes('&lt;b&gt;Otra persona&lt;/b&gt;'));
  assert.ok(!a.node('resumen').innerHTML.includes('<b>Otra persona</b>'));
  assert.equal(a.node('datosPendientes').hidden,true);
});

test('starting a new chart prevents a pending city response from restoring the previous destination',async()=>{
  const a=await app([saved],{demorarResoluciones:true});
  a.node('ciudad').value='Madrid, España';
  const destino=a.event('ciudad','change',{target:a.node('ciudad')});await flush();
  assert.equal(a.resolucionesPendientes.length,1);
  await a.event('nuevaCarta','click');
  a.resolucionesPendientes[0].contesta();await destino;
  assert.equal(a.node('resumen').hidden,true);
  assert.equal(a.node('ciudad').value,'');
  assert.ok(!a.table().includes('Madrid'));
});

test('starting a new chart prevents a pending birthplace response from drawing an abandoned chart',async()=>{
  const a=await app([],{demorarResoluciones:true});
  a.fill('fecha','1990-03-21');a.fill('hora','06:30');a.fill('lugar','Madrid, España');
  const dibujo=a.draw();await flush();
  assert.equal(a.resolucionesPendientes.length,1);
  await a.event('nuevaCarta','click');
  a.resolucionesPendientes[0].contesta();await dibujo;
  assert.equal(a.node('resumen').hidden,true);
  assert.equal(a.node('resumen').innerHTML,'');
  assert.equal(a.node('fecha').value,'');
  assert.ok(!a.table().includes('Madrid'));
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
  assert.equal(a.solicitudes.length,0,'abrir la carta guardada no intenta descargar el catálogo');
  await a.event('buscarLocalidades','click');
  assert.ok(a.lineTable().includes('No se pudo descargar'));
  assert.equal(a.solicitudes.filter(p=>p.tipo==='resolver').length,0,'la carta usa los datos guardados');
});

test('localities near a line load only on request, including after selecting a different planet',async()=>{
  const a=await app([saved]);
  assert.equal(a.solicitudes.length,0,'dibujar con coordenadas guardadas no necesita el catálogo');
  a.node('lnAstro').value='mercurio';await a.event('lnAstro','change');
  assert.equal(a.solicitudes.filter(p=>p.tipo==='explorarLinea').length,0);
  await a.change('localidadesRadio','todos');
  assert.equal(a.solicitudes.length,0,'cambiar el alcance antes de buscar tampoco descarga el catálogo');
  await a.event('buscarLocalidades','click');
  assert.equal(a.solicitudes.filter(p=>p.tipo==='explorarLinea').length,1);
  assert.ok(a.lineTable().includes('Mercurio MC'));
});

test('global locality exploration filters country and subdivision and pages without replacing the destination',async()=>{
  const a=await app([saved]);
  a.node('ciudad').value='Madrid, España';await a.event('ciudad','change',{target:a.node('ciudad')});
  const destino=a.table(),nombreDestino=a.node('ciudad').value,latDestino=a.node('latDestino').value;
  await a.change('localidadesRadio','todos');
  await a.event('buscarLocalidades','click');
  const mundo=a.resultadosLineas.at(-1).resultado;
  assert.ok(mundo.paises.some(p=>p.codigo==='ES'));
  assert.ok(mundo.paises.some(p=>p.codigo==='NP'),'el selector incluye países de otros continentes');
  assert.ok(a.node('localidadesPais').innerHTML.includes('value="NP"'));
  assert.ok(a.node('localidadesPais').innerHTML.includes('España'));
  await a.change('localidadesPais','ES');
  const espana=a.resultadosLineas.at(-1).resultado;
  assert.ok(espana.filas.every(f=>f.c.r.includes('España')));
  const madrid=espana.regiones.find(r=>/^Madrid(?:,|$)/.test(r.nombre));
  assert.ok(madrid,'las subdivisiones de España incluyen Madrid');
  await a.change('localidadesRegion',String(madrid.id));
  const primera=a.resultadosLineas.at(-1).resultado;
  assert.equal(primera.pagina,1);assert.equal(primera.filas.length,24);
  assert.ok(primera.total>24);assert.ok(primera.filas.every(f=>f.c.r.startsWith('Madrid,')));
  assert.equal(a.node('localidadesAnterior').disabled,true);
  assert.equal(a.node('localidadesSiguiente').disabled,false);
  const tablaPrimera=a.lineTable();
  await a.event('localidadesSiguiente','click');
  const segunda=a.resultadosLineas.at(-1).resultado;
  assert.equal(segunda.pagina,2);assert.equal(segunda.limite,24);
  assert.notEqual(a.lineTable(),tablaPrimera);
  assert.ok(!segunda.filas.some(f=>primera.filas.some(anterior=>anterior.c.id===f.c.id)));
  assert.equal(a.node('localidadesAnterior').disabled,false);
  assert.equal(a.table(),destino,'país, región y página no sustituyen la consulta del destino');
  assert.equal(a.node('ciudad').value,nombreDestino);assert.equal(a.node('latDestino').value,latDestino);
  const elegida=segunda.filas[0].c;
  await a.event('tablaLinea','click',{target:{closest:()=>({dataset:{localidad:'0'}})}});
  assert.equal(a.node('ciudad').value,elegida.etiqueta);
  assert.equal(Number(a.node('latDestino').value),elegida.lat);
  assert.equal(Number(a.node('lonDestino').value),elegida.lon);
  await a.change('localidadesPais','NP');
  const nepal=a.resultadosLineas.at(-1).resultado;
  assert.equal(a.node('localidadesRegion').value,'','cambiar país limpia la subdivisión anterior');
  assert.equal(nepal.pagina,1);
  assert.ok(nepal.filas.some(f=>f.c.n==='Kathmandu'));
  assert.ok(!a.lineTable().includes('España'));
});

test('out-of-order country responses and an abandoned exploration cannot restore stale rows or filters',async()=>{
  const a=await app([saved],{demorarLineas:true});
  await a.change('localidadesRadio','todos');
  const inicio=a.event('buscarLocalidades','click');await flush();
  a.lineasPendientes[0].contesta();await inicio;await flush();
  const espana=a.change('localidadesPais','ES');await flush();
  const nepal=a.change('localidadesPais','NP');await flush();
  assert.equal(a.lineasPendientes.length,3);
  a.lineasPendientes[2].contesta();await nepal;await flush();
  const tabla=a.lineTable(),regiones=a.node('localidadesRegion').innerHTML,estado=a.node('localidadesEstado').textContent;
  assert.ok(tabla.includes('Kathmandu'));
  a.lineasPendientes[1].contesta();await espana;await flush();
  assert.equal(a.lineTable(),tabla);
  assert.equal(a.node('localidadesRegion').innerHTML,regiones);
  assert.equal(a.node('localidadesEstado').textContent,estado);
  assert.equal(a.node('localidadesPais').value,'NP');
  const japon=a.change('localidadesPais','JP');await flush();
  assert.equal(a.lineasPendientes.length,4);
  await a.event('nuevaCarta','click');
  const vacia=a.lineTable(),estadoVacio=a.node('localidadesEstado').textContent;
  a.lineasPendientes[3].contesta();await japon;await flush();
  assert.equal(a.lineTable(),vacia);
  assert.equal(a.node('localidadesEstado').textContent,estadoVacio);
  assert.equal(a.node('resumen').hidden,true);
  assert.equal(a.node('localidadesPais').value,'');
  assert.equal(a.node('localidadesRegion').value,'');
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
  assert.equal(a.lineasPendientes.length,0);
  const apertura=a.event('buscarLocalidades','click');await flush();
  assert.equal(a.lineasPendientes.length,1);
  a.node('lnEje').value='IC';
  const cambio=a.event('lnEje','change');await flush();
  assert.equal(a.lineasPendientes.length,2);
  assert.equal(a.lineasPendientes[0].peticion.eje,'MC');
  assert.equal(a.lineasPendientes[1].peticion.eje,'IC');
  a.lineasPendientes[1].contesta();await cambio;
  const reciente=a.lineTable();assert.ok(reciente.includes('Sol IC'));
  a.lineasPendientes[0].contesta();await apertura;await flush();
  assert.equal(a.lineTable(),reciente);
});
