const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'astroplanetario.html'),'utf8');

function formulario(){
  const nodos=new Map(),pendientes=[],aplicadas=[],globales={};
  const inicial={nFecha:'1990-03-21',nHora:'06:30',nLugar:'Kathmandu',nNombre:'Prueba',nCasas:'placidio',nOrbe:'1',nOcurrencia:'reject'};
  function nodo(id){
    if(!nodos.has(id)){
      const clases=new Set(id==='velo'?['visible']:[]),listeners={};
      nodos.set(id,{id,value:inicial[id]||'',hidden:id==='campoOcurrencia',checked:false,options:[],textContent:'',listeners,
        classList:{add:v=>clases.add(v),remove:v=>clases.delete(v),contains:v=>clases.has(v),toggle(v,on){if(on)clases.add(v);else clases.delete(v);}},
        addEventListener(t,fn,capture=false){(listeners[t]||=[]).push({fn,capture});},
        appendChild(o){this.options.push(o);},focus(){},scrollIntoView(){},setCustomValidity(){}});
    }
    return nodos.get(id);
  }
  const c={Date,Intl,window:{Ciudades:{resolver:()=>({ciudad:null}),resolverAsync:()=>new Promise(r=>pendientes.push(r))}},
    document:{getElementById:nodo,createElement:()=>({}),addEventListener(t,fn,capture){(globales[t]||=[]).push({fn,capture});}},
    solicitudCartaMomento:0,solicitudLugarRS:0,resolverCiudad:()=>({ciudad:null}),aplicaCarta:d=>aplicadas.push(d)};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root,'app/efemerides.js'),'utf8'),c);
  Object.assign(c,{validaCarta:c.window.Efem.validaCarta,localAUTC:c.window.Efem.localAUTC,textoDesfase:c.window.Efem.textoDesfase});
  vm.runInContext(html.slice(html.indexOf('/* --- formulario --- */'),html.indexOf('function guardaUltima(')),c);
  const form=nodo('natalForm');
  function fire(id,t){const target=nodo(id),ev={target,preventDefault(){}};
    for(const h of globales[t]||[])if(h.capture)h.fn(ev);
    if(id!=='natalForm')for(const h of form.listeners[t]||[])if(h.capture)h.fn(ev);
    let result;
    for(const h of target.listeners[t]||[])result=h.fn(ev);
    if(id!=='natalForm')for(const h of form.listeners[t]||[])if(!h.capture)h.fn(ev);
    return result;
  }
  const ciudad={lat:27.7,lon:85.32,tz:'Asia/Kathmandu',etiqueta:'Kathmandu, Bagmati, NP'};
  return{nodo,fire,pendientes,aplicadas,resolver:(i=0)=>pendientes[i]({ciudad})};
}

test('un envío natal espera GeoNames y aplica una sola carta al recibir la localidad',async()=>{
  const f=formulario(),p=f.fire('natalForm','submit');
  assert.equal(f.aplicadas.length,0);
  f.resolver();await p;
  assert.equal(f.aplicadas.length,1);
  assert.equal(f.aplicadas[0].tz,'Asia/Kathmandu');
});

test('editar fecha, hora o modalidad durante la descarga invalida el envío natal pendiente',async()=>{
  for(const [id,tipo,valor] of [['nFecha','input','2000-01-01'],['nHora','input','07:30'],['nSinHora','change',null],['nOcurrencia','change','later']]){
    const f=formulario(),p=f.fire('natalForm','submit');
    if(valor===null)f.nodo(id).checked=true;else f.nodo(id).value=valor;
    f.fire(id,tipo);f.resolver();await p;
    assert.equal(f.aplicadas.length,0,id);
  }
});

test('cancelar el formulario impide que la descarga pendiente vuelva a abrir o aplicar la carta',async()=>{
  const f=formulario(),p=f.fire('natalForm','submit');
  f.fire('nCancelar','click');f.resolver();await p;
  assert.equal(f.aplicadas.length,0);
  assert.equal(f.nodo('velo').classList.contains('visible'),false);
});

test('dos envíos simultáneos publican sólo el último',async()=>{
  const f=formulario(),primero=f.fire('natalForm','submit'),ultimo=f.fire('natalForm','submit');
  f.resolver(1);await ultimo;f.resolver(0);await primero;
  assert.equal(f.aplicadas.length,1);
});
