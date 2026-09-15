'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const lee=nombre=>fs.readFileSync(path.join(__dirname,'../app',nombre),'utf8');
const turno=()=>new Promise(resolve=>setImmediate(resolve));
const diferida=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const normaliza=t=>String(t||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const ciudad=i=>({id:i,n:'Ciudad '+i,r:'Región, País',lat:10,lon:20,tz:'Asia/Kathmandu',etiqueta:'Ciudad '+i+', Región, País'});

function interfaz({fachadaReal=false,cargaPendiente=null,seleccion=null}={}){
  const listeners=new Map(),timers=new Map(),statuses=[],consultas=[];
  let secuencia=0,cargas=0,workers=0,red=0;
  class Nodo{
    constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.dataset={};this.style={};this.textContent='';this.value='';}
    setAttribute(k,v){this.attrs[k]=v;}
    getAttribute(k){return this.attrs[k]??null;}
    appendChild(n){this.children.push(n);}
    replaceChildren(...nodos){this.children=nodos.flatMap(n=>n.tag==='fragment'?n.children:[n]);}
  }
  const dl=new Nodo('datalist');
  const document={
    baseURI:'https://prueba.test/carta-natal',currentScript:{src:'https://prueba.test/app/ciudades.js?v=20260915-consulta'},
    createElement:tag=>new Nodo(tag),createDocumentFragment:()=>new Nodo('fragment'),
    getElementById:id=>id==='ciudades'?dl:null,querySelectorAll:()=>statuses,
    addEventListener:(tipo,fn)=>{if(!listeners.has(tipo))listeners.set(tipo,[]);listeners.get(tipo).push(fn);}
  };
  const C={normaliza,listo:()=>false,
    carga:()=>{cargas++;return cargaPendiente?.promise||Promise.resolve({total:235810});},
    resolver:texto=>({ciudad:seleccion&&normaliza(texto)===normaliza(seleccion.etiqueta)?seleccion:null}),
    buscar:texto=>{const p=diferida();consultas.push({texto,...p});return p.promise;}
  };
  const ctx={console,URL,document,Ciudades:C,
    Worker:class{constructor(){workers++;}postMessage(){}terminate(){}},
    fetch:()=>{red++;throw Error('No debe iniciarse una petición');},
    setTimeout:(fn,ms)=>{const id=++secuencia;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)
  };
  ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
  if(fachadaReal)vm.runInContext(lee('ciudades.js'),ctx);
  vm.runInContext(lee('ciudades-buscador.js'),ctx);ctx.CiudadesBuscador.conecta();
  function input(texto=''){
    const n=new Nodo('input');n.value=texto;n.matches=s=>s==='input[list="ciudades"]';
    n.insertAdjacentElement=(pos,s)=>{statuses.push(s);n.status=s;};return n;
  }
  function emitir(tipo,target){for(const fn of listeners.get(tipo)||[])fn({target});}
  function avanzar(){const pendientes=[...timers.values()];timers.clear();for(const t of pendientes)t.fn();}
  return{ctx,dl,input,emitir,avanzar,timers,consultas,cargas:()=>cargas,workers:()=>workers,red:()=>red};
}

test('foco y entrada vacíos no cargan ni buscan y conservan un estado accesible',async()=>{
  const d=interfaz(),input=d.input();
  for(const texto of ['', '   ', '—', '\u0301']){
    input.value=texto;
    for(const evento of ['focusin','input']){
      d.emitir(evento,input);await turno();
      assert.equal(d.cargas(),0);assert.equal(d.consultas.length,0);assert.equal(d.timers.size,0);
      assert.equal(input.attrs['aria-busy'],'false');
      assert.match(input.status.textContent,/^Escribe una ciudad/);
      assert.equal(input.status.attrs.role,'status');
      assert.equal(input.status.attrs['aria-live'],'polite');
      assert.equal(d.dl.children.length,0);
    }
  }
});

test('con la fachada real una entrada vacía no crea Worker ni peticiones',async()=>{
  const d=interfaz({fachadaReal:true}),input=d.input(' ');
  d.emitir('focusin',input);d.emitir('input',input);await turno();
  assert.equal(d.workers(),0);assert.equal(d.red(),0);assert.equal(d.timers.size,0);
  assert.equal(d.ctx.Ciudades.lista.length,0);assert.equal(d.ctx.Ciudades.listo(),false);
});

