const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function app(saved=[]){
  const nodes=new Map(),ctx=new Proxy({},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>(t[k]=v,true)});
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
  const context={window:{},Date,Intl,document:{getElementById:node,querySelector:node,createElement:()=>({})},localStorage:{getItem:()=>JSON.stringify(saved)}};
  vm.createContext(context);
  for(const file of ['app/efemerides.js','app/astrocartografia.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  const html=fs.readFileSync(path.join(root,'astrocarto.html'),'utf8');
  vm.runInContext(html.match(/<script>\s*([\s\S]*?)<\/script>/)[1],context);
  return {node,event:(id,type,event={})=>node(id).listeners[type](event),draw(){this.event('dibujar','click');},fill(id,value){node(id).value=value;this.event(id,'input');},table:()=>node('#tablaLugar tbody').innerHTML};
}
function example(){const a=app();a.fill('fecha','1990-03-21');a.fill('hora','06:30');a.fill('lugar','Ciudad de México, México');a.draw();return a;}
const saved={id:'test1',datos:{nombre:'Prueba',anio:1990,mes:3,dia:21,hora:6,min:30,horaConocida:true,lat:19.4326,lon:-99.1332,tz:'America/Mexico_City',lugarTexto:'Ciudad de México, México'}};
test('map point remains selected after distance/mode and clears stale city field',()=>{
  const a=example();a.node('ciudad').value='Madrid';
  a.event('mapa','click',{clientX:541,clientY:271});
  assert.ok(a.table().includes('El punto que tocaste · 0.00°, 0.00°'));assert.equal(a.node('ciudad').value,'');
  a.node('orbe').value='1100';a.event('orbe','change');assert.ok(a.table().includes('0.00°, 0.00°'));
  a.node('modo').value='zodiacal';a.event('modo','change',{target:a.node('modo')});assert.ok(a.table().includes('El punto que tocaste'));
});
test('planet and angle filters apply to nearby table as well as map',()=>{
  const a=example();a.event('mapa','click',{clientX:541,clientY:271});a.node('orbe').value='1100';a.event('orbe','change');
  assert.ok(a.table().includes('Mercurio'));
  a.event('astros','click',{target:{closest:()=>({dataset:{id:'mercurio'},classList:{toggle(){}}})}});
  assert.ok(!a.table().includes('Mercurio'));
  a.event('ejes','click',{target:{closest:()=>({dataset:{eje:'MC'},classList:{toggle(){}}})}});
  assert.ok(!a.table().includes(' MC'));
});
test('saved chart fills editor; editing hour changes resulting UTC',()=>{
  const a=app([saved]);assert.equal(a.node('hora').value,'06:30');assert.ok(a.node('resumen').innerHTML.includes('12:30:00Z'));
  a.fill('hora','07:30');a.draw();assert.equal(a.node('guardada').value,'');assert.ok(a.node('resumen').innerHTML.includes('13:30:00Z'));
});
test('saved custom coordinates and timezone survive an unrelated hour edit',()=>{
  const a=app([{...saved,datos:{...saved.datos,lat:20,lon:-100,tz:'UTC'}}]);
  assert.ok(a.node('resumen').innerHTML.includes('06:30:00Z'));assert.ok(a.table().includes('20.00°, -100.00°'));
  a.fill('hora','07:30');a.draw();assert.ok(a.node('resumen').innerHTML.includes('07:30:00Z'));
});
test('empty hour, duplicate city and invalid date invalidate old map with an explanation',()=>{
  const a=example();a.fill('hora','');a.draw();assert.ok(a.node('aviso').textContent.includes('necesita la hora'));assert.equal(a.node('resumen').hidden,true);
  a.fill('hora','12:00');a.fill('lugar','Córdoba');a.draw();assert.ok(a.node('aviso').textContent.includes('varias ciudades'));
  a.fill('lugar','Madrid');a.fill('fecha','1700-01-01');a.draw();assert.ok(a.node('aviso').textContent.includes('1800'));
});
test('fold requires explicit occurrence and survives selection through editor',()=>{
  const a=app();a.fill('fecha','2024-11-03');a.fill('hora','01:30');a.fill('lugar','Nueva York');a.draw();assert.ok(a.node('aviso').textContent.includes('dos veces'));
  a.fill('ocurrencia','later');a.draw();assert.ok(a.node('resumen').innerHTML.includes('06:30:00Z'));
});
test('malformed saved data does not crash startup and names are HTML escaped',()=>{
  assert.doesNotThrow(()=>app({bad:'shape'}));assert.doesNotThrow(()=>app([null,{id:'bad',datos:{anio:1990}}]));
  const a=app([{...saved,datos:{...saved.datos,nombre:'<img src=x onerror="bad">'}}]);
  assert.ok(a.node('resumen').innerHTML.includes('&lt;img'));assert.ok(!a.node('resumen').innerHTML.includes('<img'));
});
test('manual coordinate edits override catalog; changing place clears stale coordinates',()=>{
  const a=app([saved]);a.fill('latManual','20');a.fill('zonaManual','UTC');a.draw();
  assert.ok(a.table().includes('20.00°'));assert.ok(a.node('resumen').innerHTML.includes('06:30:00Z'));
  a.fill('lugar','Mi pueblo');a.draw();assert.ok(a.node('aviso').textContent.includes('coordenadas'));
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
