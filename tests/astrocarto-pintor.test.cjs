const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../app/astrocarto-vista.js'),P=require('../app/astrocarto-pintor.js'),Geo=require('../app/astrocartografia.js');
const astro=(id,lonMC=0)=>({id,n:id,g:'☉',c:'#ff8800',lonMC,lonIC:lonMC+180,dec:12});
function canvas(){
  const g={
    textos:[],trazos:[],cajas:[],transform:[1,0,0,1,0,0],globalAlpha:1,path:[],dash:[],
    setTransform(...t){this.transform=t;},beginPath(){this.path=[];},
    moveTo(x,y){this.path.push({x,y,mover:true});},lineTo(x,y){this.path.push({x,y});},
    stroke(){this.trazos.push({path:this.path.slice(),transform:this.transform.slice(),ancho:this.lineWidth,alpha:this.globalAlpha,dash:this.dash.slice(),color:this.strokeStyle});},
    fill(){},fillRect(){},closePath(){},arc(){},rect(x,y,w,h){this.cajas.push({x,y,w,h});},roundRect(x,y,w,h){this.cajas.push({x,y,w,h});},
    setLineDash(d){this.dash=d;},fillText(texto,x,y){this.textos.push({texto,x,y,font:this.font});}
  };
  return {width:0,height:0,getContext:()=>g,g};
}
test('la línea se selecciona por su distancia visual después de acercar y arrastrar',()=>{
  const v=A.crear(800,400).centrar(45,0,8),c=canvas(),p=P.crear(c,v,{geo:Geo});
  const datos={astros:[astro('sol',45)],ejes:['MC'],claro:true};p.pintar(datos);
  assert.deepEqual(p.elegirLinea(400,200),{id:'sol',eje:'MC'});
  assert.deepEqual(p.elegirLinea(409,200),{id:'sol',eje:'MC'});assert.equal(p.elegirLinea(411,200),null);
  v.mover(80,0);p.pintar(datos);
  assert.equal(p.elegirLinea(400,200),null);assert.deepEqual(p.elegirLinea(480,200),{id:'sol',eje:'MC'});
  assert.equal(c.width,800);assert.equal(c.height,400);
});
test('no hay selección ni trazo entre los dos extremos separados del antimeridiano',()=>{
  const v=A.crear(800,400),c=canvas();
  const geo={curva:()=>[[[170,0],[180,0]],[[-180,0],[-170,0]]]};
  const p=P.crear(c,v,{geo});p.pintar({astros:[astro('luna')],ejes:['AC']});
  assert.equal(p.elegirLinea(400,200),null);
  assert.deepEqual(p.elegirLinea(792,200),{id:'luna',eje:'AC'});
  assert.deepEqual(p.elegirLinea(8,200),{id:'luna',eje:'AC'});
  const curvas=c.g.trazos.filter(t=>t.color==='#944f00');
  for(const t of curvas)for(let i=1;i<t.path.length;i++)assert.ok(Math.abs(t.path[i].x-t.path[i-1].x)<1080);
});
test('la geometría se reutiliza al mover el mapa y cambia al recalcular los astros',()=>{
  let calculos=0;const v=A.crear(800,400),c=canvas(),p=P.crear(c,v,{geo:{curva(a,e){calculos++;return Geo.curva(a,e);}}});
  const datos={astros:[astro('sol')],ejes:['MC','AC']};p.pintar(datos);assert.equal(calculos,2);
  v.acercar(3);p.pintar(datos);v.mover(60,30);p.pintar({...datos,claro:false,seleccion:'sol|MC'});assert.equal(calculos,2);
  p.pintar({...datos,astros:[astro('sol',10)]});assert.equal(calculos,4);
});
test('la seleccionada mantiene prioridad en intersecciones y las demás quedan atenuadas',()=>{
  const v=A.crear(800,400),c=canvas(),p=P.crear(c,v,{geo:Geo});
  p.pintar({astros:[astro('sol'),astro('luna')],ejes:['MC'],seleccion:'luna|MC'});
  assert.deepEqual(p.elegirLinea(400,200),{id:'luna',eje:'MC'});
  const trazos=c.g.trazos.filter(t=>t.color==='#944f00');
  assert.ok(trazos.some(t=>Math.abs(t.ancho*t.transform[0]-3)<1e-8&&t.alpha===1));
  assert.ok(trazos.some(t=>t.alpha===.18));
});
test('las etiquetas se pueden pulsar y sus letras no se encogen con el mapa',()=>{
  const v=A.crear(390,450),c=canvas(),p=P.crear(c,v,{geo:Geo});
  p.pintar({astros:[astro('sol')],ejes:['MC']});
  const texto=c.g.textos.find(t=>t.texto==='MC');assert.match(texto.font,/11px/);
  assert.deepEqual(p.elegirLinea(texto.x,texto.y),{id:'sol',eje:'MC'});
  const signo=c.g.textos.find(t=>t.texto==='☉');assert.match(signo.font,/18px/);
});
test('nacimiento y consulta se distinguen y los filtros eliminan también sus líneas seleccionables',()=>{
  const v=A.crear(800,400),c=canvas(),p=P.crear(c,v,{geo:Geo});
  p.pintar({astros:[astro('sol')],ejes:['MC'],carta:{lon:20,lat:10},marca:{lon:30,lat:15}});
  assert.ok(c.g.textos.some(t=>t.texto==='Nacimiento'));assert.ok(c.g.textos.some(t=>t.texto==='Consulta'));
  p.pintar({astros:[],ejes:['MC']});assert.equal(p.elegirLinea(400,200),null);
});
test('en celular se limita la cantidad de etiquetas y se conserva la seleccionada',()=>{
  const v=A.crear(390,480),c=canvas(),p=P.crear(c,v,{geo:Geo});
  const astros=Array.from({length:10},(_,i)=>({...astro('p'+i,i*34-160),g:'p'+i}));
  p.pintar({astros,ejes:['AC','MC','DC','IC']});
  assert.ok(c.g.textos.filter(t=>['AC','MC','DC','IC'].includes(t.texto)).length<=8);
  c.g.textos=[];
  p.pintar({astros,ejes:['AC','MC','DC','IC'],seleccion:'p9|MC'});
  const etiquetas=c.g.textos.filter(t=>['AC','MC','DC','IC'].includes(t.texto));
  assert.equal(etiquetas.length,1);assert.ok(c.g.textos.some(t=>t.texto==='p9'));
});