test('una consulta de un carácter conserva debounce de 140 ms y solo envía el texto más reciente',async()=>{
  const d=interfaz(),input=d.input('T');
  d.emitir('input',input);
  assert.equal(d.cargas(),0);assert.equal(d.consultas.length,0);
  assert.equal([...d.timers.values()][0].ms,140);
  input.value='Tokyo';d.emitir('input',input);assert.equal(d.timers.size,1);
  d.avanzar();await turno();
  assert.equal(d.cargas(),1);assert.equal(d.consultas.length,1);assert.equal(d.consultas[0].texto,'Tokyo');
  d.consultas[0].resolve(Array.from({length:55},(_,i)=>ciudad(i)));await turno();
  assert.equal(d.dl.children.length,40);assert.equal(input.attrs['aria-busy'],'false');
});

test('borrar el texto durante la preparación cancela la búsqueda posterior',async()=>{
  const carga=diferida(),d=interfaz({cargaPendiente:carga}),input=d.input('Madrid');
  d.emitir('focusin',input);assert.equal(d.cargas(),1);
  input.value='';d.emitir('input',input);
  carga.resolve({total:235810});await turno();
  assert.equal(d.consultas.length,0);assert.equal(d.cargas(),1);assert.equal(d.timers.size,0);
  assert.equal(input.attrs['aria-busy'],'false');assert.match(input.status.textContent,/^Escribe/);
});

test('borrar el texto durante una petición impide recuperar opciones antiguas',async()=>{
  const d=interfaz(),input=d.input('Madrid');
  d.emitir('focusin',input);await turno();assert.equal(d.consultas.length,1);
  input.value='';d.emitir('input',input);
  d.consultas[0].resolve([ciudad(1)]);await turno();
  assert.equal(d.dl.children.length,0);assert.equal(d.cargas(),1);
  assert.equal(input.attrs['aria-busy'],'false');assert.match(input.status.textContent,/^Escribe/);
});

test('un fallo permite reintentar y una respuesta antigua no reemplaza la consulta más reciente',async()=>{
  const d=interfaz(),input=d.input('Madrid');
  d.emitir('focusin',input);await turno();d.consultas[0].reject(Error('Sin conexión.'));await turno();
  assert.match(input.status.textContent,/Sin conexión.*reintentar/);assert.equal(input.attrs['aria-busy'],'false');
  d.emitir('focusin',input);await turno();
  input.value='Tokyo';d.emitir('input',input);d.avanzar();await turno();
  d.consultas[2].resolve([ciudad(3)]);await turno();
  d.consultas[1].reject(Error('Fallo tardío'));await turno();
  assert.equal(d.dl.children[0].value,ciudad(3).etiqueta);
  assert.match(input.status.textContent,/región y país/);assert.equal(input.attrs['aria-busy'],'false');
});

test('cambiar a otro campo vacío invalida la petición del datalist compartido',async()=>{
  const d=interfaz(),primero=d.input('Madrid'),segundo=d.input('');
  d.emitir('focusin',primero);await turno();d.emitir('focusin',segundo);
  d.consultas[0].resolve([ciudad(1)]);await turno();
  assert.equal(d.dl.children.length,0);assert.equal(d.cargas(),1);
  assert.equal(primero.attrs['aria-busy'],'false');assert.equal(segundo.attrs['aria-busy'],'false');
  assert.match(segundo.status.textContent,/^Escribe/);
});

test('seleccionar una etiqueta completa ya resuelta no vuelve a consultar; un nombre parcial sí',async()=>{
  const seleccion=ciudad(12),d=interfaz({seleccion}),input=d.input(seleccion.etiqueta);
  d.emitir('input',input);d.emitir('focusin',input);await turno();
  assert.equal(d.cargas(),0);assert.equal(d.consultas.length,0);assert.equal(d.timers.size,0);
  assert.equal(d.dl.children[0].value,seleccion.etiqueta);assert.equal(input.attrs['aria-busy'],'false');
  assert.equal(input.status.textContent,'Localidad seleccionada.');
  input.value=seleccion.n;d.emitir('input',input);d.avanzar();await turno();
  assert.equal(d.consultas.length,1);assert.equal(d.consultas[0].texto,seleccion.n);
  d.consultas[0].resolve([]);await turno();assert.equal(d.dl.children.length,0);
});
