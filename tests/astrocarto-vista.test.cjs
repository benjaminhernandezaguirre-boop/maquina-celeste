const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../app/astrocarto-vista.js');
const cerca=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} ≠ ${b}`);
test('mundo completo conserva proporciones y rechaza las bandas vacías',()=>{
  const v=A.crear(800,600);
  cerca(v.escala,800/2160);cerca(v.y,100);
  assert.equal(v.aMapa(400,99),null);assert.equal(v.aMapa(400,501),null);
  cerca(v.aMapa(400,100).lat,90);cerca(v.aMapa(400,500).lat,-90);
  for(const lon of [-180,-90,0,90,180])for(const lat of [-90,-30,0,30,90]){
    const p=v.aPantalla(lon,lat),q=v.aMapa(p.x,p.y);cerca(q.lon,lon);cerca(q.lat,lat);
  }
  assert.equal(v.aMapa(-1,300),null);assert.equal(v.aPantalla(181,0),null);
});
test('zoom mantiene el lugar bajo el cursor y limita el acercamiento',()=>{
  const v=A.crear(800,400),antes=v.aMapa(250,240);
  v.acercar(4,250,240);
  const despues=v.aMapa(250,240);cerca(antes.lon,despues.lon);cerca(antes.lat,despues.lat);
  v.acercar(100);assert.equal(v.zoom,32);v.acercar(.00001);assert.equal(v.zoom,1);
  cerca(v.x,0);cerca(v.y,0);
});
test('cambiar el tamaño conserva centro geográfico y zoom si caben',()=>{
  const v=A.crear(800,400).centrar(45,25,4);
  v.redimensionar(420,600);
  const p=v.aMapa(210,300);cerca(p.lon,45);cerca(p.lat,25);assert.equal(v.zoom,4);
  v.redimensionar(1200,500);
  const q=v.aMapa(600,250);cerca(q.lon,45);cerca(q.lat,25);assert.equal(v.zoom,4);
});
test('el arrastre se detiene en polos y antimeridiano sin repetir el mundo',()=>{
  const v=A.crear(800,400).centrar(0,0,4);
  v.mover(1e6,1e6);cerca(v.aMapa(0,0).lon,-180);cerca(v.aMapa(0,0).lat,90);
  v.mover(-2e6,-2e6);cerca(v.aMapa(800,400).lon,180);cerca(v.aMapa(800,400).lat,-90);
  v.mundo();cerca(v.aMapa(0,200).lon,-180);cerca(v.aMapa(800,200).lon,180);
  v.centrar(179,0,8);cerca(v.aMapa(800,200).lon,180);
  assert.equal(v.aMapa(801,200),null);
});
function lienzo(v){
  const listeners=new Map(),capturados=new Set();
  return {
    clientWidth:v.width,clientHeight:v.height,offsetWidth:v.width,offsetHeight:v.height,clientLeft:0,clientTop:0,
    getBoundingClientRect(){return {left:30,top:40,width:v.width,height:v.height};},
    addEventListener(k,f){if(!listeners.has(k))listeners.set(k,new Set());listeners.get(k).add(f);},
    removeEventListener(k,f){listeners.get(k)?.delete(f);},
    setPointerCapture(id){capturados.add(id);},hasPointerCapture(id){return capturados.has(id);},releasePointerCapture(id){capturados.delete(id);},focus(){},
    emitir(tipo,x=400,y=200,extra={}){
      const e={clientX:30+x,clientY:40+y,pointerId:1,button:0,cancelable:true,preventDefault(){this.impedido=true;},...extra};
      for(const f of listeners.get(tipo)||[])f(e);return e;
    },capturados
  };
}
test('un clic consulta el punto; arrastrar y volver al origen no consulta',()=>{
  const v=A.crear(800,400).centrar(0,0,4),c=lienzo(v),consultas=[];
  A.conectar(c,v,{consulta:p=>consultas.push(p)});
  c.emitir('pointerdown');c.emitir('pointerup');assert.equal(consultas.length,1);cerca(consultas[0].lon,0);
  c.emitir('pointerdown');c.emitir('pointermove',440,220);c.emitir('pointermove',400,200);c.emitir('pointerup');
  assert.equal(consultas.length,1);assert.equal(c.capturados.size,0);
  c.emitir('pointerdown');c.emitir('pointerup',420,200);assert.equal(consultas.length,1);
});
test('seleccionar una etiqueta en las bandas vacías conserva el destino y no duplica callbacks',()=>{
  const v=A.crear(800,600),c=lienzo(v),eventos=[];
  let destino={lon:-99,lat:19},capturar=true;
  A.conectar(c,v,{
    seleccion:p=>{eventos.push(['seleccion',p]);return capturar;},
    consulta:p=>{eventos.push(['consulta',p]);destino=p;}
  });
  // La etiqueta está fuera del mundo, que empieza en y=100, pero dentro del canvas.
  c.emitir('pointerdown',400,70);c.emitir('pointerup',400,70);
  assert.equal(eventos.length,1);assert.equal(eventos[0][0],'seleccion');
  assert.deepEqual(destino,{lon:-99,lat:19});
  // Una selección dentro del mundo también evita sustituir el lugar consultado.
  eventos.length=0;c.emitir('pointerdown',400,300);c.emitir('pointerup',400,300);
  assert.deepEqual(eventos.map(e=>e[0]),['seleccion']);assert.deepEqual(destino,{lon:-99,lat:19});
  // Solo cuando el selector no consume el toque se consulta el punto geográfico.
  capturar=false;eventos.length=0;c.emitir('pointerdown',400,300);c.emitir('pointerup',400,300);
  assert.deepEqual(eventos.map(e=>e[0]),['seleccion','consulta']);cerca(destino.lon,0);cerca(destino.lat,0);
  eventos.length=0;c.emitir('pointerdown',400,70);c.emitir('pointerup',400,70);
  assert.deepEqual(eventos.map(e=>e[0]),['seleccion']);
});

test('la selección de pantalla se limita a toques dentro del canvas, nunca a arrastres o pinzas',()=>{
  const v=A.crear(800,400),c=lienzo(v);let selecciones=0,consultas=0;
  A.conectar(c,v,{seleccion:()=>{selecciones++;return true;},consulta:()=>consultas++});
  c.emitir('pointerdown',799,200);c.emitir('pointerup',801,200);
  c.emitir('pointerdown');c.emitir('pointermove',440,200);c.emitir('pointerup',440,200);
  c.emitir('pointerdown',300,200,{pointerId:1});c.emitir('pointerdown',500,200,{pointerId:2});
  c.emitir('pointermove',200,200,{pointerId:1});c.emitir('pointerup',200,200,{pointerId:1});c.emitir('pointerup',500,200,{pointerId:2});
  assert.equal(selecciones,0);assert.equal(consultas,0);
  c.emitir('pointerdown');c.emitir('pointerup');assert.equal(selecciones,1);assert.equal(consultas,0);
});

test('la selección compensa el borde CSS del canvas, independientemente de su resolución',()=>{
  const v=A.crear(800,400),c=lienzo(v),consultas=[];
  Object.assign(c,{width:1600,height:800,offsetWidth:802,offsetHeight:402,clientLeft:1,clientTop:1});
  c.getBoundingClientRect=()=>({left:30,top:40,width:802,height:402});
  A.conectar(c,v,{consulta:p=>consultas.push(p)});
  c.emitir('pointerdown',401,201);c.emitir('pointerup',401,201);
  cerca(consultas[0].lon,0);cerca(consultas[0].lat,0);
});
test('la pinza amplía alrededor de su centro y nunca se interpreta como consulta',()=>{
  const v=A.crear(800,400),c=lienzo(v),consultas=[];
  A.conectar(c,v,{consulta:p=>consultas.push(p)});
  c.emitir('pointerdown',300,200,{pointerId:1});c.emitir('pointerdown',500,200,{pointerId:2});
  c.emitir('pointermove',200,200,{pointerId:1});c.emitir('pointermove',600,200,{pointerId:2});
  cerca(v.zoom,2);cerca(v.aMapa(400,200).lon,0);cerca(v.aMapa(400,200).lat,0);
  c.emitir('pointerup',200,200,{pointerId:1});c.emitir('pointermove',620,200,{pointerId:2});c.emitir('pointerup',620,200,{pointerId:2});
  assert.equal(consultas.length,0);assert.equal(c.capturados.size,0);
  c.emitir('pointerdown');c.emitir('pointerup');assert.equal(consultas.length,1);
});
test('cancelación y pérdida de captura evitan consultas y permiten el gesto siguiente',()=>{
  for(const evento of ['pointercancel','lostpointercapture']){
    const v=A.crear(800,400),c=lienzo(v),consultas=[];A.conectar(c,v,{consulta:p=>consultas.push(p)});
    c.emitir('pointerdown');c.emitir(evento);c.emitir('pointerup');assert.equal(consultas.length,0);
    c.emitir('pointerdown');c.emitir('pointerup');assert.equal(consultas.length,1);
  }
});
test('la rueda normal desplaza la página; Ctrl/Meta amplían; teclado y limpieza funcionan',()=>{
  const v=A.crear(800,400),c=lienzo(v);let cambios=0;
  const dispose=A.conectar(c,v,{cambio:()=>cambios++});
  assert.equal(c.emitir('wheel',400,200,{deltaY:-200}).impedido,undefined);assert.equal(v.zoom,1);
  assert.equal(c.emitir('wheel',400,200,{deltaY:-200,ctrlKey:true}).impedido,true);assert.ok(v.zoom>1);
  c.emitir('keydown',400,200,{key:'+'});const anterior=v.x;
  c.emitir('keydown',400,200,{key:'ArrowRight'});assert.ok(v.x<anterior);
  c.emitir('keydown',400,200,{key:'Home'});assert.equal(v.zoom,1);
  c.emitir('pointerdown');dispose();dispose();assert.equal(c.capturados.size,0);
  const n=cambios;c.emitir('wheel',400,200,{deltaY:-200,metaKey:true});assert.equal(cambios,n);assert.equal(v.zoom,1);
});
